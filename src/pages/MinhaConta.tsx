import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useMyOrders } from '@/api/queries'
import { PageTransition } from '@/components/layout/Layout'
import { Button, ButtonLink } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '@/components/ui/misc'
import { useSession } from '@/features/auth/session'
import { usePageTitle } from '@/lib/usePageTitle'
import { formatDate, formatPrice } from '@/lib/utils'

export default function MinhaConta() {
  usePageTitle('Meus pedidos')
  const user = useSession((s) => s.user)!
  const signOut = useSession((s) => s.signOut)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const orders = useMyOrders()

  return (
    <PageTransition>
      <div className="container-page pt-10 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-display-lg">Olá, {user.name.split(' ')[0]}</h1>
            <p className="mt-2 text-tinta-soft">{user.email}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              signOut()
              qc.clear()
              navigate('/')
            }}
          >
            Sair da conta
          </Button>
        </div>

        <section className="mt-12" aria-labelledby="pedidos">
          <h2 id="pedidos" className="text-display-md">Seus pedidos</h2>
          <div className="mt-6">
            {orders.isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            )}
            {orders.isError && <ErrorState message={orders.error.message} onRetry={() => orders.refetch()} />}
            {orders.data?.length === 0 && (
              <EmptyState title="Nenhum pedido ainda" action={<ButtonLink to="/cardapio">Ver o cardápio</ButtonLink>}>
                Quando você pedir, acompanha por aqui do forno até a sua porta.
              </EmptyState>
            )}
            {orders.data && orders.data.length > 0 && (
              <ul className="space-y-3">
                {orders.data.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/pedido/${o.code.replace('#', '')}`}
                      className="grid gap-3 rounded-2xl border border-linha bg-white p-5 transition-colors hover:border-oregano-light sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-display text-xl">{o.code}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="mt-2 truncate text-[0.9375rem] text-tinta-soft">
                          {o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                        <p className="mt-1 text-sm text-oregano">
                          {formatDate(o.createdAt, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="font-display text-2xl">{formatPrice(o.totalCents)}</span>
                      <ChevronRight className="hidden h-5 w-5 text-oregano sm:block" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
