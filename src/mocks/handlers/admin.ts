import { http, HttpResponse } from 'msw'
import type { AdminStats, OrderStatus, ProductInput } from '@/api/types'
import { advanceSimulated, db, newId, persist } from '../db'
import { apiError, authenticate, latency, route } from './utils'

const STATUSES: OrderStatus[] = ['received', 'baking', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'cancelled']
const OPEN: OrderStatus[] = ['received', 'baking', 'out_for_delivery', 'ready_for_pickup']

function validateProduct(body: ProductInput, ignoreId?: string) {
  const fields: Record<string, string> = {}
  if (!body.name?.trim()) fields.name = 'Informe o nome.'
  if (!body.slug?.trim() || !/^[a-z0-9-]+$/.test(body.slug)) {
    fields.slug = 'Use só letras minúsculas, números e hífens.'
  } else if (db.products.some((p) => p.slug === body.slug && p.id !== ignoreId)) {
    fields.slug = 'Já existe um item com este endereço.'
  }
  if (!['pizzas', 'salgados', 'bebidas'].includes(body.category)) fields.category = 'Escolha uma categoria.'
  if (body.category === 'pizzas') {
    const s = body.sizePrices
    if (!s || ![s.broto, s.media, s.grande].every((v) => Number.isInteger(v) && v > 0)) {
      fields.sizePrices = 'Informe o preço dos três tamanhos.'
    }
  } else if (!Number.isInteger(body.priceCents) || body.priceCents <= 0) {
    fields.priceCents = 'Informe um preço válido.'
  }
  return fields
}

const normalizeProduct = (body: ProductInput): ProductInput =>
  body.category === 'pizzas'
    ? { ...body, priceCents: body.sizePrices!.grande, portion: null }
    : { ...body, sizePrices: null }

export const adminHandlers = [
  http.get(route('/admin/stats'), async ({ request }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response

    const today = new Date().toDateString()
    const valid = db.orders.filter((o) => o.status !== 'cancelled')
    const todays = valid.filter((o) => new Date(o.createdAt).toDateString() === today)

    const revenueLast7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toDateString()
      return {
        date: d.toISOString(),
        totalCents: valid
          .filter((o) => new Date(o.createdAt).toDateString() === key)
          .reduce((s, o) => s + o.totalCents, 0),
      }
    })

    // Sabores: meio a meio conta meia pizza para cada sabor
    const counts = new Map<string, { productId: string; name: string; quantity: number }>()
    const bump = (id: string, qty: number) => {
      const p = db.products.find((x) => x.id === id)
      if (!p) return
      const cur = counts.get(id) ?? { productId: id, name: p.name, quantity: 0 }
      cur.quantity += qty
      counts.set(id, cur)
    }
    for (const o of valid) {
      for (const i of o.items) {
        if (!i.pizza) continue
        if (i.pizza.secondFlavorId) {
          bump(i.productId, i.quantity / 2)
          bump(i.pizza.secondFlavorId, i.quantity / 2)
        } else bump(i.productId, i.quantity)
      }
    }

    const stats: AdminStats = {
      ordersToday: todays.length,
      revenueTodayCents: todays.reduce((s, o) => s + o.totalCents, 0),
      openOrders: db.orders.filter((o) => OPEN.includes(o.status)).length,
      revenueLast7Days,
      topFlavors: [...counts.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    }
    return HttpResponse.json(stats)
  }),

  http.get(route('/admin/products'), async ({ request }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response
    return HttpResponse.json(db.products)
  }),

  http.post(route('/admin/products'), async ({ request }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response
    const body = (await request.json()) as ProductInput
    const fields = validateProduct(body)
    if (Object.keys(fields).length) return apiError(422, 'VALIDATION_ERROR', 'Confira os campos destacados.', fields)
    const product = { ...normalizeProduct(body), id: newId('prd') }
    db.products.push(product)
    persist()
    return HttpResponse.json(product, { status: 201 })
  }),

  http.put(route('/admin/products/:id'), async ({ request, params }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response
    const idx = db.products.findIndex((p) => p.id === params.id)
    if (idx === -1) return apiError(404, 'NOT_FOUND', 'Item não encontrado.')
    const body = (await request.json()) as ProductInput
    const fields = validateProduct(body, String(params.id))
    if (Object.keys(fields).length) return apiError(422, 'VALIDATION_ERROR', 'Confira os campos destacados.', fields)
    db.products[idx] = { ...normalizeProduct(body), id: db.products[idx].id }
    persist()
    return HttpResponse.json(db.products[idx])
  }),

  http.delete(route('/admin/products/:id'), async ({ request, params }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response
    const idx = db.products.findIndex((p) => p.id === params.id)
    if (idx === -1) return apiError(404, 'NOT_FOUND', 'Item não encontrado.')
    db.products.splice(idx, 1)
    persist()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(route('/admin/orders'), async ({ request }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response
    db.orders.forEach((o) => advanceSimulated(o))
    const status = new URL(request.url).searchParams.get('status')
    const list = db.orders
      .filter((o) => (status === 'open' ? OPEN.includes(o.status) : !status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(list)
  }),

  http.patch(route('/admin/orders/:id/status'), async ({ request, params }) => {
    await latency()
    const auth = authenticate(request, 'admin')
    if ('response' in auth) return auth.response
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    const { status } = (await request.json()) as { status: OrderStatus }
    if (!STATUSES.includes(status)) return apiError(422, 'INVALID_STATUS', 'Status inválido.')
    if (status === 'out_for_delivery' && order.fulfillment === 'pickup') {
      return apiError(422, 'INVALID_STATUS', 'Pedido de retirada não sai para entrega.')
    }
    if (status === 'ready_for_pickup' && order.fulfillment === 'delivery') {
      return apiError(422, 'INVALID_STATUS', 'Pedido de entrega não fica para retirada.')
    }
    // a partir daqui quem manda é a pizzaria, não a simulação
    db.simulated = db.simulated.filter((id) => id !== order.id)
    order.status = status
    order.statusHistory.push({ status, at: new Date().toISOString() })
    persist()
    return HttpResponse.json(order)
  }),
]
