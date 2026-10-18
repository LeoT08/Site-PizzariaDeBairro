import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const control =
  'w-full rounded-xl border border-linha bg-white px-4 py-3 text-[0.9375rem] text-tinta placeholder:text-oregano transition-colors hover:border-oregano-light focus:border-tinta focus:outline-none focus-visible:ring-0 aria-[invalid=true]:border-molho'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId()
  const descId = error || hint ? `${id}-desc` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': descId })}
      {(error || hint) && (
        <p id={descId} className={cn('text-sm', error ? 'text-molho' : 'text-oregano')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(control, className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(control, 'min-h-24 resize-y', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(control, 'appearance-none bg-[length:16px] pr-10', className)} {...props} />
  ),
)
Select.displayName = 'Select'
