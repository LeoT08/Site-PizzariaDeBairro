import * as THREE from 'three'

// Texturas da pizza geradas em canvas: nenhuma imagem externa para baixar.
// Cada textura é criada uma vez e reaproveitada (cache por chave). Para cada superfície
// importante há também um mapa de normais, gerado a partir de um mapa de altura,
// que faz a luz revelar bolhas, relevos e bordas.

const cache = new Map<string, THREE.Texture>()

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Noise = (x: number, y: number, octaves?: number) => number

/** Ruído de valor suave (2D, com oitavas): base de todas as texturas orgânicas */
function makeNoise(seed: number): Noise {
  const rand = mulberry32(seed)
  const size = 256
  const grid = new Float32Array(size * size).map(() => rand())
  const at = (x: number, y: number) => grid[(y & (size - 1)) * size + (x & (size - 1))]
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const value = (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const tx = smooth(x - xi)
    const ty = smooth(y - yi)
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
  }
  return (x, y, octaves = 4) => {
    let sum = 0
    let amp = 0.5
    let freq = 1
    for (let i = 0; i < octaves; i++) {
      sum += value(x * freq, y * freq) * amp
      amp *= 0.5
      freq *= 2
    }
    return sum
  }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
type RGB = [number, number, number]
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]

interface Bubble {
  x: number
  y: number
  r: number
}

/** Bolhas espalhadas (massa e queijo estufam no forno) */
function bubbles(rand: () => number, count: number, size: number, rMin: number, rMax: number): Bubble[] {
  return Array.from({ length: count }, () => ({ x: rand() * size, y: rand() * size, r: rMin + rand() * (rMax - rMin) }))
}

/** Altura (cúpula) e "anel" (borda da bolha) de um conjunto de bolhas no ponto */
const wobble = makeNoise(99)
function bubbleHeight(list: Bubble[], x: number, y: number) {
  let h = 0
  let rim = 0
  for (const b of list) {
    const dx = x - b.x
    const dy = y - b.y
    const d2 = dx * dx + dy * dy
    if (d2 > b.r * b.r) continue
    // contorno irregular: o raio varia com o ângulo, como uma bolha de verdade
    const a = Math.atan2(dy, dx)
    const r = b.r * (0.75 + wobble(Math.cos(a) * 1.6 + b.x * 0.05, Math.sin(a) * 1.6 + b.y * 0.05, 2) * 0.5)
    const dist = Math.sqrt(d2)
    if (dist > r) continue
    const t = 1 - dist / r
    h = Math.max(h, Math.sqrt(t))
    rim = Math.max(rim, t < 0.35 ? t / 0.35 : (1 - t) / 0.65)
  }
  return { h, rim }
}

/** Grade espacial para as bolhas não custarem O(n) por pixel */
function bubbleGrid(list: Bubble[], size: number, cell = 32) {
  const n = Math.ceil(size / cell)
  const grid: Bubble[][] = Array.from({ length: n * n }, () => [])
  for (const b of list) {
    const x0 = Math.max(0, Math.floor((b.x - b.r) / cell))
    const x1 = Math.min(n - 1, Math.floor((b.x + b.r) / cell))
    const y0 = Math.max(0, Math.floor((b.y - b.r) / cell))
    const y1 = Math.min(n - 1, Math.floor((b.y + b.r) / cell))
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) grid[gy * n + gx].push(b)
  }
  return (x: number, y: number) =>
    bubbleHeight(grid[Math.min(n - 1, Math.floor(y / cell)) * n + Math.min(n - 1, Math.floor(x / cell))], x, y)
}

interface Layer {
  /** RGBA de 0 a 255 */
  color: (x: number, y: number) => [number, number, number, number]
  /** altura de 0 a 1, para o mapa de normais */
  height?: (x: number, y: number) => number
  /** rugosidade de 0 a 1 (0 = brilho de gordura) */
  rough?: (x: number, y: number) => number
}

export interface Maps {
  map: THREE.Texture
  normalMap?: THREE.Texture
  roughnessMap?: THREE.Texture
}

const mapsCache = new Map<string, Maps>()

function toTexture(canvas: HTMLCanvasElement, color: boolean, repeat?: [number, number]) {
  const tex = new THREE.CanvasTexture(canvas)
  if (color) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  tex.needsUpdate = true
  return tex
}

/** Gera cor, normais e rugosidade de uma vez, varrendo cada pixel uma só vez */
function bake(key: string, size: number, layer: Layer, repeat?: [number, number], normalStrength = 2.5): Maps {
  const hit = mapsCache.get(key)
  if (hit) return hit

  const mk = () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    return c
  }
  const colorCanvas = mk()
  const cctx = colorCanvas.getContext('2d')!
  const cimg = cctx.createImageData(size, size)
  const heights = layer.height ? new Float32Array(size * size) : null
  const roughCanvas = layer.rough ? mk() : null
  const rimg = roughCanvas ? roughCanvas.getContext('2d')!.createImageData(size, size) : null

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const [r, g, b, a] = layer.color(x, y)
      cimg.data[i * 4] = r
      cimg.data[i * 4 + 1] = g
      cimg.data[i * 4 + 2] = b
      cimg.data[i * 4 + 3] = a
      if (heights) heights[i] = layer.height!(x, y)
      if (rimg) {
        const v = clamp01(layer.rough!(x, y)) * 255
        rimg.data[i * 4] = rimg.data[i * 4 + 1] = rimg.data[i * 4 + 2] = v
        rimg.data[i * 4 + 3] = 255
      }
    }
  }
  cctx.putImageData(cimg, 0, 0)
  const out: Maps = { map: toTexture(colorCanvas, true, repeat) }

  if (heights) {
    const ncanvas = mk()
    const nctx = ncanvas.getContext('2d')!
    const nimg = nctx.createImageData(size, size)
    const hAt = (x: number, y: number) => heights[((y + size) % size) * size + ((x + size) % size)]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * normalStrength
        const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * normalStrength
        const len = Math.hypot(dx, dy, 1)
        const i = (y * size + x) * 4
        nimg.data[i] = (-dx / len) * 127.5 + 127.5
        nimg.data[i + 1] = (dy / len) * 127.5 + 127.5
        nimg.data[i + 2] = (1 / len) * 127.5 + 127.5
        nimg.data[i + 3] = 255
      }
    }
    nctx.putImageData(nimg, 0, 0)
    out.normalMap = toTexture(ncanvas, false, repeat)
  }
  if (roughCanvas && rimg) {
    roughCanvas.getContext('2d')!.putImageData(rimg, 0, 0)
    out.roughnessMap = toTexture(roughCanvas, false, repeat)
  }

  mapsCache.set(key, out)
  return out
}

function simple(key: string, size: number, paint: (x: number, y: number) => [number, number, number, number], color = true) {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y)
      const i = (y * size + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = a
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = toTexture(canvas, color)
  cache.set(key, tex)
  return tex
}

// ---------------------------------------------------------------- massa e borda

/** Base da massa (aparece pouco: por baixo e entre a borda e o molho) */
export const doughMaps = () => {
  const size = 512
  const noise = makeNoise(11)
  const rand = mulberry32(12)
  const bub = bubbleGrid(bubbles(rand, 90, size, 6, 18), size)
  const base: RGB = [232, 188, 124]
  const toasted: RGB = [176, 108, 52]
  return bake(
    'dough',
    size,
    {
      color: (x, y) => {
        const n = noise(x / 40, y / 40)
        const { h } = bub(x, y)
        const c = mixRgb(base, toasted, clamp01((n - 0.42) * 2.2 + h * 0.5))
        const flour = noise(x / 3 + 50, y / 3 + 50, 2) > 0.7 ? 22 : 0
        return [c[0] + flour, c[1] + flour, c[2] + flour, 255]
      },
      height: (x, y) => bub(x, y).h * 0.8 + noise(x / 10, y / 10, 3) * 0.35,
      rough: (x, y) => 0.75 + noise(x / 20, y / 20) * 0.2,
    },
    [2, 2],
  )
}

/**
 * Borda de forno a lenha: dourada, com manchas de "leopardo" (bolhas queimadas),
 * farinha nas partes baixas e bolhas grandes em relevo.
 * Mapeada no toro: u ao longo do anel (repete), v em volta do tubo.
 */
export const crustMaps = () => {
  const size = 1024
  const noise = makeNoise(13)
  const rand = mulberry32(14)
  const bigBubbles = bubbleGrid(bubbles(rand, 140, size, 14, 46), size)
  const leopard = bubbleGrid(bubbles(rand, 260, size, 3, 11), size)
  const pale: RGB = [236, 196, 132]
  const golden: RGB = [214, 146, 66]
  const toasted: RGB = [158, 88, 34]
  const char: RGB = [44, 26, 16]
  return bake(
    'crust',
    size,
    {
      color: (x, y) => {
        // no toro do three.js o topo do tubo fica em v ≈ 0,25; o canvas é invertido (flipY), então y = 0,75
        const top = clamp01(Math.cos((0.75 - y / size) * Math.PI * 2) * 0.9 + 0.2)
        const n = noise(x / 46, y / 46)
        const big = bigBubbles(x, y)
        let c = mixRgb(pale, golden, clamp01(top * 1.1 + (n - 0.5) * 0.6))
        c = mixRgb(c, toasted, clamp01((n - 0.48) * 2.2) * top + big.h * 0.45 * top)
        const spot = leopard(x, y)
        if (top > 0.45) c = mixRgb(c, char, clamp01(spot.h * 1.4) * 0.92)
        const flour = (1 - top) * (noise(x / 2.5 + 80, y / 2.5 + 80, 2) > 0.66 ? 40 : 0)
        return [c[0] + flour, c[1] + flour, c[2] + flour, 255]
      },
      height: (x, y) => bigBubbles(x, y).h * 0.9 + leopard(x, y).h * 0.25 + noise(x / 12, y / 12, 3) * 0.3,
      rough: (x, y) => 0.68 + noise(x / 25, y / 25) * 0.25,
    },
    [9, 1],
    3,
  )
}

// ---------------------------------------------------------------- molho e queijo

/** Molho: vermelho com pedaços de tomate e acúmulos mais escuros, borda irregular (alpha) */
export const sauceMaps = (kind: string) => {
  const size = 1024
  const noise = makeNoise(kind === 'branco' ? 21 : 22)
  const light: RGB = kind === 'branco' ? [242, 230, 204] : [200, 46, 24]
  const dark: RGB = kind === 'branco' ? [220, 202, 166] : [138, 24, 12]
  const chunk: RGB = kind === 'branco' ? [232, 216, 180] : [226, 74, 40]
  const c0 = size / 2
  return bake(`sauce-${kind}`, size, {
    color: (x, y) => {
      const n = noise(x / 34, y / 34)
      let c = mixRgb(light, dark, clamp01(n * 1.7 - 0.35))
      if (noise(x / 6 + 30, y / 6 + 30, 2) > 0.68) c = mixRgb(c, chunk, 0.7)
      const r = Math.hypot(x - c0, y - c0) / c0
      const edge = 0.91 + (noise(x / 16 + 9, y / 16 + 9) - 0.5) * 0.12
      return [c[0], c[1], c[2], clamp01((edge - r) * 40) * 255]
    },
    height: (x, y) => noise(x / 8 + 30, y / 8 + 30, 3),
    // molho é úmido: brilha bastante
    rough: (x, y) => 0.25 + noise(x / 30, y / 30) * 0.25,
  })
}

const cheeseBubbles = (kind: string, size: number) =>
  bubbles(mulberry32(kind === 'bufala' ? 34 : 35), kind === 'bufala' ? 30 : 120, size, kind === 'bufala' ? 10 : 6, kind === 'bufala' ? 60 : 44)

/**
 * Muçarela gratinada: bolhas estufadas com topo e borda tostados, poças de gordura brilhantes
 * e falhas por onde o molho aparece (alpha). A búfala é mais branca e em discos.
 */
export const cheeseMaps = (kind: string) => {
  const size = 1024
  const noise = makeNoise(kind === 'bufala' ? 31 : 32)
  const blisters = bubbleGrid(cheeseBubbles(kind, size), size)
  const melt: RGB = kind === 'bufala' ? [250, 246, 232] : [248, 222, 146]
  const golden: RGB = [226, 162, 68]
  const browned: RGB = [150, 86, 34]
  const c0 = size / 2
  return bake(
    `cheese-${kind}`,
    size,
    {
      color: (x, y) => {
        const n = noise(x / 40, y / 40)
        const b = blisters(x, y)
        let c = melt
        if (kind !== 'bufala') {
          c = mixRgb(melt, golden, clamp01((noise(x / 14 + 40, y / 14 + 40, 3) - 0.5) * 2.4))
          // bolhas: topo dourado/tostado e anel mais escuro em volta
          c = mixRgb(c, golden, clamp01(b.h * 1.2))
          c = mixRgb(c, browned, clamp01((b.h - 0.55) * 2.2) + b.rim * 0.25)
        } else {
          c = mixRgb(melt, [236, 220, 186], b.rim * 0.4)
        }
        const r = Math.hypot(x - c0, y - c0) / c0
        const coverage = kind === 'bufala' ? b.h * 1.4 + n - 0.62 : n + b.h * 0.3 - 0.27
        const edge = 0.87 + (noise(x / 12 + 70, y / 12 + 70) - 0.5) * 0.16
        return [c[0], c[1], c[2], clamp01(coverage * 10) * clamp01((edge - r) * 30) * 255]
      },
      height: (x, y) => blisters(x, y).h * 0.9 + noise(x / 9, y / 9, 3) * 0.3,
      // gordura acumula entre as bolhas: menos rugoso (mais brilho) ali
      rough: (x, y) => {
        const b = blisters(x, y)
        const oil = clamp01((noise(x / 22 + 90, y / 22 + 90) - 0.55) * 4) * (1 - b.h)
        return 0.55 - oil * 0.4 + b.h * 0.15
      },
    },
    undefined,
    3.5,
  )
}

/** Altura do queijo para o displacement (relevo real na geometria) */
export const cheeseDisplacement = (kind: string) => {
  const size = 256
  const scale = size / 1024
  const noise = makeNoise(33)
  const blisters = bubbleGrid(
    cheeseBubbles(kind, 1024).map((b) => ({ x: b.x * scale, y: b.y * scale, r: b.r * scale })),
    size,
    8,
  )
  return simple(
    `cheese-disp-${kind}`,
    size,
    (x, y) => {
      const v = clamp01(blisters(x, y).h * 0.7 + noise(x / 14, y / 14) * 0.5) * 255
      return [v, v, v, 255]
    },
    false,
  )
}

// ---------------------------------------------------------------- ingredientes

/** Rodela de calabresa: carne avermelhada com pontos de gordura e borda escura */
export const calabresaMaps = () => {
  const size = 256
  const noise = makeNoise(41)
  const fat = bubbleGrid(bubbles(mulberry32(42), 60, size, 3, 7), size, 16)
  const c0 = size / 2
  return bake('calabresa', size, {
    color: (x, y) => {
      const r = Math.hypot(x - c0, y - c0) / c0
      let c = mixRgb([182, 52, 34], [118, 28, 18], clamp01(noise(x / 14, y / 14) * 1.3 - 0.25))
      if (r < 0.82) c = mixRgb(c, [244, 206, 176], clamp01(fat(x, y).h * 2))
      // bordinha que escureceu e enrolou no forno
      if (r > 0.7 && r <= 0.86) c = mixRgb(c, [110, 30, 18], ((r - 0.7) / 0.16) * 0.6)
      if (r > 0.86) c = mixRgb([96, 26, 16], [70, 20, 12], noise(x / 4, y / 4))
      return [c[0], c[1], c[2], 255]
    },
    height: (x, y) => fat(x, y).h * 0.5 + noise(x / 6, y / 6, 2) * 0.4,
    rough: (x, y) => 0.45 - fat(x, y).h * 0.25,
  })
}

/** Rodela de tomate: polpa vermelha com gomos e sementes */
export const tomatoMaps = () => {
  const size = 256
  const noise = makeNoise(43)
  const c0 = size / 2
  return bake('tomate', size, {
    color: (x, y) => {
      const dx = x - c0
      const dy = y - c0
      const r = Math.hypot(dx, dy) / c0
      let c: RGB = [214, 44, 30]
      const lobe = Math.abs(Math.sin(Math.atan2(dy, dx) * 2))
      if (r > 0.28 && r < 0.72 && lobe > 0.35) c = mixRgb([236, 92, 60], [246, 196, 80], clamp01(noise(x / 4, y / 4) - 0.3))
      if (r > 0.88) c = [178, 26, 20]
      return [c[0], c[1], c[2], 255]
    },
    height: (x, y) => noise(x / 5, y / 5, 2),
    rough: () => 0.18,
  })
}

/** Fatia de champignon: lâminas radiais sob o chapéu */
export const mushroomMaps = () => {
  const size = 256
  const noise = makeNoise(44)
  return bake('champignon', size, {
    color: (x, y) => {
      const u = x / size - 0.5
      const v = y / size - 0.5
      const gills = Math.abs(Math.sin(Math.atan2(v, u) * 40)) > 0.75 && v > -0.02 ? 1 : 0
      const c = mixRgb([232, 216, 192], [176, 148, 116], gills * 0.5 + noise(x / 10, y / 10) * 0.25)
      return [c[0], c[1], c[2], 255]
    },
    height: (x, y) => noise(x / 6, y / 6, 2),
    rough: () => 0.6,
  })
}

/** Folha de manjericão: verde com nervuras claras */
export const basilMaps = () => {
  const size = 256
  const noise = makeNoise(45)
  return bake('manjericao', size, {
    color: (x, y) => {
      const u = x / size - 0.5
      const v = y / size - 0.5
      const mid = Math.abs(u) < 0.012
      const vein = Math.abs(Math.sin((v - Math.abs(u) * 1.2) * 60)) > 0.94 && Math.abs(u) < 0.3
      let c = mixRgb([42, 112, 62], [26, 80, 44], noise(x / 18, y / 18))
      if (mid || vein) c = mixRgb(c, [118, 170, 110], 0.6)
      return [c[0], c[1], c[2], 255]
    },
    height: (x, y) => (Math.abs(x / size - 0.5) < 0.012 ? 0.2 : noise(x / 8, y / 8, 2)),
    rough: () => 0.42,
  })
}

/** Tábua de madeira: veios retos de prancha */
export const woodMaps = () => {
  const size = 1024
  const noise = makeNoise(51)
  const light: RGB = [184, 130, 80]
  const dark: RGB = [116, 74, 40]
  return bake(
    'wood',
    size,
    {
      color: (x, y) => {
        const warp = noise(x / 220, y / 40) * 22
        const grain = Math.sin((y + warp) / 3.4) * 0.5 + 0.5
        const fibers = noise(x / 90, y / 1.6, 2)
        const c = mixRgb(light, dark, clamp01(grain * 0.32 + fibers * 0.55 + noise(x / 140, y / 70) * 0.28 - 0.1))
        return [c[0], c[1], c[2], 255]
      },
      height: (x, y) => noise(x / 90, y / 1.6, 2) * 0.5,
      rough: (x, y) => 0.7 + noise(x / 60, y / 60) * 0.2,
    },
    undefined,
    1.2,
  )
}

/** Fumaça suave para o vapor (sprite) */
export const steamTexture = () => {
  const noise = makeNoise(61)
  const c0 = 64
  return simple('steam', 128, (x, y) => {
    const r = Math.hypot(x - c0, y - c0) / c0
    const a = clamp01(1 - r) ** 2 * clamp01(noise(x / 14, y / 14) * 1.6 - 0.2)
    return [255, 255, 255, a * 255]
  })
}
