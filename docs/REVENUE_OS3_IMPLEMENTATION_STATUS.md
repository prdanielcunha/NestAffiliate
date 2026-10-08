# Revenue OS 3.0 — implementation register

**Code date:** 2026-10-07. Source: `NestAffiliate_Roadmap_Revenue_Radar_3_2026-10-07.md`. This is a non-production feature branch and NOT a certificate that marketplace live accounts were verified.

## In this PR

- P0: source audit, search-as-supply correction, no UNKNOWN_SALES promotions, cloud Agent quarantine, pure cloud eligibility gate, independent build/test.
- P1: real `NextBestAction` panel with blocked/review/due/ready/discover precedence and tenant-version scoped publication step persistence.
- P2: Radar 3 assessment with versioned evidence, offer/revenue confidence and `VALIDATED / EXPLORATORY / REVIEW_REQUIRED / BLOCKED` tracks; filters by validation, provider commission evidence and asset rights. Legacy NestScore is preserved.
- P3: safe cross-market alternative suggestions labeled `REQUIRES_REVIEW` with no automatic equivalence, payout extrapolation or price/seller guessing.
- P4: deterministic 9:16 Reel storyboard/cover copy and 1080x1920 PNG cover export using existing rights-aware renderer, multilingual disclosure and explicit user-owned/authorized footage. Existing Pinterest Creative Pack remains intact.
- P5: public Pinterest Pin URL and Shopee official tagging acknowledgement before marking published, backend publication event before optimistic campaign state; progress resumes. Facebook affiliate publishing remains disabled without verified channel eligibility; a separate Shopee→Facebook manual guide with user-reported proof and independent channel log is feature gated.
- P6: organization-scoped ledger snapshots plus statement-scoped event provenance; user supplied CSV commission ledger from lawful exports; stable marketplace+transaction ids, organization scoping, statuses pending/approved/reversed, exact-only attribution, unknown attribution explicitly presented. Data remains **reported, not independently verified**.
- P7: reuses existing NestAI `affiliate.product.analyze` on explicit click for top three candidates; passes public facts only, treats generated results as hypotheses and fails over to deterministic Radar. A new NestAI registry task is not necessary.
- P8: observational sample-gated revenue cohort diagnostic, never causal A/B winner based on a single Pin or cross-market data.
- P9: adaptive styles and all new text in PT-BR/EN/ES under existing dark/light tokens.

## Flags / release status
All seven new flags default OFF. No production deployment, no paid provider or automatic public posting. The original P0 audit is in `docs/REVENUE_RADAR_3_P0_AUDIT_2026-10-07.md`.

## Accepted technical evidence / limitations
- Automated CI on the feature branch checks eslint, TS, unit and cloud Node tests, audit, build and Playwright default plus flagged smoke for desktop/mobile.
- E2E is synthetic and does **not** prove authenticated marketplace permissions, provider program links, actual product tag commission, account-specific Facebook eligibility or real revenue reconciliation.
- New screen styles have not yet passed complete manual WCAG/voice-over and all-device golden screenshot acceptance.
- The Firefox/Safari matrix, emulator tenant/rules checks, authenticated marketplace/provider smoke and preview sign-off remain required.
- Shopee affiliate Pinterest eligibility, Facebook Professional Panel eligibility, Mercado Livre affiliate channel registration, genuine user-supplied transaction reports, licensed footage and NestAI live provider quotas must be checked by an authorized owner in real accounts.
- Do not merge into `production` until live link/preview/permission/security and rollback requirements are satisfied.

## Non-destructive rollback
- Reference baseline `production` SHA `a0ce5c932e04e0ac5b1a6d2275922b18ab8bbb11`.
- Default off flags keep original flow.
- Rollback means not merging the draft PR or reverting its commits. No destructive schema migration.

## Rollout invariant
An exploratory/unknown offer remains ineligible for campaign creation whenever the top-level Revenue Radar 3 flag is enabled, even if the optional assessment detail panel flag is disabled. Signals from the same provider family are not double-counted as independent demand evidence.

## Production safety rollout
After CI + isolated preview + authenticated smoke, production workflow enables the *safe* client surfaces P1–P4 and P6 behind its build flags. Facebook–Shopee guided integration and remote NestAI remain disabled until verified authorization. All paid APIs and Pinterest auto publish remain blocked. Changing build-time flags requires a controlled deploy and rollback, not a client toggle. Never promote on E2E failures or unverified IAM/Firestore Rules.
