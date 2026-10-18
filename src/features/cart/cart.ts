import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItemInput, PizzaConfig } from '@/api/types'
import { MAX_QTY } from '@/lib/pricing'

export interface CartLine {
  /** Mesmo produto com montagem diferente vira outra linha */
  lineId: string
  productId: string
  name: string
  details: string[]
  images: string[]
  pizza: PizzaConfig | null
  notes: string
  /** Estimativa local; o valor final vem de POST /orders/quote */
  unitPriceCents: number
  quantity: number
}

export type NewCartLine = Omit<CartLine, 'lineId' | 'quantity'>

const lineKey = (l: Pick<CartLine, 'productId' | 'pizza' | 'notes'>) =>
  [l.productId, l.pizza?.size, l.pizza?.secondFlavorId, l.pizza?.crust, l.notes.trim().toLowerCase()].join('|')

interface CartState {
  lines: CartLine[]
  isOpen: boolean
  add: (line: NewCartLine, quantity?: number) => void
  setQuantity: (lineId: string, quantity: number) => void
  remove: (lineId: string) => void
  clear: () => void
  open: () => void
  close: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line, quantity = 1) =>
        set((s) => {
          const lineId = lineKey(line)
          const existing = s.lines.find((l) => l.lineId === lineId)
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.lineId === lineId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
              ),
            }
          }
          return { lines: [...s.lines, { ...line, lineId, quantity: Math.min(MAX_QTY, quantity) }] }
        }),
      setQuantity: (lineId, quantity) =>
        set((s) => ({
          lines:
            quantity < 1
              ? s.lines.filter((l) => l.lineId !== lineId)
              : s.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
        })),
      remove: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.lineId !== lineId) })),
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    { name: 'pb:cart', partialize: (s) => ({ lines: s.lines }) },
  ),
)

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0)
export const cartEstimate = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)
export const toCartItems = (lines: CartLine[]): CartItemInput[] =>
  lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    pizza: l.pizza ?? undefined,
    notes: l.notes || undefined,
  }))
