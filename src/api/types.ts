// DTOs do contrato da API. A API real (back-end) deve devolver exatamente estes formatos.
// Documentação completa em docs/api.md e docs/openapi.yaml.

export type Role = 'customer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  phone?: string
  password: string
}

export type CategorySlug = 'pizzas' | 'salgados' | 'bebidas'

export interface Category {
  slug: CategorySlug
  name: string
  description: string
}

export type PizzaSize = 'broto' | 'media' | 'grande'
export type CrustType = 'tradicional' | 'catupiry' | 'cheddar'

export interface Product {
  id: string
  slug: string
  name: string
  category: CategorySlug
  description: string
  image: string
  /** Preço em centavos. Para pizzas, é o preço da grande. */
  priceCents: number
  /** Só pizzas: preço em centavos por tamanho */
  sizePrices: Record<PizzaSize, number> | null
  /** Ex.: "10 unidades", "2 litros" */
  portion: string | null
  tags: string[]
  featured: boolean
  available: boolean
}

export type ProductInput = Omit<Product, 'id'>

export interface ProductQuery {
  category?: CategorySlug
  q?: string
  featured?: boolean
}

/** Regras de montagem e preço da pizza, servidas pela API para o front não fixar valores. */
export type ToppingKind =
  | 'calabresa'
  | 'bacon'
  | 'frango'
  | 'presunto'
  | 'champignon'
  | 'cebola'
  | 'tomate'
  | 'azeitona'
  | 'milho'
  | 'pimentao'
  | 'palmito'
  | 'ovo'
  | 'catupiry'
  | 'manjericao'

export interface BuilderOption {
  id: string
  name: string
  priceCents: number
}

export interface Topping extends BuilderOption {
  /** Desenho usado na animação da montagem */
  kind: ToppingKind
}

/** Monte sua pizza: base por tamanho (massa, molho e queijo) mais ingredientes cobrados à parte */
export interface BuilderRules {
  productId: string
  basePrices: Record<PizzaSize, number>
  sauces: BuilderOption[]
  cheeses: BuilderOption[]
  toppings: Topping[]
  maxToppings: number
}

export interface MenuRules {
  sizes: { id: PizzaSize; name: string; slices: number; diameterCm: number }[]
  crusts: { id: CrustType; name: string; priceCents: number }[]
  /** Promoção: pizza grande de qualquer sabor por preço fixo nos dias indicados (0 = domingo) */
  promo: { weekdays: number[]; size: PizzaSize; priceCents: number; label: string }
  deliveryFeeCents: number
  freeDeliveryFromCents: number
  /** Tempo estimado em minutos [mín, máx] */
  deliveryEtaMin: [number, number]
  pickupEtaMin: [number, number]
  /** Horário de funcionamento, "HH:MM" no fuso de São Paulo */
  opensAt: string
  closesAt: string
  builder: BuilderRules
}

export interface CustomPizza {
  sauce: string
  cheese: string
  toppings: string[]
}

export interface PizzaConfig {
  size: PizzaSize
  /** Segundo sabor, para meio a meio */
  secondFlavorId: string | null
  crust: CrustType
  /** Só no Monte sua pizza (productId = rules.builder.productId) */
  custom?: CustomPizza
}

export interface CartItemInput {
  productId: string
  quantity: number
  pizza?: PizzaConfig
  notes?: string
}

export type FulfillmentType = 'delivery' | 'pickup'
export type PaymentMethod = 'pix' | 'card' | 'cash'

export type OrderStatus =
  | 'received'
  | 'baking'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  productId: string
  /** Nome montado no servidor: "Pizza grande meio Calabresa, meio Portuguesa" */
  name: string
  details: string[]
  pizza: PizzaConfig | null
  notes: string
  unitPriceCents: number
  quantity: number
}

export interface Address {
  street: string
  number: string
  district: string
  complement?: string
  reference?: string
}

export interface Order {
  id: string
  code: string
  userId: string
  customerName: string
  customerPhone: string
  items: OrderItem[]
  fulfillment: FulfillmentType
  address: Address | null
  payment: PaymentMethod
  /** Só para dinheiro: troco para quanto (centavos) */
  changeForCents: number | null
  subtotalCents: number
  discountCents: number
  deliveryFeeCents: number
  totalCents: number
  status: OrderStatus
  statusHistory: { status: OrderStatus; at: string }[]
  estimatedAt: string
  createdAt: string
}

export interface QuoteInput {
  items: CartItemInput[]
  fulfillment: FulfillmentType
}

export interface CreateOrderInput extends QuoteInput {
  address?: Address
  phone: string
  payment: PaymentMethod
  changeForCents?: number
}

export interface Quote {
  items: Pick<OrderItem, 'productId' | 'name' | 'details' | 'unitPriceCents' | 'quantity'>[]
  subtotalCents: number
  discountCents: number
  deliveryFeeCents: number
  totalCents: number
  promoApplied: boolean
}

export interface AdminStats {
  ordersToday: number
  revenueTodayCents: number
  openOrders: number
  revenueLast7Days: { date: string; totalCents: number }[]
  topFlavors: { productId: string; name: string; quantity: number }[]
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}
