import type { ComplianceOutcome, ProductTruth } from '@nestaffiliate/core';

export interface GuardInput {
  product: ProductTruth;
  disclosure: string;
  destinationUrl: string;
  headline: string;
  description: string;
  duplicateSimilarity?: number;
  priceMaxAgeMinutes?: number;
  frequencyPolicy?: {
    maxPublications24h?: number;
    publications24h?: number;
    minGapMinutes?: number;
    minutesSinceLastPublication?: number;
  };
  now?: Date;
}

export interface GuardResult {
  outcome: ComplianceOutcome;
  checks: Array<{ key: string; outcome: ComplianceOutcome; message: string }>;
}

const forbiddenClaimPatterns = [
  /melhor\s+do\s+brasil/i,
  /garantid[oa]/i,
  /milagros[oa]/i,
  /100%\s+garant/i,
];

function worst(outcomes: ComplianceOutcome[]): ComplianceOutcome {
  if (outcomes.includes('BLOCK')) return 'BLOCK';
  if (outcomes.includes('WARN')) return 'WARN';
  return 'PASS';
}

export function runPublishingGuard(input: GuardInput): GuardResult {
  const checks: GuardResult['checks'] = [];
  const push = (key: string, outcome: ComplianceOutcome, message: string) =>
    checks.push({ key, outcome, message });

  push(
    'availability',
    input.product.availability.value === 'unavailable' ? 'BLOCK' : input.product.availability.value === 'unknown' ? 'WARN' : 'PASS',
    input.product.availability.value === 'available' ? 'Produto disponível.' : 'Disponibilidade precisa de atenção.',
  );

  try {
    const url = new URL(input.destinationUrl);
    push('link', url.protocol === 'https:' ? 'PASS' : 'BLOCK', 'Link de destino validado.');
  } catch {
    push('link', 'BLOCK', 'Link de destino inválido.');
  }

  const affiliateUrl = input.product.affiliateUrl?.value;
  if (input.product.marketplace === 'MELI') {
    let affiliateValid = false;
    if (affiliateUrl) {
      try {
        affiliateValid = new URL(affiliateUrl).protocol === 'https:';
      } catch {
        affiliateValid = false;
      }
    }
    push(
      'affiliate-link',
      affiliateValid ? 'PASS' : 'BLOCK',
      affiliateValid
        ? 'Link afiliado do Mercado Livre validado.'
        : 'Adicione um link afiliado válido antes de publicar.',
    );
  } else if (input.product.marketplace === 'SHOPEE' && !affiliateUrl) {
    push(
      'affiliate-link',
      'WARN',
      'Confirme a marcação oficial do produto Shopee no Pinterest antes de publicar.',
    );
  }

  push(
    'asset-rights',
    ['AUTHORIZED', 'PLATFORM_PROVIDED', 'USER_PROVIDED', 'GENERATED'].includes(input.product.assetRights)
      ? 'PASS'
      : input.product.assetRights === 'UNKNOWN'
        ? 'WARN'
        : 'BLOCK',
    'Direito de uso do asset verificado.',
  );

  push(
    'disclosure',
    /afiliad|comiss/i.test(input.disclosure) ? 'PASS' : 'BLOCK',
    'Natureza afiliada precisa estar clara.',
  );

  const text = `${input.headline} ${input.description}`;
  push(
    'claims',
    forbiddenClaimPatterns.some((pattern) => pattern.test(text)) ? 'BLOCK' : 'PASS',
    'Claims comerciais revisados.',
  );

  const similarity = input.duplicateSimilarity ?? 0;
  push(
    'duplicate',
    similarity >= 0.92 ? 'BLOCK' : similarity >= 0.8 ? 'WARN' : 'PASS',
    similarity >= 0.8 ? 'Campanha semelhante a conteúdo recente.' : 'Sem duplicação crítica.',
  );

  if (input.frequencyPolicy) {
    const {
      maxPublications24h,
      publications24h = 0,
      minGapMinutes,
      minutesSinceLastPublication,
    } = input.frequencyPolicy;
    if (typeof maxPublications24h === 'number') {
      push(
        'frequency-daily',
        publications24h >= maxPublications24h ? 'BLOCK' : 'PASS',
        publications24h >= maxPublications24h
          ? 'Limite editorial configurado para 24h foi atingido.'
          : 'Frequência diária dentro da política configurada.',
      );
    }
    if (typeof minGapMinutes === 'number' && typeof minutesSinceLastPublication === 'number') {
      push(
        'frequency-gap',
        minutesSinceLastPublication < minGapMinutes ? 'WARN' : 'PASS',
        minutesSinceLastPublication < minGapMinutes
          ? 'Intervalo curto em relação à política editorial configurada.'
          : 'Intervalo entre publicações adequado.',
      );
    }
  }

  if (input.product.price) {
    const now = (input.now ?? new Date()).getTime();
    const observed = new Date(input.product.price.observedAt).getTime();
    const maxAge = (input.priceMaxAgeMinutes ?? 60) * 60_000;
    push(
      'price-freshness',
      Number.isFinite(observed) && now - observed <= maxAge ? 'PASS' : 'WARN',
      'Preço precisa estar fresco se aparecer no criativo.',
    );
  }

  return { outcome: worst(checks.map((check) => check.outcome)), checks };
}


export type PolicyProvider='PINTEREST'|'MELI'|'SHOPEE'|'CONAR'|'INTERNAL';

export interface PolicySnapshot {
  id:string;
  organizationId:string;
  provider:PolicyProvider;
  title:string;
  version:string;
  effectiveDate?:string;
  sourceUrl?:string;
  summary:string;
  impact:string[];
  reviewedAt:string;
  reviewAfter:string;
  notes:string[];
}

export function isPolicySnapshotStale(snapshot:Pick<PolicySnapshot,'reviewAfter'>, now=new Date()){
  const reviewAt=new Date(snapshot.reviewAfter).getTime();
  return !Number.isFinite(reviewAt) || reviewAt <= now.getTime();
}

export function nextPolicyReviewDate(checkedAt=new Date(), days=30){
  const next=new Date(checkedAt);
  next.setUTCDate(next.getUTCDate()+Math.max(1,days));
  return next.toISOString();
}


export type FreshValidationOutcome='PASS'|'REVIEW_REQUIRED'|'BLOCK';

export interface FreshValidationChange {
  field:'title'|'url'|'affiliateUrl'|'price'|'availability';
  outcome:FreshValidationOutcome;
  before?:string|number;
  after?:string|number;
  message:string;
}

export interface FreshValidationResult {
  outcome:FreshValidationOutcome;
  changes:FreshValidationChange[];
  validatedAt:string;
}

function freshWorst(values:FreshValidationOutcome[]):FreshValidationOutcome{
  if(values.includes('BLOCK')) return 'BLOCK';
  if(values.includes('REVIEW_REQUIRED')) return 'REVIEW_REQUIRED';
  return 'PASS';
}

export function validateFreshProduct(
  approved:ProductTruth,
  current:ProductTruth,
  now=new Date(),
):FreshValidationResult{
  const changes:FreshValidationChange[]=[];
  const push=(change:FreshValidationChange)=>changes.push(change);

  if(current.availability.value==='unavailable'){
    push({
      field:'availability',
      outcome:'BLOCK',
      before:approved.availability.value,
      after:current.availability.value,
      message:'O produto ficou indisponível depois da aprovação.',
    });
  } else if(approved.availability.value!==current.availability.value){
    push({
      field:'availability',
      outcome:'REVIEW_REQUIRED',
      before:approved.availability.value,
      after:current.availability.value,
      message:'A disponibilidade mudou desde a aprovação.',
    });
  }

  if(approved.url.value!==current.url.value){
    push({
      field:'url',
      outcome:'REVIEW_REQUIRED',
      before:approved.url.value,
      after:current.url.value,
      message:'A URL oficial do produto mudou.',
    });
  }

  const oldAffiliate=approved.affiliateUrl?.value;
  const newAffiliate=current.affiliateUrl?.value;
  if(oldAffiliate!==newAffiliate){
    push({
      field:'affiliateUrl',
      outcome:'REVIEW_REQUIRED',
      before:oldAffiliate,
      after:newAffiliate,
      message:'O link afiliado mudou e precisa de nova aprovação.',
    });
  }

  if(approved.title.value.trim()!==current.title.value.trim()){
    push({
      field:'title',
      outcome:'REVIEW_REQUIRED',
      before:approved.title.value,
      after:current.title.value,
      message:'O título oficial do produto mudou.',
    });
  }

  if(approved.price && current.price && approved.price.value!==current.price.value){
    push({
      field:'price',
      outcome:'REVIEW_REQUIRED',
      before:approved.price.value,
      after:current.price.value,
      message:'O preço mudou desde a aprovação.',
    });
  } else if(approved.price && !current.price){
    push({
      field:'price',
      outcome:'REVIEW_REQUIRED',
      before:approved.price.value,
      message:'Não foi possível confirmar o preço atual.',
    });
  }

  return {
    outcome:freshWorst(changes.map((change)=>change.outcome)),
    changes,
    validatedAt:now.toISOString(),
  };
}


export type PolicyBaseline = Omit<PolicySnapshot,'organizationId'>;

export const POLICY_BASELINES:PolicyBaseline[]=[
  {
    id:'pinterest-affiliate-guidelines',
    provider:'PINTEREST',
    title:'Pinterest — Conteúdo comercial e afiliados',
    version:'reviewed-2026-10-01',
    sourceUrl:'https://policy.pinterest.com/pt-br/commercial-and-branded-content-guidelines',
    summary:'Conteúdo afiliado deve ser original, agregar valor, deixar a natureza comercial clara e evitar comportamento repetitivo ou spam.',
    impact:['disclosure','conteúdo','volume','links'],
    reviewedAt:'2026-10-01T00:00:00.000Z',
    reviewAfter:'2026-10-31T00:00:00.000Z',
    notes:['Manter uma presença autêntica e não manipular saves ou distribuição.'],
  },
  {
    id:'pinterest-access-tiers',
    provider:'PINTEREST',
    title:'Pinterest — Access Tiers',
    version:'reviewed-2026-10-01',
    sourceUrl:'https://developers.pinterest.com/docs/key-concepts/access-tiers/',
    summary:'Trial permite testar a API, mas Pins e boards criados são entidades Sandbox visíveis apenas ao criador; produção pública requer Standard Access.',
    impact:['api','publicação','analytics'],
    reviewedAt:'2026-10-01T00:00:00.000Z',
    reviewAfter:'2026-10-31T00:00:00.000Z',
    notes:['Auto-publish público permanece bloqueado enquanto Standard Access estiver ausente.'],
  },
  {
    id:'pinterest-oauth',
    provider:'PINTEREST',
    title:'Pinterest — OAuth e tokens',
    version:'reviewed-2026-10-01',
    sourceUrl:'https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/',
    summary:'Authorization Code exige troca segura do código por token com client secret fora do navegador; tokens devem ser mantidos atualizados.',
    impact:['oauth','secrets','conexões'],
    reviewedAt:'2026-10-01T00:00:00.000Z',
    reviewAfter:'2026-10-31T00:00:00.000Z',
    notes:['Nunca armazenar client secret ou refresh token em documento legível pelo frontend.'],
  },
  {
    id:'meli-items-bulk',
    provider:'MELI',
    title:'Mercado Livre — migração de consulta de itens',
    version:'reviewed-2026-10-01',
    effectiveDate:'2026-10-25',
    sourceUrl:'https://developers.mercadolivre.com.br/pt_br/itens-e-buscas',
    summary:'Novas integrações devem usar /items/bulk e /users/bulk no lugar dos multigets antigos.',
    impact:['produto','fresh-validation','api'],
    reviewedAt:'2026-10-01T00:00:00.000Z',
    reviewAfter:'2026-10-20T00:00:00.000Z',
    notes:['Fresh validation do NestAffiliate já usa /items/bulk.'],
  },
  {
    id:'shopee-pinterest-affiliate',
    provider:'SHOPEE',
    title:'Shopee — parceria de afiliados com Pinterest',
    version:'reviewed-2026-10-01',
    sourceUrl:'https://help.shopee.com.br/portal/10/article/224179-Parceria-com-Afiliados-do-Pinterest',
    summary:'A integração oficial permite vincular Shopee ao Pinterest e marcar produtos do catálogo nos Pins, com geração de link afiliado pela experiência oficial.',
    impact:['links','publicação','produto'],
    reviewedAt:'2026-10-01T00:00:00.000Z',
    reviewAfter:'2026-10-31T00:00:00.000Z',
    notes:['O Guided Publisher mantém uma confirmação especial para a marcação Shopee.'],
  },
  {
    id:'conar-influencer-guide',
    provider:'CONAR',
    title:'CONAR — publicidade por influenciadores digitais',
    version:'2026-guide',
    effectiveDate:'2026-06-01',
    sourceUrl:'https://www.conar.org.br/diretrizes',
    summary:'Conteúdo comercial em redes sociais deve ter identificação publicitária clara, apresentação verdadeira e governança de conformidade.',
    impact:['disclosure','claims','conteúdo','ia'],
    reviewedAt:'2026-10-01T00:00:00.000Z',
    reviewAfter:'2026-10-31T00:00:00.000Z',
    notes:['A atualização de 2026 também trata do uso de inteligência artificial na publicidade.'],
  },
];

export function policyWatchStatus(baseline:PolicyBaseline,now=new Date()){
  if(isPolicySnapshotStale(baseline,now)) return 'REVIEW_DUE' as const;
  const reviewAt=new Date(baseline.reviewAfter).getTime();
  const days=Math.ceil((reviewAt-now.getTime())/86_400_000);
  return days<=7 ? 'REVIEW_SOON' as const : 'CURRENT' as const;
}

export function policyWatchSummary(now=new Date()){
  const statuses=POLICY_BASELINES.map((baseline)=>({baseline,status:policyWatchStatus(baseline,now)}));
  return {
    current:statuses.filter((item)=>item.status==='CURRENT').length,
    reviewSoon:statuses.filter((item)=>item.status==='REVIEW_SOON').length,
    reviewDue:statuses.filter((item)=>item.status==='REVIEW_DUE').length,
    statuses,
  };
}
