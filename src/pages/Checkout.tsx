import { useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useCreateOrder, useQuote } from '@/api/queries'
import type { Order } from '@/api/types'
import { PageTransition } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorState, Skeleton } from '@/components/ui/misc'
import { useSession } from '@/features/auth/session'
import { toCartItems, useCart } from '@/features/cart/cart'
import { Comanda } from '@/features/orders/Comanda'
import { useStoreStatus } from '@/features/store/useStoreStatus'
import { STORE } from '@/lib/constants'
import { usePageTitle } from '@/lib/usePageTitle'
import { cn, formatPrice } from '@/lib/utils'

const schema = z
  .object({
    fulfillment: z.enum(['delivery', 'pickup']),
    phone: z.string().refine((v) => v.replace(/\D/g, '').length >= 10, 'Informe o telefone com DDD.'),
    address: z.object({
      street: z.string(),
      number: z.string(),
      district: z.string(),
      complement: z.string().optional(),
      reference: z.string().optional(),
    }),
    payment: z.enum(['pix', 'card', 'cash']),
    changeFor: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === 'delivery') {
      const req: [keyof typeof v.address, string][] = [
        ['street', 'Informe a rua.'],
        ['number', 'Informe o número.'],
        ['district', 'Informe o bairro.'],
      ]
      for (const [k, message] of req) {
        if (!v.address[k]?.trim()) ctx.addIssue({ code: 'custom', path: ['address', k], message })
      }
    }
    if (v.payment === 'cash' && v.changeFor && !/^\d+([.,]\d{1,2})?$/.test(v.changeFor)) {
      ctx.addIssue({ code: 'custom', path: ['changeFor'], message: 'Use só números, como 100 ou 150,00.' })
    }
  })

type FormValues = z.infer<typeof schema>

const toCents = (s?: string) => (s ? Math.round(Number(s.replace(',', '.')) * 100) : undefined)

function Choice({
  selected,
  title,
  text,
  input,
}: {
  selected: boolean
  title: string
  text: string
  input: React.ReactNode
}) {
  return (
    <label
      className={cn(
        'cursor-pointer rounded-2xl border p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-molho',
        selected ? 'border-tinta bg-manteiga' : 'border-linha hover:border-oregano-light',
      )}
    >
      {input}
      <span className="block font-medium">{title}</span>
      <span className="mt-1 block text-sm text-oregano">{text}</span>
    </label>
  )
}

export default function Checkout() {
  usePageTitle('Finalizar pedido')
  const user = useSession((s) => s.user)
  const { lines, clear } = useCart()
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const submitted = useRef(false)
  const { rules, open } = useStoreStatus()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fulfillment: 'delivery',
      phone: user?.phone ?? '',
      address: { street: '', number: '', district: '', complement: '', reference: '' },
      payment: 'pix',
      changeFor: '',
    },
  })
  const { register, handleSubmit, setError, formState: { errors } } = form
  const fulfillment = useWatch({ control: form.control, name: 'fulfillment' })
  const payment = useWatch({ control: form.control, name: 'payment' })

  const quote = useQuote({ items: toCartItems(lines), fulfillment }, Boolean(user))

  if (!user) return <Navigate to="/entrar?voltar=/finalizar" replace />
  // depois de enviar, a sacola é esvaziada: não redirecionar para o cardápio nesse momento
  if (lines.length === 0 && !submitted.current) return <Navigate to="/cardapio" replace />

  const onSubmit = handleSubmit(async (v) => {
    try {
      const order: Order = await createOrder.mutateAsync({
        items: toCartItems(lines),
        fulfillment: v.fulfillment,
        address: v.fulfillment === 'delivery' ? v.address : undefined,
        phone: v.phone,
        payment: v.payment,
        changeForCents: v.payment === 'cash' ? toCents(v.changeFor) : undefined,
      })
      submitted.current = true
      clear()
      navigate(`/pedido/${order.code.replace('#', '')}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [path, message] of Object.entries(err.fields)) {
          setError((path === 'changeForCents' ? 'changeFor' : path) as keyof FormValues, { message })
        }
      }
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.')
    }
  })

  return (
    <PageTransition>
      <div className="container-page pt-10 sm:pt-14">
        <h1 className="text-display-lg">Finalizar pedido</h1>
        {!open && rules && (
          <p className="mt-4 max-w-prose rounded-2xl bg-borda-wash px-4 py-3 text-[0.9375rem] text-[#7A5310]">
            A pizzaria está fechada agora. Seu pedido entra na fila e começa a ser preparado às {rules.opensAt}.
          </p>
        )}
        <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div className="space-y-10">
            <fieldset>
              <legend className="font-display text-2xl">Entrega ou retirada?</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Choice
                  selected={fulfillment === 'delivery'}
                  title="Entregar em casa"
                  text={
                    rules
                      ? `${rules.deliveryEtaMin[0]} a ${rules.deliveryEtaMin[1]} min. ${formatPrice(rules.deliveryFeeCents)}, grátis acima de ${formatPrice(rules.freeDeliveryFromCents)}.`
                      : ''
                  }
                  input={<input type="radio" value="delivery" className="sr-only" {...register('fulfillment')} />}
                />
                <Choice
                  selected={fulfillment === 'pickup'}
                  title="Retirar no balcão"
                  text={rules ? `${rules.pickupEtaMin[0]} a ${rules.pickupEtaMin[1]} min. ${STORE.address}.` : ''}
                  input={<input type="radio" value="pickup" className="sr-only" {...register('fulfillment')} />}
                />
              </div>
            </fieldset>

            {fulfillment === 'delivery' && (
              <fieldset className="grid gap-4 sm:grid-cols-6">
                <legend className="mb-4 font-display text-2xl">Endereço</legend>
                <Field label="Rua" error={errors.address?.street?.message} className="sm:col-span-4">
                  {(p) => <Input {...p} autoComplete="address-line1" {...register('address.street')} />}
                </Field>
                <Field label="Número" error={errors.address?.number?.message} className="sm:col-span-2">
                  {(p) => <Input {...p} {...register('address.number')} />}
                </Field>
                <Field label="Bairro" error={errors.address?.district?.message} className="sm:col-span-3">
                  {(p) => <Input {...p} {...register('address.district')} />}
                </Field>
                <Field label="Complemento" className="sm:col-span-3">
                  {(p) => <Input {...p} placeholder="Apto, bloco" {...register('address.complement')} />}
                </Field>
                <Field label="Ponto de referência" className="sm:col-span-6" hint="Ajuda o entregador a achar mais rápido.">
                  {(p) => <Input {...p} placeholder="Portão verde, ao lado da padaria" {...register('address.reference')} />}
                </Field>
              </fieldset>
            )}

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-4 font-display text-2xl">Contato</legend>
              <Field label="Telefone (WhatsApp)" error={errors.phone?.message} hint="Ligamos se o entregador não achar o endereço.">
                {(p) => <Input {...p} type="tel" autoComplete="tel" placeholder="(11) 90000-0000" {...register('phone')} />}
              </Field>
            </fieldset>

            <fieldset>
              <legend className="font-display text-2xl">Pagamento na {fulfillment === 'delivery' ? 'entrega' : 'retirada'}</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { v: 'pix', t: 'Pix', d: 'QR code na maquininha' },
                  { v: 'card', t: 'Cartão', d: 'Crédito ou débito' },
                  { v: 'cash', t: 'Dinheiro', d: 'Levamos o troco' },
                ].map((o) => (
                  <Choice
                    key={o.v}
                    selected={payment === o.v}
                    title={o.t}
                    text={o.d}
                    input={<input type="radio" value={o.v} className="sr-only" {...register('payment')} />}
                  />
                ))}
              </div>
              {payment === 'cash' && (
                <Field label="Troco para quanto?" error={errors.changeFor?.message} hint="Deixe vazio se não precisar de troco." className="mt-4 max-w-xs">
                  {(p) => <Input {...p} inputMode="decimal" placeholder="100,00" {...register('changeFor')} />}
                </Field>
              )}
            </fieldset>
          </div>

          <aside className="h-fit lg:sticky lg:top-28">
            {quote.isLoading && <Skeleton className="h-80" />}
            {quote.error && <ErrorState message={quote.error.message} />}
            {quote.data && (
              <Comanda
                title="Resumo do pedido"
                items={quote.data.items.map((i, idx) => ({ ...i, notes: lines[idx]?.notes }))}
                subtotalCents={quote.data.subtotalCents}
                discountCents={quote.data.discountCents}
                deliveryFeeCents={fulfillment === 'delivery' ? quote.data.deliveryFeeCents : null}
                totalCents={quote.data.totalCents}
              />
            )}
            <Button type="submit" size="lg" className="mt-6 w-full" loading={createOrder.isPending} disabled={!quote.data}>
              Enviar pedido
            </Button>
            <p className="mt-3 text-center text-sm text-oregano">
              <Link to="/cardapio" className="underline">Continuar escolhendo</Link>
            </p>
          </aside>
        </form>
      </div>
    </PageTransition>
  )
}
