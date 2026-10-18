import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useProducts } from '@/api/queries'
import type { CrustType, MenuRules, PizzaSize, Product } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { QuantityStepper } from '@/components/ui/misc'
import { useCart } from '@/features/cart/cart'
import { PricingError, priceItem } from '@/lib/pricing'
import { cn, formatPrice } from '@/lib/utils'
import { PizzaPreview } from './PizzaPreview'

function OptionCard({
  selected,
  disabled,
  onSelect,
  title,
  hint,
  name,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  hint?: string
  name: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col rounded-2xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-molho',
        selected ? 'border-tinta bg-manteiga' : 'border-linha hover:border-oregano-light',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={selected} disabled={disabled} onChange={onSelect} />
      <span className="font-medium">{title}</span>
      {hint && <span className="text-sm text-oregano">{hint}</span>}
    </label>
  )
}

export function PizzaBuilder({
  product,
  rules,
  promoToday,
  onDone,
}: {
  product: Product
  rules: MenuRules
  promoToday: boolean
  onDone: () => void
}) {
  const { data: pizzas = [] } = useProducts({ category: 'pizzas' })
  const add = useCart((s) => s.add)
  const [size, setSize] = useState<PizzaSize>('grande')
  const [half, setHalf] = useState(false)
  const [secondId, setSecondId] = useState<string | null>(null)
  const [crust, setCrust] = useState<CrustType>('tradicional')
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState(1)

  const others = pizzas.filter((p) => p.id !== product.id)
  const second = half ? (others.find((p) => p.id === secondId) ?? null) : null
  const config = { size, crust, secondFlavorId: second?.id ?? null }

  const priced = useMemo(() => {
    try {
      return priceItem(
        { productId: product.id, quantity: 1, pizza: config },
        (id) => [product, ...pizzas].find((p) => p.id === id),
        rules,
        promoToday,
      )
    } catch (err) {
      if (err instanceof PricingError) return null
      throw err
    }
    // config é derivado dos estados abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, pizzas, rules, promoToday, size, crust, second?.id])

  const needsSecond = half && !second
  const finalUnit = priced ? priced.unitPriceCents - priced.unitDiscountCents : 0

  const submit = () => {
    if (!priced || needsSecond) return
    add(
      {
        productId: product.id,
        name: priced.name,
        details: priced.details,
        images: second ? [product.image, second.image] : [product.image],
        pizza: priced.pizza,
        notes: notes.trim(),
        unitPriceCents: priced.unitPriceCents,
      },
      qty,
    )
    toast.success(`${priced.name} na sacola`, {
      action: { label: 'Ver sacola', onClick: () => useCart.getState().open() },
    })
    onDone()
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,240px)_1fr]">
      <div className="md:sticky md:top-0 md:self-start">
        <PizzaPreview
          first={product.image}
          second={second?.image}
          size={size}
          crust={crust}
          className="mx-auto w-full max-w-[240px]"
        />
        <p className="mt-3 text-center text-sm text-oregano">{product.description}</p>
      </div>

      <div className="space-y-7">
        <fieldset>
          <legend className="font-display text-xl">Tamanho</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {rules.sizes.map((s) => (
              <OptionCard
                key={s.id}
                name="tamanho"
                selected={size === s.id}
                onSelect={() => {
                  setSize(s.id)
                  if (s.id === 'broto') setHalf(false)
                }}
                title={s.name}
                hint={`${s.slices} fatias`}
              />
            ))}
          </div>
          {promoToday && size === rules.promo.size && (
            <p className="mt-2 text-sm font-medium text-manjericao">
              Promoção de hoje: qualquer grande por {formatPrice(rules.promo.priceCents)}.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-display text-xl">Sabor</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <OptionCard name="meio" selected={!half} onSelect={() => setHalf(false)} title={`Inteira de ${product.name}`} />
            <OptionCard
              name="meio"
              selected={half}
              disabled={size === 'broto'}
              onSelect={() => setHalf(true)}
              title="Meio a meio"
              hint={size === 'broto' ? 'Só na média ou grande' : 'Cobra o sabor mais caro'}
            />
          </div>
          {half && (
            <div className="mt-3">
              <p className="text-sm text-oregano">Escolha a outra metade:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {others.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSecondId(p.id)}
                    aria-pressed={secondId === p.id}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors',
                      secondId === p.id ? 'border-tinta bg-manteiga' : 'border-linha hover:border-oregano-light',
                    )}
                  >
                    <img src={p.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-display text-xl">Borda</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {rules.crusts.map((c) => (
              <OptionCard
                key={c.id}
                name="borda"
                selected={crust === c.id}
                onSelect={() => setCrust(c.id)}
                title={c.name}
                hint={c.priceCents ? `+ ${formatPrice(c.priceCents)}` : 'Sem custo'}
              />
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="obs" className="font-display text-xl">
            Alguma observação?
          </label>
          <Textarea
            id="obs"
            value={notes}
            maxLength={140}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sem cebola, bem assada, cortar em 12…"
            className="mt-3 min-h-16"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-linha pt-5">
          <QuantityStepper label="Quantidade" value={qty} onChange={setQty} />
          <Button size="lg" className="flex-1" onClick={submit} disabled={!priced || needsSecond}>
            {needsSecond ? 'Escolha a outra metade' : `Adicionar ${formatPrice(finalUnit * qty)}`}
          </Button>
          {priced && priced.unitDiscountCents > 0 && (
            <p className="w-full text-sm text-oregano">
              De <s>{formatPrice(priced.unitPriceCents * qty)}</s> por {formatPrice(finalUnit * qty)} com a promoção.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
