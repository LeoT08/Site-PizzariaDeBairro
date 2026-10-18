import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProducts } from '@/api/queries'
import { ButtonLink, buttonClass } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/misc'
import { PageTransition } from '@/components/layout/Layout'
import { StoreStatusPill } from '@/components/layout/Header'
import { PizzaPreview } from '@/features/catalog/PizzaPreview'
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/ProductCard'
import { useStoreStatus } from '@/features/store/useStoreStatus'
import { STORE } from '@/lib/constants'
import { usePageTitle } from '@/lib/usePageTitle'
import { formatPrice, whatsappLink } from '@/lib/utils'

const ease = [0.22, 1, 0.36, 1] as const

/** Carimbo da promoção, como o impresso na tampa da caixa de pizza */
function PromoStamp({ priceCents }: { priceCents: number }) {
  return (
    <motion.div
      initial={{ scale: 1.6, opacity: 0, rotate: -24 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.9 }}
      className="grid h-36 w-36 place-items-center rounded-full border-[3px] border-molho bg-white p-2 text-center text-molho shadow-[0_12px_30px_-12px_rgba(198,42,31,0.45)] sm:h-44 sm:w-44"
    >
      <div className="grid h-full w-full place-items-center rounded-full border border-dashed border-molho/60">
        <div>
          <p className="text-xs font-semibold sm:text-sm">Seg a qui</p>
          <p className="font-display text-2xl leading-none sm:text-3xl">{formatPrice(priceCents)}</p>
          <p className="mt-1 text-[0.7rem] font-medium leading-tight sm:text-xs">qualquer pizza grande</p>
        </div>
      </div>
    </motion.div>
  )
}

function Hero() {
  const { rules } = useStoreStatus()
  return (
    <section className="container-page grid items-center gap-12 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-24">
      <div className="max-w-2xl">
        <StoreStatusPill />
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="mt-5 text-display-xl"
        >
          A pizza do bairro, quentinha na sua porta.
        </motion.h1>
        <p className="mt-6 max-w-prose text-lg text-tinta-soft">
          Massa de longa fermentação, molho de tomate feito aqui e forno a lenha. Monte inteira ou meio a meio,
          escolha a borda e acompanhe o pedido até chegar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/cardapio" size="lg">
            Montar minha pizza
          </ButtonLink>
          <a
            href={whatsappLink('Olá! Gostaria de fazer um pedido.')}
            target="_blank"
            rel="noreferrer"
            className={buttonClass('secondary', 'lg')}
          >
            Pedir pelo WhatsApp
          </a>
        </div>
      </div>

      <div className="relative">
        {/* A pizza sai do forno para a mesa: é o único movimento automático da página */}
        <motion.img
          src="/images/pizza-mussarela.jpg"
          alt="Fatia de pizza sendo servida, com o queijo puxando"
          initial={{ opacity: 0, x: 60, rotate: 3 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="aspect-[4/3] w-full rounded-[2rem] object-cover"
        />
        {rules && (
          <div className="absolute -bottom-10 -left-3 sm:-left-10">
            <PromoStamp priceCents={rules.promo.priceCents} />
          </div>
        )}
      </div>
    </section>
  )
}

function Featured() {
  const { data, isLoading, isError, refetch } = useProducts({ category: 'pizzas', featured: true })
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="mais-pedidas">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="mais-pedidas" className="text-display-lg">As mais pedidas do bairro</h2>
        <Link to="/cardapio" className="font-medium text-molho underline decoration-1 underline-offset-4 hover:decoration-2">
          Ver todos os sabores
        </Link>
      </div>
      <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading && Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
        {data?.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {isError && <ErrorState message="Não foi possível carregar o cardápio." onRetry={() => refetch()} />}
    </section>
  )
}

function HalfAndHalf() {
  return (
    <section className="bg-manteiga py-16 sm:py-20">
      <div className="container-page grid items-center gap-10 md:grid-cols-[minmax(0,320px)_1fr] md:gap-16">
        <PizzaPreview
          first="/images/pizza-calabresa.jpg"
          second="/images/pizza-portuguesa.jpg"
          size="grande"
          crust="catupiry"
          className="mx-auto w-full max-w-[320px]"
        />
        <div className="max-w-prose">
          <h2 className="text-display-lg">Não decidiu o sabor? Pede meio a meio.</h2>
          <p className="mt-4 text-lg text-tinta-soft">
            Na média ou na grande, cada metade de um jeito. Cobramos o sabor mais caro, como em toda pizzaria de
            bairro. Borda recheada de Catupiry ou cheddar por mais R$ 12.
          </p>
          <ButtonLink to="/cardapio" className="mt-7" size="lg">
            Escolher os sabores
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

function Extras() {
  const salgados = useProducts({ category: 'salgados', featured: true })
  const bebidas = useProducts({ category: 'bebidas', featured: true })
  const items = [...(salgados.data ?? []), ...(bebidas.data ?? [])]
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="acompanha">
      <h2 id="acompanha" className="text-display-lg">Pra acompanhar</h2>
      <p className="mt-3 max-w-prose text-tinta-soft">Porção de salgado frito na hora e refrigerante gelado.</p>
      <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {salgados.isLoading && Array.from({ length: 2 }, (_, i) => <ProductCardSkeleton key={i} />)}
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
        <Link
          to="/cardapio?categoria=salgados"
          className="flex min-h-48 flex-col justify-end rounded-3xl border border-dashed border-linha p-6 transition-colors hover:border-oregano-light hover:bg-manteiga"
        >
          <span className="font-display text-xl">Todos os salgados</span>
          <span className="text-oregano">Coxinha, risole, bolinha de queijo e mix.</span>
        </Link>
        <Link
          to="/cardapio?categoria=bebidas"
          className="flex min-h-48 flex-col justify-end rounded-3xl border border-dashed border-linha p-6 transition-colors hover:border-oregano-light hover:bg-manteiga"
        >
          <span className="font-display text-xl">Todas as bebidas</span>
          <span className="text-oregano">Refrigerante 2 L e lata.</span>
        </Link>
      </div>
    </section>
  )
}

function Info() {
  const { rules } = useStoreStatus()
  if (!rules) return null
  const [dMin, dMax] = rules.deliveryEtaMin
  const blocks = [
    {
      title: 'Entrega',
      text: `Em ${dMin} a ${dMax} minutos em ${STORE.city}. Taxa de ${formatPrice(rules.deliveryFeeCents)}, grátis acima de ${formatPrice(rules.freeDeliveryFromCents)}.`,
    },
    {
      title: 'Retirada',
      text: `Pronta em ${rules.pickupEtaMin[0]} a ${rules.pickupEtaMin[1]} minutos no balcão: ${STORE.address}.`,
    },
    { title: 'Pagamento', text: 'Pix, cartão na maquininha ou dinheiro, na entrega ou no balcão.' },
    { title: 'Horário', text: STORE.hours + '.' },
  ]
  return (
    <section className="border-t border-linha">
      <div className="container-page grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((b) => (
          <div key={b.title}>
            <h2 className="text-xl">{b.title}</h2>
            <p className="mt-2 text-[0.9375rem] text-tinta-soft">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  usePageTitle()
  return (
    <PageTransition>
      <Hero />
      <Featured />
      <HalfAndHalf />
      <Extras />
      <Info />
    </PageTransition>
  )
}
