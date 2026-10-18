import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useQuote, useRules } from '@/api/queries'
import { PizzaArt } from '@/features/builder/PizzaArt'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EmptyState, QuantityStepper } from '@/components/ui/misc'
import { MAX_QTY } from '@/lib/pricing'
import { formatPrice } from '@/lib/utils'
import { toCartItems, useCart, type CartLine } from './cart'

export function LineThumb({ images, pizza }: { images: string[]; pizza?: CartLine['pizza'] }) {
  const { data: rules } = useRules()
  if (pizza?.custom && rules) {
    const toppings = pizza.custom.toppings.map((id) => rules.builder.toppings.find((t) => t.id === id)!).filter(Boolean)
    return (
      <span className="block h-16 w-16 shrink-0">
        <PizzaArt still sauce={pizza.custom.sauce} cheese={pizza.custom.cheese} toppings={toppings} crust={pizza.crust} className="h-full w-full" />
      </span>
    )
  }
  if (images.length > 1) {
    return (
      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-full">
        <img src={images[0]} alt="" className="absolute inset-y-0 left-0 h-full w-1/2 object-cover object-left" />
        <img src={images[1]} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover object-right" />
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
      </span>
    )
  }
  return <img src={images[0]} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
}

function Line({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCart()
  return (
    <motion.li layout exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="flex gap-4 py-4">
      <LineThumb images={line.images} pizza={line.pizza} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug">{line.name}</p>
          <button
            type="button"
            onClick={() => remove(line.lineId)}
            className="rounded-full p-1.5 text-oregano hover:bg-molho-wash hover:text-molho"
            aria-label={`Remover ${line.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {line.details.length > 0 && <p className="text-sm text-oregano">{line.details.join('. ')}</p>}
        {line.notes && <p className="text-sm italic text-oregano">“{line.notes}”</p>}
        <div className="mt-1 flex items-center justify-between">
          <QuantityStepper
            size="sm"
            label={`Quantidade de ${line.name}`}
            value={line.quantity}
            min={0}
            max={MAX_QTY}
            onChange={(n) => setQuantity(line.lineId, n)}
          />
          <span>{formatPrice(line.unitPriceCents * line.quantity)}</span>
        </div>
      </div>
    </motion.li>
  )
}

export function CartSheet() {
  const { lines, isOpen, close } = useCart()
  const navigate = useNavigate()
  const quote = useQuote({ items: toCartItems(lines), fulfillment: 'pickup' }, isOpen)

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      title="Sua sacola"
      description={lines.length ? 'A taxa de entrega é calculada no próximo passo.' : undefined}
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            {quote.data && quote.data.discountCents > 0 && (
              <div className="flex justify-between text-sm text-manjericao">
                <span>Promoção do dia</span>
                <span>- {formatPrice(quote.data.discountCents)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-oregano">Subtotal</span>
              <span className="font-display text-2xl">
                {quote.data ? formatPrice(quote.data.subtotalCents - quote.data.discountCents) : '...'}
              </span>
            </div>
            {quote.error && <p className="text-sm text-molho">{quote.error.message}</p>}
            <Button
              size="lg"
              className="w-full"
              disabled={!!quote.error}
              onClick={() => {
                close()
                navigate('/finalizar')
              }}
            >
              Finalizar pedido
            </Button>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          title="Sacola vazia"
          action={
            <Link to="/cardapio" onClick={close} className="font-medium text-molho underline underline-offset-4">
              Ver o cardápio
            </Link>
          }
        >
          Escolha uma pizza, um salgado ou uma bebida e ele aparece aqui.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-linha">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <Line key={line.lineId} line={line} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Sheet>
  )
}
