# Pinterest Developer API — complete pre-review audit

**Review date:** 2026-10-21. **Current app:** MillionsNest — NestAffiliate, ID **1625057**. **Actual provider status:** Trial **DENIED** by Periwinkle on 2026-10-20 because Main URL previously required login. Previous app **1618597** denied because company did not match website. Provider re-review is NOT yet confirmed.

## Primary official policies reviewed
- Developer Guidelines: https://policy.pinterest.com/en/developer-guidelines
- Tier approval/denial guidance: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- Connect app and redirect rules: https://developers.pinterest.com/docs/getting-started/connect-app/
- OAuth/scopes: https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/
- Commercial/affiliate rules: https://policy.pinterest.com/en/commercial-and-branded-content-guidelines
- Community Guidelines (spam/safety): https://policy.pinterest.com/en/community-guidelines
- Developer & API Terms page: https://developers.pinterest.com/terms/ (full current acceptance contract must also be reviewed by account owner in Pinterest).

## Pre-review compliance matrix

| Control | Finding / evidence | Action |
| --- | --- | --- |
| Company identity/domain | MillionsNest/official domain consistent in new 1625057. Original 1618597 denied. | Verify truthful company details in portal; no name swap or new app without provider instruction. |
| Public Main URL | FIXED, deployed. Production CI verified public homepage in signed-out browser, crawlable HTML and correct domain. | Open anonymously and verify no login wall, no redirection. |
| Product purpose | Public marketing overview and /about; original value: marketplace research, Pin creative, campaigns, account analytics. | Align exact submitted description with these actual features. |
| Privacy/Terms/delete | Public /privacy, /terms, /data-deletion; CI smoke passed. Legal copy updated for API limits, company and user rights. | Verify contact mailbox is real and accessible. |
| Brand/icon | Official green NestAffiliate icon, not official Pinterest branding. | Check uploaded image in Developer portal: earlier screenshot showed placeholder. |
| Business/admin account | @achadosdonest and verified site in earlier records. | Verify Business status and email in portal, no additional fake accounts. |
| Trial status | DENIED until Pinterest re-reviews, regardless of app frontend feature toggles. | Do not use credentials or assert live OAuth, analytics API or auto-posting. |
| Individual action consent | Guided Publisher requires user review for each Pin. | Future API must preserve specific user selection/consent for each Pin; no unattended mass posting. |
| Original affiliate media | Claims checks and source/creative controls in app. | Human must ensure real rights, transparency and meaningful original value. |
| Affiliate spam | Bulk repetitive affiliate Pins, fake engagement, paid saves, misleading redirects and keyword stuffing prohibited. | Apply conservative editorial frequency and no artificial amplification. |
| Pinterest API data retention | Most Pinterest-sourced API data CANNOT be stored; explicit exception for authorized campaign analytics. | No persistent Pinterest user/board/Pin caches by default; retention design must be vetted before OAuth. |
| Pinterest account data isolation | Don't mix users accounts or share/sell Pinterest API data, including with advertising services. | Strict per-user/provider data boundaries, minimize scopes, no resale. |
| Pinterest content used for AI training | PROHIBITED without explicit authorization. | Don't train, fine-tune, develop or improve AI models with Pinterest materials. |
| Pinterest benchmarking/competitor research | PROHIBITED without written Pinterest authorization. | Radar must refer ONLY to marketplace product research, not claim Pinterest-wide trend or competitor analytics. |
| Scraping/extraction | Not permitted except expressly approved. | Do not scrape Pinterest pages/use cookies/unofficial bots. |
| OAuth credentials | Not yet possible (Trial denied). | After approval, secure server-only secret, Pinterest OAuth consent + scoped tokens, exact redirect URI and refresh/revoke. |
| Engagement automation | Unapproved auto-follows/saves/likes/forced engagements forbidden. | No broad automation or inducement. |
| Visual identity | No misleading Pinterest endorsement, trademark misuse or UI imitation. | Use only descriptive Pinterest references. |
| Young users/ads scope | Product not intended for under-13 users. No ads/audience integrations. | Avoid irrelevant scopes; re-audit any future new capability. |
| Trial vs Standard | Trial Pins/Boards creator-only; Standard requires video of real authorized OAuth & API feature. | Do not promise public API publishing until Standard approved. |

## Code-path audit
- Apps UI: public landing/site + /about, private routes stay behind AuthProvider and RBAC.
- Pinterest connection: denied state visible; user-approved API functionality off.
- Config: PINTEREST_DEVELOPER_APP.id = 1625057. Approval is a separate fail-closed gate, not inferred from environment variables.
- Analytics: manual import of user-authorized Pinterest CSV about the user's published campaigns; financial results unknown unless supported by the affiliate marketplace.
- Learning: local assessment of own campaign metrics. Must not train external ML models on Pinterest Materials.
- Compliance: human approval, source-backed commercial claims, copyright safeguards and honest affiliate link status; user must still review content.
- No Pinterest OAuth broker or Pinterest API sync is activated while denied.

## What the audit cannot establish without the Pinterest account
- Full text of the current app submission (description, selected use cases, business/company info, requested scopes), or email verification state. User must verify in Pinterest Developers.
- Whether current uploaded app icon is visible; whether support will accept re-review of same ID.
- External copyright ownership for third-party media or affiliate-network terms for individual offers.
- Full dynamically-served Pinterest Developer/API agreement accepted in the owners portal.
- Pinterest reviewer approval itself; no guarantee even after technical checks.

## Re-review recommendation, avoiding a third cycle
1. Verify the above manual-only fields in Pinterest Developers for app 1625057, without changing Main URL/Privacy URL.
2. Verify exact production Main URL in private/incognito browser; public text, no login, Privacy, Terms and support details.
3. Reply in the SAME Periwinkle support thread with the same App ID, send ALL four public links and ask her to list ALL other possible blockers together before deciding.
4. Offer a short video of guest navigation as evidence. No client secrets/tokens in email/screenshots.
5. Once approved Trial: OAuth flow, provider API operation in Trial, then request Standard with genuine end-to-end demo.

### Suggested support reply (English)

Hi Periwinkle,

Thank you for reviewing MillionsNest — NestAffiliate (App ID **1625057**). We fixed the reported issue: our exact registered Main URL **https://nestaffiliate.millionsnest.com/** is now publicly accessible to visitors without login. Only the private user workspace requires authentication.

You can inspect all public details here:
- Main website: https://nestaffiliate.millionsnest.com/
- About the product: https://nestaffiliate.millionsnest.com/about
- Privacy Policy: https://nestaffiliate.millionsnest.com/privacy
- Terms of Use: https://nestaffiliate.millionsnest.com/terms
- Data Deletion: https://nestaffiliate.millionsnest.com/data-deletion

We have not changed the registered Main URL or Privacy Policy URL. MillionsNest is the company brand, matching our official domain. We reviewed your Developer Guidelines and affiliate, security, consent and data-use requirements. Public API posting is disabled while Trial is denied; each Pin requires human review and manual publishing.

To avoid another round of partial rejections, **could you please review the full application, including its description and all other requirements, in one pass and tell us whether anything else must be corrected?** We are happy to supply a video demonstration or screenshots.

Please re-review the SAME App ID 1625057 for Trial Access.

Thank you,
Daniel
NestAffiliate — MillionsNest
