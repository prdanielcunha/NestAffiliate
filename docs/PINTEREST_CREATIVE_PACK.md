# Pinterest Creative Pack — Implementation & Release Contract

**Product:** NestAffiliate  
**Scope:** Pinterest Creative Pack / Phase 14  
**Date:** 2026-10-02  
**Branch:** \`feature/pinterest-creative-pack-2026-10-02\`

## Goal

Turn the existing Pinterest campaign pipeline into a complete zero-cost creative workflow:

\`campaign -> creative pack -> visual concept -> image prompt -> manual AI generation -> validated import -> final 1000x1500 Pin -> approval -> publish package -> learning\`.

No paid AI API is required. OpenAI paid providers remain behind the existing feature flags and paid-services kill switch.

## Product Truth invariants

The creative pipeline never mutates the commercial source of truth.

Locked facts include product identity, marketplace, verified URL, price, availability, seller data and asset-rights state. Generated copy and image prompts may omit unknown facts but may not invent them.

A product swap invalidates the previous \`creativePack\` and \`creativeAsset\`.

## Scene Engine

Files:

- \`packages/creative-engine/src/scene-engine/category-map.ts\`
- \`packages/creative-engine/src/scene-engine/scene-profile.ts\`
- \`packages/creative-engine/src/scene-engine/scene-rules.ts\`
- \`packages/creative-engine/src/scene-engine/scene-score.ts\`

The engine is deterministic and local. It maps product title + intent + board + editorial context to a structured \`SceneProfile\`.

Initial rule families cover bathroom, kitchen organization, kitchen utensils, lighting, home decor, laundry, kids room, pet, home office and a safe generic-home fallback.

## Creative Director 2.0

\`packages/creative-engine/src/creative-director/index.ts\`

Creates three distinct concepts per pack and ranks them by:

1. product/scene coherence;
2. benefit clarity;
3. mobile visual strength;
4. diversity;
5. Pinterest fit.

Supported angle vocabulary includes problem/solution, transformation, discovery, inspiration, utility, organization, small spaces, routine, aesthetics, how-to, curation and seasonal.

"Generate another direction" rotates to a different group of angles without changing Product Truth.

## Image Prompt Builder

\`packages/creative-engine/src/prompt-builder/index.ts\`

Each prompt package records:

- template ID/version;
- Scene Engine version;
- Creative Director version;
- campaign/version;
- facts used;
- restrictions used;
- language;
- created timestamp.

Default prompt language is English. The UI can render an equivalent Portuguese prompt without replacing the stored original concept.

Prompts explicitly require:

- 2:3 vertical composition;
- final 1000x1500 target;
- product fidelity;
- believable lifestyle context;
- negative space for app-rendered headline;
- no embedded text;
- no invented price/rating/reviews/brand/material/dimensions/stock/shipping/commission.

## Visual Truth Guard

\`packages/creative-engine/src/visual-truth/index.ts\`

Checks scene coherence, forbidden claims, reference rights and commercial copy. Imported AI images require human confirmation of product fidelity and absence of rasterized AI text.

The final Publishing Guard also blocks a generated creative asset if these confirmations are missing.

## Image import and normalization

\`apps/web/src/features/AIImageImport.tsx\`

Input methods:

- file picker;
- drag-and-drop;
- clipboard paste.

Accepted formats:

- PNG;
- JPEG;
- WebP.

Validation:

- magic-byte signature;
- declared MIME consistency;
- max size;
- minimum resolution;
- dedupe by SHA-256;
- safe 2:3 cover crop;
- top/center/bottom crop adjustment.

Normalized output is 1000x1500. The image is encoded to a bounded WebP/JPEG payload for resilience.

Persistence strategy:

1. Firebase Storage when available and authorized.
2. If Storage is unavailable, a bounded binary fallback is stored in the tenant-protected Firestore \`creativeAssets\` document.
3. Campaign documents store metadata/pointers only, not the image bytes.

This fallback avoids making Firebase Storage configuration a hard dependency for the MVP.

## UI integration

Review now contains one integrated Pinterest Creative Pack area:

- Prepare Pin;
- three visual concepts;
- recommended concept;
- prompt preview;
- copy/open ChatGPT;
- English / Portuguese prompt view;
- import generated image;
- crop adjustment;
- title/description choice;
- SEO keyword list;
- board recommendation;
- Product Truth restrictions;
- publication readiness.

The original ten Canvas templates remain unchanged in order and behavior. Eight contextual variants were added after them:

- Lifestyle Full Bleed
- Lifestyle + Headline
- Product Detail
- Room Inspiration
- Before / After Contextual
- Small Space Contextual
- Utility / How-to
- Editorial Clean

## Data model

New domain objects:

- \`PinterestCreativePack\`
- \`SceneProfile\`
- \`ImageConcept\`
- \`ImagePromptSpec\`
- \`CreativeAsset\`

Firestore collections:

- \`creativePacks\`
- \`creativeConcepts\`
- \`sceneProfiles\`
- \`promptPackages\`
- \`creativeAssets\`

Publication packages now retain:

- creativePackId;
- creativeAssetId;
- conceptId;
- promptPackageId;
- sceneType;
- environment;
- keywords.

## Learning Engine

The existing small-sample guard remains in place.

Creative DNA can now use:

- sceneType;
- environment;
- creativeAngle;
- headlineStyle;
- visualDensity;
- backgroundStrategy.

These dimensions only become recommendations after repeated evidence; they never override Product Truth or explicit human decisions.

## Security

The canonical MillionsNest Firestore rules must include the new Creative Pack collections in the NestAffiliate-specific allowlist.

Rules behavior:

- viewer: read only;
- editor: create/update within own entitled tenant;
- admin/owner: delete where allowed;
- cross-tenant organizationId changes denied;
- secret-like fields denied.

Generated image bytes stored through the Firestore fallback remain under the same tenant boundary.

## QA gates

Automated coverage includes:

- base-template preservation;
- contextual-template count;
- Scene Engine category mapping;
- three distinct concepts;
- prompt 2:3 / 1000x1500 contract;
- SEO keyword count;
- prompt Product Truth lock;
- absolute-claim blocking;
- image magic-byte detection;
- minimum resolution;
- non-distorting cover crop;
- AI asset visual-fidelity gate;
- contextual Creative DNA learning;
- E2E Prepare Pin;
- approval blocked until generated image is validated;
- existing responsive/accessibility suites.

## Rollback

The feature is additive.

Rollback order:

1. disable/revert Creative Pack UI integration;
2. existing campaign review and the original ten templates remain functional;
3. historical packs/assets remain readable;
4. no Product Truth fields require migration;
5. no paid-provider dependency is introduced.

Do not delete stored creative packs/assets during rollback; leave them as versioned historical artifacts.

## Release order

1. Rules QA in \`prdanielcunha/millionsnest\`.
2. NestAffiliate lint/typecheck/unit/integration/build.
3. E2E and accessibility/responsive suite.
4. Merge to \`main\`.
5. Firebase preview smoke.
6. Promote only from a known-good commit after production branch reconciliation.
