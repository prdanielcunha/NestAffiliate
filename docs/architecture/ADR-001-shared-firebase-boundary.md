# ADR-001 — Shared Firebase boundary

Status: accepted  
Date: 2026-09-30

NestAffiliate uses the existing MillionsNest Firebase project for identity continuity. Business data is scoped under the active organization and every business entity also carries `organizationId`.

Production Firestore Rules are shared by the ecosystem. Therefore this repository must not deploy a standalone replacement ruleset over `millionsnest`. NestAffiliate rules are maintained as an additive fragment, tested independently, then merged into the canonical MillionsNest rules file.

This preserves:
- shared identity and organization authority;
- tenant isolation;
- no duplicate billing/RBAC;
- rollback safety for MusicScale, NestFinance, NestJourney, Connect and other products.
