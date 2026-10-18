import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrderStatus, PaymentMethod } from '@/api/types'
import { STORE, WHATSAPP_NUMBER } from './constants'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatPrice = (cents: number) => brl.format(cents / 100)

export const formatDate = (
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' },
) => new Intl.DateTimeFormat('pt-BR', { timeZone: STORE.timeZone, ...opts }).format(new Date(iso))

export const formatTime = (iso: string) => formatDate(iso, { hour: '2-digit', minute: '2-digit' })

export const whatsappLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Pedido recebido',
  baking: 'No forno',
  out_for_delivery: 'Saiu para entrega',
  ready_for_pickup: 'Pronto para retirar',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix na entrega',
  card: 'Cartão na maquininha',
  cash: 'Dinheiro',
}

/** 11999990000 -> (11) 99999-0000 */
export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, '')
  if (d.length < 10) return digits
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
}
