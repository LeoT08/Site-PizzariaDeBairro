import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OrderStatus } from '@/api/types'
import { cn, ORDER_STATUS_LABEL } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-manteiga', className)} aria-hidden />
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  size = 'md',
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  label: string
  size?: 'sm' | 'md'
}) {
  const btn = cn(
    'grid place-items-center rounded-full text-tinta transition-colors hover:bg-manteiga disabled:opacity-40',
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
  )
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-linha bg-white p-0.5"
      role="group"
      aria-label={label}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuir">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-6 text-center font-medium" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

const statusTone: Record<OrderStatus, string> = {
  received: 'bg-borda-wash text-[#7A5310]',
  baking: 'bg-molho-wash text-molho-dark',
  out_for_delivery: 'bg-manjericao-wash text-manjericao',
  ready_for_pickup: 'bg-manjericao-wash text-manjericao',
  delivered: 'bg-manteiga text-tinta-soft',
  cancelled: 'bg-linha text-tinta-soft',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', statusTone[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-linha px-6 py-14 text-center">
      <h3 className="text-2xl">{title}</h3>
      {children && <p className="max-w-sm text-oregano">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-molho/30 bg-molho-wash px-5 py-4 text-molho-dark" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold underline underline-offset-4">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
