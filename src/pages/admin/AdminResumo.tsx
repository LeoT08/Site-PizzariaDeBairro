import { useState } from 'react'
import { useAdminStats } from '@/api/queries'
import type { AdminStats } from '@/api/types'
import { ErrorState, Skeleton } from '@/components/ui/misc'
import { usePageTitle } from '@/lib/usePageTitle'
import { formatDate, formatPrice } from '@/lib/utils'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-linha bg-white p-5">
      <p className="text-sm text-oregano">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  )
}

/** Barras de uma série só: uma cor, sem legenda (o título nomeia), tooltip no hover e tabela para leitores de tela. */
function RevenueChart({ data }: { data: AdminStats['revenueLast7Days'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.totalCents))
  const H = 180

  return (
    <figure className="rounded-2xl border border-linha bg-white p-5">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-medium">Faturamento dos últimos 7 dias</span>
        <span className="text-sm text-oregano">sem cancelados</span>
      </figcaption>
      <div className="relative mt-6" style={{ height: H + 28 }} aria-hidden>
        <div className="absolute inset-x-0 border-t border-dashed border-linha" style={{ top: 0 }} />
        <span className="absolute -top-5 right-0 text-xs text-oregano">{formatPrice(max)}</span>
        <div className="absolute inset-x-0 border-t border-linha" style={{ top: H }} />
        <div className="absolute inset-x-0 top-0 grid grid-cols-7 gap-3" style={{ height: H }}>
          {data.map((d, i) => {
            const h = d.totalCents ? Math.max(4, (d.totalCents / max) * H) : 0
            return (
              <div
                key={d.date}
                className="relative flex h-full cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className="w-full max-w-10 rounded-t-[4px] transition-colors"
                  style={{ height: h, backgroundColor: hover === i ? '#1B3A2A' : '#C62A1F' }}
                />
                {hover === i && (
                  <div
                    className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-lg bg-tinta px-3 py-2 text-xs text-white"
                    style={{ bottom: h }}
                  >
                    <span className="block">{formatDate(d.date, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                    <span className="block font-semibold">{formatPrice(d.totalCents)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="absolute inset-x-0 grid grid-cols-7 gap-3 text-center text-xs text-oregano" style={{ top: H + 8 }}>
          {data.map((d) => (
            <span key={d.date}>{formatDate(d.date, { weekday: 'short' }).replace('.', '')}</span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Faturamento por dia</caption>
        <thead>
          <tr><th>Dia</th><th>Total</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}><td>{formatDate(d.date)}</td><td>{formatPrice(d.totalCents)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export default function AdminResumo() {
  usePageTitle('Painel')
  const { data, isLoading, isError, error, refetch } = useAdminStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}
        <Skeleton className="h-72 sm:col-span-3" />
      </div>
    )
  }
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pedidos hoje" value={String(data.ordersToday)} />
        <Stat label="Faturamento hoje" value={formatPrice(data.revenueTodayCents)} />
        <Stat label="Em andamento" value={String(data.openOrders)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RevenueChart data={data.revenueLast7Days} />
        <div className="rounded-2xl border border-linha bg-white p-5">
          <p className="font-medium">Sabores mais pedidos</p>
          <p className="text-sm text-oregano">Meio a meio conta meia pizza para cada sabor.</p>
          <ol className="mt-4 space-y-3">
            {data.topFlavors.map((p, i) => (
              <li key={p.productId} className="flex items-center gap-3 text-[0.9375rem]">
                <span className="w-5 text-oregano">{i + 1}</span>
                <span className="flex-1">{p.name}</span>
                <span className="text-tinta-soft">{String(p.quantity).replace('.', ',')} pizzas</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
