import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  side?: 'right' | 'center'
  children: ReactNode
  footer?: ReactNode
}

/** Painel lateral (sacola, menu) ou modal centralizado, com foco preso e Esc para fechar. */
export function Sheet({ open, onOpenChange, title, description, side = 'right', children, footer }: SheetProps) {
  const isRight = side === 'right'
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-tinta/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed z-50 flex flex-col bg-papel shadow-[0_20px_60px_-20px_rgba(38,48,42,0.35)] focus:outline-none',
                  isRight
                    ? 'inset-y-0 right-0 w-full max-w-md'
                    : 'left-1/2 top-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl rounded-3xl',
                )}
                initial={isRight ? { x: '100%' } : { opacity: 0, scale: 0.97, x: '-50%', y: '-50%' }}
                animate={isRight ? { x: 0 } : { opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={isRight ? { x: '100%' } : { opacity: 0, scale: 0.97, x: '-50%', y: '-50%' }}
                transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-linha px-6 py-5">
                  <div>
                    <Dialog.Title className="font-display text-2xl">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-oregano">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className="-mr-2 rounded-full p-2 text-oregano transition-colors hover:bg-manteiga hover:text-tinta"
                    aria-label="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
                {footer && <div className="border-t border-linha px-6 py-5">{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
