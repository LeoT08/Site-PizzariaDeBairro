import { useDeferredValue } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCategories, useProducts } from '@/api/queries'
import type { CategorySlug } from '@/api/types'
import { PageTransition } from '@/components/layout/Layout'
import { Input } from '@/components/ui/field'
import { EmptyState, ErrorState } from '@/components/ui/misc'
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/ProductCard'
import { useStoreStatus } from '@/features/store/useStoreStatus'
import { usePageTitle } from '@/lib/usePageTitle'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { PizzaArt } from '@/features/builder/PizzaArt'

export default function Cardapio() {
  usePageTitle('Cardápio')
  const [params, setParams] = useSearchParams()
  const category = (params.get('categoria') as CategorySlug | null) ?? 'pizzas'
  const q = params.get('busca') ?? ''
  const deferredQ = useDeferredValue(q)
  const { rules, promoToday } = useStoreStatus()

  const categories = useCategories()
  const products = useProducts({ category, q: deferredQ.trim() || undefined })
  const active = categories.data?.find((c) => c.slug === category)

  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <PageTransition>
      <section className="container-page pb-6 pt-10 sm:pt-14">
        <h1 className="text-display-lg">Cardápio</h1>
        <p className="mt-3 max-w-prose text-lg text-tinta-soft">
          {active?.description ?? 'Pizzas, salgados e bebidas.'}
        </p>
        {category === 'pizzas' && rules && (
          <p
            className={cn(
              'mt-5 inline-flex rounded-full px-4 py-2 text-[0.9375rem] font-medium',
              promoToday ? 'bg-manjericao-wash text-manjericao' : 'bg-manteiga text-tinta-soft',
            )}
          >
            {promoToday ? 'Hoje tem promoção: ' : 'Promoção: '}
            {rules.promo.label.toLowerCase()}.
          </p>
        )}
      </section>

      <div className="sticky top-16 z-30 border-y border-linha bg-papel/90 backdrop-blur-md sm:top-20">
        <div className="container-page flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Categorias">
            {(categories.data ?? []).map((c) => (
              <button
                key={c.slug}
                role="tab"
                aria-selected={c.slug === category}
                onClick={() => update('categoria', c.slug === 'pizzas' ? undefined : c.slug)}
                className={cn(
                  'shrink-0 rounded-full px-5 py-2 text-[0.9375rem] font-medium transition-colors',
                  c.slug === category ? 'bg-tinta text-white' : 'text-tinta-soft hover:bg-manteiga',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="relative md:w-72">
            <span className="sr-only">Buscar no cardápio</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-oregano" />
            <Input
              type="search"
              value={q}
              onChange={(e) => update('busca', e.target.value)}
              placeholder="Buscar sabor ou ingrediente"
              className="py-2.5 pl-10"
            />
          </label>
        </div>
      </div>

      <section className="container-page pt-12" aria-live="polite" aria-busy={products.isFetching}>
        {products.isError ? (
          <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
        ) : products.data?.length === 0 ? (
          <EmptyState
            title="Nada com esse nome"
            action={
              <button type="button" onClick={() => update('busca')} className="font-medium text-molho underline underline-offset-4">
                Limpar a busca
              </button>
            }
          >
            Tente outro ingrediente, como calabresa, frango ou palmito.
          </EmptyState>
        ) : (
          <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {category === 'pizzas' && !q && rules && (
              <Link
                to="/monte-sua-pizza"
                className="group flex flex-col rounded-3xl border-2 border-dashed border-molho/40 p-5 transition-colors hover:border-molho hover:bg-molho-wash"
              >
                <span className="mx-auto block w-3/5 transition-transform duration-700 group-hover:rotate-12">
                  <PizzaArt still sauce="tomate" cheese="mucarela" crust="tradicional" toppings={rules.builder.toppings.filter((t) => ['calabresa', 'cebola', 'azeitona', 'manjericao'].includes(t.id))} className="w-full" />
                </span>
                <span className="mt-4 font-display text-xl">Monte sua pizza</span>
                <span className="mt-1 text-[0.9375rem] text-oregano">Escolha molho, queijo e até {rules.builder.maxToppings} ingredientes e veja a pizza ficando pronta.</span>
              </Link>
            )}
            {products.isLoading
              ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)
              : products.data?.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </PageTransition>
  )
}
