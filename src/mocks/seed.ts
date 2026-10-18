import type { Category, MenuRules, Order, Product, User } from '@/api/types'
import { quote } from '@/lib/pricing'

export interface UserRecord extends User {
  /** Só no mock. A API real guarda hash (bcrypt/argon2), nunca a senha. */
  password: string
}

export const DEMO_CUSTOMER = { email: 'cliente@pizzadobairro.dev', password: 'cliente123' }
export const DEMO_ADMIN = { email: 'admin@pizzadobairro.dev', password: 'admin123' }

export const seedRules: MenuRules = {
  sizes: [
    { id: 'broto', name: 'Broto', slices: 4, diameterCm: 25 },
    { id: 'media', name: 'Média', slices: 6, diameterCm: 30 },
    { id: 'grande', name: 'Grande', slices: 8, diameterCm: 35 },
  ],
  crusts: [
    { id: 'tradicional', name: 'Tradicional', priceCents: 0 },
    { id: 'catupiry', name: 'Catupiry', priceCents: 1200 },
    { id: 'cheddar', name: 'Cheddar', priceCents: 1200 },
  ],
  promo: {
    weekdays: [1, 2, 3, 4],
    size: 'grande',
    priceCents: 6999,
    label: 'De segunda a quinta, qualquer pizza grande por R$ 69,99',
  },
  deliveryFeeCents: 600,
  freeDeliveryFromCents: 10000,
  deliveryEtaMin: [40, 55],
  pickupEtaMin: [25, 30],
  opensAt: '18:00',
  closesAt: '23:30',
}

export const seedCategories: Category[] = [
  { slug: 'pizzas', name: 'Pizzas', description: 'Massa de longa fermentação, assada no forno a lenha.' },
  { slug: 'salgados', name: 'Salgados', description: 'Porções fritas na hora, para abrir o apetite.' },
  { slug: 'bebidas', name: 'Bebidas', description: 'Refrigerantes gelados para acompanhar.' },
]

export const seedUsers: UserRecord[] = [
  {
    id: 'usr_admin',
    name: 'Equipe Pizza do Bairro',
    email: DEMO_ADMIN.email,
    password: DEMO_ADMIN.password,
    phone: '11993304800',
    role: 'admin',
    createdAt: '2024-05-01T21:00:00.000Z',
  },
  {
    id: 'usr_demo',
    name: 'Cliente Demo',
    email: DEMO_CUSTOMER.email,
    password: DEMO_CUSTOMER.password,
    phone: '11999990000',
    role: 'customer',
    createdAt: '2025-02-10T22:30:00.000Z',
  },
]

const pizza = (
  id: string,
  name: string,
  description: string,
  image: string,
  [broto, media, grande]: [number, number, number],
  tags: string[] = [],
  featured = false,
): Product => ({
  id,
  slug: `pizza-${id.replace('prd_', '').replace(/_/g, '-')}`,
  name,
  category: 'pizzas',
  description,
  image,
  priceCents: grande,
  sizePrices: { broto, media, grande },
  portion: null,
  tags,
  featured,
  available: true,
})

const simple = (
  id: string,
  category: 'salgados' | 'bebidas',
  name: string,
  description: string,
  image: string,
  priceCents: number,
  portion: string,
  featured = false,
): Product => ({
  id,
  slug: id.replace('prd_', '').replace(/_/g, '-'),
  name,
  category,
  description,
  image,
  priceCents,
  sizePrices: null,
  portion,
  tags: [],
  featured,
  available: true,
})

export const seedProducts: Product[] = [
  pizza(
    'prd_calabresa',
    'Calabresa',
    'Calabresa fatiada, cebola em rodelas, azeitona preta e orégano sobre muçarela.',
    '/images/pizza-calabresa.jpg',
    [4290, 6290, 7990],
    ['Mais pedida'],
    true,
  ),
  pizza(
    'prd_mussarela',
    'Muçarela especial',
    'Muçarela gratinada, tomate, champignon e lascas de bacon.',
    '/images/pizza-mussarela.jpg',
    [4190, 6190, 7890],
    [],
    true,
  ),
  pizza(
    'prd_marguerita',
    'Marguerita',
    'Muçarela, rodelas de tomate, parmesão e manjericão fresco.',
    '/images/pizza-marguerita.jpg',
    [4490, 6690, 8490],
    ['Vegetariana'],
    true,
  ),
  pizza(
    'prd_frango_catupiry',
    'Frango com Catupiry',
    'Frango desfiado temperado, Catupiry original, milho e orégano.',
    '/images/pizza-frango-catupiry.jpg',
    [4690, 6890, 8690],
  ),
  pizza(
    'prd_portuguesa',
    'Portuguesa',
    'Presunto, ovo, cebola, ervilha, azeitona e muçarela.',
    '/images/pizza-portuguesa.jpg',
    [4790, 6990, 8990],
    [],
    true,
  ),
  pizza(
    'prd_palmito',
    'Palmito',
    'Palmito em rodelas, muçarela, tomate e azeitona.',
    '/images/pizza-palmito.jpg',
    [4790, 6990, 8990],
    ['Vegetariana'],
  ),
  simple('prd_coxinha', 'salgados', 'Coxinha de frango', 'Massa leve e frango cremoso, frita na hora.', '/images/coxinha.jpg', 2990, '10 unidades', true),
  simple('prd_bolinha_queijo', 'salgados', 'Bolinha de queijo', 'Muçarela derretida por dentro, casquinha crocante.', '/images/bolinha-de-queijo.jpg', 2790, '10 unidades'),
  simple('prd_mini_coxinhas', 'salgados', 'Mini coxinhas', 'Porção de coxinhas pequenas para dividir.', '/images/mini-coxinhas.jpg', 3290, '20 unidades'),
  simple('prd_enroladinho', 'salgados', 'Enroladinho de presunto e queijo', 'Massa folhada assada com presunto e muçarela.', '/images/enroladinho.jpg', 2690, '6 unidades'),
  simple('prd_risole', 'salgados', 'Risole de carne', 'Recheio de carne moída temperada.', '/images/risole-de-carne.jpg', 2990, '10 unidades'),
  simple('prd_mix_salgados', 'salgados', 'Mix de salgados', 'Coxinha, bolinha de queijo, risole e enroladinho.', '/images/mix-de-salgados.jpg', 4490, '25 unidades'),
  simple('prd_coca_2l', 'bebidas', 'Coca-Cola 2 L', 'Garrafa gelada.', '/images/coca-cola-2l.jpg', 1590, '2 litros', true),
  simple('prd_fanta_2l', 'bebidas', 'Fanta Laranja 2 L', 'Garrafa gelada.', '/images/fanta-laranja-2l.jpg', 1390, '2 litros'),
  simple('prd_soda_2l', 'bebidas', 'Soda Limonada 2 L', 'Garrafa gelada.', '/images/soda-2l.jpg', 1290, '2 litros'),
  simple('prd_latas', 'bebidas', 'Lata (sabor do dia)', 'Coca-Cola Zero, Sprite, Fanta ou Guaraná, conforme o estoque.', '/images/latas-variadas.jpg', 690, '350 ml'),
  simple('prd_coca_lata', 'bebidas', 'Coca-Cola lata', 'Lata gelada.', '/images/coca-cola-lata.jpg', 690, '350 ml'),
  simple('prd_guarana_lata', 'bebidas', 'Guaraná Antarctica lata', 'Lata gelada.', '/images/guarana-lata.jpg', 650, '350 ml'),
]

/** Alguns pedidos para o painel e a conta demo não começarem vazios. */
export function seedOrders(now = new Date()): Order[] {
  const find = (id: string) => seedProducts.find((p) => p.id === id)
  type Line = [string, number, { size: 'broto' | 'media' | 'grande'; half?: string; crust?: 'tradicional' | 'catupiry' | 'cheddar' }?]

  const make = (
    n: number,
    daysAgo: number,
    hour: number,
    lines: Line[],
    status: Order['status'],
    fulfillment: Order['fulfillment'] = 'delivery',
    userId = 'usr_demo',
    customerName = 'Cliente Demo',
  ): Order => {
    const created = new Date(now)
    if (daysAgo === 0) {
      // pedidos de hoje: poucos minutos atrás, para a fila da cozinha fazer sentido a qualquer hora
      created.setTime(now.getTime() - (10 - n) * 9 * 60_000)
    } else {
      created.setDate(created.getDate() - daysAgo)
      created.setHours(hour, 10 + n * 3, 0, 0)
    }
    const q = quote(
      lines.map(([productId, quantity, p]) => ({
        productId,
        quantity,
        pizza: p ? { size: p.size, secondFlavorId: p.half ?? null, crust: p.crust ?? 'tradicional' } : undefined,
      })),
      fulfillment,
      find,
      seedRules,
      false,
    )
    const eta = new Date(created.getTime() + 50 * 60_000)
    return {
      id: `ord_seed_${n}`,
      code: `#${String(200 + n)}`,
      userId,
      customerName,
      customerPhone: '11999990000',
      items: q.priced.map(({ unitDiscountCents: _d, ...i }) => i),
      fulfillment,
      address:
        fulfillment === 'delivery'
          ? { street: 'Rua das Flores', number: '45', district: 'Centro', reference: 'Portão verde' }
          : null,
      payment: n % 3 === 0 ? 'cash' : n % 2 === 0 ? 'card' : 'pix',
      changeForCents: n % 3 === 0 ? 10000 : null,
      subtotalCents: q.subtotalCents,
      discountCents: q.discountCents,
      deliveryFeeCents: q.deliveryFeeCents,
      totalCents: q.totalCents,
      status,
      statusHistory: [{ status: 'received', at: created.toISOString() }],
      estimatedAt: eta.toISOString(),
      createdAt: created.toISOString(),
    }
  }

  return [
    make(1, 6, 20, [['prd_calabresa', 1, { size: 'grande' }], ['prd_coca_2l', 1]], 'delivered'),
    make(2, 5, 19, [['prd_marguerita', 1, { size: 'grande', half: 'prd_portuguesa' }]], 'delivered', 'delivery', 'usr_x1', 'Ana Ribeiro'),
    make(3, 4, 21, [['prd_frango_catupiry', 2, { size: 'media', crust: 'catupiry' }], ['prd_coxinha', 1]], 'delivered', 'pickup', 'usr_x2', 'Paulo Mendes'),
    make(4, 3, 20, [['prd_mussarela', 1, { size: 'grande' }], ['prd_mix_salgados', 1], ['prd_guarana_lata', 2]], 'delivered', 'delivery', 'usr_x3', 'Juliana Prado'),
    make(5, 2, 22, [['prd_portuguesa', 1, { size: 'grande', half: 'prd_calabresa', crust: 'cheddar' }]], 'delivered', 'delivery', 'usr_x1', 'Ana Ribeiro'),
    make(6, 1, 20, [['prd_palmito', 1, { size: 'media' }], ['prd_fanta_2l', 1]], 'delivered'),
    make(7, 0, 19, [['prd_calabresa', 2, { size: 'grande' }], ['prd_coca_2l', 1]], 'out_for_delivery', 'delivery', 'usr_x4', 'Rafael Costa'),
    make(8, 0, 20, [['prd_marguerita', 1, { size: 'broto' }], ['prd_bolinha_queijo', 1]], 'baking', 'pickup', 'usr_x2', 'Paulo Mendes'),
    make(9, 0, 20, [['prd_mussarela', 1, { size: 'grande', half: 'prd_frango_catupiry' }]], 'received', 'delivery', 'usr_x5', 'Beatriz Lima'),
  ]
}
