import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { CrustType, PizzaSize, Topping } from '@/api/types'
import { Toppings3D } from './toppings3d'
import { cheeseDisplacement, cheeseMaps, crustMaps, doughMaps, sauceMaps, steamTexture, woodMaps } from './textures'

export interface PizzaSceneProps {
  size: PizzaSize
  sauce: string
  cheese: string
  toppings: Topping[]
  crust: CrustType
  /** true: pizza pronta, câmera em 3/4, gira e pode ser arrastada */
  finished: boolean
}

const SIZE_SCALE: Record<PizzaSize, number> = { broto: 0.74, media: 0.86, grande: 1 }

/** Interpola um valor em direção ao alvo a cada quadro (amortecimento independente do FPS) */
const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(current, target, lambda, dt)

function Board() {
  const wood = useMemo(() => woodMaps(), [])
  return (
    <mesh position={[0, -0.04, 0]} receiveShadow>
      <cylinderGeometry args={[1.22, 1.22, 0.07, 128]} />
      <meshStandardMaterial
        map={wood.map}
        normalMap={wood.normalMap}
        normalScale={new THREE.Vector2(0.6, 0.6)}
        roughnessMap={wood.roughnessMap}
        roughness={1}
      />
    </mesh>
  )
}

function Dough({ crust }: { crust: CrustType }) {
  const dough = useMemo(() => doughMaps(), [])
  const crustM = useMemo(() => crustMaps(), [])
  const crustRef = useRef<THREE.Mesh>(null)
  const stuffed = crust !== 'tradicional'
  const tint = crust === 'cheddar' ? '#F6C27A' : '#FFFFFF'

  // a borda incha quando vira recheada
  useFrame((_, dt) => {
    const mesh = crustRef.current
    if (!mesh) return
    mesh.scale.z = damp(mesh.scale.z, (stuffed ? 1.3 : 1) * 0.78, 6, dt)
    mesh.scale.x = mesh.scale.y = damp(mesh.scale.x, stuffed ? 1.01 : 1, 6, dt)
  })

  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.97, 0.99, 0.04, 128]} />
        <meshStandardMaterial map={dough.map} normalMap={dough.normalMap} roughnessMap={dough.roughnessMap} roughness={1} />
      </mesh>
      <mesh ref={crustRef} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.93, 0.075, 40, 220]} />
        <meshStandardMaterial
          map={crustM.map}
          normalMap={crustM.normalMap}
          normalScale={new THREE.Vector2(1.4, 1.4)}
          roughnessMap={crustM.roughnessMap}
          roughness={1}
          color={tint}
        />
      </mesh>
    </group>
  )
}

function Sauce({ kind }: { kind: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const m = useMemo(() => sauceMaps(kind), [kind])
  const progress = useRef(0)

  useEffect(() => {
    progress.current = 0
  }, [kind])

  // o molho espalha do centro para fora, como com a concha
  useFrame((_, dt) => {
    if (!ref.current) return
    progress.current = damp(progress.current, 1, 4, dt)
    const s = 0.15 + progress.current * 0.85
    ref.current.scale.set(s, s, 1)
    ref.current.rotation.z = (1 - progress.current) * 2
  })

  return (
    <mesh ref={ref} position={[0, 0.0415, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[0.9, 128]} />
      <meshPhysicalMaterial
        map={m.map}
        normalMap={m.normalMap}
        normalScale={new THREE.Vector2(0.8, 0.8)}
        roughnessMap={m.roughnessMap}
        roughness={1}
        clearcoat={0.35}
        clearcoatRoughness={0.45}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

function Cheese({ kind }: { kind: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshPhysicalMaterial>(null)
  const m = useMemo(() => (kind === 'sem-queijo' ? null : cheeseMaps(kind)), [kind])
  const disp = useMemo(() => (kind === 'sem-queijo' ? null : cheeseDisplacement(kind)), [kind])
  const melt = useRef(0)

  useEffect(() => {
    melt.current = 0
  }, [kind])

  // o queijo derrete: começa alto e grosso e assenta sobre o molho
  useFrame((_, dt) => {
    if (!ref.current || !mat.current) return
    melt.current = damp(melt.current, 1, 2.5, dt)
    mat.current.displacementScale = 0.06 * (1 - melt.current) + 0.02
    mat.current.opacity = Math.min(1, melt.current * 1.6)
    ref.current.position.y = 0.046 + (1 - melt.current) * 0.05
  })

  if (!m || !disp) return null
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
      <planeGeometry args={[1.8, 1.8, 192, 192]} />
      <meshPhysicalMaterial
        ref={mat}
        map={m.map}
        normalMap={m.normalMap}
        normalScale={new THREE.Vector2(1.2, 1.2)}
        roughnessMap={m.roughnessMap}
        roughness={1}
        displacementMap={disp}
        alphaTest={0.45}
        transparent
        clearcoat={0.3}
        clearcoatRoughness={0.35}
        sheen={0.3}
        sheenColor="#FFE7B0"
      />
    </mesh>
  )
}

/** Orégano salpicado por cima do queijo: centenas de flocos num único InstancedMesh */
function Oregano({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = 420
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const c = new THREE.Color()
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < count; i++) {
      const r = 0.82 * Math.sqrt(rand())
      const a = rand() * Math.PI * 2
      e.set(-Math.PI / 2 + (rand() - 0.5) * 0.4, 0, rand() * Math.PI * 2)
      q.setFromEuler(e)
      const s = 0.6 + rand() * 0.9
      m.compose(
        new THREE.Vector3(Math.cos(a) * r, 0.072 + rand() * 0.01, Math.sin(a) * r),
        q,
        new THREE.Vector3(s, s * (0.5 + rand()), s),
      )
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, c.set(rand() > 0.5 ? '#4A5626' : '#6B6430'))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} visible={visible} frustumCulled={false}>
      <planeGeometry args={[0.014, 0.01]} />
      <meshStandardMaterial roughness={0.85} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

function Steam({ visible }: { visible: boolean }) {
  const map = useMemo(() => steamTexture(), [])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const seeds = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x: Math.cos(i * 2.4) * 0.45, z: Math.sin(i * 2.4) * 0.45, o: i / 7 })), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    refs.current.forEach((s, i) => {
      if (!s) return
      const k = (t * 0.18 + seeds[i].o) % 1
      s.position.set(seeds[i].x + Math.sin(t + i) * 0.05, 0.15 + k * 1.1, seeds[i].z)
      s.scale.setScalar(0.35 + k * 0.6)
      ;(s.material as THREE.SpriteMaterial).opacity = (visible ? 1 : 0) * Math.sin(k * Math.PI) * 0.22
    })
  })

  return (
    <group>
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }}>
          <spriteMaterial map={map} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  )
}

function Rig({ finished }: { finished: boolean }) {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    // montando: quase de cima, para ver cada ingrediente cair. Pronta: 3/4, como na mesa
    if (!finished) {
      target.set(0, 4.2, 1.25)
      camera.position.x = damp(camera.position.x, target.x, 3, dt)
      camera.position.y = damp(camera.position.y, target.y, 3, dt)
      camera.position.z = damp(camera.position.z, target.z, 3, dt)
      camera.lookAt(0, 0, 0)
    }
  })

  useEffect(() => {
    if (finished) {
      // começa a transição para a visão de mesa a partir de onde a câmera está
      const start = camera.position.clone()
      const end = new THREE.Vector3(0, 2.3, 3.7)
      let raf = 0
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 1100)
        const e = 1 - (1 - k) ** 3
        camera.position.lerpVectors(start, end, e)
        camera.lookAt(0, 0, 0)
        if (k < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
    }
  }, [finished, camera])

  return null
}

function PizzaModel({ size, sauce, cheese, toppings, crust, finished }: PizzaSceneProps) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!group.current) return
    const s = damp(group.current.scale.x, SIZE_SCALE[size], 5, dt)
    group.current.scale.setScalar(s)
  })
  return (
    <group ref={group}>
      <Dough crust={crust} />
      <Sauce kind={sauce} />
      <Cheese kind={cheese} />
      <Oregano visible={cheese !== 'sem-queijo'} />
      <group position={[0, 0.062, 0]}>
        <Toppings3D toppings={toppings} still={false} />
      </group>
      <Steam visible={finished} />
    </group>
  )
}

/** Celular fraco: menos pixels e sem sombras dinâmicas */
function useQuality() {
  return useMemo(() => {
    const cores = navigator.hardwareConcurrency ?? 4
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const low = cores <= 4 || (mobile && cores <= 6)
    return { dpr: (low ? [1, 1.25] : [1, 1.75]) as [number, number], shadows: !low }
  }, [])
}

export default function PizzaScene(props: PizzaSceneProps) {
  const q = useQuality()
  return (
    <Canvas
      shadows={q.shadows}
      dpr={q.dpr}
      camera={{ position: [0, 4.2, 1.25], fov: 32, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 0.92
      }}
      aria-label="Pizza em 3D sendo montada"
      role="img"
    >
      <ambientLight intensity={0.2} />
      <hemisphereLight args={['#FFF1DA', '#4A2E1A', 0.45]} />
      <directionalLight
        position={[2.2, 4, 1.6]}
        intensity={2.4}
        color="#FFE9C7"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
      />
      {/* brilho alaranjado de forno a lenha vindo de trás */}
      <pointLight position={[-1.6, 0.8, -1.8]} intensity={3} color="#FF8A3D" distance={6} />

      {/* reflexos suaves sem baixar HDR externo */}
      <Environment resolution={64}>
        <Lightformer intensity={1.2} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#FFF3DD" />
        <Lightformer intensity={0.8} position={[4, 1, 2]} scale={[4, 2, 1]} color="#FFD9A8" />
      </Environment>

      <Board />
      <PizzaModel {...props} />
      <Rig finished={props.finished} />
      <ContactShadows position={[0, -0.08, 0]} opacity={0.55} scale={3.4} blur={2.4} far={1.2} />

      <OrbitControls
        enabled={props.finished}
        enablePan={false}
        enableZoom={props.finished}
        minDistance={2.8}
        maxDistance={5.5}
        minPolarAngle={0.25}
        maxPolarAngle={1.25}
        autoRotate={props.finished}
        autoRotateSpeed={0.9}
        enableDamping
      />
    </Canvas>
  )
}

