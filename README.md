# Pizza do Bairro

Site de pedidos de uma pizzaria de bairro em Vargem Grande Paulista: cardápio, montagem de pizza (tamanho, meio a meio e borda recheada), sacola, checkout com pagamento na entrega, acompanhamento do pedido em tempo real e painel da cozinha. Projeto de portfólio.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router, TanStack Query, Zustand, React Hook Form + Zod, MSW (API simulada), Vitest.

## Destaques

- **Monte sua pizza** (`/monte-sua-pizza`): o cliente escolhe tamanho, molho, queijo, até 6 ingredientes e borda, e a pizza é montada em **3D (Three.js + React Three Fiber)** ao lado:
  - o molho espalha a partir do centro, o queijo derrete e assenta, e cada ingrediente cai peça por peça com um leve quique;
  - massa com bolhas tostadas de forno a lenha, queijo com relevo e pontos dourados, ingredientes com volume e brilho, sobre uma tábua de madeira com luz quente;
  - no final a câmera desce para a visão de mesa, a pizza gira sozinha soltando vapor e o cliente pode girar e aproximar.
  - Leveza: tudo é gerado por código (geometrias e texturas em canvas), sem modelos ou imagens para baixar. Ingredientes usam `InstancedMesh` (uma chamada de desenho por ingrediente). O three.js só é carregado nessa página, a qualidade cai em celulares mais fracos e, sem WebGL, a página usa a versão em SVG animado.
- **Sabores do cardápio** com prévia em SVG: o diâmetro muda com o tamanho, o meio a meio divide a pizza com as fotos dos dois sabores e a borda recheada muda de cor.
- **Preço calculado no servidor:** `POST /orders/quote` devolve o total com promoção do dia (seg a qui, qualquer grande por R$ 69,99) e frete grátis acima de R$ 100. A mesma regra fica em `src/lib/pricing.ts`, coberta por testes.
- **Acompanhamento do pedido:** linha do tempo (recebido, no forno, saiu para entrega, entregue) que se atualiza sozinha.
- **Fila da cozinha:** pedidos em colunas, com um botão para avançar cada um.
- Horário de funcionamento e promoção calculados no fuso de São Paulo.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run lint
npm run build
```

Contas de demonstração (API fictícia):

| Perfil | E-mail | Senha |
|---|---|---|
| Cliente | cliente@pizzadobairro.dev | cliente123 |
| Admin | admin@pizzadobairro.dev | admin123 |

## API

O [MSW](https://mswjs.io) intercepta `/api/*` no navegador e responde a partir de um banco em memória salvo no `localStorage` (`pb:mockdb`). O contrato para a API real está em [`docs/api.md`](docs/api.md) e [`docs/openapi.yaml`](docs/openapi.yaml). Para usar a API real:

```bash
VITE_API_URL=https://api.seudominio.com
VITE_USE_MOCKS=false
```

O site precisa de HTTPS (ou localhost) porque o MSW roda num service worker.
