# NestAffiliate

**Affiliate Intelligence by MillionsNest**

NestAffiliate is the zero-cost-first affiliate operating system for discovering opportunities, preparing campaigns, rendering Pinterest creatives, enforcing product truth/compliance, and guiding publication with mandatory human approval.

> Intelligence → Creation → Approval → Distribution → Learning → Revenue.

## Product principles

- Human approval is mandatory before publication.
- Paid AI/services are blocked by default.
- Product facts never come from generative AI.
- Multi-tenant isolation and RBAC are required from the first release.
- PT-BR, EN and ES are first-class UI locales.
- Pinterest guided publishing is the production fallback until Standard Access is approved.
- OpenAI adapters exist behind disabled feature flags and are never required for the MVP.

## Stack

- React + TypeScript + Vite
- Firebase Auth / Firestore / Hosting
- PWA
- Vitest + Playwright
- Deterministic Creative Engine
- Provider adapters for Pinterest, Mercado Livre, Shopee and future AI providers

## Repository layout

```text
apps/web
packages/core
packages/scoring
packages/creative-engine
packages/ai-router
packages/integrations
packages/compliance
packages/config
packages/radar
packages/analytics
packages/learning
firebase
tests
docs
.github/workflows
```

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

## Zero-Cost Mode

The global policy `PAID_SERVICES_DISABLED` defaults to `true`. Gemini Free is optional and quota guarded. OpenAI text/image/edit are disabled until a future explicit revenue/budget gate.

## Firebase safety

NestAffiliate shares MillionsNest identity. Business data is scoped to the active organization. Because the Firebase project is shared with the ecosystem, NestAffiliate rules are maintained as an additive product fragment; this repository must never overwrite the ecosystem-wide Firestore rules blindly.

## Production

- Official domain: https://nestaffiliate.millionsnest.com
- Firebase fallback: https://mn-nestaffiliate-555464791734.web.app
- `main`: development / homologation
- `production`: certified production branch

## Documentation

The six 2026-09-30 master documents are the product source of truth and are versioned under `docs/specs/`:
- Product / Architecture / Roadmap
- UI/UX Master Design
- Technical Implementation Blueprint
- Integrations & Data Contracts
- QA / Security / Release Playbook
- Growth Operating Playbook
