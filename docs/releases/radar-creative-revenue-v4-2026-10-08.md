# NestAffiliate Radar & Creative Revenue 4.0 — release dossier
Date: 2026-10-08. Target: production (Firebase Hosting). Companion Hub PR: prdanielcunha/millionsnest#299.

## Non-negotiable invariants
- No deletion, automatic rewrite or migration of historical campaigns, organizations, subscriptions or Stripe data.
- Old NestScore stays persisted with its original version. V4 is separate and additive.
- Discoverability is NOT publication approval. Unknown sales are UNKNOWN, never 0 or 100.
- No paid AI or automated Pinterest publishing, ever, until explicitly authorized.
- Real listing/source and affiliated destination are separately identified and validated.
- No original marketplace product image is copied to an external AI without licensed rights.
- Human approval is mandatory; new V4 research drafts require the source-reference audit.

## Implemented capabilities
1. Opt-in `mode=discovery_v4` in Hub Mercado Livre broker: preserve legacy `minSoldQuantity=100` without mode; include lower-sales offers and offers with unknown sales for private research. The fallback labels missing stock/status/sales as unknown; degraded status is surfaced.
2. Independent potential bounds, readiness gate and evidence confidence, with reasons and version `potential-v4.0`, candidate diversity, small-screen action filters, batch-scoped source coverage snapshots.
3. Safe original listing action and explicit affiliate URL, plus product screenshot labeled reference-only.
4. Reference Lock 4.0: own/licensed photo source, explicit written rights evidence and consent to external AI, strict tenant/listing/variant ID, SHA-256, metadata-stripping client WebP normalization, authenticated private Hub image proxy, no public download tokens.
5. Copy prompt to ChatGPT with unambiguous manual attachment instructions. Prompt text alone NEVER attaches the photo.
6. Import generated 1000×1500 image separately, side-by-side compare exact form/color/parts/finish, human checklist, provenance stored on `CreativeAsset`.
7. New V4 research drafts cannot pass final export, scheduling or guided publication without approved reference; current reference status rechecked in Firestore. Older campaigns retain original behavior.
8. Test suites: V4 unit tests, mobile+desktop E2E, Hub Firestore tenant rules tests, server media validation and auth-proxy smoke steps.

## Private media server
`POST /api/v1/nestaffiliate/reference-media`: Firebase ID token + active NestAffiliate entitlement + editor/owner + org-scoped request JSON. Client normalization caps the long side at 1600 px and retries WebP quality until <= 620 KB, preserving clear product detail for comparison. Server accepts at most 8 MB (JSON request <= 12 MB), checks metadata-free RIFF and SHA-256, and creates the immutable Firestore `productReferences` record. Preferred media storage is private GCS; when bucket permissions are unavailable, a <= 620 KB image uses a **backend-only Firestore binary document** (`privateReferenceBytes`) with explicit deny rules for all browser users. Daily org cap: 24 *new* media assets. Existing exact-asset retries are idempotent and do not consume quota.
`GET /api/v1/nestaffiliate/reference-media?organizationId=...&referenceId=...`: signed-in tenant member only; source is never a public URL; backend rechecks active rights, path, metadata, size and SHA-256, then returns `image/webp` with `private, no-store`. GCS and private Firestore binaries both pass the same per-tenant and SHA-256 checks.
Revocation: editor updates only status/consent fields from `READY_FOR_AI` to `REVOKED` (irreversible via client rules). No physical deletion until retention policy approved.
Server enablement: `NESTAFFILIATE_REFERENCE_MEDIA_ENABLED=true`; bucket: `FIREBASE_STORAGE_BUCKET=millionsnest.firebasestorage.app`.

## Ordering and gating
1. Verify Hub PR #299: MillionsNest QA, RBAC QA, NestAffiliate Firestore emulator, media server validator, existing MusicScale/Connect regressions and Firebase infrastructure checks **all green**. Verify bucket access where available; exercise the deny-all private Firestore media fallback when GCS IAM does not permit writes.
2. Deploy Hub Cloud Run **first**, then canonical Firestore rules from the shared Hub repository only. Never deploy the app's `firebase/nestaffiliate.rules.fragment` in place of the global rules.
3. Confirm unauthenticated API returns 401 for the old and V4 broker routes and for private media. Confirm a real authenticated editor can upload/read/choose/revoke its *own licensed photo*, including the private Firestore fallback. Verify 403 cross-tenant/viewer write and 401 unauthenticated.
4. Verify official Mercado Livre search returns research candidates with low sales/unknown sales without fake values and that legacy mode still filters as before. Check fallback disabled/401/429 handling.
5. Verify NestAffiliate app CI: lint, typecheck, unit tests, baseline E2E, Revenue 3 E2E, Radar 4 E2E, build.
6. Deploy NestAffiliate Hosting and enable `VITE_RADAR_V4_SHADOW_ENABLED=true`, `VITE_RADAR_V4_DISCOVERY_ENABLED=true`, `VITE_REFERENCE_LOCK_V4_ENABLED=true`; keep AI paid/publishing flags off.
7. Real authenticated test: Radar -> click genuine listing -> add official affiliate URL -> create private research draft -> own photo attested/uploaded -> choose concept -> attach **that** photo manually in ChatGPT -> import generated pin -> compare & confirm -> approve -> verify listing/affiliate -> guided Pinterest publication.
8. Validate 320–390 px, tablet and desktop; PT/EN/ES, slow network, offline/401/403/429, revoked photos, exact product swap, state reload, empty/partial results.
9. Check quotas/metrics and no increases beyond free tier. Roll out gradually; monitor errors and opt-out rates.

## Fast rollback
- NestAffiliate: rebuild/redeploy from previous production SHA, or set V4 UI env flags all false and redeploy. Historical campaigns are untouched.
- Hub: `NESTAFFILIATE_REFERENCE_MEDIA_ENABLED=false` on Cloud Run and/or rollback revision; revert optional discovery mode behavior, leaving legacy default unchanged. Keep reference records; do not delete.
- Never rollback shared canonical Firestore rules wholesale over newer permissions for MusicScale or other applications; use an additive policy reversal reviewed with RBAC QA.
- Do not remove existing creative assets, Stripe subscriptions, users or app entitlements.

## Current release limitations / honest semantics
- Rights evidence is a user's explicit attestation, not an automatic copyright license verification.
- Site-search supply density does not prove Pinterest demand or future revenue.
- Numeric potential is a prioritization range, not probability or a revenue forecast.
- Real authenticated Cloud Run/GCS permission smoke cannot be replaced by mock-auth E2E alone.
- The design allows automatic V4 image reference transfer later only with an approved multimodal API contract. Today ChatGPT attachment is manual and explicit.
