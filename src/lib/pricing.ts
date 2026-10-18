// Regras de preço da pizzaria. A API fictícia usa este arquivo como fonte de verdade, e a tela de
// montagem usa para mostrar o preço antes de pedir. A API real deve reproduzir estas regras (docs/api.md).
import type { CartItemInput, MenuRules, PizzaConfig, Product, Quote } from '@/api/types'

export const MAX_QTY = 20

/** Dia da semana (0 = domingo) e minutos desde 00:00 no fuso da loja */
export function storeClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function isOpen(rules: MenuRules, now: Date, timeZone: string) {
  const { minutes } = storeClock(now, timeZone)
  return minutes >= toMinutes(rules.opensAt) && minutes < toMinutes(rules.closesAt)
}

export function isPromoDay(rules: MenuRules, now: Date, timeZone: string) {
  return rules.promo.weekdays.includes(storeClock(now, timeZone).weekday)
}

export class PricingError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export interface PricedItem {
  productId: string
  name: string
  details: string[]
  pizza: PizzaConfig | null
  notes: string
  unitPriceCents: number
  /** Desconto por unidade (promoção) */
  unitDiscountCents: number
  quantity: number
}

export function priceItem(
  item: CartItemInput,
  findProduct: (id: string) => Product | undefined,
  rules: MenuRules,
  promoDay: boolean,
): PricedItem {
  const product = findProduct(item.productId)
  if (!product || !product.available) {
    throw new PricingError('PRODUCT_UNAVAILABLE', 'Um dos itens saiu do cardápio. Remova-o da sacola.')
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY) {
    throw new PricingError('INVALID_QUANTITY', `Quantidade inválida para ${product.name}.`)
  }
  const notes = item.notes?.trim().slice(0, 140) ?? ''

  if (product.category !== 'pizzas') {
    return {
      productId: product.id,
      name: product.name,
      details: product.portion ? [product.portion] : [],
      pizza: null,
      notes,
      unitPriceCents: product.priceCents,
      unitDiscountCents: 0,
      quantity: item.quantity,
    }
  }

  const cfg = item.pizza
  const size = rules.sizes.find((s) => s.id === cfg?.size)
  const crust = rules.crusts.find((c) => c.id === cfg?.crust)
  if (!cfg || !size || !crust || !product.sizePrices) {
    throw new PricingError('INVALID_PIZZA', `Escolha o tamanho e a borda da ${product.name}.`)
  }

  let second: Product | undefined
  if (cfg.secondFlavorId && cfg.secondFlavorId !== product.id) {
    second = findProduct(cfg.secondFlavorId)
    if (!second || !second.available || second.category !== 'pizzas' || !second.sizePrices) {
      throw new PricingError('INVALID_PIZZA', 'O segundo sabor escolhido não está disponível.')
    }
    if (size.id === 'broto') {
      throw new PricingError('INVALID_PIZZA', 'A pizza broto não pode ser meio a meio.')
    }
  }

  // Meio a meio cobra o sabor mais caro, como nas pizzarias de São Paulo
  const flavorPrice = Math.max(product.sizePrices[size.id], second?.sizePrices?.[size.id] ?? 0)
  const unitPriceCents = flavorPrice + crust.priceCents
  const promo = promoDay && size.id === rules.promo.size && flavorPrice > rules.promo.priceCents
  const unitDiscountCents = promo ? flavorPrice - rules.promo.priceCents : 0

  const name = second
    ? `Pizza ${size.name.toLowerCase()} meio ${product.name}, meio ${second.name}`
    : `Pizza ${size.name.toLowerCase()} de ${product.name}`
  const details = [
    `${size.slices} fatias, ${size.diameterCm} cm`,
    crust.id === 'tradicional' ? 'Borda tradicional' : `Borda recheada de ${crust.name.toLowerCase()}`,
  ]

  return {
    productId: product.id,
    name,
    details,
    pizza: { size: size.id, secondFlavorId: second?.id ?? null, crust: crust.id },
    notes,
    unitPriceCents,
    unitDiscountCents,
    quantity: item.quantity,
  }
}

export function quote(
  items: CartItemInput[],
  fulfillment: 'delivery' | 'pickup',
  findProduct: (id: string) => Product | undefined,
  rules: MenuRules,
  promoDay: boolean,
): Quote & { priced: PricedItem[] } {
  if (!items.length) throw new PricingError('EMPTY_ORDER', 'Adicione pelo menos um item.')
  const priced = items.map((i) => priceItem(i, findProduct, rules, promoDay))
  const subtotalCents = priced.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0)
  const discountCents = priced.reduce((s, i) => s + i.unitDiscountCents * i.quantity, 0)
  const afterDiscount = subtotalCents - discountCents
  const deliveryFeeCents =
    fulfillment === 'delivery' && afterDiscount < rules.freeDeliveryFromCents ? rules.deliveryFeeCents : 0
  return {
    priced,
    items: priced.map(({ productId, name, details, unitPriceCents, quantity }) => ({
      productId,
      name,
      details,
      unitPriceCents,
      quantity,
    })),
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    totalCents: afterDiscount + deliveryFeeCents,
    promoApplied: discountCents > 0,
  }
}
