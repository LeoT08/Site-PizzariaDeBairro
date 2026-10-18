import { PageTransition } from '@/components/layout/Layout'
import { ButtonLink } from '@/components/ui/button'
import { PizzaPreview } from '@/features/catalog/PizzaPreview'
import { usePageTitle } from '@/lib/usePageTitle'

export default function NotFound() {
  usePageTitle('Página não encontrada')
  return (
    <PageTransition>
      <section className="container-page flex flex-col items-center pt-16 text-center">
        <PizzaPreview first="/images/pizza-calabresa.jpg" size="media" crust="tradicional" className="w-48" />
        <h1 className="mt-6 text-display-lg">Essa página saiu para entrega e não voltou</h1>
        <p className="mt-3 max-w-md text-lg text-tinta-soft">O endereço pode estar errado ou o item saiu do cardápio.</p>
        <div className="mt-8 flex gap-3">
          <ButtonLink to="/cardapio">Ver o cardápio</ButtonLink>
          <ButtonLink to="/" variant="secondary">Ir para o início</ButtonLink>
        </div>
      </section>
    </PageTransition>
  )
}
