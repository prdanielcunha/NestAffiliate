import type { CampaignVersion } from '@nestaffiliate/core';

export const PIN_WIDTH = 1000 as const;
export const PIN_HEIGHT = 1500 as const;
export const SAFE_MARGIN = 72 as const;

export interface CreativeTheme {
  background: string;
  panel: string;
  text: string;
  muted: string;
  accent: string;
}

export interface CreativeTemplate {
  id: string;
  label: string;
  eyebrow: string;
  imageY: number;
  imageH: number;
  headlineY: number;
  headlineSize: number;
  headlineMaxLines: number;
  align: 'left' | 'center';
  treatment: 'editorial' | 'minimal' | 'problem' | 'collection';
  contextual?: boolean;
}

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  { id:'editorial-premium', label:'Editorial Premium', eyebrow:'ACHADOS DO NEST', imageY:220, imageH:620, headlineY:950, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'editorial' },
  { id:'problem-solution', label:'Problem → Solution', eyebrow:'PROBLEMA → SOLUÇÃO', imageY:245, imageH:555, headlineY:905, headlineSize:76, headlineMaxLines:4, align:'left', treatment:'problem' },
  { id:'minimal', label:'Minimal', eyebrow:'ACHADO INTELIGENTE', imageY:260, imageH:520, headlineY:905, headlineSize:82, headlineMaxLines:3, align:'left', treatment:'minimal' },
  { id:'hero-product', label:'Hero Product', eyebrow:'DESTAQUE DO NEST', imageY:180, imageH:760, headlineY:1035, headlineSize:64, headlineMaxLines:3, align:'left', treatment:'editorial' },
  { id:'checklist', label:'Checklist', eyebrow:'IDEIA PRÁTICA', imageY:245, imageH:500, headlineY:860, headlineSize:70, headlineMaxLines:4, align:'left', treatment:'collection' },
  { id:'before-after', label:'Before / After Concept', eyebrow:'ANTES → DEPOIS', imageY:220, imageH:590, headlineY:925, headlineSize:74, headlineMaxLines:4, align:'left', treatment:'problem' },
  { id:'small-space', label:'Small Space', eyebrow:'PEQUENOS ESPAÇOS', imageY:235, imageH:575, headlineY:925, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'editorial' },
  { id:'routine-hack', label:'Routine Hack', eyebrow:'FACILITA A ROTINA', imageY:255, imageH:520, headlineY:885, headlineSize:78, headlineMaxLines:4, align:'left', treatment:'minimal' },
  { id:'collection', label:'Collection', eyebrow:'CURADORIA DO NEST', imageY:235, imageH:555, headlineY:910, headlineSize:70, headlineMaxLines:4, align:'left', treatment:'collection' },
  { id:'seasonal', label:'Seasonal', eyebrow:'AGORA FAZ SENTIDO', imageY:225, imageH:590, headlineY:930, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'editorial' },
  { id:'lifestyle-full-bleed', label:'Lifestyle Full Bleed', eyebrow:'ACHADOS DO NEST', imageY:0, imageH:1500, headlineY:1010, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'editorial', contextual:true },
  { id:'lifestyle-headline', label:'Lifestyle + Headline', eyebrow:'IDEIA PARA SALVAR', imageY:0, imageH:1500, headlineY:960, headlineSize:78, headlineMaxLines:4, align:'left', treatment:'editorial', contextual:true },
  { id:'product-detail', label:'Product Detail', eyebrow:'DETALHE ÚTIL', imageY:0, imageH:1500, headlineY:1040, headlineSize:68, headlineMaxLines:4, align:'left', treatment:'minimal', contextual:true },
  { id:'room-inspiration', label:'Room Inspiration', eyebrow:'INSPIRAÇÃO', imageY:0, imageH:1500, headlineY:1000, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'editorial', contextual:true },
  { id:'before-after-contextual', label:'Before / After Contextual', eyebrow:'TRANSFORMAÇÃO', imageY:0, imageH:1500, headlineY:990, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'problem', contextual:true },
  { id:'small-space-contextual', label:'Small Space Contextual', eyebrow:'PEQUENOS ESPAÇOS', imageY:0, imageH:1500, headlineY:995, headlineSize:72, headlineMaxLines:4, align:'left', treatment:'editorial', contextual:true },
  { id:'utility-how-to', label:'Utility / How-to', eyebrow:'IDEIA PRÁTICA', imageY:0, imageH:1500, headlineY:1000, headlineSize:70, headlineMaxLines:4, align:'left', treatment:'collection', contextual:true },
  { id:'editorial-clean', label:'Editorial Clean', eyebrow:'CURADORIA DO NEST', imageY:0, imageH:1500, headlineY:1015, headlineSize:70, headlineMaxLines:4, align:'left', treatment:'minimal', contextual:true },
];

export const ACHADOS_DARK: CreativeTheme = {
  background: '#101412',
  panel: '#18201c',
  text: '#f6f8f4',
  muted: '#b7c0b9',
  accent: '#b8e36f',
};

const ACHADOS_LIGHT: CreativeTheme = {
  background: '#f2f0e9',
  panel: '#ffffff',
  text: '#172019',
  muted: '#667168',
  accent: '#456f2b',
};

export function templateFor(value: string): CreativeTemplate {
  const normalized=value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return CREATIVE_TEMPLATES.find((template)=>
    template.id===normalized ||
    template.label.toLowerCase()===value.toLowerCase() ||
    (value.toLowerCase().includes('problem') && template.id==='problem-solution') ||
    (value.toLowerCase().includes('minimal') && template.id==='minimal') ||
    (value.toLowerCase().includes('light') && template.id==='minimal')
  ) ?? CREATIVE_TEMPLATES[0]!;
}

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

function drawBackground(ctx:CanvasRenderingContext2D,template:CreativeTemplate,theme:CreativeTheme){
  const gradient=ctx.createLinearGradient(0,0,PIN_WIDTH,PIN_HEIGHT);
  gradient.addColorStop(0,theme.background);
  gradient.addColorStop(1,template.treatment==='problem' ? '#252018' : template.treatment==='collection' ? '#172020' : '#202a24');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,PIN_WIDTH,PIN_HEIGHT);

  if(template.treatment==='minimal'){
    ctx.strokeStyle=theme.accent;
    ctx.globalAlpha=.15;
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(820,170,240,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
  } else if(template.treatment==='problem'){
    ctx.fillStyle=theme.accent;
    ctx.globalAlpha=.08;
    ctx.fillRect(0,0,330,PIN_HEIGHT);
    ctx.globalAlpha=1;
  } else if(template.treatment==='collection'){
    ctx.fillStyle=theme.accent;
    ctx.globalAlpha=.07;
    ctx.beginPath();ctx.roundRect(610,55,330,160,34);ctx.fill();
    ctx.globalAlpha=1;
  }
}


async function loadCreativeImage(src:string){
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve,reject)=>{
    img.onload=()=>resolve();
    img.onerror=()=>reject(new Error('asset load failed'));
    img.src=src;
  });
  return img;
}

function drawCoverImage(ctx:CanvasRenderingContext2D,img:HTMLImageElement){
  const targetRatio=PIN_WIDTH/PIN_HEIGHT;
  const sourceRatio=img.width/img.height;
  let sx=0,sy=0,sw=img.width,sh=img.height;
  if(sourceRatio>targetRatio){
    sw=img.height*targetRatio;
    sx=(img.width-sw)/2;
  }else{
    sh=img.width/targetRatio;
    sy=(img.height-sh)/2;
  }
  ctx.drawImage(img,sx,sy,sw,sh,0,0,PIN_WIDTH,PIN_HEIGHT);
}

function drawContextOverlay(ctx:CanvasRenderingContext2D){
  const gradient=ctx.createLinearGradient(0,300,0,PIN_HEIGHT);
  gradient.addColorStop(0,'rgba(8,12,10,.05)');
  gradient.addColorStop(.55,'rgba(8,12,10,.18)');
  gradient.addColorStop(1,'rgba(8,12,10,.82)');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,PIN_WIDTH,PIN_HEIGHT);
}

export async function renderPin(
  canvas: HTMLCanvasElement,
  version: CampaignVersion,
  suppliedTheme?: CreativeTheme,
) {
  canvas.width = PIN_WIDTH;
  canvas.height = PIN_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const template=templateFor(version.template);
  const theme=suppliedTheme ?? (version.template.toLowerCase().includes('light') ? ACHADOS_LIGHT : ACHADOS_DARK);
  const contextualSrc=version.creativeAsset?.downloadUrl;
  let contextualRendered=false;
  if(template.contextual && contextualSrc && ['AUTHORIZED','USER_PROVIDED','GENERATED'].includes(version.creativeAsset?.rightsStatus ?? 'UNKNOWN')){
    try{
      const contextual=await loadCreativeImage(contextualSrc);
      drawCoverImage(ctx,contextual);
      drawContextOverlay(ctx);
      contextualRendered=true;
    }catch{
      drawBackground(ctx,template,theme);
    }
  }else{
    drawBackground(ctx,template,theme);
  }

  ctx.fillStyle = theme.accent;
  ctx.fillRect(SAFE_MARGIN, 80, template.treatment==='minimal' ? 42 : 72, 8);

  ctx.fillStyle = theme.muted;
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(template.eyebrow, SAFE_MARGIN, 145);

  drawKeywordBadge(ctx,version.keyword,theme,template);

  if (!contextualRendered) {
    const image = version.product.imageUrl?.value;
    const safeAsset = ['AUTHORIZED', 'PLATFORM_PROVIDED', 'USER_PROVIDED', 'GENERATED'].includes(version.product.assetRights);
    if (image && safeAsset) {
      try {
        const img = await loadCreativeImage(image);
        drawProductFrame(ctx,img,template,theme);
      } catch {
        drawProductPlaceholder(ctx, theme, template);
      }
    } else {
      drawProductPlaceholder(ctx, theme, template);
    }
  }

  const textX=SAFE_MARGIN;
  const textWidth=PIN_WIDTH-SAFE_MARGIN*2;
  ctx.fillStyle = theme.text;
  ctx.font = `750 ${template.headlineSize}px system-ui, sans-serif`;
  ctx.textAlign=template.align;
  const x=template.align==='center' ? PIN_WIDTH/2 : textX;
  const lines = wrapText(ctx, version.narrative.headline, textWidth, template.headlineMaxLines);
  const lineHeight=Math.round(template.headlineSize*1.14);
  lines.forEach((line,index)=>ctx.fillText(line,x,template.headlineY+index*lineHeight));
  ctx.textAlign='left';

  const subY=Math.min(1345,template.headlineY+lines.length*lineHeight+38);
  ctx.fillStyle = theme.muted;
  ctx.font = '500 29px system-ui, sans-serif';
  const sub = version.narrative.subheadline ?? version.narrative.cta;
  wrapText(ctx, sub, 780, 2).forEach((line,index)=>ctx.fillText(line,SAFE_MARGIN,subY+index*40));

  drawCta(ctx,version.narrative.cta,theme);
  drawFooter(ctx,theme);

  return canvas.toDataURL('image/png');
}

function drawProductFrame(ctx:CanvasRenderingContext2D,img:HTMLImageElement,template:CreativeTemplate,theme:CreativeTheme){
  const frameX=SAFE_MARGIN, frameY=template.imageY, frameW=PIN_WIDTH-SAFE_MARGIN*2, frameH=template.imageH;
  const scale=Math.min(frameW/img.width,frameH/img.height);
  const w=img.width*scale,h=img.height*scale;
  ctx.fillStyle=theme.panel;
  ctx.beginPath();ctx.roundRect(frameX,frameY,frameW,frameH,template.treatment==='minimal'?18:34);ctx.fill();
  ctx.drawImage(img,frameX+(frameW-w)/2,frameY+(frameH-h)/2,w,h);
}

function drawKeywordBadge(ctx:CanvasRenderingContext2D,keyword:string,theme:CreativeTheme,template:CreativeTemplate){
  if(template.treatment==='minimal') return;
  const label=keyword.toUpperCase().slice(0,34);
  ctx.font='700 18px system-ui, sans-serif';
  const width=Math.min(420,ctx.measureText(label).width+42);
  ctx.fillStyle=theme.panel;
  ctx.beginPath();ctx.roundRect(PIN_WIDTH-SAFE_MARGIN-width,80,width,42,21);ctx.fill();
  ctx.fillStyle=theme.muted;
  ctx.fillText(label,PIN_WIDTH-SAFE_MARGIN-width+21,107);
}

function drawCta(ctx:CanvasRenderingContext2D,cta:string,theme:CreativeTheme){
  const label=cta.toUpperCase().slice(0,26);
  ctx.font='750 23px system-ui, sans-serif';
  const width=Math.min(320,ctx.measureText(label).width+64);
  ctx.fillStyle=theme.accent;
  ctx.beginPath();ctx.roundRect(SAFE_MARGIN,1400,width,54,27);ctx.fill();
  ctx.fillStyle=theme.background;
  ctx.fillText(label,SAFE_MARGIN+32,1435);
}

function drawFooter(ctx:CanvasRenderingContext2D,theme:CreativeTheme){
  ctx.fillStyle=theme.muted;
  ctx.font='600 18px system-ui, sans-serif';
  ctx.textAlign='right';
  ctx.fillText('achados do nest',PIN_WIDTH-SAFE_MARGIN,1436);
  ctx.textAlign='left';
}

function drawProductPlaceholder(ctx: CanvasRenderingContext2D, theme: CreativeTheme, template:CreativeTemplate) {
  ctx.fillStyle = theme.panel;
  ctx.beginPath();
  ctx.roundRect(SAFE_MARGIN, template.imageY, PIN_WIDTH-SAFE_MARGIN*2, template.imageH, template.treatment==='minimal'?18:34);
  ctx.fill();
  ctx.fillStyle = theme.muted;
  ctx.font = '650 30px system-ui, sans-serif';
  ctx.fillText('Asset protegido', SAFE_MARGIN+38, template.imageY+82);
  ctx.font = '500 23px system-ui, sans-serif';
  const text='A imagem só entra quando o direito de uso estiver confirmado.';
  wrapText(ctx,text,720,2).forEach((line,index)=>ctx.fillText(line,SAFE_MARGIN+38,template.imageY+128+index*34));
}


export { buildSceneProfile, sceneIsCoherent } from './scene-engine/scene-rules';
export { scoreScene } from './scene-engine/scene-score';
export { buildCreativeConcepts } from './creative-director';
export {
  buildImagePrompt,
  translateImagePromptToPortuguese,
  IMAGE_PROMPT_TEMPLATE_ID,
  IMAGE_PROMPT_TEMPLATE_VERSION,
  SCENE_ENGINE_VERSION,
  CREATIVE_DIRECTOR_VERSION,
} from './prompt-builder';
export {
  validateScene,
  validatePromptClaims,
  validateProductFidelity,
  validateReferenceRights,
  validateEmbeddedTextPolicy,
  validateCommercialClaims,
  runVisualTruthGuard,
  truthConstraints,
} from './visual-truth';
export { buildPinterestCreativePack, versionPinterestCreativePack } from './pinterest-pack';
export {
  validateImageMetadata,
  detectImageMime,
  computeCoverCrop,
  sha256Hex,
  SUPPORTED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MIN_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  TARGET_IMAGE_WIDTH,
  TARGET_IMAGE_HEIGHT,
  TARGET_RATIO,
} from './image-processing';

export { createReelKit } from './reelKit';
export type { ReelKit } from './reelKit';
