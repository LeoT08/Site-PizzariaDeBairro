import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CrustType, PizzaSize } from '@/api/types'

const SCALE: Record<PizzaSize, number> = { broto: 0.74, media: 0.87, grande: 1 }
const CRUST: Record<CrustType, { color: string; width: number }> = {
  tradicional: { color: '#D9963A', width: 7 },
  catupiry: { color: '#F2E6C9', width: 12 },
  cheddar: { color: '#F0A23A', width: 12 },
}

/**
 * Prévia da pizza montada: o tamanho muda o diâmetro, meio a meio divide a foto ao meio
 * e a borda recheada engrossa e muda de cor. É a resposta visual a cada escolha do cliente.
 */
export function PizzaPreview({
  first,
  second,
  size,
  crust,
  className,
}: {
  first: string
  second?: string | null
  size: PizzaSize
  crust: CrustType
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const r = 84
  const c = CRUST[crust]

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Prévia da pizza montada"
      animate={{ scale: SCALE[size] }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
    >
      <defs>
        <clipPath id={`full-${id}`}>
          <circle cx="100" cy="100" r={r} />
        </clipPath>
        <clipPath id={`left-${id}`}>
          <path d={`M100 ${100 - r} A${r} ${r} 0 0 0 100 ${100 + r} Z`} />
        </clipPath>
        <clipPath id={`right-${id}`}>
          <path d={`M100 ${100 - r} A${r} ${r} 0 0 1 100 ${100 + r} Z`} />
        </clipPath>
      </defs>

      {/* tábua de madeira */}
      <circle cx="100" cy="100" r="99" fill="#E9D3AE" />
      <circle cx="100" cy="100" r="99" fill="none" stroke="#C99E62" strokeWidth="2" />

      <AnimatePresence initial={false}>
        {second ? (
          <motion.g key={`half-${first}-${second}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <image href={first} x="16" y="16" width="168" height="168" preserveAspectRatio="xMidYMid slice" clipPath={`url(#left-${id})`} />
            <image href={second} x="16" y="16" width="168" height="168" preserveAspectRatio="xMidYMid slice" clipPath={`url(#right-${id})`} />
            <line x1="100" y1={100 - r} x2="100" y2={100 + r} stroke="#FFF" strokeWidth="2.5" />
          </motion.g>
        ) : (
          <motion.image
            key={`full-${first}`}
            href={first}
            x="16"
            y="16"
            width="168"
            height="168"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#full-${id})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <motion.circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        animate={{ stroke: c.color, strokeWidth: c.width }}
        transition={{ duration: 0.3 }}
      />
    </motion.svg>
  )
}
