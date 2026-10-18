import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useOrder } from '@/api/queries'
import type { Order, OrderStatus } from '@/api/types'
import { PageTransition } from '@/components/layout/Layout'
import { ButtonLink, buttonClass } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/misc'
import { Comanda } from '@/features/orders/Comanda'
import { usePageTitle } from '@/lib/usePageTitle'
import { cn, formatDate, formatPhone, formatPrice, formatTime, ORDER_STATUS_LABEL, PAYMENT_LABEL, whatsappLink } from '@/lib/utils'

const STEP_TEXT: Record<OrderStatus, string> = {
  received: 'A pizzaria recebeu e já vai começar.',
  baking: 'Massa aberta, recheio montado, no forno a lenha.',
  out_for_delivery: 'O motoboy está a caminho.',
  ready_for_pickup: 'Está te esperando no balcão.',
  delivered: 'Bom apetite!',
  cancelled: 'Este pedido foi cancelado. Fale com a gente pelo WhatsApp.',
}

function steps(order: Order): OrderStatus[] {
  return order.fulfillment === 'delivery'
    ? ['received', 'baking', 'out_for_delivery', 'delivered']
    : ['received', 'baking', 'ready_for_pickup']
}

/** Linha do tempo do pedido: é uma sequência real, por isso os marcadores em ordem. */
function Timeline({ order }: { order: Order }) {
  const list = steps(order)
  const current = list.indexOf(order.status)
  const at = (s: OrderStatus) => order.statusHistory.find((h) => h.status === s)?.at

  return (
    <ol className="relative space-y-6">
      {list.map((s, i) => {
        const done = i < current || (i === current && ['delivered', 'ready_for_pickup'].includes(s))
        const active = i === current && !done
        const time = at(s)
        return (
          <li key={s} className="relative flex gap-4">
            {i < list.length - 1 && (
              <span
                className={cn('absolute left-[15px] top-8 h-[calc(100%-0.5rem)] w-0.5', i < current ? 'bg-manjericao' : 'bg-linha')}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold',
                done && 'border-manjericao bg-manjericao text-white',
                active && 'border-molho bg-white text-molho',
                !done && !active && 'border-linha bg-white text-oregano-light',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
              {active && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-molho"
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  aria-hidden
                />
              )}
            </span>
            <div className="pt-0.5">
              <p className={cn('font-medium', !done && !active && 'text-oregano')}>
                {ORDER_STATUS_LABEL[s]}
                {time && <span className="ml-2 text-sm font-normal text-oregano">{formatTime(time)}</span>}
              </p>
              {(active || (done && i === current)) && <p className="text-[0.9375rem] text-tinta-soft">{STEP_TEXT[s]}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function Pedido() {
  const { code = '' } = useParams()
  usePageTitle(`Pedido #${code}`)
  const { data: order, isLoading, error, refetch } = useOrder(code)

  if (isLoading) {
    return (
      <div className="container-page grid gap-10 pt-12 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (error || !order) {
    return (
      <div className="container-page pt-16">
        {error instanceof ApiError && error.status === 404 ? (
          <EmptyState title="Pedido não encontrado" action={<ButtonLink to="/minha-conta">Ver meus pedidos</ButtonLink>} />
        ) : (
          <ErrorState message={error?.message ?? 'Erro ao carregar o pedido.'} onRetry={() => refetch()} />
        )}
      </div>
    )
  }

  const finished = ['delivered', 'cancelled', 'ready_for_pickup'].includes(order.status)

  return (
    <PageTransition>
      <div className="container-page pt-10 sm:pt-14">
        <p className="text-oregano">Pedido {order.code}, feito às {formatTime(order.createdAt)}</p>
        <h1 className="mt-2 text-display-lg">
          {order.status === 'cancelled'
            ? 'Pedido cancelado'
            : finished
              ? ORDER_STATUS_LABEL[order.status]
              : `Chega até ${formatTime(order.estimatedAt)}`}
        </h1>
        {!finished && <p className="mt-2 text-tinta-soft">Esta página atualiza sozinha.</p>}

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div className="space-y-10">
            {order.status !== 'cancelled' && <Timeline order={order} />}
            <dl className="grid gap-6 border-t border-linha pt-8 text-[0.9375rem] sm:grid-cols-2">
              <div>
                <dt className="text-oregano">{order.fulfillment === 'delivery' ? 'Entregar em' : 'Retirada'}</dt>
                <dd className="mt-1">
                  {order.address
                    ? `${order.address.street}, ${order.address.number}${order.address.complement ? `, ${order.address.complement}` : ''}, ${order.address.district}`
                    : 'No balcão da pizzaria'}
                  {order.address?.reference && <span className="block text-oregano">{order.address.reference}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-oregano">Pagamento</dt>
                <dd className="mt-1">
                  {PAYMENT_LABEL[order.payment]}
                  {order.changeForCents && <span className="block text-oregano">Troco para {formatPrice(order.changeForCents)}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-oregano">Telefone</dt>
                <dd className="mt-1">{formatPhone(order.customerPhone)}</dd>
              </div>
              <div>
                <dt className="text-oregano">Data</dt>
                <dd className="mt-1">{formatDate(order.createdAt, { weekday: 'long', day: '2-digit', month: 'long' })}</dd>
              </div>
            </dl>
            <a
              href={whatsappLink(`Olá! Sobre o meu pedido ${order.code}:`)}
              target="_blank"
              rel="noreferrer"
              className={buttonClass('secondary', 'md')}
            >
              Falar com a pizzaria
            </a>
          </div>
          <aside>
            <Comanda
              title={`Pedido ${order.code}`}
              items={order.items}
              subtotalCents={order.subtotalCents}
              discountCents={order.discountCents}
              deliveryFeeCents={order.fulfillment === 'delivery' ? order.deliveryFeeCents : null}
              totalCents={order.totalCents}
              footer={<p className="text-center text-xs">Obrigado pela preferência!</p>}
            />
          </aside>
        </div>
      </div>
    </PageTransition>
  )
}
