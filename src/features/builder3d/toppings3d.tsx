import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Topping, ToppingKind } from '@/api/types'
import { scatter, TOPPING_COUNT } from '@/features/builder/toppingArt'
import { basilMaps, calabresaMaps, mushroomMaps, tomatoMaps, type Maps } from './textures'

// Ingredientes em 3D. Unidade: raio da pizza = 1 (grande, 35 cm), então 0,08 ≈ 1,4 cm de raio.
// Cada ingrediente é um ou mais InstancedMesh: uma única chamada de desenho para todas as peças.

interface Part {
  geometry: THREE.BufferGeometry
  material: THREE.Material | THREE.Material[]
  /** deslocamento da parte em relação à peça (ex.: gema em cima da clara) */
  offsetY?: number
}

interface Def {
  parts: Part[]
  /** inclinação aleatória máxima (rad): rodelas ficam meio tortas sobre o queijo */
  tilt: number
  /** variação de tamanho entre peças */
  jitter: number
}

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)

function flatRing(radius: number, tube: number, radial = 8, tubular = 32) {
  const g = new THREE.TorusGeometry(radius, tube, radial, tubular)
  g.rotateX(-Math.PI / 2)
  return g
}

function leafGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, -0.07)
  s.bezierCurveTo(0.05, -0.04, 0.05, 0.04, 0, 0.075)
  s.bezierCurveTo(-0.05, 0.04, -0.05, -0.04, 0, -0.07)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: false, curveSegments: 10 })
  g.rotateX(-Math.PI / 2)
  // folha levemente curvada
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + Math.abs(pos.getX(i)) * 0.35)
  g.computeVertexNormals()
  return g
}

function mushroomGeometry() {
  const s = new THREE.Shape()
  s.moveTo(-0.06, 0)
  s.absarc(0, 0, 0.06, Math.PI, 0, true)
  s.lineTo(0.022, 0)
  s.lineTo(0.022, -0.045)
  s.quadraticCurveTo(0, -0.052, -0.022, -0.045)
  s.lineTo(-0.022, 0)
  s.lineTo(-0.06, 0)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 })
  g.rotateX(-Math.PI / 2)
  return g
}

function baconGeometry() {
  const g = new THREE.PlaneGeometry(0.19, 0.055, 16, 1)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, Math.sin(pos.getX(i) * 55) * 0.009)
  g.computeVertexNormals()
  return g
}

function baconTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 16
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 16)
  grad.addColorStop(0, '#A8443A')
  grad.addColorStop(0.35, '#C9675A')
  grad.addColorStop(0.45, '#F2D2C2')
  grad.addColorStop(0.6, '#B14E43')
  grad.addColorStop(0.8, '#F0CBB8')
  grad.addColorStop(1, '#9C3B32')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 16)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let defsCache: Record<ToppingKind, Def> | null = null

function buildDefs(): Record<ToppingKind, Def> {
  const cylinder = (r: number, h: number) => new THREE.CylinderGeometry(r, r, h, 28)
  const fromMaps = (m: Maps, extra: THREE.MeshStandardMaterialParameters = {}) =>
    std({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, ...extra })
  // geometrias extrudadas usam as coordenadas da forma como UV: centraliza e ajusta a escala
  const fitted = (m: Maps, span: number): Maps => {
    const fit = (tex?: THREE.Texture) => {
      if (!tex) return undefined
      const c = tex.clone()
      c.repeat.set(1 / span, 1 / span)
      c.offset.set(0.5, 0.5)
      c.needsUpdate = true
      return c
    }
    return { map: fit(m.map)!, normalMap: fit(m.normalMap), roughnessMap: fit(m.roughnessMap) }
  }
  const calabresaTop = fromMaps(calabresaMaps())
  const tomatoTop = fromMaps(tomatoMaps())
  const ovoClara = new THREE.CylinderGeometry(0.068, 0.072, 0.012, 28)
  ovoClara.scale(1, 1, 0.8)
  const gema = new THREE.SphereGeometry(0.03, 20, 12)
  gema.scale(1, 0.55, 1)
  const frango = new THREE.IcosahedronGeometry(0.038, 1)
  frango.scale(1.35, 0.42, 0.85)
  const catupiry = new THREE.SphereGeometry(0.048, 18, 10)
  catupiry.scale(1, 0.32, 1)
  const milho = new THREE.SphereGeometry(0.016, 10, 8)
  milho.scale(1, 0.8, 1.25)

  return {
    calabresa: {
      parts: [{ geometry: cylinder(0.08, 0.02), material: [std({ color: '#7C2418', roughness: 0.6 }), calabresaTop, calabresaTop] }],
      tilt: 0.12,
      jitter: 0.1,
    },
    tomate: {
      parts: [{ geometry: cylinder(0.07, 0.012), material: [std({ color: '#B8261C', roughness: 0.3 }), tomatoTop, tomatoTop] }],
      tilt: 0.1,
      jitter: 0.12,
    },
    azeitona: {
      parts: [{ geometry: flatRing(0.024, 0.014, 12, 24), material: std({ color: '#1C1814', roughness: 0.18 }) }],
      tilt: 0.25,
      jitter: 0.15,
    },
    cebola: {
      parts: [{ geometry: flatRing(0.055, 0.006, 6, 36), material: std({ color: '#EAD3E4', roughness: 0.35, transparent: true, opacity: 0.88 }) }],
      tilt: 0.15,
      jitter: 0.3,
    },
    pimentao: {
      parts: [{ geometry: flatRing(0.05, 0.009, 6, 28), material: std({ color: '#2E8A3B', roughness: 0.22 }) }],
      tilt: 0.2,
      jitter: 0.2,
    },
    palmito: {
      parts: [{ geometry: flatRing(0.034, 0.019, 10, 24), material: std({ color: '#F1E9CF', roughness: 0.55 }) }],
      tilt: 0.15,
      jitter: 0.15,
    },
    milho: {
      parts: [{ geometry: milho, material: std({ color: '#F2BC2C', roughness: 0.3 }) }],
      tilt: 1,
      jitter: 0.2,
    },
    manjericao: {
      parts: [{ geometry: leafGeometry(), material: fromMaps(fitted(basilMaps(), 0.15), { side: THREE.DoubleSide }) }],
      tilt: 0.3,
      jitter: 0.25,
    },
    champignon: {
      parts: [{ geometry: mushroomGeometry(), material: fromMaps(fitted(mushroomMaps(), 0.12)) }],
      tilt: 0.15,
      jitter: 0.15,
    },
    bacon: {
      parts: [{ geometry: baconGeometry(), material: std({ map: baconTexture(), roughness: 0.4, side: THREE.DoubleSide }) }],
      tilt: 0.1,
      jitter: 0.15,
    },
    frango: {
      parts: [{ geometry: frango, material: std({ color: '#E2BE86', roughness: 0.75 }) }],
      tilt: 0.3,
      jitter: 0.3,
    },
    presunto: {
      parts: [{ geometry: new THREE.BoxGeometry(0.11, 0.01, 0.08), material: std({ color: '#E39A96', roughness: 0.5 }) }],
      tilt: 0.12,
      jitter: 0.2,
    },
    ovo: {
      parts: [
        { geometry: ovoClara, material: std({ color: '#FFFDF6', roughness: 0.3 }) },
        { geometry: gema, material: std({ color: '#EFA417', roughness: 0.2 }), offsetY: 0.008 },
      ],
      tilt: 0.05,
      jitter: 0.1,
    },
    catupiry: {
      parts: [{ geometry: catupiry, material: std({ color: '#FFF6E1', roughness: 0.32 }) }],
      tilt: 0.05,
      jitter: 0.3,
    },
  }
}

function toppingDefs() {
  if (!defsCache) defsCache = buildDefs()
  return defsCache
}

interface Placement {
  x: number
  z: number
  rotY: number
  tiltX: number
  tiltZ: number
  scale: number
  delay: number
}

function placements(t: Topping, def: Def): Placement[] {
  const pts = scatter(t.id, TOPPING_COUNT[t.kind])
  return pts.map((p, i) => {
    // reaproveita o espalhamento do desenho 2D (viewBox 400) convertido para o raio da pizza
    const r1 = Math.sin(i * 12.9898 + t.id.length) * 43758.5453
    const r2 = Math.sin(i * 78.233 + t.id.length) * 12345.678
    const f1 = r1 - Math.floor(r1)
    const f2 = r2 - Math.floor(r2)
    return {
      x: (p.x - 200) / 172,
      z: (p.y - 200) / 172,
      rotY: (p.rotate * Math.PI) / 180,
      tiltX: (f1 - 0.5) * def.tilt,
      tiltZ: (f2 - 0.5) * def.tilt,
      scale: 1 + (f1 - 0.5) * def.jitter,
      delay: i * 0.045,
    }
  })
}

const DROP_HEIGHT = 1.1
const FALL = 0.55

/** Queda com quique leve no fim */
function dropCurve(t: number) {
  if (t >= 1) return 0
  if (t < 0.75) {
    const k = t / 0.75
    return 1 - k * k
  }
  const k = (t - 0.75) / 0.25
  return Math.sin(k * Math.PI) * 0.06
}

function ToppingMesh({ topping, leaving, still }: { topping: Topping; leaving: boolean; still: boolean }) {
  const def = toppingDefs()[topping.kind]
  const list = useMemo(() => placements(topping, def), [topping, def])
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  const start = useRef<number | null>(null)
  const leaveStart = useRef<number | null>(null)
  const done = useRef(false)
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const s = useMemo(() => new THREE.Vector3(), [])

  const write = (time: number) => {
    let animating = false
    list.forEach((p, i) => {
      let lift = 0
      let spin = 0
      let scale = p.scale
      if (leaveStart.current !== null) {
        const k = Math.min(1, (time - leaveStart.current) / 0.35)
        lift = k * 0.5
        scale *= 1 - k
        animating = animating || k < 1
      } else if (!still) {
        // antes do primeiro quadro a peça ainda está no alto, esperando para cair
        const k = start.current === null ? 0 : Math.max(0, (time - start.current - p.delay) / FALL)
        lift = dropCurve(k) * DROP_HEIGHT
        spin = (1 - Math.min(1, k)) * 2.5
        if (k < 1) animating = true
      }
      e.set(p.tiltX + spin * 0.4, p.rotY + spin, p.tiltZ)
      q.setFromEuler(e)
      s.setScalar(Math.max(scale, 0.0001))
      def.parts.forEach((part, j) => {
        v.set(p.x, lift + (part.offsetY ?? 0), p.z)
        m.compose(v, q, s)
        refs.current[j]?.setMatrixAt(i, m)
      })
    })
    refs.current.forEach((mesh) => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true
    })
    return animating
  }

  useLayoutEffect(() => {
    write(still ? Infinity : -Infinity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, still])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (start.current === null) start.current = time
    if (leaving && leaveStart.current === null) leaveStart.current = time
    if (done.current && !leaving) return
    const animating = write(time)
    if (!animating && !leaving) done.current = true
  })

  return (
    <group>
      {def.parts.map((part, j) => (
        <instancedMesh
          key={j}
          ref={(el) => {
            refs.current[j] = el
          }}
          args={[part.geometry, part.material, list.length]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </group>
  )
}

/** Mantém o ingrediente removido por um instante para ele "sair" da pizza com animação */
export function Toppings3D({ toppings, still }: { toppings: Topping[]; still: boolean }) {
  const [shown, setShown] = useState<{ topping: Topping; leaving: boolean }[]>(() =>
    toppings.map((t) => ({ topping: t, leaving: false })),
  )

  useEffect(() => {
    setShown((cur) => {
      const ids = new Set(toppings.map((t) => t.id))
      const next = cur.map((x) => (ids.has(x.topping.id) ? { ...x, leaving: false } : { ...x, leaving: true }))
      for (const t of toppings) if (!next.some((x) => x.topping.id === t.id)) next.push({ topping: t, leaving: false })
      return next
    })
    const timer = window.setTimeout(() => setShown((cur) => cur.filter((x) => !x.leaving)), 450)
    return () => window.clearTimeout(timer)
  }, [toppings])

  return (
    <>
      {shown.map(({ topping, leaving }) => (
        <ToppingMesh key={topping.id} topping={topping} leaving={leaving} still={still} />
      ))}
    </>
  )
}
