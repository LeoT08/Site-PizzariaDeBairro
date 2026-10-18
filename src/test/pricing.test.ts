import { describe, expect, it } from 'vitest'
import { isOpen, isPromoDay, priceItem, PricingError, quote } from '@/lib/pricing'
import { seedProducts, seedRules } from '@/mocks/seed'

const find = (id: string) => seedProducts.find((p) => p.id === id)
const TZ = 'America/Sao_Paulo'

describe('preço da pizza', () => {
  it('soma a borda recheada ao preço do tamanho', () => {
    const r = priceItem({ productId: 'prd_calabresa', quantity: 1, pizza: { size: 'media', crust: 'catupiry', secondFlavorId: null } }, find, seedRules, false)
    expect(r.unitPriceCents).toBe(find('prd_calabresa')!.sizePrices!.media + 1200)
    expect(r.name).toBe('Pizza média de Calabresa')
  })

  it('meio a meio cobra o sabor mais caro', () => {
    const r = priceItem({ productId: 'prd_calabresa', quantity: 1, pizza: { size: 'grande', crust: 'tradicional', secondFlavorId: 'prd_portuguesa' } }, find, seedRules, false)
    expect(r.unitPriceCents).toBe(find('prd_portuguesa')!.sizePrices!.grande)
    expect(r.name).toContain('meio Calabresa, meio Portuguesa')
  })

  it('broto não pode ser meio a meio', () => {
    expect(() =>
      priceItem({ productId: 'prd_calabresa', quantity: 1, pizza: { size: 'broto', crust: 'tradicional', secondFlavorId: 'prd_palmito' } }, find, seedRules, false),
    ).toThrow(PricingError)
  })

  it('promoção vale só na grande, só no dia, e não cobre a borda', () => {
    const grande = priceItem({ productId: 'prd_portuguesa', quantity: 1, pizza: { size: 'grande', crust: 'cheddar', secondFlavorId: null } }, find, seedRules, true)
    expect(grande.unitPriceCents - grande.unitDiscountCents).toBe(6999 + 1200)
    const media = priceItem({ productId: 'prd_portuguesa', quantity: 1, pizza: { size: 'media', crust: 'tradicional', secondFlavorId: null } }, find, seedRules, true)
    expect(media.unitDiscountCents).toBe(0)
  })

  it('entrega grátis a partir do valor mínimo', () => {
    const pequeno = quote([{ productId: 'prd_coca_lata', quantity: 1 }], 'delivery', find, seedRules, false)
    expect(pequeno.deliveryFeeCents).toBe(seedRules.deliveryFeeCents)
    const grande = quote([{ productId: 'prd_mix_salgados', quantity: 3 }], 'delivery', find, seedRules, false)
    expect(grande.deliveryFeeCents).toBe(0)
    const retirada = quote([{ productId: 'prd_coca_lata', quantity: 1 }], 'pickup', find, seedRules, false)
    expect(retirada.deliveryFeeCents).toBe(0)
  })
})

describe('horário e promoção no fuso da loja', () => {
  it('segunda às 20h em São Paulo: aberto e com promoção', () => {
    const d = new Date('2026-10-19T23:00:00Z') // 20h de segunda em SP
    expect(isOpen(seedRules, d, TZ)).toBe(true)
    expect(isPromoDay(seedRules, d, TZ)).toBe(true)
  })
  it('sábado às 15h: fechado e sem promoção', () => {
    const d = new Date('2026-10-17T18:00:00Z')
    expect(isOpen(seedRules, d, TZ)).toBe(false)
    expect(isPromoDay(seedRules, d, TZ)).toBe(false)
  })
})
