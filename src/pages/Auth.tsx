import type { ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { authApi } from '@/api/endpoints'
import type { AuthResponse } from '@/api/types'
import { PageTransition } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorState } from '@/components/ui/misc'
import { useSession } from '@/features/auth/session'
import { usePageTitle } from '@/lib/usePageTitle'
import { DEMO_ADMIN, DEMO_CUSTOMER } from '@/mocks/seed'

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Informe o DDD e o número.'),
  password: z.string().min(6, 'Use pelo menos 6 caracteres.'),
})

/** Para onde ir depois de entrar: só caminhos internos, para evitar open redirect. */
function useRedirectTarget() {
  const [params] = useSearchParams()
  const target = params.get('voltar')
  return target?.startsWith('/') && !target.startsWith('//') ? target : null
}

function useFinishAuth() {
  const signIn = useSession((s) => s.signIn)
  const navigate = useNavigate()
  const target = useRedirectTarget()
  return (auth: AuthResponse) => {
    signIn(auth)
    navigate(target ?? (auth.user.role === 'admin' ? '/admin' : '/minha-conta'), { replace: true })
  }
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <PageTransition>
      <div className="container-page grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <h1 className="text-display-lg">{title}</h1>
          <p className="mt-3 text-tinta-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <img
          src="/images/pizza-calabresa.jpg"
          alt=""
          className="mx-auto hidden aspect-square w-full max-w-md rounded-full object-cover lg:block"
        />
      </div>
    </PageTransition>
  )
}

export function Login() {
  usePageTitle('Entrar')
  const user = useSession((s) => s.user)
  const finish = useFinishAuth()
  const target = useRedirectTarget()
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const login = useMutation({ mutationFn: authApi.login, onSuccess: finish })

  if (user) return <Navigate to={target ?? (user.role === 'admin' ? '/admin' : '/minha-conta')} replace />

  const fillDemo = (demo: typeof DEMO_CUSTOMER) => {
    form.setValue('email', demo.email)
    form.setValue('password', demo.password)
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle={
        <>
          Não tem conta?{' '}
          <Link to={`/cadastro${target ? `?voltar=${encodeURIComponent(target)}` : ''}`} className="font-medium text-molho underline underline-offset-4">
            Crie em um minuto
          </Link>
          .
        </>
      }
    >
      <form onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate className="space-y-5">
        {login.error && <ErrorState message={login.error.message} />}
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register('password')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Entrar
        </Button>
      </form>

      {import.meta.env.VITE_USE_MOCKS === 'true' && (
      <div className="mt-8 rounded-2xl bg-borda-wash p-5 text-[0.9375rem]">
        <p className="font-medium">Contas de demonstração</p>
        <p className="mt-1 text-tinta-soft">Este site usa uma API fictícia. Entre com uma das contas abaixo para testar o pedido e o painel da cozinha.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => fillDemo(DEMO_CUSTOMER)}>
            Usar conta de cliente
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => fillDemo(DEMO_ADMIN)}>
            Usar conta de admin
          </Button>
        </div>
      </div>
      )}
    </AuthShell>
  )
}

export function Cadastro() {
  usePageTitle('Criar conta')
  const user = useSession((s) => s.user)
  const finish = useFinishAuth()
  const target = useRedirectTarget()
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: finish,
    onError: (err) => {
      if (err instanceof ApiError && err.fields) {
        for (const [name, message] of Object.entries(err.fields)) {
          form.setError(name as 'email', { message })
        }
      }
    },
  })

  if (user) return <Navigate to={target ?? (user.role === 'admin' ? '/admin' : '/minha-conta')} replace />
  const { errors } = form.formState

  return (
    <AuthShell
      title="Criar conta"
      subtitle={
        <>
          Já tem conta?{' '}
          <Link to={`/entrar${target ? `?voltar=${encodeURIComponent(target)}` : ''}`} className="font-medium text-molho underline underline-offset-4">
            Entre aqui
          </Link>
          .
        </>
      }
    >
      <form onSubmit={form.handleSubmit((v) => register.mutate(v))} noValidate className="space-y-5">
        {register.error && !(register.error instanceof ApiError && register.error.fields) && (
          <ErrorState message={register.error.message} />
        )}
        <Field label="Nome" error={errors.name?.message}>
          {(p) => <Input {...p} autoComplete="name" {...form.register('name')} />}
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="WhatsApp" error={errors.phone?.message} hint="Opcional. Usamos só para confirmar pedidos.">
          {(p) => <Input {...p} type="tel" autoComplete="tel" placeholder="(11) 90000-0000" {...form.register('phone')} />}
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('password')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          Criar conta
        </Button>
      </form>
    </AuthShell>
  )
}
