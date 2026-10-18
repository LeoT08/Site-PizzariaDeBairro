import { useId, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CrustType, Topping } from '@/api/types'
import { scatter, TOPPING_COUNT, TOPPING_SHAPE } from './toppingArt'

const SAUCE_COLOR: Record<string, { base: string; spot: string }> = {
  tomate: { base: '#C33A22', spot: '#A92C17' },
  branco: { base: '#F1E6CF', spot: '#E4D4B2' },
}

const CRUST_STROKE: Record<CrustType, { color: string; width: number }> = {
  tradicional: { color: '#D99A47', width: 0 },
  catupiry: { color: '#F6EBCF', width: 10 },
  cheddar: { color: '#F0A23A', width: 10 },
}

/**
 * Pizza vista de cima, desenhada em camadas: massa, molho, queijo e ingredientes.
 * Cada escolha anima a sua camada: o molho espalha, o queijo derrete por cima
 * e cada ingrediente cai peça por peça. Com `still`, desenha tudo pronto (prévia 3D e miniaturas).
 */
export function PizzaArt({
  sauce,
  cheese,
  toppings,
  crust,
  still = false,
  className,
}: {
  sauce: string
  cheese: string
  toppings: Topping[]
  crust: CrustType
  still?: boolean
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const s = SAUCE_COLOR[sauce] ?? SAUCE_COLOR.tomate
  const c = CRUST_STROKE[crust]
  const cheeseBlobs = useMemo(() => scatter('queijo', 26, 128), [])
  const sauceSpots = useMemo(() => scatter('molho', 14, 130), [])
  const initial = still ? false : undefined

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Sua pizza sendo montada">
      <defs>
        <radialGradient id={`massa-${id}`} cx="50%" cy="45%" r="55%">
          <stop offset="78%" stopColor="#F3D29A" />
          <stop offset="92%" stopColor="#E0A55A" />
          <stop offset="100%" stopColor="#B9742F" />
        </radialGradient>
        <filter id={`derretido-${id}`}>
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* massa */}
      <circle cx="200" cy="200" r="188" fill={`url(#massa-${id})`} />
      {/* pontinhos de forno a lenha na borda */}
      {scatter('forno', 16, 184)
        .filter((p) => Math.hypot(p.x - 200, p.y - 200) > 168)
        .map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3 + (i % 3)} fill="#8A4B1F" opacity="0.35" />
        ))}
      {/* borda recheada */}
      <motion.circle
        cx="200"
        cy="200"
        r="176"
        fill="none"
        initial={initial}
        animate={{ stroke: c.color, strokeWidth: c.width, opacity: c.width ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* molho: espalha do centro para fora quando muda */}
      <AnimatePresence initial={false}>
        <motion.g
          key={sauce}
          initial={still ? false : { scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          style={{ originX: '200px', originY: '200px' }}
        >
          <circle cx="200" cy="200" r="160" fill={s.base} />
          {sauceSpots.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={10 + (i % 4) * 3} ry={7 + (i % 3) * 3} fill={s.spot} opacity="0.55" />
          ))}
        </motion.g>
      </AnimatePresence>

      {/* queijo derretendo */}
      <AnimatePresence initial={false}>
        {cheese !== 'sem-queijo' && (
          <motion.g key={cheese} filter={`url(#derretido-${id})`} exit={{ opacity: 0 }}>
            {cheeseBlobs.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                fill={cheese === 'bufala' ? '#FFFDF4' : i % 3 ? '#FBE6A2' : '#F5D372'}
                initial={still ? false : { r: 0, opacity: 0 }}
                animate={{ r: cheese === 'bufala' ? 15 + (i % 3) * 3 : 22 + (i % 4) * 4, opacity: 0.92 }}
                transition={{ delay: i * 0.012, type: 'spring', stiffness: 160, damping: 18 }}
              />
            ))}
          </motion.g>
        )}
      </AnimatePresence>

      {/* ingredientes: cada peça cai na pizza */}
      <AnimatePresence>
        {toppings.map((t) => (
          <motion.g key={t.id} exit={{ opacity: 0, y: -24, transition: { duration: 0.25 } }}>
            {scatter(t.id, TOPPING_COUNT[t.kind]).map((p, i) => (
              <motion.g
                key={i}
                initial={still ? false : { y: -230, opacity: 0, scale: 1.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: i * 0.04 }}
              >
                <g transform={`translate(${p.x} ${p.y}) rotate(${p.rotate})`}>{TOPPING_SHAPE[t.kind]}</g>
              </motion.g>
            ))}
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  )
}

/** Ícone pequeno do ingrediente para os botões de escolha */
export function ToppingIcon({ kind }: { kind: Topping['kind'] }) {
  return (
    <svg viewBox="-16 -16 32 32" className="h-7 w-7 shrink-0" aria-hidden>
      {TOPPING_SHAPE[kind]}
    </svg>
  )
}
