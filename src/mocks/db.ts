import type { Category, MenuRules, Order, Product } from '@/api/types'
import { seedCategories, seedOrders, seedProducts, seedRules, seedUsers, type UserRecord } from './seed'

// "Banco" da API fictícia: tabelas em memória, salvas no localStorage para sobreviver ao F5.
// Para zerar: localStorage.removeItem('pb:mockdb') ou resetDb().

const STORAGE_KEY = 'pb:mockdb'
const VERSION = 1

interface Tables {
  version: number
  users: UserRecord[]
  categories: Category[]
  products: Product[]
  rules: MenuRules
  orders: Order[]
  orderSeq: number
  /** Só no mock: pedidos que a "cozinha simulada" vai avançando sozinha */
  simulated: string[]
}

function fresh(): Tables {
  return {
    version: VERSION,
    users: structuredClone(seedUsers),
    categories: structuredClone(seedCategories),
    products: structuredClone(seedProducts),
    rules: structuredClone(seedRules),
    orders: seedOrders(),
    orderSeq: 300,
    simulated: [],
  }
}

function load(): Tables {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Tables
      if (parsed.version === VERSION) return parsed
    }
  } catch {
    // localStorage indisponível ou corrompido: começa do seed
  }
  return fresh()
}

export const db: Tables = load()

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // sem persistência; segue em memória
  }
}

export function resetDb() {
  Object.assign(db, fresh())
  persist()
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export const findProduct = (id: string) => db.products.find((p) => p.id === id)

// Cozinha simulada: para a demo, o pedido feito no site anda sozinho pelos status
// (recebido, forno, entrega). Na API real isso vem do painel da pizzaria.
const STEPS_MIN = { baking: 1, out: 4, done: 9 }

export function advanceSimulated(order: Order, now = Date.now()) {
  if (!db.simulated.includes(order.id)) return
  const elapsed = (now - new Date(order.createdAt).getTime()) / 60_000
  const push = (status: Order['status'], afterMin: number) => {
    if (order.statusHistory.some((h) => h.status === status)) return
    order.statusHistory.push({
      status,
      at: new Date(new Date(order.createdAt).getTime() + afterMin * 60_000).toISOString(),
    })
    order.status = status
  }
  if (elapsed >= STEPS_MIN.baking) push('baking', STEPS_MIN.baking)
  if (elapsed >= STEPS_MIN.out) push(order.fulfillment === 'delivery' ? 'out_for_delivery' : 'ready_for_pickup', STEPS_MIN.out)
  if (elapsed >= STEPS_MIN.done && order.fulfillment === 'delivery') push('delivered', STEPS_MIN.done)
  if (['delivered', 'ready_for_pickup', 'cancelled'].includes(order.status)) {
    db.simulated = db.simulated.filter((id) => id !== order.id)
  }
  persist()
}
