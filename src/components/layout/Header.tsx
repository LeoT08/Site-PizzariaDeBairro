import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, ShoppingBag, User } from 'lucide-react'
import { useSession } from '@/features/auth/session'
import { cartCount, useCart } from '@/features/cart/cart'
import { useStoreStatus } from '@/features/store/useStoreStatus'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const links = [
  { to: '/monte-sua-pizza', label: 'Monte sua pizza' },
  { to: '/cardapio', label: 'Cardápio' },
  { to: '/cardapio?categoria=salgados', label: 'Salgados' },
  { to: '/cardapio?categoria=bebidas', label: 'Bebidas' },
]

export function StoreStatusPill({ className }: { className?: string }) {
  const { label, open } = useStoreStatus()
  if (!label) return null
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-tinta-soft', className)}>
      <span className={cn('h-2 w-2 rounded-full', open ? 'bg-manjericao' : 'bg-oregano-light')} aria-hidden />
      {label}
    </span>
  )
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useSession((s) => s.user)
  const count = useCart((s) => cartCount(s.lines))
  const openCart = useCart((s) => s.open)
  const { pathname, search } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [pathname, search])

  const accountHref = user ? (user.role === 'admin' ? '/admin' : '/minha-conta') : '/entrar'
  const accountLabel = user ? (user.role === 'admin' ? 'Painel' : 'Meus pedidos') : 'Entrar'

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow] duration-300',
        scrolled ? 'bg-papel/90 shadow-[0_1px_0_#E6E2D8] backdrop-blur-md' : 'bg-papel',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6 sm:h-20">
        <Link to="/" className="shrink-0" aria-label="Pizza do Bairro, página inicial">
          <img src="/images/logo.png" alt="" className="h-10 w-auto sm:h-12" width={103} height={48} />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {links.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              end
              className="text-[0.9375rem] text-tinta-soft transition-colors hover:text-tinta"
            >
              {l.label}
            </NavLink>
          ))}
          <StoreStatusPill className="border-l border-linha pl-7" />
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to={accountHref}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-[0.9375rem] text-tinta-soft transition-colors hover:bg-manteiga hover:text-tinta sm:inline-flex"
          >
            <User className="h-[18px] w-[18px]" aria-hidden />
            {accountLabel}
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex items-center gap-2 rounded-full bg-molho px-4 py-2 text-[0.9375rem] font-medium text-white transition-colors hover:bg-molho-dark"
            aria-label={`Abrir sacola, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">Sacola</span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-xs font-semibold text-molho"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-manteiga lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title="Menu">
        <StoreStatusPill className="mb-4" />
        <nav className="flex flex-col" aria-label="Menu móvel">
          {[...links, { to: accountHref, label: accountLabel }].map((l) => (
            <Link key={l.label} to={l.to} className="border-b border-linha py-4 font-display text-2xl">
              {l.label}
            </Link>
          ))}
        </nav>
      </Sheet>
    </header>
  )
}
