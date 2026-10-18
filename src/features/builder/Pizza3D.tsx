import { useRef, useState, type ReactNode } from 'react'
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion'

/**
 * A pizza pronta em perspectiva: inclinada na mesa, com espessura de massa,
 * sombra e vapor. Gira devagar sozinha e o cliente pode arrastar para girar.
 */
export function Pizza3D({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const spin = useMotionValue(0)
  const dragging = useRef<{ x: number; start: number } | null>(null)
  const [grabbing, setGrabbing] = useState(false)

  useAnimationFrame((_, delta) => {
    if (reduce || dragging.current) return
    spin.set(spin.get() + delta * 0.012)
  })

  const layers = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[460px] select-none touch-none"
      style={{ perspective: 1100 }}
      onPointerDown={(e) => {
        dragging.current = { x: e.clientX, start: spin.get() }
        setGrabbing(true)
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (dragging.current) spin.set(dragging.current.start + (e.clientX - dragging.current.x) * 0.6)
      }}
      onPointerUp={() => {
        dragging.current = null
        setGrabbing(false)
      }}
      role="img"
      aria-label="Sua pizza pronta, em 3D. Arraste para girar."
    >
      {/* sombra na mesa */}
      <motion.div
        className="absolute left-[8%] right-[8%] top-[58%] h-[30%] rounded-[50%] bg-tinta/30 blur-2xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      <motion.div
        className="absolute inset-[6%]"
        style={{ transformStyle: 'preserve-3d', cursor: grabbing ? 'grabbing' : 'grab' }}
        initial={{ rotateX: 0, y: 0, scale: 0.9 }}
        animate={{ rotateX: 58, y: -10, scale: 1 }}
        transition={{ type: 'spring', stiffness: 70, damping: 14 }}
      >
        <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', rotateZ: spin }}>
          {/* espessura da massa: discos empilhados */}
          {layers.map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                transform: `translateZ(${-i * 1.6}px)`,
                background: i === layers.length - 1 ? '#7A4519' : `hsl(31 ${55 - i}% ${52 - i * 1.8}%)`,
              }}
            />
          ))}
          <div className="absolute inset-0" style={{ transform: 'translateZ(1px)' }}>
            {children}
          </div>
        </motion.div>
      </motion.div>

      {/* vapor saindo da pizza quente */}
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.svg
            key={i}
            viewBox="0 0 20 80"
            className="pointer-events-none absolute w-6"
            style={{ left: `${38 + i * 11}%`, top: '14%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 0.55, 0], y: [20, -30] }}
            transition={{ duration: 3.2, repeat: Infinity, delay: 1 + i * 0.9, ease: 'easeOut' }}
            aria-hidden
          >
            <path d="M10 78 C2 62 18 52 10 38 C2 24 18 14 10 2" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          </motion.svg>
        ))}
    </div>
  )
}
