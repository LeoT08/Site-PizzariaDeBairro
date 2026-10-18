import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/api/types'
import { EmptyState } from '@/components/ui/misc'
import { ButtonLink } from '@/components/ui/button'
import { useSession } from './session'

export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()

  if (!user) return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname)}`} replace />
  if (role && user.role !== role) {
    return (
      <div className="container-page pt-16">
        <EmptyState title="Área restrita" action={<ButtonLink to="/">Voltar ao início</ButtonLink>}>
          Esta área é só para a equipe da pizzaria.
        </EmptyState>
      </div>
    )
  }
  return <>{children}</>
}
