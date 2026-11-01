# Guided Pinterest launch and separate video preparation

A beginner can use the existing product → text → image → review → manual publication flow without needing Standard API access. Public API publishing remains disabled.

## Changes

- Both Shopee affiliate-link and official product-tag workflows have explicit independent checks. Direct links require a fresh portal confirmation for the exact URL, listing and Pinterest channel; official tags remain confirmed at posting time.
- Final PNG/ZIP export rejects unresolved, unavailable or unreviewed campaign media instead of silently substituting a placeholder. Preview and export use the reviewed creative even with older templates.
- Local composition now stores a text-free base image; editorial copy is applied once. Existing complete local compositions remain readable without a second headline.
- Editing an approved or published campaign creates a draft requiring new approval, while preserving history.
- The image handoff always requires attaching the actual authorized reference, offers the original photo, distinguishes prompt copying from photo attachment, and includes an optional Gemini handoff.
- Manual publishing includes instructions for iPhone and a self-contained text package. UI check labels use plain language.
- Approved publication work takes priority on Today over older blocked drafts.
- Video preparation is a separate route: `/video-studio`. It prepares product-specific reference-guided prompts, scene continuity, captions and channel instructions for Instagram, TikTok and eligible Shopee products. It does not assemble MP4, publish, mutate Pins or assert channel eligibility.
- Tool guidance is sourced and dated. Flow is the first free allowance to check; YouTube Create and Grok are conditional. No paid services are activated.
- The minimatch override addresses the dependency advisory found by the existing moderate-level audit gate.

## Sources checked 2026-11-01

- https://support.google.com/flow/answer/16526234?hl=pt-BR — daily credits and variable access. Credits are not a fixed number of videos.
- https://support.google.com/flow/answer/16353544?hl=en — supported countries, including Brazil.
- https://support.google.com/youtube/answer/16631240?hl=en — current YouTube Create video-generation country restrictions; Brazil is not on the list consulted.
- https://docs.x.ai/grok/faq — account/plan-specific allowances; no guaranteed free daily video quota is asserted.
- https://help.shopee.com.br/portal/10/article/128461-Passo-a-Passo-para-Gerar-Seus-Links-de-Afiliado-ou-ID-de-produto — official referral links and Sub_id.

## Release validation

Run `pnpm run ci`, `pnpm audit --audit-level=moderate`, baseline and enabled-flag Playwright checks, plus the existing iPhone WebKit configuration. Account-specific permissions, media-generation quotas and real commissions are not established by synthetic tests. Production deployment must pass the existing certification workflow; do not weaken its checks.

No account secret, Firebase rules deployment or new paid provider is required by these changes. Roll back Hosting to the previous release or revert this additive UI/source change; no destructive migration is present.
