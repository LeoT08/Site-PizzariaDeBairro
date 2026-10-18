import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CartSheet } from '@/features/cart/CartSheet'
import { BuilderSheet } from '@/features/catalog/ProductCard'
import { STORE } from '@/lib/constants'
import { whatsappLink } from '@/lib/utils'
import { Header } from './Header'

function ScrollManager() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function WhatsAppButton() {
  return (
    <a
      href={whatsappLink('Olá! Gostaria de fazer um pedido.')}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#1F7A4D] text-white shadow-[0_10px_30px_-10px_rgba(31,122,77,0.7)] transition-transform hover:scale-105"
      aria-label={`Pedir pelo WhatsApp ${STORE.whatsappDisplay}`}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.1 0 12 0 5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.6-8.3z" />
      </svg>
    </a>
  )
}

function Footer() {
  return (
    <footer className="mt-24">
      <div className="faixa-xadrez" aria-hidden />
      <div className="bg-tinta text-white/80">
        <div className="container-page grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-3xl text-white">Pizza do Bairro</p>
            <p className="mt-3 max-w-sm">
              A pizzaria da esquina, agora com pedido pelo site. Massa de longa fermentação e forno a lenha.
            </p>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold text-white">Funcionamento</h2>
            <ul className="mt-4 space-y-2">
              <li>{STORE.hours}</li>
              <li>{STORE.address}</li>
              <li>{STORE.city}</li>
            </ul>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold text-white">Pedidos</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <a href={whatsappLink('Olá! Gostaria de fazer um pedido.')} target="_blank" rel="noreferrer" className="hover:text-white">
                  WhatsApp {STORE.whatsappDisplay}
                </a>
              </li>
              <li><Link to="/cardapio" className="hover:text-white">Cardápio completo</Link></li>
              <li><Link to="/minha-conta" className="hover:text-white">Acompanhar pedido</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col gap-2 py-6 text-sm text-white/60 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} Pizza do Bairro</p>
            <p>Desenvolvido por Leonardo Vieira Teixeira</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-tinta focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <ScrollManager />
      <Header />
      <main id="conteudo" className="flex-1 overflow-x-clip">
        {children}
      </main>
      <Footer />
      <CartSheet />
      <BuilderSheet />
      <WhatsAppButton />
    </div>
  )
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}
