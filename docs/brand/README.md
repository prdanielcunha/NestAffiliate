# NestAffiliate — approved identity

Approved by the owner on 2026-10-21. The source of truth is
`approved-original.png`: connected lowercase `na`, white `nest`, lime
`affiliate`, original dark background. Preserve the exact artwork, proportions,
lettering and colors. Do not redraw, substitute a font, recolor or stretch it.

`scripts/build-approved-brand.py` crops the original and packages responsive
wordmarks, square icons (16–1024 px), maskable icons, Apple touch icon, favicon
and a 1200×630 sharing image. These are raster derivatives, not newly drawn
vectors or additional source detail. Run with Python and Pillow from the root.

Use `BrandLogo` for brand lockups, with accessible `NestAffiliate` alternative
text. Keep ordinary mentions of the product in prose as text. Square icons
contain the exact `na` mark extracted from the approved original.

Public assets: `/brand/nestaffiliate-approved.png`, responsive WebP variants,
`/brand/icon-{size}.png`, `/brand/icon-maskable-{192,512}.png`,
`/brand/social-1200x630.png`, `/apple-touch-icon.png`, `/favicon.ico`.
The compatibility `/icon.svg` embeds the approved raster icon.
