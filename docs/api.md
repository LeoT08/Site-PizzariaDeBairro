# Contrato da API

O front-end consome esta API em `${VITE_API_URL}/api`. Hoje ela é simulada no navegador pelo MSW (`src/mocks/`). Para trocar pela API real, implemente estas rotas e configure:

```
VITE_API_URL=https://api.seudominio.com
VITE_USE_MOCKS=false
```

Os tipos TypeScript de cada payload estão em `src/api/types.ts`, e a especificação OpenAPI em `docs/openapi.yaml`. As regras de preço estão em `src/lib/pricing.ts`, que é a implementação de referência: a API real deve chegar exatamente nos mesmos valores.

## Convenções

- JSON em requisição e resposta. Datas em ISO 8601 (UTC). Horário da loja no fuso `America/Sao_Paulo`.
- **Valores em centavos** (inteiro): `priceCents: 7990` = R$ 79,90.
- Autenticação: `Authorization: Bearer <token>`. O formato do token é livre (o mock gera um JWT sem assinatura com `sub`, `role` e `exp`).
- Ao receber `401` em rota autenticada, o front encerra a sessão.
- Se a API estiver em outro domínio, liberar CORS para a origem do site e para o header `Authorization`.

### Formato de erro

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Confira os dados do pedido.", "fields": { "address.street": "Informe a rua." } } }
```

`message` aparece para o usuário, então deve estar em português. As chaves de `fields` aparecem embaixo do campo correspondente do formulário (caminhos aninhados usam ponto).

| Status | `code` | Quando |
|---|---|---|
| 401 | `UNAUTHENTICATED`, `INVALID_TOKEN`, `INVALID_CREDENTIALS` | Sem token, token inválido ou login errado |
| 403 | `FORBIDDEN` | Cliente em rota de admin |
| 404 | `NOT_FOUND` | Recurso não existe ou não pertence ao usuário |
| 409 | `EMAIL_TAKEN` | Cadastro com e-mail já usado |
| 422 | `VALIDATION_ERROR`, `EMPTY_ORDER`, `PRODUCT_UNAVAILABLE`, `INVALID_QUANTITY`, `INVALID_PIZZA`, `INVALID_STATUS` | Dados inválidos |

## Autenticação

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `200 { token, user }` |
| POST | `/auth/register` | `{ name, email, phone?, password }` | `201 { token, user }` |
| GET | `/auth/me` | | `200 User` |

`User`: `{ id, name, email, phone, role: "customer" | "admin", createdAt }`. Nunca devolver a senha.

## Cardápio (público)

| Método | Rota | Resposta |
|---|---|---|
| GET | `/menu/rules` | `200 MenuRules` |
| GET | `/categories` | `200 Category[]` |
| GET | `/products?category=&q=&featured=` | `200 Product[]` (só `available: true`) |
| GET | `/products/:slug` | `200 Product` ou `404` |

`Product`: `{ id, slug, name, category: "pizzas" | "salgados" | "bebidas", description, image, priceCents, sizePrices, portion, tags, featured, available }`.

- Pizza: `sizePrices = { broto, media, grande }` e `priceCents` igual ao da grande. `portion = null`.
- Salgados e bebidas: `sizePrices = null` e `portion` descreve a porção (`"10 unidades"`, `"2 litros"`).

`MenuRules` centraliza o que muda de pizzaria para pizzaria, para o front não fixar valores:

```json
{
  "sizes": [{ "id": "broto", "name": "Broto", "slices": 4, "diameterCm": 25 }, ...],
  "crusts": [{ "id": "tradicional", "name": "Tradicional", "priceCents": 0 }, { "id": "catupiry", ... "priceCents": 1200 }, ...],
  "promo": { "weekdays": [1, 2, 3, 4], "size": "grande", "priceCents": 6999, "label": "De segunda a quinta, ..." },
  "deliveryFeeCents": 600,
  "freeDeliveryFromCents": 10000,
  "deliveryEtaMin": [40, 55],
  "pickupEtaMin": [25, 30],
  "opensAt": "18:00",
  "closesAt": "23:30",
  "builder": {
    "productId": "custom-pizza",
    "basePrices": { "broto": 3490, "media": 4990, "grande": 6290 },
    "sauces": [{ "id": "tomate", "name": "Molho de tomate da casa", "priceCents": 0 }, ...],
    "cheeses": [{ "id": "mucarela", "name": "Muçarela", "priceCents": 0 }, ...],
    "toppings": [{ "id": "calabresa", "name": "Calabresa", "kind": "calabresa", "priceCents": 700 }, ...],
    "maxToppings": 6
  }
}
```

## Regras de preço

Para cada item do pedido:

- **Salgado ou bebida:** `unitPriceCents = product.priceCents`.
- **Pizza:** exige `pizza: { size, crust, secondFlavorId | null }`.
  - Preço do sabor = `sizePrices[size]`. No **meio a meio**, vale o maior entre os dois sabores.
  - Broto não pode ser meio a meio.
  - `unitPriceCents = preço do sabor + crust.priceCents`.
  - **Promoção:** se o dia (no fuso da loja) está em `promo.weekdays`, o tamanho é `promo.size` e o preço do sabor passa de `promo.priceCents`, o desconto por unidade é `preço do sabor - promo.priceCents`. A borda não entra no desconto.
- O nome e os detalhes do item são montados no servidor (`"Pizza grande meio Calabresa, meio Portuguesa"`).

- **Monte sua pizza:**  e .
  - .
  - De 1 a  ingredientes, sem repetir; molho, queijo e ingredientes precisam existir em .
  - Não entra na promoção do dia e não pode ser meio a meio.
  -  de cada ingrediente diz ao front qual desenho usar na animação da montagem.

No pedido:

- `subtotalCents` = soma de `unitPriceCents × quantity`.
- `discountCents` = soma dos descontos de promoção.
- `deliveryFeeCents` = `rules.deliveryFeeCents` na entrega, ou 0 se `subtotal - desconto >= freeDeliveryFromCents`. Retirada é sempre 0.
- `totalCents = subtotalCents - discountCents + deliveryFeeCents`.

## Pedidos (cliente autenticado, exceto o orçamento)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/orders/quote` | `{ items, fulfillment }` | `200 Quote` (público; mostra o total antes de pedir) |
| POST | `/orders` | `CreateOrderInput` | `201 Order` |
| GET | `/orders/me` | | `200 Order[]` (mais recentes primeiro) |
| GET | `/orders/:code` | | `200 Order` (`code` sem `#`; só o dono ou admin) |

```json
{
  "items": [
    { "productId": "prd_calabresa", "quantity": 1, "pizza": { "size": "grande", "crust": "catupiry", "secondFlavorId": "prd_portuguesa" }, "notes": "sem cebola" },
    { "productId": "prd_coca_2l", "quantity": 1 }
  ],
  "fulfillment": "delivery",
  "address": { "street": "Rua das Flores", "number": "45", "district": "Centro", "complement": "", "reference": "Portão verde" },
  "phone": "11999990000",
  "payment": "cash",
  "changeForCents": 20000
}
```

Validações do servidor:

- Pelo menos 1 item; quantidade inteira de 1 a 20; produto existente e disponível; observação com até 140 caracteres.
- **O preço é sempre recalculado no servidor** com as regras acima. O front nunca envia valores.
- `delivery` exige `address.street`, `address.number` e `address.district`.
- `phone` com DDD (10 ou 11 dígitos).
- `payment`: `pix`, `card` ou `cash` (pago na entrega ou no balcão). `changeForCents` só vale para `cash` e precisa ser maior ou igual ao total.
- O pedido nasce com `status: "received"`, `code` sequencial legível (`#301`), `statusHistory` com o primeiro status e `estimatedAt = createdAt + maior valor do ETA`.
- Sugestão para a API real: recusar pedidos fora do horário com `409 STORE_CLOSED`. A demo aceita a qualquer hora.

`Order`: `{ id, code, userId, customerName, customerPhone, items: OrderItem[], fulfillment, address | null, payment, changeForCents | null, subtotalCents, discountCents, deliveryFeeCents, totalCents, status, statusHistory: [{ status, at }], estimatedAt, createdAt }`.

`OrderItem`: `{ productId, name, details: string[], pizza | null, notes, unitPriceCents, quantity }`.

### Status

```
received ─▶ baking ─▶ out_for_delivery ─▶ delivered      (entrega)
received ─▶ baking ─▶ ready_for_pickup                   (retirada)
received ─▶ cancelled
```

`out_for_delivery` só vale para entrega e `ready_for_pickup` só para retirada (senão `422 INVALID_STATUS`). Cada mudança acrescenta `{ status, at }` em `statusHistory`.

> Na demo, pedidos criados pelo site avançam sozinhos (forno em 1 min, entrega em 4 min, entregue em 9 min) para dar para ver o acompanhamento. Isso é só do mock: na API real o status muda pelo painel.

## Admin (`role: "admin"`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/admin/stats` | | `200 AdminStats` |
| GET | `/admin/products` | | `200 Product[]` (inclui indisponíveis) |
| POST | `/admin/products` | `ProductInput` | `201 Product` |
| PUT | `/admin/products/:id` | `ProductInput` | `200 Product` |
| DELETE | `/admin/products/:id` | | `204` |
| GET | `/admin/orders?status=` | | `200 Order[]` (`status=open` traz os em andamento) |
| PATCH | `/admin/orders/:id/status` | `{ status }` | `200 Order` |

- `ProductInput` é `Product` sem `id`. Para pizza, exigir os três preços e salvar `priceCents = sizePrices.grande`. Para os demais, exigir `priceCents` e salvar `sizePrices = null`.
- `AdminStats`: `{ ordersToday, revenueTodayCents, openOrders, revenueLast7Days: [{ date, totalCents }] (7 itens, do mais antigo para hoje), topFlavors: [{ productId, name, quantity }] }`. No `topFlavors`, meio a meio conta 0,5 pizza para cada sabor. Pedidos cancelados não entram no faturamento.

## Sugestão de modelo de dados

```
users        (id, name, email UNIQUE, phone, password_hash, role, created_at)
products     (id, slug UNIQUE, name, category, description, image, price_cents,
              price_broto_cents NULL, price_media_cents NULL, price_grande_cents NULL,
              portion NULL, tags TEXT[], featured, available)
menu_rules   (linha única ou tabela de configuração: tamanhos, bordas, promoção, taxas, horário)
orders       (id, code UNIQUE, user_id FK, customer_phone, fulfillment, address JSON NULL,
              payment, change_for_cents NULL, subtotal_cents, discount_cents,
              delivery_fee_cents, total_cents, status, estimated_at, created_at)
order_items  (order_id FK, product_id FK, name, details JSON, size NULL, crust NULL,
              second_flavor_id NULL, notes, unit_price_cents, quantity)
order_status_history (order_id FK, status, at)
```
