import { http, HttpResponse } from 'msw'
import type { LoginInput, RegisterInput } from '@/api/types'
import { db, newId, persist } from '../db'
import { apiError, authenticate, latency, publicUser, route, signToken } from './utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authHandlers = [
  http.post(route('/auth/login'), async ({ request }) => {
    await latency()
    const { email, password } = (await request.json()) as LoginInput
    const user = db.users.find((u) => u.email.toLowerCase() === email?.trim().toLowerCase())
    if (!user || user.password !== password) {
      return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    const pub = publicUser(user)
    return HttpResponse.json({ token: signToken(pub), user: pub })
  }),

  http.post(route('/auth/register'), async ({ request }) => {
    await latency()
    const body = (await request.json()) as RegisterInput
    const fields: Record<string, string> = {}
    if (!body.name || body.name.trim().length < 2) fields.name = 'Informe seu nome.'
    if (!body.email || !EMAIL_RE.test(body.email)) fields.email = 'Informe um e-mail válido.'
    if (!body.password || body.password.length < 6) fields.password = 'Use pelo menos 6 caracteres.'
    if (Object.keys(fields).length) {
      return apiError(422, 'VALIDATION_ERROR', 'Confira os campos destacados.', fields)
    }
    const email = body.email.trim().toLowerCase()
    if (db.users.some((u) => u.email === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
        email: 'Já existe uma conta com este e-mail.',
      })
    }
    const user = {
      id: newId('usr'),
      name: body.name.trim(),
      email,
      phone: body.phone?.replace(/\D/g, '') || null,
      role: 'customer' as const,
      password: body.password,
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    persist()
    const pub = publicUser(user)
    return HttpResponse.json({ token: signToken(pub), user: pub }, { status: 201 })
  }),

  http.get(route('/auth/me'), async ({ request }) => {
    await latency()
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json(publicUser(auth.user))
  }),
]
