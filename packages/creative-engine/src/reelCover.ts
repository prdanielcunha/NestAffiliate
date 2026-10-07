import type {CampaignVersion} from '@nestaffiliate/core';
import {renderPin,ACHADOS_DARK} from './index';

export const REEL_COVER_WIDTH=1080 as const;
export const REEL_COVER_HEIGHT=1920 as const;

/**
 * Render a 9:16 Reel cover locally from the existing zero-cost, rights-aware
 * Pin renderer. This does not generate a video or reuse unauthorized footage.
 */
export async function renderReelCover(canvas:HTMLCanvasElement,version:CampaignVersion,locale:'pt-BR'|'en'|'es'='pt-BR'){
  const pin=document.createElement('canvas');
  await renderPin(pin,version);
  canvas.width=REEL_COVER_WIDTH;
  canvas.height=REEL_COVER_HEIGHT;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
  ctx.fillStyle=ACHADOS_DARK.background;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // Preserve full 2:3 creative: resize to width and center within vertical cover.
  ctx.drawImage(pin,0,150,REEL_COVER_WIDTH,1620);
  ctx.fillStyle=ACHADOS_DARK.accent;
  ctx.fillRect(62,80,56,5);
  ctx.fillStyle=ACHADOS_DARK.text;
  ctx.font='700 27px system-ui,sans-serif';
  ctx.fillText('ACHADOS DO NEST',62,125);
  ctx.fillStyle=ACHADOS_DARK.muted;
  ctx.font='600 23px system-ui,sans-serif';
  ctx.fillText(locale==='pt-BR'?'CONTEÚDO DE AFILIADO':locale==='es'?'CONTENIDO DE AFILIADOS':'AFFILIATE CONTENT',62,1830);
  return canvas.toDataURL('image/png');
}
