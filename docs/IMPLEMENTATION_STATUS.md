# NestAffiliate — Implementation Status

## Implemented vertical slice
- monorepo/workspace;
- shared Firebase Google identity resolver;
- organization + RBAC resolution;
- Zero-Cost feature policy and kill switches;
- Product Truth structures;
- NestScore v1;
- Mercado Livre public catalog adapter;
- affiliate-link separation;
- Publishing/Compliance Guard;
- deterministic Creative Engine at 1000×1500;
- Today;
- Radar;
- Campaign Review;
- natural-language local edits;
- campaign versioning;
- product swap;
- approval gate;
- publication package;
- Guided Publisher;
- Results foundation;
- Boards/Library/Connections/Cost/Workspace surfaces;
- dark/light responsive UI;
- CI and Firebase preview workflow.

## External gates
- Pinterest Standard Access: not approved/configured; public auto-publish remains OFF.
- Pinterest Trends API: OFF.
- Shopee programmatic API: no private scraping; official/manual flow only until capability is verified.
- Gemini Free: adapter policy ready, browser secret use prohibited; provider remains OFF until server-side secret path exists.
- OpenAI API/image/edit: OFF.
- Amazon: OFF.
- Paid services: globally blocked.

## Safety boundary
Production Firestore Rules are shared by MillionsNest. NestAffiliate must contribute an additive rules fragment to the central ruleset instead of overwriting it from this repository.
