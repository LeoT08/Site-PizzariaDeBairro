import { http, HttpResponse } from 'msw'
import type { CreateOrderInput, Order, QuoteInput } from '@/api/types'
import { isPromoDay, PricingError, quote } from '@/lib/pricing'
import { STORE } from '@/lib/constants'
import { advanceSimulated, db, findProduct, newId, persist } from '../db'
import { apiError, authenticate, latency, route } from './utils'

/** Calcula o orçamento no "servidor": o preço que vale é sempre este, nunca o do front. */
function serverQuote(body: QuoteInput) {
  try {
    const promoDay = isPromoDay(db.rules, new Date(), STORE.timeZone)
    return { ok: quote(body.items ?? [], body.fulfillment, findProduct, db.rules, promoDay) }
  } catch (err) {
    if (err instanceof PricingError) return { error: apiError(422, err.code, err.message) }
    throw err
  }
}

export const ordersHandlers = [
  http.post(route('/orders/quote'), async ({ request }) => {
    await latency()
    const result = serverQuote((await request.json()) as QuoteInput)
    if (result.error) return result.error
    const { priced: _priced, ...q } = result.ok
    return HttpResponse.json(q)
  }),

  http.post(route('/orders'), async ({ request }) => {
    await latency()
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const body = (await request.json()) as CreateOrderInput


    const fields: Record<string, string> = {}
    const phone = body.phone?.replace(/\D/g, '') ?? ''
    if (phone.length < 10) fields.phone = 'Informe o telefone com DDD.'
    if (body.fulfillment === 'delivery') {
      if (!body.address?.street?.trim()) fields['address.street'] = 'Informe a rua.'
      if (!body.address?.number?.trim()) fields['address.number'] = 'Informe o número.'
      if (!body.address?.district?.trim()) fields['address.district'] = 'Informe o bairro.'
    }
    if (!['pix', 'card', 'cash'].includes(body.payment)) fields.payment = 'Escolha a forma de pagamento.'

    const result = serverQuote(body)
    if (result.error) return result.error
    const q = result.ok

    if (body.payment === 'cash' && body.changeForCents != null && body.changeForCents < q.totalCents) {
      fields.changeForCents = 'O troco precisa ser para um valor maior que o total.'
    }
    if (Object.keys(fields).length) {
      return apiError(422, 'VALIDATION_ERROR', 'Confira os dados do pedido.', fields)
    }

    const now = new Date()
    const [, maxEta] = body.fulfillment === 'delivery' ? db.rules.deliveryEtaMin : db.rules.pickupEtaMin
    db.orderSeq += 1
    const order: Order = {
      id: newId('ord'),
      code: `#${db.orderSeq}`,
      userId: auth.user.id,
      customerName: auth.user.name,
      customerPhone: phone,
      items: q.priced.map(({ unitDiscountCents: _d, ...i }) => i),
      fulfillment: body.fulfillment,
      address: body.fulfillment === 'delivery' ? body.address! : null,
      payment: body.payment,
      changeForCents: body.payment === 'cash' ? (body.changeForCents ?? null) : null,
      subtotalCents: q.subtotalCents,
      discountCents: q.discountCents,
      deliveryFeeCents: q.deliveryFeeCents,
      totalCents: q.totalCents,
      status: 'received',
      statusHistory: [{ status: 'received', at: now.toISOString() }],
      estimatedAt: new Date(now.getTime() + maxEta * 60_000).toISOString(),
      createdAt: now.toISOString(),
    }
    db.orders.unshift(order)
    db.simulated.push(order.id)
    persist()
    return HttpResponse.json(order, { status: 201 })
  }),

  http.get(route('/orders/me'), async ({ request }) => {
    await latency()
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const mine = db.orders.filter((o) => o.userId === auth.user.id)
    mine.forEach((o) => advanceSimulated(o))
    return HttpResponse.json([...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }),

  http.get(route('/orders/:code'), async ({ request, params }) => {
    await latency()
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const code = decodeURIComponent(String(params.code))
    const order = db.orders.find((o) => o.code === code || o.code === `#${code}`)
    if (!order || (order.userId !== auth.user.id && auth.user.role !== 'admin')) {
      return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    }
    advanceSimulated(order)
    return HttpResponse.json(order)
  }),
]
