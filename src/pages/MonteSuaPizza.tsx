import { useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { CrustType, PizzaSize } from '@/api/types'
import { PageTransition } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { QuantityStepper, Skeleton } from '@/components/ui/misc'
import { PizzaArt, ToppingIcon } from '@/features/builder/PizzaArt'
import { Pizza3D } from '@/features/builder/Pizza3D'
import { useCart } from '@/features/cart/cart'
import { useStoreStatus } from '@/features/store/useStoreStatus'
import { PricingError, priceItem } from '@/lib/pricing'
import { usePageTitle } from '@/lib/usePageTitle'
import { cn, formatPrice } from '@/lib/utils'

const SIZE_SCALE: Record<PizzaSize, number> = { broto: 0.78, media: 0.89, grande: 1 }

/** Os passos são uma sequência de verdade, por isso numerados */
function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="flex items-baseline gap-3">
        <span className="font-display text-2xl text-molho">{n}</span>
        <span className="font-display text-2xl">{title}</span>
      </legend>
      {hint && <p className="mt-1 text-[0.9375rem] text-oregano">{hint}</p>}
      <div className="mt-4">{children}</div>
    </fieldset>
  )
}

function Pick({
  selected,
  onSelect,
  title,
  hint,
  name,
}: {
  selected: boolean
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
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={selected} onChange={onSelect} />
      <span className="font-medium">{title}</span>
      {hint && <span className="text-sm text-oregano">{hint}</span>}
    </label>
  )
}

export default function MonteSuaPizza() {
  usePageTitle('Monte sua pizza')
  const { rules } = useStoreStatus()
  const add = useCart((s) => s.add)
  const openCart = useCart((s) => s.open)
  const stageRef = useRef<HTMLDivElement>(null)

  const [size, setSize] = useState<PizzaSize>('grande')
  const [sauce, setSauce] = useState('tomate')
  const [cheese, setCheese] = useState('mucarela')
  const [toppingIds, setToppingIds] = useState<string[]>([])
  const [crust, setCrust] = useState<CrustType>('tradicional')
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState(1)
  const [view3d, setView3d] = useState(false)

  const b = rules?.builder
  const toppings = useMemo(
    () => (b ? toppingIds.map((id) => b.toppings.find((t) => t.id === id)!).filter(Boolean) : []),
    [b, toppingIds],
  )

  const priced = useMemo(() => {
    if (!rules || !toppingIds.length) return null
    try {
      return priceItem(
        {
          productId: rules.builder.productId,
          quantity: 1,
          pizza: { size, crust, secondFlavorId: null, custom: { sauce, cheese, toppings: toppingIds } },
        },
        () => undefined,
        rules,
        false,
      )
    } catch (err) {
      if (err instanceof PricingError) return null
      throw err
    }
  }, [rules, size, crust, sauce, cheese, toppingIds])

  if (!rules || !b) {
    return (
      <div className="container-page grid gap-10 pt-12 lg:grid-cols-2">
        <Skeleton className="h-[480px]" />
        <Skeleton className="aspect-square" />
      </div>
    )
  }

  const full = toppingIds.length >= b.maxToppings
  const toggle = (id: string) => {
    setView3d(false)
    setToppingIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= b.maxToppings ? cur : [...cur, id]))
  }
  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setView3d(false)
    setter(v)
  }
  const base = b.basePrices[size]
  const total = (priced?.unitPriceCents ?? base) * qty

  const finish = () => {
    setView3d(true)
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const addToCart = () => {
    if (!priced) return
    add({
      productId: priced.productId,
      name: priced.name,
      details: priced.details,
      images: [],
      pizza: priced.pizza,
      notes: notes.trim(),
      unitPriceCents: priced.unitPriceCents,
    }, qty)
    toast.success('Sua pizza foi para a sacola', { action: { label: 'Ver sacola', onClick: openCart } })
    setToppingIds([])
    setNotes('')
    setQty(1)
    setView3d(false)
  }

  const art = <PizzaArt sauce={sauce} cheese={cheese} toppings={toppings} crust={crust} still={view3d} className="h-full w-full" />

  return (
    <PageTransition>
      <div className="container-page pt-10 sm:pt-14">
        <h1 className="text-display-lg">Monte sua pizza</h1>
        <p className="mt-3 max-w-prose text-lg text-tinta-soft">
          Escolha cada camada e veja a pizza ganhando forma. Quando terminar, ela sai do forno pra você ver de todos
          os lados.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          {/* palco da pizza: no celular fica em cima, no computador acompanha a rolagem */}
          <div className="lg:order-2">
            <div className="lg:sticky lg:top-28">
              <div
                ref={stageRef}
                className={cn(
                  'relative overflow-hidden rounded-[2rem] p-6 transition-colors duration-700 sm:p-10',
                  view3d ? 'bg-[radial-gradient(circle_at_50%_35%,#7A5230,#3E2716)]' : 'bg-manteiga',
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {view3d ? (
                    <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Pizza3D>{art}</Pizza3D>
                      <p className="mt-2 text-center text-sm text-white/80">Arraste para girar</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="flat"
                      className="mx-auto aspect-square w-full max-w-[460px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: SIZE_SCALE[size] }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >
                      {art}
                    </motion.div>
                  )}
                </AnimatePresence>
                {!view3d && toppingIds.length === 0 && (
                  <p className="absolute inset-x-0 bottom-5 text-center text-sm text-oregano">
                    Escolha os ingredientes e eles caem aqui
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <p className="text-sm text-oregano">{qty > 1 ? `${qty} pizzas` : 'Total da pizza'}</p>
                  <motion.p key={total} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl">
                    {formatPrice(total)}
                  </motion.p>
                </div>
                {view3d ? (
                  <>
                    <Button variant="secondary" onClick={() => setView3d(false)}>
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Voltar a editar
                    </Button>
                    <Button size="lg" onClick={addToCart}>
                      Adicionar à sacola
                    </Button>
                  </>
                ) : (
                  <Button size="lg" onClick={finish} disabled={!priced}>
                    {toppingIds.length ? 'Ver minha pizza pronta' : 'Escolha um ingrediente'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-7 lg:order-1">
            <Step n={1} title="Tamanho" hint="Já vem com massa, molho e queijo.">
              <div className="grid grid-cols-3 gap-2">
                {rules.sizes.map((s) => (
                  <Pick
                    key={s.id}
                    name="tamanho"
                    selected={size === s.id}
                    onSelect={() => edit(setSize)(s.id)}
                    title={s.name}
                    hint={`${s.slices} fatias, ${formatPrice(b.basePrices[s.id])}`}
                  />
                ))}
              </div>
            </Step>

            <Step n={2} title="Molho">
              <div className="grid grid-cols-2 gap-2">
                {b.sauces.map((o) => (
                  <Pick
                    key={o.id}
                    name="molho"
                    selected={sauce === o.id}
                    onSelect={() => edit(setSauce)(o.id)}
                    title={o.name}
                    hint={o.priceCents ? `+ ${formatPrice(o.priceCents)}` : 'Incluso'}
                  />
                ))}
              </div>
            </Step>

            <Step n={3} title="Queijo">
              <div className="grid grid-cols-3 gap-2">
                {b.cheeses.map((o) => (
                  <Pick
                    key={o.id}
                    name="queijo"
                    selected={cheese === o.id}
                    onSelect={() => edit(setCheese)(o.id)}
                    title={o.name}
                    hint={o.priceCents ? `+ ${formatPrice(o.priceCents)}` : 'Incluso'}
                  />
                ))}
              </div>
            </Step>

            <Step n={4} title="Ingredientes" hint={`Escolha até ${b.maxToppings}. ${toppingIds.length} de ${b.maxToppings} escolhidos.`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {b.toppings.map((t) => {
                  const on = toppingIds.includes(t.id)
                  const disabled = !on && full
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        'relative flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        on ? 'border-tinta bg-manteiga' : 'border-linha hover:border-oregano-light',
                      )}
                    >
                      <ToppingIcon kind={t.kind} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9375rem] font-medium leading-tight">{t.name}</span>
                        <span className="text-sm text-oregano">+ {formatPrice(t.priceCents)}</span>
                      </span>
                      <AnimatePresence>
                        {on && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="grid h-5 w-5 place-items-center rounded-full bg-tinta text-white"
                          >
                            <Check className="h-3 w-3" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  )
                })}
              </div>
            </Step>

            <Step n={5} title="Borda">
              <div className="grid grid-cols-3 gap-2">
                {rules.crusts.map((c) => (
                  <Pick
                    key={c.id}
                    name="borda"
                    selected={crust === c.id}
                    onSelect={() => edit(setCrust)(c.id)}
                    title={c.name}
                    hint={c.priceCents ? `+ ${formatPrice(c.priceCents)}` : 'Sem custo'}
                  />
                ))}
              </div>
            </Step>

            <Step n={6} title="Finalizar">
              <label htmlFor="obs-montada" className="text-sm font-medium">
                Alguma observação?
              </label>
              <Textarea
                id="obs-montada"
                value={notes}
                maxLength={140}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bem assada, cortar em 12…"
                className="mt-2 min-h-16"
              />
              <div className="mt-4">
                <QuantityStepper label="Quantidade" value={qty} onChange={setQty} />
              </div>
            </Step>
          </div>
        </div>
      </div>

      {/* no celular a pizza fica para trás quando a pessoa desce até os ingredientes: barra fixa com a prévia */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-papel/95 py-3 pl-4 pr-24 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <span className="block h-12 w-12 shrink-0">
            <PizzaArt still sauce={sauce} cheese={cheese} toppings={toppings} crust={crust} className="h-full w-full" />
          </span>
          <span className="mr-auto font-display text-xl">{formatPrice(total)}</span>
          <Button size="sm" onClick={view3d ? addToCart : finish} disabled={!priced}>
            {view3d ? 'Adicionar' : 'Ver pronta'}
          </Button>
        </div>
      </div>
    </PageTransition>
  )
}
