import type { ProductTruth, NestScoreDimensions, NestScoreResult, Marketplace } from '@nestaffiliate/core';
import { calculateNestScore } from '@nestaffiliate/scoring';

export type CommerceSignalSource =
  | 'RULE_ENGINE'
  | 'MELI_SEARCH'
  | 'MELI_TREND_GROWTH'
  | 'MELI_TREND_DESIRED'
  | 'MELI_TREND_POPULAR'
  | 'MELI_BEST_SELLER'
  | 'SHOPEE_RECOMMENDATION'
  | 'SHOPEE_EXTRA_COMMISSION'
  | 'SHOPEE_TOP_SALES'
  | 'PINTEREST_TRENDS'
  | 'INTERNAL_PERFORMANCE'
  | 'MANUAL';

export type CommerceSignalKind =
  | 'DEMAND'
  | 'BEST_SELLER'
  | 'YIELD'
  | 'PINTEREST_DEMAND'
  | 'COMPETITION_GAP'
  | 'INTERNAL_PERFORMANCE';

export interface CommerceSignal {
  id: string;
  source: CommerceSignalSource;
  kind: CommerceSignalKind;
  strength: number;
  confidence: number;
  observedAt: string;
  label: string;
  evidence: string[];
  rank?: number;
  keyword?: string;
  productExternalId?: string;
  commissionRate?: number;
  futureProvider?: boolean;
}

export interface OpportunitySignals {
  signals: CommerceSignal[];
  commissionRate?: number;
  internalEpmStrength?: number;
  internalConversionStrength?: number;
}

export interface TrendSignal {
  id: string;
  organizationId: string;
  source: 'RULE_ENGINE' | 'PINTEREST' | 'MARKETPLACE' | 'MANUAL';
  keyword: string;
  strength: number;
  confidence: number;
  observedAt: string;
  evidence: string[];
}

export interface Opportunity {
  id: string;
  organizationId: string;
  keyword: string;
  product: ProductTruth;
  score: NestScoreResult;
  confidence: number;
  cluster: string[];
  reasons: string[];
  commercialSignals: CommerceSignal[];
  rankingReasons: string[];
  trackingCode: string;
  createdAt: string;
}

const stopwords = new Set([
  'a','o','as','os','de','da','do','das','dos','e','em','para','por','com','um','uma','the','and','for','of'
]);

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function keywordCluster(value: string) {
  const base = normalizeSearchText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stopwords.has(token));
  const synonyms: Record<string,string[]> = {
    cozinha: ['organizacao','bancada','armario'],
    banheiro: ['organizacao','pequeno','decoracao'],
    lavanderia: ['organizacao','espaco','funcional'],
    quarto: ['aconchegante','organizacao','decoracao'],
    apartamento: ['pequeno','espaco','organizacao'],
    organizador: ['organizacao','guardar','espaco'],
  };
  const expanded = new Set(base);
  for (const token of base) for (const sibling of synonyms[token] ?? []) expanded.add(sibling);
  return [...expanded].slice(0, 12);
}

export function titleSimilarity(a: string, b: string) {
  const tokens = (value: string) => new Set(keywordCluster(value));
  const aa=tokens(a), bb=tokens(b);
  const union=new Set([...aa,...bb]);
  if (!union.size) return 0;
  let intersection=0;
  for (const value of aa) if (bb.has(value)) intersection += 1;
  return intersection / union.size;
}

export function dedupeProducts(products: ProductTruth[], threshold = 0.72) {
  const result: ProductTruth[] = [];
  for (const product of products) {
    if (!result.some((existing) => titleSimilarity(existing.title.value, product.title.value) >= threshold)) {
      result.push(product);
    }
  }
  return result;
}

export function seasonalScore(keyword: string, date = new Date()) {
  const month=date.getMonth()+1;
  const text=normalizeSearchText(keyword);
  let score=2;
  const reasons:string[]=[];
  if ([11,12].includes(month) && /decor|cozinha|casa|presente/.test(text)) {
    score=4; reasons.push('Sazonalidade de fim de ano compatível com casa e presentes.');
  } else if ([1,2].includes(month) && /organiz|rotina|casa|material/.test(text)) {
    score=4; reasons.push('Início de ano favorece intenção de organização e rotina.');
  } else if ([5,6].includes(month) && /quarto|aconcheg|casa|cozinha/.test(text)) {
    score=3; reasons.push('Período de clima mais frio favorece temas de casa e aconchego.');
  } else {
    reasons.push('Sem impulso sazonal forte no motor local.');
  }
  return { score, reasons };
}

export function dataConfidence(product: ProductTruth) {
  let points=0;
  if (product.title.value) points += 1;
  if (product.price) points += 1;
  if (product.sellerName) points += 1;
  if (product.rating || product.sellerReputation) points += 1;
  if (product.imageUrl) points += 1;
  if (product.availability.value === 'available') points += 1;
  return Math.min(1, points / 6);
}

export function buildSearchSignal(input:{
  marketplace:Marketplace;
  keyword:string;
  resultCount:number;
  confidence:number;
  observedAt?:string;
}):CommerceSignal{
  return {
    id:`search:${input.marketplace}:${normalizeSearchText(input.keyword)}`,
    source:input.marketplace==='MELI'?'MELI_SEARCH':'MANUAL',
    kind:'DEMAND',
    strength:clamp01(input.resultCount/25)*0.62,
    confidence:clamp01(input.confidence),
    observedAt:input.observedAt ?? new Date().toISOString(),
    label:'Demanda observada na busca',
    keyword:input.keyword,
    evidence:[`resultados:${input.resultCount}`],
  };
}

function weightedSignalStrength(signals:CommerceSignal[], kinds:CommerceSignalKind[]){
  const relevant=signals.filter((signal)=>kinds.includes(signal.kind) && !signal.futureProvider);
  if(!relevant.length) return null;
  const sorted=[...relevant].sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence));
  const strongest=sorted[0]!;
  const support=sorted.slice(1,3).reduce((sum,signal)=>sum+(signal.strength*signal.confidence*0.12),0);
  return clamp01(strongest.strength*strongest.confidence+support);
}

function baselineYield(product:ProductTruth){
  const price=product.price?.value ?? 0;
  if(!price) return 0.48;
  if(price>=35 && price<=140) return 0.76;
  if(price>140 && price<=250) return 0.64;
  if(price>0 && price<35) return 0.58;
  return 0.46;
}

function yieldStrength(product:ProductTruth, input:OpportunitySignals){
  const signals=input.signals.filter((signal)=>signal.kind==='YIELD' || signal.kind==='INTERNAL_PERFORMANCE');
  const signalStrength=weightedSignalStrength(signals,['YIELD','INTERNAL_PERFORMANCE']);
  let result=baselineYield(product);
  if(signalStrength!==null) result=Math.max(result,signalStrength);
  if(typeof input.commissionRate==='number'){
    const commission=clamp01(input.commissionRate/0.2);
    result=Math.max(result,commission);
  }
  if(typeof input.internalEpmStrength==='number') result=Math.max(result,clamp01(input.internalEpmStrength));
  if(typeof input.internalConversionStrength==='number') result=Math.max(result,clamp01(input.internalConversionStrength));
  return clamp01(result);
}

export function opportunityDimensions(
  product: ProductTruth,
  keyword: string,
  input: OpportunitySignals | number = { signals: [] },
): NestScoreDimensions {
  const signals:OpportunitySignals=typeof input==='number'
    ? {signals:[buildSearchSignal({marketplace:product.marketplace,keyword,resultCount:Math.round(clamp01(input)*25),confidence:0.75})]}
    : input;
  const confidence=dataConfidence(product);
  const seasonal=seasonalScore(keyword).score;
  const visual=product.imageUrl ? 0.82 : 0.5;
  const quality=product.rating
    ? Math.min(1,product.rating.value/5)
    : product.sellerReputation
      ? clamp01(product.sellerReputation.value)
      : 0.58;
  const intent=/compr|kit|organizador|suporte|dispens|prateleira|luminaria|tapete|cesto|armario|gancho|pote/.test(normalizeSearchText(keyword))
    ? 0.94
    : 0.74;

  const demand=weightedSignalStrength(signals.signals,['DEMAND','BEST_SELLER','PINTEREST_DEMAND']) ?? 0.55;
  const competition=weightedSignalStrength(signals.signals,['COMPETITION_GAP']) ?? 0.7;
  const creative=product.imageUrl ? 0.88 : 0.6;
  const yieldScore=yieldStrength(product,signals);
  const signalConfidence=signals.signals.length
    ? signals.signals.reduce((sum,signal)=>sum+signal.confidence,0)/signals.signals.length
    : 0;
  const combinedConfidence=clamp01(confidence*0.72+signalConfidence*0.28);

  return {
    trend: Math.round(18*demand),
    intent: Math.round(16*intent),
    visual: Math.round(14*visual),
    yield: Math.round(14*yieldScore),
    quality: Math.round(12*quality),
    competition: Math.round(10*competition),
    creative: Math.round(8*creative),
    seasonality: seasonal,
    dataConfidence: Math.max(1,Math.round(combinedConfidence*4)),
  };
}

function signalReason(signal:CommerceSignal){
  if(signal.rank) return `${signal.label} · #${signal.rank}`;
  if(typeof signal.commissionRate==='number') return `${signal.label} · ${(signal.commissionRate*100).toFixed(1)}%`;
  return signal.label;
}

export function affiliateTrackingCode(input:{
  marketplace:Marketplace;
  keyword:string;
  seed:string;
}){
  const market=input.marketplace==='MELI'?'ML':'SH';
  const slug=normalizeSearchText(input.keyword).split(' ').filter(Boolean).slice(0,3).join('_').slice(0,24).toUpperCase() || 'PRODUTO';
  const suffix=input.seed.replace(/[^a-zA-Z0-9]/g,'').slice(-6).toUpperCase() || '000001';
  return `NA_${market}_${slug}_${suffix}`;
}

export function buildOpportunity(
  product: ProductTruth,
  keyword: string,
  input: OpportunitySignals | number = { signals: [] },
): Opportunity {
  const signalInput:OpportunitySignals=typeof input==='number'
    ? {signals:[buildSearchSignal({marketplace:product.marketplace,keyword,resultCount:Math.round(clamp01(input)*25),confidence:0.75})]}
    : input;
  const score=calculateNestScore(opportunityDimensions(product,keyword,signalInput));
  const cluster=keywordCluster(keyword);
  const confidence=dataConfidence(product);
  const rankedSignals=[...signalInput.signals]
    .filter((signal)=>!signal.futureProvider)
    .sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence));
  const rankingReasons=[
    ...rankedSignals.slice(0,3).map(signalReason),
    ...score.reasons.slice(0,2),
  ];
  return {
    id:`opp:${product.marketplace}:${product.externalId}`,
    organizationId:product.organizationId,
    keyword,
    product,
    score,
    confidence,
    cluster,
    commercialSignals:signalInput.signals,
    rankingReasons,
    trackingCode:affiliateTrackingCode({
      marketplace:product.marketplace,
      keyword,
      seed:product.externalId,
    }),
    reasons:[
      ...score.reasons,
      ...rankedSignals.slice(0,3).map((signal)=>`Sinal: ${signalReason(signal)}`),
      ...seasonalScore(keyword).reasons,
      `Confiança factual: ${Math.round(confidence*100)}%`,
    ],
    createdAt:new Date().toISOString(),
  };
}

export function shortlist(
  products: ProductTruth[],
  keyword: string,
  limit = 6,
  signalResolver?: (product:ProductTruth)=>OpportunitySignals,
) {
  return dedupeProducts(products)
    .map((product)=>buildOpportunity(product,keyword,signalResolver?.(product) ?? {
      signals:[buildSearchSignal({
        marketplace:product.marketplace,
        keyword,
        resultCount:products.length,
        confidence:dataConfidence(product),
      })],
    }))
    .sort((a,b)=>b.score.score-a.score.score || b.confidence-a.confidence)
    .slice(0,limit)
    .map((opportunity,index)=>({
      ...opportunity,
      rankingReasons:[
        `Ranking #${index+1} entre as oportunidades analisadas`,
        ...opportunity.rankingReasons,
      ],
    }));
}
