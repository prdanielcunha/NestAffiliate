# NestAffiliate — Technical Implementation Blueprint

**Versão:** 1.0  
**Data-base:** 30/09/2026  
**Produto:** NestAffiliate  
**Repositório:** `prdanielcunha/NestAffiliate`  
**Domínio planejado:** `nestaffiliate.millionsnest.com`  
**Documento:** Blueprint técnico de implementação  
**Dependências conceituais:** `NestAffiliate_Arquitetura_Produto_Roadmap_2026-09-30.md` e `NestAffiliate_UI_UX_Master_Design_2026-09-30.md`

---

# 1. Objetivo deste documento

Este documento transforma a visão de produto do NestAffiliate em uma especificação técnica executável.

Ele define:

- stack;
- arquitetura de frontend e backend;
- módulos;
- contratos;
- modelos;
- estado;
- banco;
- segurança;
- filas;
- jobs;
- AI Router;
- Creative Engine;
- integrações;
- feature flags;
- logging;
- testes;
- CI/CD;
- critérios de aceite.

O objetivo é reduzir decisões improvisadas durante a implementação.

---

# 2. Princípios técnicos inegociáveis

1. **Zero-Cost Mode precisa funcionar sem API paga.**
2. **OpenAI não pode ser dependência obrigatória.**
3. **Nenhum secret no frontend.**
4. **Multi-tenant desde o início.**
5. **`organizationId` em toda entidade de negócio.**
6. **RBAC real, não apenas UI escondida.**
7. **i18n em `pt-BR`, `en`, `es`.**
8. **Aprovação humana antes da publicação final.**
9. **Não depender de scraping contrário aos termos das plataformas.**
10. **Toda integração externa deve ter adapter e fallback.**
11. **Product Truth Lock deve separar fatos de conteúdo gerado.**
12. **Tudo importante precisa ser auditável.**
13. **Mobile-first.**
14. **Firebase Hosting como destino inicial.**
15. **`main` = desenvolvimento/homologação; `production` = release aprovado.**
16. **Mudanças externas devem ser isoladas por feature flags.**

---

# 3. Stack recomendada

## Frontend

- React
- TypeScript strict
- Vite
- PWA
- React Router
- TanStack Query
- Zustand apenas para estado local transversal
- React Hook Form
- Zod
- i18next
- CSS Variables + Tailwind ou camada utilitária equivalente
- Lucide ou família de ícones equivalente única
- Vitest
- Testing Library
- Playwright

## Backend

Priorizar Firebase/Google Cloud com arquitetura simples:

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Cloud Storage somente quando necessário
- Cloud Functions/Cloud Run apenas para operações que não podem ficar no cliente
- Secret Manager
- App Check
- IAM

## Ferramentas

- pnpm
- ESLint
- Prettier
- TypeScript project references quando necessário
- GitHub Actions
- Firebase Emulator Suite

---

# 4. Estrutura do monorepo

```text
NestAffiliate/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ routes/
│     │  ├─ features/
│     │  ├─ components/
│     │  ├─ hooks/
│     │  ├─ lib/
│     │  ├─ services/
│     │  ├─ i18n/
│     │  ├─ styles/
│     │  └─ types/
│     └─ public/
│
├─ packages/
│  ├─ core/
│  ├─ ui/
│  ├─ data/
│  ├─ scoring/
│  ├─ creative-engine/
│  ├─ ai-router/
│  ├─ integrations/
│  ├─ compliance/
│  ├─ analytics/
│  └─ config/
│
├─ firebase/
│  ├─ firestore.rules
│  ├─ firestore.indexes.json
│  ├─ storage.rules
│  └─ seed/
│
├─ functions/
├─ tests/
├─ scripts/
├─ docs/
├─ .github/workflows/
├─ firebase.json
├─ .firebaserc
├─ package.json
└─ pnpm-workspace.yaml
```

---

# 5. Arquitetura modular

## Core

Entidades puras, state machines e regras de negócio.

Não importar Firebase, React ou SDK externo.

## Data

Repositories e mappers.

Responsável por:

- Firestore;
- cache;
- persistência;
- queries;
- pagination.

## Integrations

Adapters por provider.

Exemplo:

```ts
interface ProductProvider {
  searchProducts(input: ProductSearchInput): Promise<ProductSearchResult>
  getProduct(externalId: string): Promise<ExternalProduct>
  validateOffer(input: OfferValidationInput): Promise<OfferValidationResult>
}
```

## AI Router

Escolhe provider de IA conforme:

- capacidade;
- zero-cost;
- quota;
- segurança;
- disponibilidade;
- feature flag.

## Creative Engine

Renderização determinística de Pin.

## Compliance

Validação de:

- truth;
- disclosure;
- asset;
- link;
- duplicação;
- frequência;
- claims.

## Analytics

Normalização de métricas externas e métricas internas.

---

# 6. App shell e rotas

Rotas iniciais:

```text
/login
/onboarding
/app/today
/app/radar
/app/radar/:opportunityId
/app/campaigns
/app/campaigns/:campaignId
/app/publish/:campaignId
/app/results
/app/library
/app/boards
/app/connections
/app/settings
/app/help
```

Rotas protegidas por:

- auth;
- membership;
- organization status;
- role.

---

# 7. Autenticação

## Fluxo

1. usuário entra com Google;
2. Firebase Auth valida;
3. resolver perfil;
4. resolver memberships;
5. se uma organização: entrar direto;
6. se múltiplas: usar última ativa ou chooser;
7. carregar permissions;
8. carregar feature flags.

## Regras

- nunca manter fluxo paralelo de login desnecessário;
- não abrir popups em loop;
- guardar estado de auth resolution;
- diferenciar `loading`, `unauthenticated`, `authenticated-but-no-membership`.

---

# 8. RBAC

Roles:

```text
owner
admin
editor
viewer
```

Permissions:

```text
organization.read
organization.manage
members.read
members.manage
connections.read
connections.manage
opportunities.read
campaigns.read
campaigns.create
campaigns.edit
campaigns.approve
campaigns.publish
analytics.read
settings.manage
audit.read
```

Não derivar permissão somente de role no componente.

Criar helper central:

```ts
can(userContext, "campaigns.approve")
```

---

# 9. Firestore — modelo principal

Coleções:

```text
organizations
users
memberships
providerConnections
affiliateAccounts
pinterestAccounts
boards
products
productOffers
productSnapshots
trendSignals
trendClusters
opportunities
opportunityScores
campaigns
campaignVersions
creativeAssets
creativeTemplates
promptPackages
approvalEvents
publicationPackages
publications
performanceDaily
affiliateResults
learningSignals
userPreferences
policySnapshots
complianceChecks
quotaUsage
auditEvents
featureFlags
systemJobs
```

---

# 10. Padrão multi-tenant

Toda entidade operacional:

```ts
{
  organizationId: string
}
```

Queries do cliente devem incluir organização.

Security Rules devem exigir:

- membership válida;
- role/permission adequada;
- correspondência do `organizationId`.

Regras não são filtros: a query precisa satisfazer as mesmas restrições de segurança.

---

# 11. Schemas TypeScript

Usar Zod como contrato runtime.

Exemplo:

```ts
export const CampaignSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  opportunityId: z.string(),
  status: z.enum([
    "DRAFT",
    "BUILDING",
    "READY_FOR_REVIEW",
    "APPROVED",
    "PUBLICATION_READY",
    "PUBLISHED",
    "REJECTED",
    "BLOCKED"
  ]),
  marketplace: z.enum(["MELI", "SHOPEE", "AMAZON"]),
  productOfferId: z.string(),
  version: z.number().int().positive(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
})
```

Nenhuma resposta de integração externa entra diretamente no domínio sem validação/mapping.

---

# 12. Product Truth Layer

Separar:

```text
ProductTruth
CreativeNarrative
```

`ProductTruth` armazena:

- external IDs;
- nome;
- marca;
- modelo;
- atributos;
- preço + timestamp;
- reputação;
- disponibilidade;
- marketplace;
- imagem;
- fonte.

`CreativeNarrative` pode conter:

- headline;
- benefício editorial;
- contexto;
- CTA.

Nunca permitir que `CreativeNarrative` sobrescreva `ProductTruth`.

---

# 13. Snapshots

Informação volátil deve ser snapshot.

Exemplo:

```ts
ProductSnapshot {
  offerId
  price
  availability
  rating
  reviewCount
  sellerReputation
  capturedAt
  source
}
```

TTL lógico conforme dado.

Ao publicar, rodar freshness validation.

---

# 14. Opportunity pipeline

```text
Signal
→ Cluster
→ Product candidates
→ Eligibility filter
→ Product normalization
→ Score
→ Deduplication
→ Shortlist
→ Campaign build
```

Cada etapa deve ser idempotente.

---

# 15. NestScore engine

Implementar como função pura.

```ts
calculateNestScore(input): NestScoreResult
```

Retorno:

```ts
{
  score: 0..100,
  confidence: "LOW"|"MEDIUM"|"HIGH",
  dimensions: {},
  reasons: [],
  risks: [],
  version: "1.0"
}
```

Guardar `scoreVersion`.

Nunca recalcular histórico antigo silenciosamente sem registrar nova versão.

---

# 16. State machine de oportunidade

```text
DETECTED
ENRICHING
SCORED
SHORTLISTED
SELECTED
CAMPAIGN_BUILDING
REVIEW_READY
APPROVED
PUBLICATION_READY
PUBLISHED
MONITORING
ARCHIVED
```

Transições devem ser explícitas.

Exemplo:

```ts
canTransition("REVIEW_READY", "APPROVED") === true
canTransition("PUBLISHED", "DRAFT") === false
```

---

# 17. State machine de campanha

```text
DRAFT
BUILDING
READY_FOR_REVIEW
EDITING
APPROVED
VALIDATING
PUBLICATION_READY
PUBLISHED
BLOCKED
REJECTED
ARCHIVED
```

---

# 18. Idempotência

Operações externas precisam de idempotency key.

Exemplo:

```text
publish:{organizationId}:{campaignId}:{version}
```

Nunca criar dois Pins porque o usuário clicou duas vezes.

---

# 19. Jobs

Tipos:

```text
SYNC_PRODUCTS
REFRESH_OFFER
SCORE_OPPORTUNITIES
BUILD_CAMPAIGN
RENDER_CREATIVE
VALIDATE_CAMPAIGN
SYNC_PIN_ANALYTICS
IMPORT_AFFILIATE_RESULTS
LEARN_PREFERENCES
POLICY_REVIEW
```

Cada job:

- id;
- org;
- type;
- payload;
- status;
- attempts;
- nextRetryAt;
- lastError.

---

# 20. Zero-Cost job strategy

No início:

- executar jobs no login/abertura;
- sync incremental;
- processamento local;
- GitHub Actions apenas se adequado e dentro da franquia;
- evitar serviços permanentes cobrados.

Quando houver receita:

- Cloud Scheduler;
- Cloud Tasks;
- workers.

Feature flag para cada executor.

---

# 21. Retry

Padrão:

- exponential backoff;
- jitter;
- limite;
- classificar retryable vs permanent.

Exemplo:

401 → reauth, não retry infinito.  
429 → respeitar retry-after/backoff.  
404 produto → indisponível, não retry agressivo.

---

# 22. Circuit breaker

Por provider:

```text
CLOSED
OPEN
HALF_OPEN
```

Se integração falha repetidamente:

- pausar;
- mostrar degraded mode;
- não derrubar app.

---

# 23. Cache

Camadas:

- browser query cache;
- IndexedDB para PWA quando útil;
- Firestore snapshot;
- provider cache.

Nunca cachear secret.

---

# 24. AI Router

Contrato:

```ts
type AICapability =
  | "classify"
  | "summarize"
  | "generate_copy"
  | "generate_angles"
  | "generate_prompt"
  | "rank_assist"
  | "image_generate"
  | "image_edit"
```

Provider resolution:

```text
1. policy
2. paid-block
3. task sensitivity
4. free quota
5. availability
6. fallback
```

---

# 25. Providers iniciais

## Rule Engine

Sempre disponível.

## Gemini Free

Somente dados públicos/não sensíveis.

## Manual ChatGPT

Não é API.

Gera prompt package.

## OpenAI API

Código preparado; OFF.

---

# 26. Provider config

```ts
ProviderConfig {
  provider
  enabled
  mode
  allowedCapabilities[]
  dailyLimit
  paidAllowed
  sensitivityPolicy
}
```

---

# 27. Quota Guard

Antes de toda chamada:

```text
checkQuota
checkPaidPolicy
checkSensitivity
reserve
execute
commitUsage
```

Se falhar:

- fallback;
- explicar.

Nunca migrar automaticamente para plano pago.

---

# 28. Structured output

IA de texto deve retornar JSON validado.

Exemplo:

```json
{
  "headline": "...",
  "description": "...",
  "keywords": ["..."],
  "angle": "problem-solution",
  "confidence": 0.82
}
```

Se parsing falhar:

- repair uma vez;
- fallback template.

---

# 29. Prompt versioning

```ts
PromptTemplate {
  id
  task
  version
  language
  system
  userTemplate
  active
}
```

Guardar versão usada em cada geração.

---

# 30. Creative Engine

Pipeline:

```text
Canvas
→ Background
→ Context
→ Product asset
→ effects
→ text
→ brand
→ validate
→ export
```

Renderer deve ser determinístico.

---

# 31. Template schema

```ts
CreativeTemplate {
  id
  version
  canvas
  slots
  typography
  safeAreas
  constraints
  supportedProductCount
}
```

Slots:

- heroImage;
- product;
- headline;
- subheadline;
- brand;
- disclosure.

---

# 32. Render validation

Antes de exportar:

- 1000x1500;
- safe area;
- contraste;
- overflow;
- texto truncado;
- resolução do asset;
- produto visível;
- copyright/asset status.

---

# 33. Image processing

Priorizar client-side:

- crop;
- resize;
- compositing;
- shadow;
- mask;
- basic removal se modelo local viável.

Nunca travar UI thread.

Usar Web Worker quando necessário.

---

# 34. Asset storage

Metadados:

```ts
CreativeAsset {
  id
  organizationId
  origin
  rightsStatus
  mimeType
  width
  height
  hash
  storagePath?
  createdAt
}
```

Evitar duplicação por hash.

---

# 35. Prompt Studio

Gera um pacote:

```text
prompt.md
reference-info
constraints
expected-output
```

Não precisa criar arquivo sempre; UI pode copiar.

Guardar histórico só quando campanha exige auditoria.

---

# 36. Campaign versions

Cada alteração material cria nova versão.

```ts
CampaignVersion {
  campaignId
  version
  changeType
  snapshot
  createdBy
  createdAt
}
```

Undo = restaurar nova versão baseada em anterior.

Não reescrever histórico.

---

# 37. Natural-language edit

Fluxo:

1. usuário envia instrução;
2. parser classifica intenção;
3. extrai alvos;
4. aplica somente objetos necessários;
5. valida;
6. renderiza preview;
7. cria versão.

Intents:

```text
CHANGE_COPY
CHANGE_VISUAL
CHANGE_PRODUCT
CHANGE_MARKETPLACE
CHANGE_BOARD
REGENERATE
REMOVE_PRICE
CUSTOM
```

---

# 38. Edit planner

Antes de executar:

```ts
EditPlan {
  intents[]
  affectedFields[]
  requiresProductResearch
  requiresAI
  requiresRender
  requiresCompliance
}
```

Evita refazer o que não mudou.

---

# 39. Board engine

Dados:

```ts
Board {
  id
  organizationId
  providerBoardId?
  name
  description  themes[]
  status
  performanceSummary
}
```

Seleção:

- keyword;
- theme;
- historical result;
- duplication;
- semantic fit.

---

# 40. Publish Package

Gerado somente após aprovação + compliance.

Imutável por versão.

Inclui:

- asset;
- filename;
- title;
- description;
- disclosure;
- destination URL;
- board;
- topics;
- alt;
- schedule;
- instructions.

---

# 41. Manual publish flow

Registrar checklist local:

```ts
PublishProgress {
  packageId
  step
  completedSteps[]
}
```

Permitir sair e retornar.

---

# 42. Future API publish

Adapter:

```ts
interface PinterestPublisher {
  publishPin(pkg): Promise<PublishResult>
  createBoard(input): Promise<BoardResult>
}
```

Trial e Standard tratados como capabilities diferentes.

---

# 43. Analytics normalization

Criar métrica canônica:

```ts
MetricPoint {
  entityType
  entityId
  date
  impressions
  saves
  pinClicks
  outboundClicks
  engagements
  revenue?
  sales?
}
```

Não acoplar UI a nomes exatos da API.

---

# 44. Affiliate attribution

Quando provider permite tags/sub-id:

gerar:

```text
org
campaign
pin
channel
```

Não colocar PII.

---

# 45. Learning signals

Eventos:

```text
APPROVED
REJECTED
EDITED
PRODUCT_SWAPPED
PUBLISHED
HIGH_CTR
HIGH_EPM
LOW_CTR
SALE
```

Cada signal:

- value;
- context;
- confidence.

---

# 46. Preference inference

Nunca transformar uma única ação em preferência permanente.

Exigir:

- repetição;
- confidence threshold;
- sugestão explícita ao usuário.

---

# 47. Feature flags

Store central:

```text
PINTEREST_API_ENABLED
PINTEREST_STANDARD_ACCESS
PINTEREST_AUTO_PUBLISH
PINTEREST_TRENDS_API
MELI_ENABLED
SHOPEE_ENABLED
AMAZON_ENABLED
GEMINI_FREE_ENABLED
OPENAI_API_ENABLED
OPENAI_IMAGE_ENABLED
INTERNATIONAL_ENABLED
```

Flags por:

- global;
- organization;
- environment.

---

# 48. Environment

```text
local
preview
production
```

Nunca usar dados reais por padrão no local.

Seed seguro.

---

# 49. Secrets

Somente backend/secret store:

- Pinterest client secret;
- Gemini key;
- future OpenAI key;
- marketplace credentials;
- service credentials.

Frontend recebe apenas tokens/artefatos estritamente necessários.

---

# 50. Firebase Security Rules

Regras devem garantir:

- autenticação;
- membership;
- tenant isolation;
- role;
- ownership;
- campos imutáveis quando necessário.

Exemplo conceitual:

```text
allow read: if isMember(resource.data.organizationId)
allow write: if canEdit(request.resource.data.organizationId)
```

Testar no Emulator Suite.

Observação importante: SDKs server-side/Admin bypassam Firestore Rules; permissões de servidor dependem de IAM e validação da aplicação.

---

# 51. App Check

Ativar gradualmente.

Objetivo:

reduzir abuso direto contra Firebase.

Não tratar App Check como substituto de auth/rules.

---

# 52. Audit log

Eventos críticos:

- login;
- connection;
- disconnect;
- secret replacement;
- member role;
- approval;
- publish;
- manual override;
- paid mode;
- policy block.

Audit event append-only.

---

# 53. Logs técnicos

Structured logging:

```json
{
  "traceId": "...",
  "organizationId": "...",
  "module": "pinterest",
  "operation": "sync_analytics",
  "status": "error",
  "code": "RATE_LIMIT"
}
```

Não logar secrets nem payloads sensíveis.

---

# 54. Error taxonomy

```text
AUTH_ERROR
PERMISSION_ERROR
VALIDATION_ERROR
PROVIDER_RATE_LIMIT
PROVIDER_UNAVAILABLE
PRODUCT_UNAVAILABLE
QUOTA_EXCEEDED
COMPLIANCE_BLOCK
NETWORK_ERROR
UNKNOWN
```

UI recebe erro traduzível, não raw exception.

---

# 55. Telemetry

Eventos de UX:

- home_opened;
- campaign_reviewed;
- campaign_approved;
- campaign_edited;
- product_swapped;
- publish_guide_started;
- publish_guide_completed.

Privacidade primeiro.

---

# 56. PWA

Requisitos:

- installable;
- app manifest;
- icons;
- offline shell;
- cache de telas básicas;
- autosave local;
- não simular publicação offline.

---

# 57. Performance budgets

Targets iniciais:

- JS inicial controlado;
- lazy load features;
- imagens responsivas;
- WebP/AVIF quando apropriado;
- evitar libs enormes.

Review/Pub devem abrir rapidamente mesmo em 4G.

---

# 58. CI

Pull request:

```text
install
lint
typecheck
unit
rules-tests
build
e2e-smoke
```

Production gate:

- all green;
- review;
- changelog;
- rollback point.

---

# 59. Branching

```text
main
production
feature/*
fix/*
```

Production somente fast-forward/cherry-pick de commit aprovado conforme política do projeto.

---

# 60. Deployment

Firebase Hosting.

Backend/functions seletivos.

Passos:

1. build;
2. test;
3. preview;
4. smoke;
5. production;
6. smoke production;
7. monitor.

---

# 61. Rollback

Manter:

- último release saudável;
- hosting release history;
- migrations backwards-compatible.

Banco:

preferir additive changes.

Não remover campo no mesmo release em que frontend antigo ainda pode usá-lo.

---

# 62. Data migrations

Cada migração:

- id;
- status;
- dry-run;
- resumable;
- idempotent.

Nunca rodar migration destrutiva automática sem backup/validação.

---

# 63. Testing matrix

Unit:

- score;
- state machine;
- claim rules;
- board routing;
- filename;
- normalization.

Integration:

- repositories;
- adapters;
- AI router;
- auth.

E2E:

- login;
- onboarding;
- review;
- edit;
- swap;
- approve;
- publish package.

Visual:

- 360;
- 390;
- 768;
- 1024;
- 1440;
- 1920;
- light/dark.

---

# 64. Seed data

Criar dataset fake com:

- 10 produtos;
- 2 marketplaces;
- 8 boards;
- 10 oportunidades;
- 5 campanhas;
- 3 resultados.

Nunca usar dados reais para testes públicos.

---

# 65. Accessibility technical gates

Automated checks:

- axe;
- semantic HTML;
- keyboard;
- focus.

Manual:

- screen reader;
- zoom 200%;
- reduced motion.

---

# 66. Definition of Done por módulo

Cada módulo precisa:

- types;
- schema;
- repository;
- error states;
- tests;
- i18n;
- mobile;
- audit se crítico;
- docs.

---

# 67. Ordem de construção

## Phase A
Bootstrap + design tokens + auth + org + RBAC.

## Phase B
Core entities + Firestore + rules.

## Phase C
Products + offers + Truth Lock.

## Phase D
Opportunity + NestScore.

## Phase E
AI Router zero-cost + Prompt Studio.

## Phase F
Creative Engine.

## Phase G
Campaign Review + natural edit.

## Phase H
Guided Publisher.

## Phase I
Pinterest analytics.

## Phase J
Learning.

## Phase K
Standard access + auto publish.

---

# 68. Critério de pronto do MVP

O sistema deve conseguir:

1. autenticar;
2. resolver organização;
3. cadastrar/conectar canais;
4. registrar produtos/ofertas;
5. criar oportunidades;
6. calcular NestScore;
7. selecionar shortlist;
8. gerar campanha;
9. renderizar Pin sem IA paga;
10. editar;
11. trocar produto;
12. aprovar;
13. gerar package;
14. orientar publicação;
15. registrar publicado;
16. receber analytics quando disponível;
17. aprender sinais;
18. manter IA paga bloqueada.

---

# 69. Guardrail final

Se uma feature:

- aumenta custo recorrente;
- introduz scraping;
- ignora multi-tenant;
- pula aprovação;
- exige segredo no cliente;
- quebra zero-cost;
- duplica domínio;
- acopla provider;

ela deve ser redesenhada antes de merge.

---

# 70. Resultado esperado

O repositório deve ser simples de entender:

- domínio separado de provider;
- UI separada de regra;
- integrações substituíveis;
- segurança testável;
- campanhas versionadas;
- resultados rastreáveis.

O NestAffiliate precisa conseguir evoluir de:

**MVP gratuito e manualmente publicado**

para:

**agente conectado e quase totalmente autônomo**

sem reescrever o produto.