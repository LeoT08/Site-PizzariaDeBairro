import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, catalogApi, ordersApi } from './endpoints'
import type { OrderStatus, ProductInput, ProductQuery, QuoteInput } from './types'

export const queryKeys = {
  rules: ['rules'] as const,
  categories: ['categories'] as const,
  products: (q: ProductQuery) => ['products', q] as const,
  product: (slug: string) => ['product', slug] as const,
  quote: (q: QuoteInput) => ['quote', q] as const,
  myOrders: ['orders', 'me'] as const,
  order: (code: string) => ['orders', code] as const,
  adminStats: ['admin', 'stats'] as const,
  adminProducts: ['admin', 'products'] as const,
  adminOrders: (status?: string) => ['admin', 'orders', status ?? 'all'] as const,
}

export const useRules = () =>
  useQuery({ queryKey: queryKeys.rules, queryFn: catalogApi.rules, staleTime: 5 * 60_000 })

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: catalogApi.categories, staleTime: Infinity })

export const useProducts = (q: ProductQuery = {}) =>
  useQuery({ queryKey: queryKeys.products(q), queryFn: () => catalogApi.products(q) })

export const useProduct = (slug: string) =>
  useQuery({ queryKey: queryKeys.product(slug), queryFn: () => catalogApi.product(slug) })

/** Orçamento calculado pela API: é o valor que vale na hora de pedir. */
export const useQuote = (input: QuoteInput, enabled = true) =>
  useQuery({
    queryKey: queryKeys.quote(input),
    queryFn: () => ordersApi.quote(input),
    enabled: enabled && input.items.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  })

export const useMyOrders = () =>
  useQuery({ queryKey: queryKeys.myOrders, queryFn: ordersApi.mine, refetchInterval: 20_000 })

/** Acompanhamento: atualiza sozinho enquanto o pedido está em andamento. */
export const useOrder = (code: string) =>
  useQuery({
    queryKey: queryKeys.order(code),
    queryFn: () => ordersApi.get(code),
    refetchInterval: (q) =>
      q.state.data && ['delivered', 'cancelled', 'ready_for_pickup'].includes(q.state.data.status) ? false : 15_000,
  })

export const useAdminStats = () =>
  useQuery({ queryKey: queryKeys.adminStats, queryFn: adminApi.stats })

export const useAdminProducts = () =>
  useQuery({ queryKey: queryKeys.adminProducts, queryFn: adminApi.products })

export const useAdminOrders = (status?: OrderStatus | 'open') =>
  useQuery({
    queryKey: queryKeys.adminOrders(status),
    queryFn: () => adminApi.orders(status),
    refetchInterval: 20_000,
  })

function useInvalidateCatalog() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['product'] })
    qc.invalidateQueries({ queryKey: queryKeys.adminProducts })
  }
}

export function useSaveProduct() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProductInput }) =>
      id ? adminApi.updateProduct(id, input) : adminApi.createProduct(input),
    onSuccess: invalidate,
  })
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog()
  return useMutation({ mutationFn: adminApi.deleteProduct, onSuccess: invalidate })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
