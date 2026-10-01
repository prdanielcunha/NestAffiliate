# NestAffiliate — Integrations & Data Contracts

**Versão:** 1.0  
**Data-base:** 30/09/2026  
**Produto:** NestAffiliate  
**Objetivo:** definir contratos, capacidades, limites, fallbacks e regras das integrações externas.

> Este documento contém pontos sensíveis a mudanças de terceiros. Revalidar fontes oficiais antes de grandes releases.

---

# 1. Princípio

Nenhuma integração externa é o domínio do NestAffiliate.

Cada provider deve ficar atrás de um adapter.

O domínio trabalha com contratos canônicos.

---

# 2. Providers iniciais

1. Pinterest
2. Mercado Livre
3. Shopee
4. Gemini Developer API
5. MillionsNest / Firebase
6. ChatGPT Manual Prompt Studio

Futuros:

7. OpenAI API
8. Amazon Associates / Creators API
9. outros marketplaces

---

# 3. Capability Registry

Cada integração anuncia capacidades.

Exemplo:

```ts
ProviderCapabilities {
  productSearch: boolean
  productRead: boolean
  affiliateLink: boolean
  affiliateMetrics: boolean
  boardRead: boolean
  boardWrite: boolean
  pinRead: boolean
  pinWrite: boolean
  pinAnalytics: boolean
  trends: boolean
  textAI: boolean
  imageAI: boolean
}
```

Nunca assumir capability somente pelo nome do provider.

---

# 4. Pinterest

## Capacidades oficiais relevantes

A Pinterest API v5 oferece recursos para:

- ler Pins;
- ler boards;
- criar Pins;
- criar boards;
- analytics;
- audiences/catálogos conforme escopo.

Scopes relevantes para conteúdo orgânico:

```text
boards:read
boards:write
pins:read
pins:write
```

## Trial vs Standard

### Trial

- Pin Analytics: disponível;
- leitura: disponível;
- criação: disponível;
- Pins/boards criados pela API são entidades sandbox e visíveis somente ao criador;
- limites diários por app.

### Standard

- uso de produção;
- maior rate limit;
- Pins/boards normais;
- aprovação necessária.

Consequência:

**MVP não pode depender de auto-publicação pública.**

Fluxo padrão até Standard:

> criar package → publicação guiada manual.

---

# 5. Pinterest OAuth

Requisitos:

- OAuth oficial;
- state;
- PKCE se suportado pelo fluxo;
- redirect URL allowlisted;
- escopos mínimos;
- token seguro;
- refresh/reconnect.

Não:

- coletar senha;
- coletar session cookie;
- simular login.

Para Standard access, preparar demonstração real do OAuth e integração.

---

# 6. Pinterest — Board contract

Canônico:

```ts
PinterestBoard {
  provider: "PINTEREST"
  externalId: string
  name: string
  description?: string
  privacy?: string
  url?: string
}
```

Mapear sem expor campos desnecessários.

---

# 7. Pinterest — Pin contract

```ts
PinterestPin {
  externalId
  boardExternalId
  title
  description
  altText?
  destinationUrl?
  media
  createdAt?
  status
}
```

---

# 8. Pinterest — Organic Analytics

A documentação oficial atual informa:

- lookback de 90 dias para reporting orgânico de contas/Pins;
- lifetime reporting para a maioria dos Pins;
- lista dos top 50 Pins de imagem e/ou vídeo.

Normalizar para:

```ts
OrganicMetrics {
  impressions
  engagements
  saves
  pinClicks
  outboundClicks
  dateRange
}
```

Nunca acoplar UI ao payload original.

---

# 9. Pinterest Trends API

A API oficial de Trends & Insights está limitada atualmente a:

- agências;
- Enterprise;
- plataformas parceiras.

Também possui escopo menor que o Pinterest Trends web.

Pode retornar:

- trending keywords;
- WoW;
- MoM;
- YoY;
- filtros como região/interesses/demografia conforme endpoint.

## Regra de arquitetura

Feature flag:

```text
PINTEREST_TRENDS_API=false
```

MVP funciona sem ela.

Se acesso for aprovado futuramente, implementar adapter sem mudar o domínio.

---

# 10. Pinterest rate limits

Nunca hardcodar limites presumidos.

Adapter deve:

- ler headers quando disponíveis;
- registrar rate-limit;
- backoff em 429;
- preservar cota para ações críticas.

---

# 11. Pinterest publishing

Interface:

```ts
interface PinterestPublishingAdapter {
  createPin(input: CreatePinInput): Promise<CreatePinResult>
  createBoard(input: CreateBoardInput): Promise<CreateBoardResult>
}
```

Em Trial:

não apresentar “Publicar no Pinterest” como produção.

Mostrar:

**Testar integração**.

Em Standard:

habilitar:

**Aprovar e publicar**.

---

# 12. Mercado Livre — estratégia

Usar APIs oficiais para dados de item/catálogo quando disponíveis.

Separar:

- Mercado Livre commerce API;
- dados do programa de afiliados.

Não assumir que métricas de afiliado ou comissão estejam expostas na API pública de itens.

---

# 13. Mercado Livre — mudança crítica 2026

A documentação brasileira, atualizada em 31/08/2026, informa migração de consultas múltiplas:

Antigo:

```text
/items?ids=
/users?ids=
```

Novo:

```text
/items/bulk?ids=
/users/bulk?ids=
```

Prazo indicado:

**25/10/2026**

O NestAffiliate deve nascer usando os endpoints novos quando aplicável.

Mudanças de mapping em `/items/bulk` incluem:

- `code` → `status_code`;
- `id` no nível raiz;
- `body.` para seleção de atributos.

Criar testes específicos.

---

# 14. Mercado Livre — Product Adapter

Contrato:

```ts
interface MeliProductAdapter {
  search(input): Promise<ProductSearchResult>
  bulkGet(ids: string[]): Promise<ExternalProduct[]>
  getSeller(id: string): Promise<ExternalSeller>
}
```

Não acoplar UI ao ID `MLB...`.

---

# 15. Mercado Livre — quantidade

A documentação atual informa que `available_quantity` pode ser apresentado de forma referencial/faixas, não como estoque exato em certos recursos públicos.

Regra:

**não exibir “restam X unidades” baseado nesse campo sem confirmar semântica.**

---

# 16. Mercado Livre — Search

Suportar:

- seller search;
- category;
- sort;
- filters quando oficiais.

Não transformar search API em “tendência de consumo” sem evidência.

---

# 17. Mercado Livre — afiliado

O programa deve ser tratado como módulo separado:

```ts
AffiliateOfferData {
  marketplace: "MELI"
  affiliateUrl
  commissionPercent?
  extraCommissionPercent?
  campaignTag?
  observedAt
  source
}
```

Se informação não puder ser obtida por API oficial:

- import;
- captura manual;
- export;
- input explícito.

Nunca scraping de painel privado.

---

# 18. Mercado Livre — freshness

Antes da publicação:

- validar URL;
- validar status do item;
- validar preço se preço aparecer;
- validar seller/offer.

Se informação comercial crítica estiver velha:

bloquear preço no criativo ou refresh.

---

# 19. Shopee — estratégia

A Shopee possui integração oficial com Pinterest para afiliados.

Fluxo oficial atual:

1. conectar conta Shopee ao Pinterest;
2. criar Pin;
3. usar “Marcar produtos”;
4. buscar produto ou colar link;
5. selecionar;
6. sistema mostra estimativa de comissão;
7. até 5 produtos por Pin;
8. publicar.

Links de afiliado são gerados automaticamente para os produtos marcados.

---

# 20. Shopee — eligibility

A documentação atual exige, entre outros:

- 18+;
- cumprimento de diretrizes;
- dados corretos;
- respeito a integridade/IP.

Programa também aceita Pinterest como mídia social aprovada conforme termos atuais.

---

# 21. Shopee — adapter

Como nem todo dado desejado possui API pública aberta:

```ts
interface ShopeeAffiliateAdapter {
  registerAffiliateLink(input)
  parseAffiliateLink(input)
  buildManualPinterestInstructions(input)
  importResults?(input)
}
```

O adapter deve funcionar mesmo sem catálogo programático completo.

---

# 22. Shopee — Sub_id

Quando o fluxo oficial permitir tracking com Sub_id:

Padrão sem PII:

```text
na_{campaignIdShort}_{pinIdShort}_{variant}
```

Guardar mapping interno.

Nunca colocar:

- email;
- nome;
- telefone;
- userId público sensível.

---

# 23. Shopee — multiple products

Até 5 produtos podem ser marcados no Pin pela integração atual.

NestAffiliate só recomenda múltiplos quando:

- conceito editorial comporta;
- produtos são coerentes;
- não dilui a ação.

---

# 24. Gemini Developer API

Objetivo no MVP:

**texto de apoio no Zero-Cost Mode.**

A página oficial atual oferece tier gratuito para determinados modelos/capacidades.

## Regra

Não codificar um model ID fixo como “para sempre”.

Config remota:

```ts
GeminiModelPolicy {
  task
  model
  freeTierRequired
  maxOutput
}
```

---

# 25. Gemini Free privacy

A documentação atual diferencia free e paid, inclusive tratamento de conteúdo.

No free tier, conteúdo pode ser utilizado para melhorar produtos segundo as condições atuais.

Portanto:

**não enviar dados confidenciais, PII, secrets ou dados privados de clientes.**

Enviar apenas:

- dados públicos de produtos;
- keywords;
- briefs;
- conteúdo editorial não sensível.

---

# 26. Gemini rate limits

Criar quota layer.

Não assumir “free = ilimitado”.

Persistir:

```ts
QuotaUsage {
  provider
  date
  requestCount
  tokenEstimate
  last429At
}
```

---

# 27. Gemini tasks

Permitidas no MVP:

- classificar keyword;
- gerar headline;
- gerar descrição;
- cluster;
- ângulos;
- prompt;
- explicar score.

Não usar para:

- fatos de produto;
- preço;
- comissão;
- disponibilidade.

---

# 28. Manual ChatGPT Prompt Studio

Não há API.

Integração de UX:

- montar prompt;
- copiar;
- abrir ChatGPT via link normal quando possível;
- importar resultado.

Não declarar integração automática.

Não depender do plano Pro para runtime do app.

---

# 29. OpenAI API — futuro

Contrato pronto:

```ts
OpenAIAdapter implements AIProvider
```

Feature flags OFF.

Requisitos para ligar:

- receita;
- key;
- budget;
- hard cap;
- logs;
- fallback.

---

# 30. Firebase Authentication

Provider inicial:

- Google.

Dados:

- uid;
- email;
- displayName;
- avatar.

Não usar auth profile como única fonte de authorization.

Authorization vem de `memberships`.

---

# 31. Firestore

Usar client SDK para operações seguras protegidas por Rules.

Server/Admin SDK:

- bypassa Rules;
- exige IAM;
- exige validação explícita do tenant.

Toda função server-side recebe `organizationId` validado contra caller/contexto.

---

# 32. Firebase App Check

Ativar em produção quando estável.

Não considerar App Check como autorização.

---

# 33. Storage

Somente assets necessários.

Paths:

```text
organizations/{orgId}/creative-assets/{assetId}
organizations/{orgId}/imports/{importId}
```

Storage Rules alinhadas a membership.

---

# 34. MillionsNest / Hub

Integração de identidade.

Contrato conceitual:

```ts
HubIdentity {
  userId
  ecosystemRoles[]
  activeOrganizationId?
}
```

NestAffiliate não deve duplicar billing no MVP.

Se Hub estiver indisponível:

- auth segura não deve entrar em loop;
- mostrar retry/degraded state.

---

# 35. Normalized Provider Error

Todos adapters convertem erro externo:

```ts
ProviderError {
  provider
  category
  retryable
  statusCode?
  retryAfter?
  userMessageKey
  technicalCode
}
```

---

# 36. Provider health

```text
HEALTHY
DEGRADED
DOWN
AUTH_REQUIRED
RATE_LIMITED
```

Mostrar status simples no Connection Center.

---

# 37. Sync cursor

Adapters com paginação/sync devem guardar cursor:

```ts
SyncState {
  provider
  resource
  cursor?
  lastSuccessfulAt
  lastAttemptAt
}
```

---

# 38. Freshness contracts

Exemplo inicial:

```text
Product availability: refresh before publish
Price shown in creative: refresh immediately before publish
Seller reputation: daily/when used
Pinterest analytics: periodic
Policy: weekly/manual monitor
```

TTL configurável.

---

# 39. Data provenance

Todo fato externo:

```ts
{
  value
  sourceProvider
  sourceUrl?
  fetchedAt
  confidence
}
```

---

# 40. Contract tests

Para cada adapter:

- fixture real redacted;
- parser test;
- schema test;
- error mapping;
- rate-limit;
- null handling.

---

# 41. Mock adapters

Obrigatórios:

```text
MockPinterestAdapter
MockMeliAdapter
MockShopeeAdapter
MockGeminiAdapter
```

E2E não deve depender de internet.

---

# 42. API versioning

Por provider, guardar:

```text
adapterVersion
apiVersion
```

Mudanças incompatíveis exigem versão.

---

# 43. Deprecation watch

Criar lista:

- provider;
- endpoint;
- announcedAt;
- deadline;
- replacement;
- status.

Exemplo atual:

```text
MELI /items?ids → /items/bulk?ids
deadline: 25/10/2026
```

---

# 44. Pinterest Standard Access checklist

Antes de solicitar:

- Trial aprovado;
- app funcional;
- OAuth real;
- privacy policy pública;
- domínio associado;
- descrição clara;
- vídeo demonstrando auth + API;
- secrets seguros.

---

# 45. Fallback matrix

| Provider | Falha | Fallback |
|---|---|---|
| Pinterest API | indisponível | publicação manual guiada |
| Trends API | sem acesso | radar interno + sinais próprios |
| ML API | rate limit | cache + retry |
| Shopee catalog | sem API | link/manual/native tagging |
| Gemini | cota | Rule Engine + Prompt Studio |
| Hub | indisponível | retry seguro, sem loop |
| OpenAI | off | Creative Engine + manual |

---

# 46. Compliance por integração

## Pinterest
- disclosure;
- originalidade;
- não spam;
- OAuth oficial.

## ML
- links oficiais;
- comissão apenas quando confirmada;
- dados frescos.

## Shopee
- conta aprovada;
- tagging oficial;
- respeitar IP.

## Gemini Free
- não enviar dados sensíveis.

---

# 47. Security boundaries

Provider tokens:

**server only** quando segredo for exigido.

Access tokens de usuário:

- criptografia/secret store apropriado;
- nunca Firestore público;
- nunca localStorage em texto puro se evitável.

---

# 48. Webhooks

Se provider oferecer webhook relevante:

- validar assinatura;
- idempotência;
- replay protection;
- event log.

Não inventar webhook onde não existe.

---

# 49. Polling

Somente quando necessário.

Estratégia:

- baixa frequência;
- incremental;
- conditional;
- backoff.

Zero-cost mode evita polling agressivo.

---

# 50. Affiliate result import

Pipeline:

```text
source file/API
→ validate
→ normalize
→ dedupe
→ map campaign/subId
→ store
→ recalc metrics
```

---

# 51. Amazon futura

Não ativar no MVP.

Antes:

- validar candidatura;
- site editorial;
- política;
- API atual;
- Partner Tag;
- conteúdo original.

Adapter já pode possuir interface vazia/flag off.

---

# 52. Fonte de verdade

O provider é fonte de verdade para:

- fatos que ele publica.

NestAffiliate é fonte de verdade para:

- campaign;
- approval;
- creative version;
- internal score;
- publication mapping;
- learning.

---

# 53. Referências oficiais verificadas em 30/09/2026

## Pinterest

Access Tiers  
https://developers.pinterest.com/docs/key-concepts/access-tiers/

Create Boards and Pins  
https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/

Sandbox  
https://developers.pinterest.com/docs/developer-tools/sandbox/

Organic Reporting  
https://developers.pinterest.com/docs/analytics-and-reports/organic-reporting/

Trends API  
https://developers.pinterest.com/docs/analytics-and-reports/trends/

Commercial Content Guidelines  
https://policy.pinterest.com/pt-br/commercial-and-branded-content-guidelines

## Mercado Livre

Itens e Buscas  
https://developers.mercadolivre.com.br/pt_br/itens-e-buscas

Afiliados  
https://www.mercadolivre.com.br/l/afiliados-home

## Shopee

Parceria Afiliados Pinterest  https://help.shopee.com.br/portal/10/article/224179-Parceria-com-Afiliados-do-Pinterest

Termos Programa de Afiliados  
https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-da-Shopee-Termos-e-Condi%C3%A7%C3%B5es

## Gemini

Pricing  
https://ai.google.dev/gemini-api/docs/pricing

Rate Limits  
https://ai.google.dev/gemini-api/docs/rate-limits

## Firebase

Firestore Security Overview  
https://firebase.google.com/docs/firestore/security/overview

Rules and Queries  
https://firebase.google.com/docs/firestore/security/rules-query

Rules Deploy  
https://firebase.google.com/docs/rules/manage-deploy