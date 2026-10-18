import { beforeEach, describe, expect, it } from 'vitest'
import { authApi, ordersApi } from '@/api/endpoints'
import { useSession } from '@/features/auth/session'
import { PricingError, priceItem } from '@/lib/pricing'
import { DEMO_CUSTOMER, seedRules } from '@/mocks/seed'

const b = seedRules.builder
const custom = (toppings: string[], extra: Partial<{ sauce: string; cheese: string }> = {}) => ({
  productId: b.productId,
  quantity: 1,
  pizza: {
    size: 'media' as const,
    crust: 'cheddar' as const,
    secondFlavorId: null,
    custom: { sauce: 'branco', cheese: 'bufala', toppings, ...extra },
  },
})

describe('monte sua pizza', () => {
  beforeEach(() => useSession.getState().signOut())

  it('soma base do tamanho, molho, queijo, ingredientes e borda', () => {
    const r = priceItem(custom(['calabresa', 'cebola']), () => undefined, seedRules, true)
    const price = (id: string, list: { id: string; priceCents: number }[]) => list.find((x) => x.id === id)!.priceCents
    expect(r.unitPriceCents).toBe(
      b.basePrices.media + price('branco', b.sauces) + price('bufala', b.cheeses) + 1200 +
        price('calabresa', b.toppings) + price('cebola', b.toppings),
    )
    // a promoção do dia não vale para a pizza montada
    expect(r.unitDiscountCents).toBe(0)
    expect(r.details[2]).toBe('Calabresa, Cebola')
  })

  it('exige ao menos um ingrediente e respeita o máximo', () => {
    expect(() => priceItem(custom([]), () => undefined, seedRules, false)).toThrow(PricingError)
    const many = b.toppings.slice(0, b.maxToppings + 1).map((t) => t.id)
    expect(() => priceItem(custom(many), () => undefined, seedRules, false)).toThrow(PricingError)
  })

  it('recusa ingrediente ou molho inexistente', () => {
    expect(() => priceItem(custom(['abacaxi']), () => undefined, seedRules, false)).toThrow(PricingError)
    expect(() => priceItem(custom(['milho'], { sauce: 'pesto' }), () => undefined, seedRules, false)).toThrow(PricingError)
  })

  it('pedido com pizza montada passa pela API', async () => {
    useSession.getState().signIn(await authApi.login(DEMO_CUSTOMER))
    const order = await ordersApi.create({
      items: [custom(['frango', 'catupiry', 'milho'])],
      fulfillment: 'pickup',
      phone: '11999990000',
      payment: 'pix',
    })
    expect(order.items[0].name).toBe('Pizza média montada por você')
    expect(order.items[0].pizza?.custom?.toppings).toEqual(['frango', 'catupiry', 'milho'])
  })
})
