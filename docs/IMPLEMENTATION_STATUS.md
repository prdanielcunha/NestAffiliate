# NestAffiliate — Implementation Status

**Status date:** 2026-10-02  
**Official domain:** https://nestaffiliate.millionsnest.com  
**Firebase fallback:** https://mn-nestaffiliate-555464791734.web.app  
**Official Pinterest:** https://br.pinterest.com/achadosdonest/  
**Branches:** main = development/homologation; production = certified release.

## Launch state

- Official Pinterest profile is live as **@achadosdonest**.
- Guided Publisher is the active production path and can be used immediately.
- API approval is no longer a blocker for starting business validation.
- Trial Access is the next integration milestone for OAuth/Sandbox testing.
- Standard Access remains the gate for public production publishing through the Pinterest API.

## Production baseline

The official domain is active on Firebase Hosting with MillionsNest shared Firebase Auth.
The currently deployed production baseline remains healthy while the newest main candidate is certified.

Production safety rules are maintained additively in the central prdanielcunha/millionsnest Firestore ruleset. NestAffiliate never deploys an isolated product rules file over the shared ecosystem rules.

## Roadmap state

### Phase 0 — Bootstrap — complete
- monorepo/workspace;
- React + TypeScript + Vite;
- Firebase setup;
- env template;
- ESLint + Prettier configuration;
- Vitest + Playwright;
- CI;
- PWA shell;
- PT-BR / EN / ES;
- design tokens;
- auth shell;
- environment-driven feature flags and kill switches;
- all six official master documents versioned under docs/specs/.

### Phase 1 — Foundation — complete
- shared MillionsNest Google/Firebase identity;
- active organization resolution;
- owner/admin/editor/viewer RBAC;
- mobile-first app shell;
- Today;
- Campaign queue;
- Settings;
- ten default boards;
- Connection Center;
- additive production Firestore Rules;
- append-only audit events;
- tenant isolation tests.

### Phase 2 — Product Intelligence — complete
- Product Truth model;
- Product Offer model;
- Mercado Livre public adapter;
- Shopee official/manual import path without private scraping;
- normalization;
- Product Truth Lock;
- product snapshots;
- NestScore v1;
- explainable shortlist;
- affiliate-link separation.

### Phase 3 — Opportunity Radar — complete
- marketplace signal ingestion;
- persisted trend signals / clusters;
- local seasonality engine;
- keyword clusters;
- confidence;
- dedupe;
- max-price and image filters;
- explainable Radar shortlist;
- no prohibited scraping.

### Phase 4 — Zero-Cost AI — internally complete; external free-provider activation gated
- AI Router;
- deterministic Rule Engine;
- Prompt Package;
- Prompt Studio;
- manual ChatGPT/Gemini workflow;
- truth-safe Import AI Result;
- structured editorial import;
- local quota guard;
- Privacy Guard;
- fallbacks;
- paid AI blocked by default.

**External gate:** Gemini Free remains OFF until there is a server-side credential path that does not expose provider secrets and does not require activating a paid service.

### Phase 5 — Creative Engine — complete
- deterministic 1000×1500 renderer;
- ten templates;
- safe areas;
- typography rules;
- PNG export;
- deterministic filename;
- asset-rights guard;
- Product Truth visual lock;
- 2:3 canvas contract tests;
- desktop/mobile E2E checks.

### Phase 6 — Campaign Builder — complete
- headline/title/description/alt/disclosure/keyword/board/template;
- preview;
- version history;
- restore/undo;
- natural-language local edits;
- product swap;
- regenerate;
- manual AI result import creates a new version instead of overwriting history.

### Phase 7 — Guided Publisher — complete
- PublicationPackage;
- PNG download;
- copy buttons;
- board instruction;
- mobile/desktop guided flow;
- Shopee-specific official-program verification step;
- mark-as-published;
- configurable publication-frequency guard;
- zero-cost publication scheduling with Today due queue;
- fresh product validation immediately before publish;
- offline mode never fakes a completed publication;
- explicit human approval remains mandatory.

### Phase 8 — Pinterest Analytics — product path complete; Pinterest credentials/access external
Implemented:
- performanceDaily model;
- campaign mapping;
- manual metric import;
- performance dashboard;
- CTR / save rate / conversion / revenue / commission / EPM;
- provider interface and access-tier gates;
- failure-safe operation when Pinterest is unavailable.

**External gate:** OAuth, Trial API calls and live Pinterest analytics require an approved Pinterest application/client credentials. Public API publishing remains unavailable until Standard Access is granted.

### Phase 9 — Learning Engine — complete
- Creative DNA;
- Product DNA;
- Audience DNA;
- Preference Learning;
- persisted learningSignals;
- historical score adjustment bounded to ±6;
- no score adjustment before a minimum repeated sample;
- persisted human decision signals for approve/reject/edit/swap/restore/regenerate/preferred variant;
- explanations preserve human rules and Product Truth.

### Phase 10 — Standard Access / Auto Publish — internal prerequisites complete; public API publish externally gated
- publish broker contract exists;
- scheduling/status lifecycle exists;
- fresh validation exists;
- final human approval is mandatory;
- feature flags and kill switch exist;
- Standard Access is checked independently from Trial;
- no browser-held client secret;
- Guided Publisher remains the production fallback while Standard Access is absent.

**External gate:** Pinterest Standard Access approval and Pinterest application credentials.

### Phase 11 — OpenAI API — intentionally not activated
Per the official roadmap, paid OpenAI providers are only activated after revenue or explicit cost authorization.
Current state:
- flags exist;
- paid-service guard exists;
- product remains fully usable without OpenAI API;
- PAID_SERVICES_DISABLED=true by default.

### Phase 12 — Amazon / editorial site — future roadmap gate
Not activated in the zero-cost Pinterest/Mercado Livre/Shopee launch scope. Amazon remains OFF.

### Phase 13 — SaaS commercialization — future validation gate
The data model is multi-tenant from day one, but external billing/plans/onboarding are intentionally not built before the own-operation validation proves results.

## Security state

- Shared Firebase Auth, no parallel identity authority.
- All client business data is scoped under organizations/{orgId}/products/nestaffiliate/....
- Firestore Rules enforce tenant and role boundaries.
- Viewer is read-only in Rules and UI.
- Sensitive provider account collections are admin-readable/backend-managed.
- Provider tokens/secrets are forbidden from client-writable documents.
- auditEvents are append-only.
- approvalEvents preserve human decisions.
- Product facts retain source + observed timestamp.
- Publishing Guard checks availability, destination, disclosure, asset rights, claims, price freshness, weighted duplicate similarity and configured frequency.
- Product/affiliate URLs reject insecure, localhost, private-network and credential-bearing destinations.
- Optimistic Firestore concurrency prevents a stale tab/member from silently overwriting a newer campaign version.
- Hosting ships CSP, HSTS, anti-framing, referrer and permissions headers.
- Live Firebase Web configuration is resolved in deploy workflows instead of being hardcoded in the repository HEAD.
- Dependency audit blocks high-severity vulnerable dependencies; the grpc high advisory is pinned to a patched release.
- Automated axe/WCAG, keyboard, reduced-motion and 360/390/768/1024/1440/1920 overflow checks run in E2E.
- Production Rules deployment uses the canonical MillionsNest ruleset and is tested before release.

## Operational automation

- Daily Agent incrementally refreshes stale READY Mercado Livre campaigns on app open.
- The agent never silently edits an already approved campaign.
- Product changes create a new version and rescore; unavailable products are blocked.
- Policy Watch versions official Pinterest/Mercado Livre/Shopee/CONAR baselines and surfaces review dates.
- Zero-cost scheduling persists publication intent and returns due work to Today without requiring a paid 24/7 job.

## Zero-cost state

- Paid services blocked by default.
- OpenAI API/image/edit OFF.
- Gemini Free optional and OFF until a safe server-side credential path exists.
- Rule Engine and Prompt Studio keep the product usable without any paid AI.
- Mercado Livre public catalog adapter requires no paid API.
- Shopee uses official/manual input without private scraping.
- Pinterest Guided Publisher requires no paid API.

## Public legal/compliance pages

- Public Privacy Policy at /privacy, no authentication required.
- Public Terms of Use at /terms.
- Public data-deletion/unlinking instructions at /data-deletion.
- PT-BR / EN / ES versions.
- Legal links exposed from the login surface.
- Pinterest Developer Trial/Standard submission pack versioned at docs/PINTEREST_DEVELOPER_SUBMISSION.md.
- Public legal pages are covered by E2E + axe/WCAG checks.

## External blockers only

1. Pinterest Business/developer validation, Trial approval and credentials for OAuth/Sandbox/live analytics.
2. Pinterest Standard Access for public API auto-publish.
3. Gemini Free server-side secret path if we decide to activate that provider.
4. Amazon/site expansion only when the roadmap business gate is intentionally opened.
5. OpenAI paid providers only after explicit revenue/budget authorization.

No external blocker prevents the current zero-cost guided operation from running. The launch profile is @achadosdonest and manual production publishing can begin immediately.
