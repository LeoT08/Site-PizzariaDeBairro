import { create } from 'zustand'
import type { Product } from '@/api/types'

/** Qual pizza está sendo montada agora (o montador é um só, aberto a partir de qualquer card) */
export const useBuilder = create<{ product: Product | null; open: (p: Product) => void; close: () => void }>()(
  (set) => ({
    product: null,
    open: (product) => set({ product }),
    close: () => set({ product: null }),
  }),
)
