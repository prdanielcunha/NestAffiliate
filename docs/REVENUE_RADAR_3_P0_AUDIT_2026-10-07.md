# NestAffiliate Revenue OS 3.0 — P0 audit / first increment

Date: 2026-10-07. Source roadmap: `NestAffiliate_Roadmap_Revenue_Radar_3_2026-10-07.md`. This report distinguishes **code inspected** from **live authenticated proof**. It is not a production certificate.

## Baseline and release boundary
- Before this feature branch, `main` and `production` both pointed to `a0ce5c932e04e0ac5b1a6d2275922b18ab8bbb11`. `production` is not modified by this change.
- Feature branch: `feat/revenue-radar-3-truth-gates-20261007`, based on that SHA.
- Existing workflow `meli-market-signal-sync.yml` schedules `17 */3 * * *` (every three hours; status text saying four hours is inconsistent).
- GitHub Actions run `37670604382` (2026-10-07) reported green, including its actual **Sync official Mercado Livre signals** step. This proves a successful GitHub step, **not** the accuracy of market/provider contents or an end-to-end publish.
- Reuse, do not duplicate: `packages/radar`, the cloud Daily Agent `scripts/sync-meli-market-signals.mjs`, Hub ML/Shopee brokers, `@millionsnest/ai` client, existing Review/Publisher and Firestore document paths.

## Bugs verified in source
1. `buildSearchSignal()` labeled offer result counts as `DEMAND` and called them “Demanda observada”. Counts are supply density, not verified demand.
2. Persisted Radar 2 snapshots with sources `MELI_SEARCH` or `SHOPEE_SEARCH_ASSISTED` could still contaminate demand calculations after code was corrected.
3. `isCommerceReadyProduct()` accepted missing sales as if the minimum sales requirement passed, and allowed unresolved canonical catalogs as ready seller listings.
4. Cloud Daily Agent used `missing sales OR >= min sales` in its READY selection, with a catalog fallback. It also permitted older READY campaigns to remain READY after inconclusive revalidation.
5. `recordRadarSignal()` saved a strength based on product count under `trendSignals` without an explicit supply/demand distinction.

## Fix scope (this first increment)
- Search count signals explicitly classified `SUPPLY_DENSITY`; legacy search-derived `DEMAND` records excluded from the demand scorer.
- Require numeric, finite, minimum sales, resolvable `listingVerified===true`, availability and image for programmatic “commerce ready”.
- Existing cloud Agent reused, with a pure, regression-tested READY predicate. Previously READY catalog-only or missing-sales campaigns are blocked after attempted safe refresh rather than silently promoted; existing campaign documents and history are retained.
- New `trendSignals` writes record `kind: SUPPLY_DENSITY`, with no destructive migration of historical records.
- 7 Revenue OS 3.0 feature flags introduced with default `false`. Radar 2 and NestScore 2 remain active; no new task was added to NestAI prematurely.
- No auto-publish, no new provider/model, no changed billing behavior, no API secrets, no Firestore Rules changes.

## Inspection status by capability

| Capability | Repository verification | Live account verification |
|---|---|---|
| MillionsNest/Firebase Auth + organization | Existing `auth.tsx` resolves org/role | **Not tested** with real account |
| Tenant/RBAC | Scoped Firestore repositories + Rules fragment found | **Not tested** live / Rules not redeployed |
| Mercado Livre API/search | Hub broker implementation found | **Not independently authenticated** |
| Shopee API/manual path | Hub broker + manual import found | **Not independently authenticated** |
| Daily Agent execution | GitHub Actions run green, sync step ran | Firestore payload/quality **not verified** |
| Radar to Review to Guided Publisher | UI/services and existing E2E suite found | **Not tested** with real logged-in affiliate |
| ML affiliate URL | Guard blocks absent/unsafe affiliateUrl | True affiliate attribution **not tested** |
| Shopee–Pinterest product tags | Guided path and manual verification check found | Eligibility/connection **not tested** |
| Facebook affiliate Reels | Planned behind disabled flag | **Not eligible/connected until proven** |
| NestAI product/pin/creative tasks | Tasks registered in NestAI source; NestAffiliate client calls present | **No authenticated smoke**; account provider blockers documented |
| Commission import/attribution | Existing performance/manual flow found | **Not reconciled** against provider statements |
| Pinterest public API publishing | Standard Access gate already exists | **No Standard/OAuth proof** |
| Creative asset rights | Guard found | Specific user/media licenses **not audited** |

## Regression test plan
- Vitest: missing or non-finite sales, unresolved catalog, unknown availability; search counts do not alter the demand dimension; legacy snapshots never become demand again.
- Node built-in suite: identical cloud READY gate for persisted Agent selection; added to `pnpm scripts:check` and GitHub CI.
- GitHub CI: lint, typecheck, unit/integration, syntax/agent regression, dependency audit, build, Playwright E2E.
- **Still required before production:** green CI at exact branch head; authenticated Hub/marketplace smoke; user review/approval/publish walkthrough in production-equivalent preview; real affiliate link and tag verification; rollback point based on pre-change SHA.

## Rollback
Do not merge to `production` before release gates. The first rollback is to leave this PR unmerged or revert the feature branch commits. For any later roll-out, retain the prior `production` SHA and compare historical `NestScore 2.0` without overwriting documents. Feature flags default off.

## External owner/platform checks
- Shopee affiliate and Shopee–Pinterest partnership eligibility.
- Facebook Pro Panel affiliate partnership availability.
- Mercado Livre affiliate program and public channels, test affiliate link.
- Pinterest Standard OAuth access if automated public API publication is later desired.
- Real authorized images/video and official revenue exports.
- Authenticated NestAI task smoke and FREE_ONLY effective configuration.

**Do not claim released:** this change is a source-code incremental patch pending CI and live functional validation.
