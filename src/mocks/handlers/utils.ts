import { HttpResponse, delay } from 'msw'
import type { User } from '@/api/types'
import { db } from '../db'
import type { UserRecord } from '../seed'

/** Casa a rota em qualquer origem (mesma origem ou VITE_API_URL). */
export const route = (path: string) => `*/api${path}`

export function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

/** Latência de rede simulada, para os estados de carregamento aparecerem. */
export const latency = () => delay(import.meta.env.MODE === 'test' ? 0 : 250 + Math.random() * 350)

const b64url = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const fromB64url = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7

/** JWT de mentira: formato real (header.payload.signature), assinatura falsa. */
export function signToken(user: User) {
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor((Date.now() + TOKEN_TTL_MS) / 1000) }),
  )
  return `${header}.${payload}.mock-signature`
}

export function publicUser({ password: _password, ...user }: UserRecord): User {
  return user
}

type AuthResult = { user: UserRecord } | { response: Response }

export function authenticate(request: Request, role?: User['role']): AuthResult {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { response: apiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.') }

  try {
    const payload = JSON.parse(fromB64url(token.split('.')[1])) as { sub: string; exp: number }
    const user = db.users.find((u) => u.id === payload.sub)
    if (!user || payload.exp * 1000 < Date.now()) throw new Error('invalid')
    if (role && user.role !== role) {
      return { response: apiError(403, 'FORBIDDEN', 'Você não tem permissão para acessar esta área.') }
    }
    return { user }
  } catch {
    return { response: apiError(401, 'INVALID_TOKEN', 'Sua sessão expirou. Entre novamente.') }
  }
}
