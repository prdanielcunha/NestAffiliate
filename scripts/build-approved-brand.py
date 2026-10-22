"""Package the approved artwork without redrawing or retyping it.

Requires Pillow. Run from the repository root. All crops use the approved
1774x887 original, retained verbatim in docs/brand/approved-original.png.
"""
from pathlib import Path
import base64
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'docs/brand/approved-original.png').convert('RGB')
assert source.size == (1774, 887), 'Do not substitute a different source artwork'
dest = root / 'apps/web/public/brand'
dest.mkdir(parents=True, exist_ok=True)
background = source.getpixel((300, 440))
def remove_dark_matte(image):
    """Remove only the source matte, retaining the original colored pixels.

    The approved artwork has a high-contrast separation: background channels
    remain below 32; solid logo channels exceed 96. Undo the original matte
    along antialiased edges rather than carrying dark fringes into the UI.
    No generated artwork, tracing, fonts or redrawing is used here.
    """
    result = image.convert('RGBA')
    original = list(image.getdata())
    pixels = []
    for red, green, blue in original:
        peak = max(red, green, blue)
        alpha = max(0.0, min(1.0, (peak - 32) / 64))
        if not alpha:
            pixels.append((0, 0, 0, 0))
        elif alpha == 1:
            pixels.append((red, green, blue, 255))
        else:
            color = tuple(max(0, min(255, round((channel - matte * (1-alpha)) / alpha)))
                          for channel, matte in zip((red, green, blue), background))
            pixels.append((*color, round(alpha * 255)))
    result.putdata(pixels)
    return result

logo = remove_dark_matte(source.crop((304, 354, 1470, 524)))
mark = remove_dark_matte(source.crop((314, 364, 567, 515)))
logo.save(dest / 'nestaffiliate-approved.png', optimize=True)
logo.save(dest / 'nestaffiliate-approved.webp', lossless=True)
logo.save(dest / 'nestaffiliate-transparent-v2.png', optimize=True)
logo.save(dest / 'nestaffiliate-transparent-v2.webp', lossless=True)
for width in (256, 512):
    resized = logo.resize((width, round(width * logo.height / logo.width)), Image.Resampling.LANCZOS)
    resized.save(dest / f'nestaffiliate-{width}.webp', lossless=True)
    resized.save(dest / f'nestaffiliate-transparent-v2-{width}.webp', lossless=True)

def icon(size, maskable=False):
    canvas = Image.new('RGBA', (size, size), (*background, 255) if maskable else (0,0,0,0))
    width = round(size * (0.66 if maskable else 0.78))
    symbol = mark.resize((width, round(width * mark.height / mark.width)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(symbol, ((size-symbol.width)//2, (size-symbol.height)//2))
    return canvas

for size in (16, 32, 48, 64, 128, 180, 192, 256, 512, 1024):
    icon(size).save(dest / f'icon-{size}.png', optimize=True)
for size in (192, 512):
    icon(size, True).save(dest / f'icon-maskable-{size}.png', optimize=True)
icon(256).save(root / 'apps/web/public/favicon.ico', sizes=[(16,16),(32,32),(48,48)])
icon(180, True).save(root / 'apps/web/public/apple-touch-icon.png', optimize=True)
social = Image.new('RGB', (1200, 630), background)
social_logo = logo.resize((1000, round(1000 * logo.height / logo.width)), Image.Resampling.LANCZOS)
social.paste(social_logo, (100, (630-social_logo.height)//2), social_logo)
social.save(dest / 'social-1200x630.png', optimize=True)
# Preserve compatibility for consumers of the former public SVG URL. The SVG
# embeds the exact approved raster symbol; it does not approximate its paths.
data = base64.b64encode((dest / 'icon-512.png').read_bytes()).decode()
(root / 'apps/web/public/icon.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="NestAffiliate">'
    f'<image width="512" height="512" href="data:image/png;base64,{data}"/></svg>\n'
)
