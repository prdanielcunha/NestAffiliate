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


export interface PolicySnapshot {
  id:string;
  organizationId:string;
  provider:'PINTEREST'|'MELI'|'SHOPEE'|'CONAR'|'INTERNAL';
  title:string;
  sourceUrl?:string;
  checkedAt:string;
  reviewAfter:string;
  notes:string[];
}

export function isPolicySnapshotStale(snapshot:PolicySnapshot, now=new Date()){
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
