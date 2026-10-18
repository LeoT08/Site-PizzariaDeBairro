import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAdminProducts, useDeleteProduct, useSaveProduct } from '@/api/queries'
import type { CategorySlug, Product, ProductInput } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { ErrorState, Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { usePageTitle } from '@/lib/usePageTitle'
import { cn, formatPrice } from '@/lib/utils'

const IMAGES = [
  'pizza-calabresa', 'pizza-mussarela', 'pizza-marguerita', 'pizza-frango-catupiry', 'pizza-portuguesa',
  'pizza-palmito', 'coxinha', 'bolinha-de-queijo', 'mini-coxinhas', 'enroladinho', 'risole-de-carne',
  'mix-de-salgados', 'coca-cola-2l', 'fanta-laranja-2l', 'soda-2l', 'latas-variadas', 'coca-cola-lata', 'guarana-lata',
].map((n) => `/images/${n}.jpg`)

const CATEGORY_LABEL: Record<CategorySlug, string> = { pizzas: 'Pizza', salgados: 'Salgado', bebidas: 'Bebida' }

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const money = z.string().regex(/^\d+([.,]\d{1,2})?$/, 'Use o formato 49,90.')
const optionalMoney = z.string().optional()

const schema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome.'),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Use só letras minúsculas, números e hífens.'),
    category: z.enum(['pizzas', 'salgados', 'bebidas']),
    description: z.string().trim().min(5, 'Descreva o item.'),
    image: z.string().min(1),
    price: optionalMoney,
    broto: optionalMoney,
    media: optionalMoney,
    grande: optionalMoney,
    portion: z.string().optional(),
    tags: z.string().optional(),
    featured: z.boolean(),
    available: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const keys = v.category === 'pizzas' ? (['broto', 'media', 'grande'] as const) : (['price'] as const)
    for (const k of keys) {
      if (!money.safeParse(v[k] ?? '').success) ctx.addIssue({ code: 'custom', path: [k], message: 'Use o formato 49,90.' })
    }
  })
type FormValues = z.infer<typeof schema>

const toCents = (s?: string) => Math.round(Number((s ?? '0').replace(',', '.')) * 100)
const fromCents = (c?: number) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')

const toForm = (p?: Product): FormValues => ({
  name: p?.name ?? '',
  slug: p?.slug ?? '',
  category: p?.category ?? 'pizzas',
  description: p?.description ?? '',
  image: p?.image ?? IMAGES[0],
  price: fromCents(p?.priceCents),
  broto: fromCents(p?.sizePrices?.broto),
  media: fromCents(p?.sizePrices?.media),
  grande: fromCents(p?.sizePrices?.grande),
  portion: p?.portion ?? '',
  tags: p?.tags.join(', ') ?? '',
  featured: p?.featured ?? false,
  available: p?.available ?? true,
})

const toInput = (v: FormValues): ProductInput => {
  const isPizza = v.category === 'pizzas'
  const sizePrices = isPizza ? { broto: toCents(v.broto), media: toCents(v.media), grande: toCents(v.grande) } : null
  return {
    name: v.name,
    slug: v.slug,
    category: v.category,
    description: v.description,
    image: v.image,
    priceCents: isPizza ? sizePrices!.grande : toCents(v.price),
    sizePrices,
    portion: isPizza ? null : v.portion?.trim() || null,
    tags: (v.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    featured: v.featured,
    available: v.available,
  }
}

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const save = useSaveProduct()
  const { register, handleSubmit, setValue, setError, control, formState: { errors, dirtyFields } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(product) })
  const [image, category, slug] = useWatch({ control, name: ['image', 'category', 'slug'] })

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { id: product?.id, input: toInput(values) },
      {
        onSuccess: (p) => {
          toast.success(product ? `${p.name} atualizado` : `${p.name} criado`)
          onDone()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.fields) {
            for (const [k, m] of Object.entries(err.fields)) {
              const key = k === 'priceCents' ? 'price' : k === 'sizePrices' ? 'grande' : k
              setError(key as keyof FormValues, { message: m })
            }
          } else toast.error(err.message)
        },
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-6">
      <Field label="Nome" error={errors.name?.message} className="sm:col-span-4">
        {(p) => (
          <Input
            {...p}
            {...register('name', {
              onChange: (e) => {
                if (!product && !dirtyFields.slug) setValue('slug', slugify(e.target.value))
              },
            })}
          />
        )}
      </Field>
      <Field label="Categoria" error={errors.category?.message} className="sm:col-span-2">
        {(p) => (
          <Select {...p} {...register('category')}>
            <option value="pizzas">Pizza</option>
            <option value="salgados">Salgado</option>
            <option value="bebidas">Bebida</option>
          </Select>
        )}
      </Field>
      <Field label="Endereço (slug)" error={errors.slug?.message} hint={`/${slug || '...'}`} className="sm:col-span-3">
        {(p) => <Input {...p} {...register('slug')} />}
      </Field>
      <Field label="Selos" hint="Separados por vírgula, como Vegetariana." className="sm:col-span-3">
        {(p) => <Input {...p} {...register('tags')} />}
      </Field>

      {category === 'pizzas' ? (
        <>
          <Field label="Broto (R$)" error={errors.broto?.message} className="sm:col-span-2">
            {(p) => <Input {...p} inputMode="decimal" {...register('broto')} />}
          </Field>
          <Field label="Média (R$)" error={errors.media?.message} className="sm:col-span-2">
            {(p) => <Input {...p} inputMode="decimal" {...register('media')} />}
          </Field>
          <Field label="Grande (R$)" error={errors.grande?.message} className="sm:col-span-2">
            {(p) => <Input {...p} inputMode="decimal" {...register('grande')} />}
          </Field>
        </>
      ) : (
        <>
          <Field label="Preço (R$)" error={errors.price?.message} className="sm:col-span-3">
            {(p) => <Input {...p} inputMode="decimal" {...register('price')} />}
          </Field>
          <Field label="Porção" hint="Ex.: 10 unidades, 2 litros" className="sm:col-span-3">
            {(p) => <Input {...p} {...register('portion')} />}
          </Field>
        </>
      )}

      <Field label="Descrição" error={errors.description?.message} className="sm:col-span-6">
        {(p) => <Textarea {...p} className="min-h-20" {...register('description')} />}
      </Field>

      <fieldset className="sm:col-span-6">
        <legend className="text-sm font-medium">Foto</legend>
        <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-9">
          {IMAGES.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setValue('image', src, { shouldDirty: true })}
              className={cn(
                'aspect-square overflow-hidden rounded-xl ring-offset-2 transition',
                image === src ? 'ring-2 ring-molho' : 'opacity-70 hover:opacity-100',
              )}
              aria-label={`Usar foto ${src.split('/').pop()}`}
              aria-pressed={image === src}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-6 sm:col-span-6">
        <label className="inline-flex items-center gap-2 text-[0.9375rem]">
          <input type="checkbox" className="h-4 w-4 accent-molho" {...register('featured')} />
          Destaque na página inicial
        </label>
        <label className="inline-flex items-center gap-2 text-[0.9375rem]">
          <input type="checkbox" className="h-4 w-4 accent-molho" {...register('available')} />
          Disponível no cardápio
        </label>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-6">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {product ? 'Salvar alterações' : 'Criar item'}
        </Button>
      </div>
    </form>
  )
}

export default function AdminProdutos() {
  usePageTitle('Cardápio')
  const products = useAdminProducts()
  const remove = useDeleteProduct()
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  return (
    <div>
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo item
        </Button>
      </div>

      <div className="mt-6">
        {products.isLoading && <Skeleton className="h-96" />}
        {products.isError && <ErrorState message={products.error.message} onRetry={() => products.refetch()} />}
        {products.data && (
          <ul className="divide-y divide-linha rounded-2xl border border-linha bg-white">
            {products.data.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-sm text-oregano">
                    {CATEGORY_LABEL[p.category]}
                    {p.featured && ', em destaque'}
                    {!p.available && ', fora do cardápio'}
                  </p>
                </div>
                <span className="hidden text-right text-sm sm:block">
                  {p.sizePrices
                    ? `${formatPrice(p.sizePrices.broto)} a ${formatPrice(p.sizePrices.grande)}`
                    : formatPrice(p.priceCents)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="rounded-full p-2 text-oregano hover:bg-manteiga hover:text-tinta"
                    aria-label={`Editar ${p.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Excluir ${p.name}? Esta ação não pode ser desfeita.`)) return
                      remove.mutate(p.id, {
                        onSuccess: () => toast.success(`${p.name} excluído`),
                        onError: (e) => toast.error(e.message),
                      })
                    }}
                    className="rounded-full p-2 text-oregano hover:bg-molho-wash hover:text-molho"
                    aria-label={`Excluir ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        side="center"
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === 'new' ? 'Novo item' : `Editar ${editing?.name ?? ''}`}
      >
        {editing !== null && <ProductForm product={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  )
}
