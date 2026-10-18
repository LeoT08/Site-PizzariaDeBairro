import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { apiError, latency, route } from './utils'

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const catalogHandlers = [
  http.get(route('/menu/rules'), async () => {
    await latency()
    return HttpResponse.json(db.rules)
  }),

  http.get(route('/categories'), async () => {
    await latency()
    return HttpResponse.json(db.categories)
  }),

  http.get(route('/products'), async ({ request }) => {
    await latency()
    const params = new URL(request.url).searchParams
    const category = params.get('category')
    const q = params.get('q')
    const featured = params.get('featured') === 'true'

    let list = db.products.filter((p) => p.available)
    if (category) list = list.filter((p) => p.category === category)
    if (featured) list = list.filter((p) => p.featured)
    if (q) {
      const term = normalize(q)
      list = list.filter((p) => normalize(`${p.name} ${p.description} ${p.tags.join(' ')}`).includes(term))
    }
    return HttpResponse.json(list)
  }),

  http.get(route('/products/:slug'), async ({ params }) => {
    await latency()
    const product = db.products.find((p) => p.slug === params.slug && p.available)
    if (!product) return apiError(404, 'NOT_FOUND', 'Este item não existe ou saiu do cardápio.')
    return HttpResponse.json(product)
  }),
]
