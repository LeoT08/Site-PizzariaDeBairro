import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/api/types'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/misc'
import { useCart } from '@/features/cart/cart'
import { useStoreStatus } from '@/features/store/useStoreStatus'
import { formatPrice } from '@/lib/utils'
import { PizzaBuilder } from './PizzaBuilder'
import { useBuilder } from './builder'

export function BuilderSheet() {
  const { product, close } = useBuilder()
  const { rules, promoToday } = useStoreStatus()
  return (
    <Sheet
      side="center"
      open={product !== null}
      onOpenChange={(o) => !o && close()}
      title={product ? `Pizza de ${product.name}` : ''}
      description="Monte do seu jeito: tamanho, meio a meio e borda."
    >
      {product && rules && <PizzaBuilder product={product} rules={rules} promoToday={promoToday} onDone={close} />}
    </Sheet>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const openBuilder = useBuilder((s) => s.open)
  const isPizza = product.category === 'pizzas'

  const quickAdd = () => {
    add({
      productId: product.id,
      name: product.name,
      details: product.portion ? [product.portion] : [],
      images: [product.image],
      pizza: null,
      notes: '',
      unitPriceCents: product.priceCents,
    })
    toast.success(`${product.name} na sacola`, {
      action: { label: 'Ver sacola', onClick: () => useCart.getState().open() },
    })
  }

  return (
    <article className="group flex h-full flex-col">
      <button
        type="button"
        onClick={isPizza ? () => openBuilder(product) : quickAdd}
        className="block overflow-hidden rounded-3xl bg-manteiga text-left"
        aria-label={isPizza ? `Montar pizza de ${product.name}` : `Adicionar ${product.name} à sacola`}
      >
        <img
          src={product.image}
          alt=""
          loading="lazy"
          className={
            product.category === 'bebidas'
              ? 'aspect-[4/3] w-full bg-white object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]'
              : 'aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]'
          }
        />
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-xl leading-tight">{product.name}</h3>
        {product.tags.map((t) => (
          <span key={t} className="rounded-full bg-borda-wash px-2 py-0.5 text-xs font-medium text-[#7A5310]">
            {t}
          </span>
        ))}
      </div>
      <p className="mt-1 line-clamp-2 text-[0.9375rem] text-oregano">
        {isPizza ? product.description : [product.portion, product.description].filter(Boolean).join('. ')}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        {isPizza && product.sizePrices ? (
          <span>
            <span className="text-sm text-oregano">a partir de </span>
            <span className="font-medium">{formatPrice(product.sizePrices.broto)}</span>
          </span>
        ) : (
          <span className="font-medium">{formatPrice(product.priceCents)}</span>
        )}
        <button
          type="button"
          onClick={isPizza ? () => openBuilder(product) : quickAdd}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tinta/25 px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-molho hover:bg-molho hover:text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {isPizza ? 'Montar' : 'Adicionar'}
        </button>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] rounded-3xl" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-4 h-8 w-1/3" />
    </div>
  )
}
