import { toast } from 'sonner'
import { useAdminOrders, useUpdateOrderStatus } from '@/api/queries'
import type { Order, OrderStatus } from '@/api/types'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/misc'
import { usePageTitle } from '@/lib/usePageTitle'
import { formatPrice, formatTime, ORDER_STATUS_LABEL, PAYMENT_LABEL } from '@/lib/utils'

/** Próximo passo de cada pedido na cozinha */
function nextStatus(o: Order): { status: OrderStatus; label: string } | null {
  switch (o.status) {
    case 'received':
      return { status: 'baking', label: 'Pôr no forno' }
    case 'baking':
      return o.fulfillment === 'delivery'
        ? { status: 'out_for_delivery', label: 'Saiu para entrega' }
        : { status: 'ready_for_pickup', label: 'Pronto no balcão' }
    case 'out_for_delivery':
    case 'ready_for_pickup':
      return { status: 'delivered', label: 'Entregue' }
    default:
      return null
  }
}

const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Novos', statuses: ['received'] },
  { title: 'No forno', statuses: ['baking'] },
  { title: 'Na rua ou no balcão', statuses: ['out_for_delivery', 'ready_for_pickup'] },
]

function Ticket({ order }: { order: Order }) {
  const update = useUpdateOrderStatus()
  const next = nextStatus(order)
  const move = (status: OrderStatus) =>
    update.mutate(
      { id: order.id, status },
      {
        onSuccess: (o) => toast.success(`${o.code}: ${ORDER_STATUS_LABEL[o.status].toLowerCase()}`),
        onError: (e) => toast.error(e.message),
      },
    )

  return (
    <li className="rounded-2xl border border-linha bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-lg">{order.code}</span>
        <span className="text-sm text-oregano">{formatTime(order.createdAt)}</span>
      </div>
      <p className="text-sm">
        {order.customerName}, {order.fulfillment === 'delivery' ? order.address?.district : 'retirada'}
      </p>
      <ul className="mt-3 space-y-1 text-[0.9375rem]">
        {order.items.map((i, idx) => (
          <li key={idx}>
            <span className="font-medium">{i.quantity}x</span> {i.name}
            {i.pizza && <span className="block text-xs text-oregano">{i.details[1]}</span>}
            {i.notes && <span className="block text-xs italic text-molho">“{i.notes}”</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-oregano">
        {formatPrice(order.totalCents)}, {PAYMENT_LABEL[order.payment].toLowerCase()}
        {order.changeForCents ? `, troco para ${formatPrice(order.changeForCents)}` : ''}
      </p>
      <div className="mt-3 flex gap-2">
        {next && (
          <Button size="sm" className="flex-1" loading={update.isPending} onClick={() => move(next.status)}>
            {next.label}
          </Button>
        )}
        {order.status === 'received' && (
          <Button size="sm" variant="danger" onClick={() => window.confirm(`Cancelar o pedido ${order.code}?`) && move('cancelled')}>
            Cancelar
          </Button>
        )}
      </div>
    </li>
  )
}

export default function AdminPedidos() {
  usePageTitle('Fila da cozinha')
  const orders = useAdminOrders('open')

  if (orders.isLoading) return <Skeleton className="h-96" />
  if (orders.isError) return <ErrorState message={orders.error.message} onRetry={() => orders.refetch()} />

  return (
    <div>
      <p className="text-tinta-soft">Fila da cozinha. Atualiza sozinha a cada 20 segundos.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = (orders.data ?? []).filter((o) => col.statuses.includes(o.status)).reverse()
          return (
            <section key={col.title} aria-labelledby={`col-${col.title}`} className="rounded-3xl bg-manteiga p-4">
              <h2 id={`col-${col.title}`} className="flex items-center justify-between font-sans text-base font-semibold">
                {col.title}
                <span className="rounded-full bg-white px-2.5 py-0.5 text-sm">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <p className="mt-4 text-sm text-oregano">Nada por aqui.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {list.map((o) => <Ticket key={o.id} order={o} />)}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
