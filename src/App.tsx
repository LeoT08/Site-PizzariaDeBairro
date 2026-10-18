import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Skeleton } from '@/components/ui/misc'
import { RequireAuth } from '@/features/auth/RequireAuth'
import Home from '@/pages/Home'
import Cardapio from '@/pages/Cardapio'
import Checkout from '@/pages/Checkout'
import Pedido from '@/pages/Pedido'
import { Cadastro, Login } from '@/pages/Auth'
import MinhaConta from '@/pages/MinhaConta'
import NotFound from '@/pages/NotFound'

// O painel só é baixado por quem entra nele
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminResumo = lazy(() => import('@/pages/admin/AdminResumo'))
const AdminPedidos = lazy(() => import('@/pages/admin/AdminPedidos'))
const AdminProdutos = lazy(() => import('@/pages/admin/AdminProdutos'))

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="container-page pt-14"><Skeleton className="h-96" /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cardapio" element={<Cardapio />} />
          <Route path="/finalizar" element={<Checkout />} />
          <Route path="/pedido/:code" element={<RequireAuth><Pedido /></RequireAuth>} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/minha-conta" element={<RequireAuth><MinhaConta /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminResumo />} />
            <Route path="pedidos" element={<AdminPedidos />} />
            <Route path="produtos" element={<AdminProdutos />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
