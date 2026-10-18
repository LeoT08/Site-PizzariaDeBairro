import type { ReactNode } from 'react'
import { formatPrice } from '@/lib/utils'

interface ComandaItem {
  name: string
  details: string[]
  notes?: string
  unitPriceCents: number
  quantity: number
}

/**
 * Resumo no formato da comanda impressa da pizzaria (papel térmico, fonte mono).
 * É o único lugar do site com fonte monoespaçada: ela imita o cupom de verdade.
 */
export function Comanda({
  title,
  items,
  subtotalCents,
  discountCents,
  deliveryFeeCents,
  totalCents,
  footer,
}: {
  title: string
  items: ComandaItem[]
  subtotalCents: number
  discountCents: number
  deliveryFeeCents: number | null
  totalCents: number
  footer?: ReactNode
}) {
  return (
    <div className="comanda px-5 pb-6 pt-5">
      <p className="text-center font-semibold">PIZZA DO BAIRRO</p>
      <p className="text-center text-xs text-oregano">{title}</p>
      <div className="my-3 border-t border-dashed border-tinta/30" />
      <ul className="space-y-3">
        {items.map((i, idx) => (
          <li key={idx}>
            <div className="flex justify-between gap-3">
              <span>
                {i.quantity}x {i.name}
              </span>
              <span className="shrink-0">{formatPrice(i.unitPriceCents * i.quantity)}</span>
            </div>
            {i.details.map((d) => (
              <p key={d} className="pl-4 text-xs text-oregano">
                {d}
              </p>
            ))}
            {i.notes && <p className="pl-4 text-xs text-oregano">Obs: {i.notes}</p>}
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-tinta/30" />
      <dl className="space-y-1">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(subtotalCents)}</dd>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-manjericao">
            <dt>Promoção</dt>
            <dd>- {formatPrice(discountCents)}</dd>
          </div>
        )}
        {deliveryFeeCents !== null && (
          <div className="flex justify-between">
            <dt>Entrega</dt>
            <dd>{deliveryFeeCents ? formatPrice(deliveryFeeCents) : 'Grátis'}</dd>
          </div>
        )}
        <div className="flex justify-between pt-1 text-base font-semibold">
          <dt>TOTAL</dt>
          <dd>{formatPrice(totalCents)}</dd>
        </div>
      </dl>
      {footer && (
        <>
          <div className="my-3 border-t border-dashed border-tinta/30" />
          {footer}
        </>
      )}
    </div>
  )
}
