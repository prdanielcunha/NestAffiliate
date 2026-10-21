# NestAffiliate public Main URL — production certification trigger

Release date: 2026-10-21.

Source PRs: #108 feature and #109 main-to-production release.

Public site: https://nestaffiliate.millionsnest.com/
Public product overview: https://nestaffiliate.millionsnest.com/about
Privacy: https://nestaffiliate.millionsnest.com/privacy

Reason: Pinterest Developers denied Trial for app 1625057 when the Main URL required login. This release provides a public product homepage for visitors with no session, a direct public overview, a crawlable HTML fallback, and unchanged protected workspace for authenticated users.

Provider review remains DENIED until Pinterest rechecks the same app ID. The Main URL and privacy URL have not changed. This documentation-only follow-up commit explicitly triggers the production push/CI/Hosting workflow without changing app behavior. Publication is certified only after GitHub Actions reports Firebase Hosting success and live unauthenticated root/API/legal checks pass.
