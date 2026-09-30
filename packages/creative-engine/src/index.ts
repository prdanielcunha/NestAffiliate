import type { CampaignVersion } from '@nestaffiliate/core';

export const PIN_WIDTH = 1000 as const;
export const PIN_HEIGHT = 1500 as const;

export interface CreativeTheme {
  background: string;
  panel: string;
  text: string;
  muted: string;
  accent: string;
}

export const ACHADOS_DARK: CreativeTheme = {
  background: '#101412',
  panel: '#18201c',
  text: '#f6f8f4',
  muted: '#b7c0b9',
  accent: '#b8e36f',
};

export function slugifyFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function campaignFilename(version: CampaignVersion) {
  const product = version.product.title.value.split(' ').slice(0, 4).join(' ');
  return `${slugifyFilename(version.keyword)}-${slugifyFilename(product)}-${String(version.version).padStart(2, '0')}.png`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export async function renderPin(
  canvas: HTMLCanvasElement,
  version: CampaignVersion,
  theme: CreativeTheme = ACHADOS_DARK,
) {
  canvas.width = PIN_WIDTH;
  canvas.height = PIN_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const gradient = ctx.createLinearGradient(0, 0, PIN_WIDTH, PIN_HEIGHT);
  gradient.addColorStop(0, theme.background);
  gradient.addColorStop(1, '#202a24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, PIN_WIDTH, PIN_HEIGHT);

  ctx.fillStyle = theme.accent;
  ctx.fillRect(72, 80, 72, 8);

  ctx.fillStyle = theme.muted;
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText('ACHADOS DO NEST', 72, 145);

  const image = version.product.imageUrl?.value;
  if (image && ['AUTHORIZED', 'PLATFORM_PROVIDED', 'USER_PROVIDED'].includes(version.product.assetRights)) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('asset load failed'));
        img.src = image;
      });
      const frameX = 72, frameY = 220, frameW = 856, frameH = 620;
      const scale = Math.min(frameW / img.width, frameH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.fillStyle = '#f4f2ec';
      ctx.beginPath();
      ctx.roundRect(frameX, frameY, frameW, frameH, 34);
      ctx.fill();
      ctx.drawImage(img, frameX + (frameW - w) / 2, frameY + (frameH - h) / 2, w, h);
    } catch {
      drawProductPlaceholder(ctx, theme);
    }
  } else {
    drawProductPlaceholder(ctx, theme);
  }

  ctx.fillStyle = theme.text;
  ctx.font = '700 72px system-ui, sans-serif';
  const lines = wrapText(ctx, version.narrative.headline, 856, 4);
  lines.forEach((line, index) => ctx.fillText(line, 72, 950 + index * 84));

  ctx.fillStyle = theme.muted;
  ctx.font = '500 30px system-ui, sans-serif';
  const sub = version.narrative.subheadline ?? version.narrative.cta;
  wrapText(ctx, sub, 780, 2).forEach((line, index) => ctx.fillText(line, 72, 1298 + index * 42));

  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.roundRect(72, 1400, 250, 54, 27);
  ctx.fill();
  ctx.fillStyle = '#111610';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(version.narrative.cta.toUpperCase(), 104, 1435);

  return canvas.toDataURL('image/png');
}

function drawProductPlaceholder(ctx: CanvasRenderingContext2D, theme: CreativeTheme) {
  ctx.fillStyle = theme.panel;
  ctx.beginPath();
  ctx.roundRect(72, 220, 856, 620, 34);
  ctx.fill();
  ctx.fillStyle = theme.muted;
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText('Produto selecionado', 110, 300);
  ctx.font = '500 24px system-ui, sans-serif';
  ctx.fillText('Asset será usado somente quando o direito de uso estiver validado.', 110, 350);
}
