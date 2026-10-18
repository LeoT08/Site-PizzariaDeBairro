import { beforeEach, describe, expect, it } from 'vitest'
import { adminApi, authApi, catalogApi, ordersApi } from '@/api/endpoints'
import type { CreateOrderInput } from '@/api/types'
import { useSession } from '@/features/auth/session'
import { DEMO_ADMIN, DEMO_CUSTOMER } from '@/mocks/seed'

async function signInAs(creds: { email: string; password: string }) {
  const auth = await authApi.login(creds)
  useSession.getState().signIn(auth)
}

const order: CreateOrderInput = {
  items: [
    { productId: 'prd_calabresa', quantity: 1, pizza: { size: 'grande', crust: 'catupiry', secondFlavorId: 'prd_marguerita' }, notes: 'sem cebola' },
    { productId: 'prd_coca_2l', quantity: 1 },
  ],
  fulfillment: 'delivery',
  address: { street: 'Rua A', number: '10', district: 'Centro' },
  phone: '11999990000',
  payment: 'cash',
  changeForCents: 20000,
}

describe('API fictícia da pizzaria', () => {
  beforeEach(() => useSession.getState().signOut())

  it('serve as regras do cardápio e filtra por categoria', async () => {
    const rules = await catalogApi.rules()
    expect(rules.sizes.map((s) => s.id)).toEqual(['broto', 'media', 'grande'])
    const bebidas = await catalogApi.products({ category: 'bebidas' })
    expect(bebidas.every((p) => p.category === 'bebidas')).toBe(true)
  })

  it('orçamento calculado no servidor bate com o pedido criado', async () => {
    await signInAs(DEMO_CUSTOMER)
    const q = await ordersApi.quote({ items: order.items, fulfillment: 'delivery' })
    const created = await ordersApi.create(order)
    expect(created.totalCents).toBe(q.totalCents)
    expect(created.items[0].notes).toBe('sem cebola')
    expect(created.items[0].name).toContain('meio Calabresa, meio Marguerita')
    expect(created.status).toBe('received')
    const fetched = await ordersApi.get(created.code)
    expect(fetched.id).toBe(created.id)
  })

  it('exige endereço na entrega e troco maior que o total', async () => {
    await signInAs(DEMO_CUSTOMER)
    await expect(
      ordersApi.create({ ...order, address: { street: '', number: '', district: '' }, changeForCents: 100 }),
    ).rejects.toMatchObject({
      status: 422,
      fields: { 'address.street': expect.any(String), changeForCents: expect.any(String) },
    })
  })

  it('cliente não vê pedido de outra pessoa', async () => {
    await signInAs(DEMO_CUSTOMER)
    await expect(ordersApi.get('#207')).rejects.toMatchObject({ status: 404 })
  })

  it('admin move o pedido na fila e valida o tipo de entrega', async () => {
    await expect(adminApi.orders('open')).rejects.toMatchObject({ status: 401 })
    await signInAs(DEMO_CUSTOMER)
    await expect(adminApi.stats()).rejects.toMatchObject({ status: 403 })
    await signInAs(DEMO_ADMIN)
    const open = await adminApi.orders('open')
    const pickup = open.find((o) => o.fulfillment === 'pickup')!
    await expect(adminApi.updateOrderStatus(pickup.id, 'out_for_delivery')).rejects.toMatchObject({ status: 422 })
    const moved = await adminApi.updateOrderStatus(pickup.id, 'ready_for_pickup')
    expect(moved.statusHistory.at(-1)?.status).toBe('ready_for_pickup')
  })

  it('admin cria pizza com preços por tamanho', async () => {
    await signInAs(DEMO_ADMIN)
    const p = await adminApi.createProduct({
      slug: 'pizza-quatro-queijos', name: 'Quatro Queijos', category: 'pizzas', description: 'Muçarela, provolone, parmesão e catupiry.',
      image: '/images/pizza-mussarela.jpg', priceCents: 0, sizePrices: { broto: 4590, media: 6790, grande: 8590 },
      portion: null, tags: ['Vegetariana'], featured: false, available: true,
    })
    expect(p.priceCents).toBe(8590)
    const stats = await adminApi.stats()
    expect(stats.revenueLast7Days).toHaveLength(7)
  })
})
