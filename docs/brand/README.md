# NestAffiliate — approved identity

Approved by the owner on 2026-10-21. The source of truth is
`approved-original.png`: connected lowercase `na`, white `nest`, lime
`affiliate`. Preserve the exact artwork, proportions, lettering and colors.
Do not redraw, substitute a font, recolor or stretch it. The dark matte in the
original presentation is not part of the logo and must never appear as a
rectangle behind it in the UI.

`scripts/build-approved-brand.py` crops the original and packages responsive
wordmarks with genuine alpha transparency, square icons (16–1024 px), maskable icons, Apple touch icon, favicon
and a 1200×630 sharing image. These are raster derivatives, not newly drawn
vectors or additional source detail. Run with Python and Pillow from the root.

Use `BrandLogo` for brand lockups, with accessible `NestAffiliate` alternative
text. Keep ordinary mentions of the product in prose as text. Square icons
contain the exact `na` mark extracted from the approved original. Regular icons
are transparent; only platform-required maskable/Apple tiles and social sharing
canvases have an intentional, uniform background.

Public assets: `/brand/nestaffiliate-approved.png`, responsive WebP variants,
`/brand/nestaffiliate-transparent-v2.webp` and its 256/512 px derivatives,
`/brand/icon-{size}.png`, `/brand/icon-maskable-{192,512}.png`,
`/brand/social-1200x630.png`, `/apple-touch-icon.png`, `/favicon.ico`.
The compatibility `/icon.svg` embeds the approved raster icon.

Release note: `scripts/configure-ci-apt.sh` switches the disposable CI runner
from the failing Azure Ubuntu mirror to the official Ubuntu archive before
installing browser dependencies. Package signature verification and every
Chromium/WebKit release gate remain enabled. Network requests have bounded
timeouts so dependency downloads cannot stall the entire release indefinitely.
Production concurrency keeps the latest requested release and cancels
superseded runs, rather than queuing behind stuck dependency downloads.
