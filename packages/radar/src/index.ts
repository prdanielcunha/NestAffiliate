import type { ProductTruth, NestScoreDimensions, NestScoreResult, Marketplace } from '@nestaffiliate/core';
import { calculateNestScore } from '@nestaffiliate/scoring';

export type CommerceSignalSource =
  | 'RULE_ENGINE'
  | 'MELI_SEARCH'
  | 'MELI_TREND_GROWTH'
  | 'MELI_TREND_DESIRED'
  | 'MELI_TREND_POPULAR'
  | 'MELI_BEST_SELLER'
  | 'SHOPEE_SEARCH_ASSISTED'
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
  | 'SUPPLY_DENSITY'
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
export const DEFAULT_MIN_VALIDATED_SALES=100;

export function isCommerceReadyProduct(
  product:ProductTruth,
  minSoldQuantity=DEFAULT_MIN_VALIDATED_SALES,
){
  const sold=product.soldQuantity?.value;
  const available=product.availableQuantity?.value;
  const stockPasses=typeof available!=='number' || available>0;
  // Missing sales are UNKNOWN_SALES, not proof of the minimum sales threshold.
  // Canonical/catalog entries cannot pass as a verified seller listing.
  const salesPass=typeof sold==='number' && Number.isFinite(sold) && sold>=minSoldQuantity;
  const identityPasses=product.listingVerified===true;
  const availabilityPasses=product.availability.value==='available';
  return identityPasses &&
    availabilityPasses &&
    stockPasses &&
    salesPass &&
    Boolean(product.url.value) &&
    Boolean(product.imageUrl?.value);
}

export type ProductPotentialBand='EXCEPTIONAL'|'VERY_HIGH'|'HIGH'|'VALIDATED';

export function productPotentialBand(opportunity:Pick<Opportunity,'score'|'product'>):ProductPotentialBand{
  const sold=Number(opportunity.product.soldQuantity?.value || 0);
  const score=opportunity.score.score;
  if(sold>=5000 && score>=65) return 'EXCEPTIONAL';
  if(sold>=1000 && score>=60) return 'VERY_HIGH';
  if(sold>=500 && score>=58) return 'HIGH';
  return 'VALIDATED';
}

function productPotentialPriority(opportunity:Opportunity){
  const band=productPotentialBand(opportunity);
  return band==='EXCEPTIONAL' ? 4 : band==='VERY_HIGH' ? 3 : band==='HIGH' ? 2 : 1;
}

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
    source:input.marketplace==='MELI' ? 'MELI_SEARCH' : input.marketplace==='SHOPEE' ? 'SHOPEE_SEARCH_ASSISTED' : 'MANUAL',
    kind:'SUPPLY_DENSITY',
    strength:clamp01(input.resultCount/25)*0.62,
    confidence:clamp01(input.confidence),
    observedAt:input.observedAt ?? new Date().toISOString(),
    label:input.marketplace==='SHOPEE' ? 'Shopee · Affiliate Open API · ofertas encontradas (não comprova demanda)' : 'Ofertas encontradas na busca (não comprova demanda)',
    keyword:input.keyword,
    evidence:[`anúncios retornados:${input.resultCount}`],
  };
}


export function buildMeliTrendSignal(input:{
  position:number;
  keyword:string;
  observedAt?:string;
}):CommerceSignal{
  const position=Math.max(1,Math.min(50,Math.round(input.position)));
  const segment=position<=10
    ? {source:'MELI_TREND_GROWTH' as const,label:'Mercado Livre · maior crescimento semanal',base:1,span:10}
    : position<=30
      ? {source:'MELI_TREND_DESIRED' as const,label:'Mercado Livre · buscas mais desejadas',base:0.86,span:20}
      : {source:'MELI_TREND_POPULAR' as const,label:'Mercado Livre · tendência popular',base:0.75,span:20};
  const segmentPosition=position<=10 ? position : position<=30 ? position-10 : position-30;
  const decay=(segmentPosition-1)/Math.max(1,segment.span-1);
  const floor=segment.source==='MELI_TREND_GROWTH' ? 0.78 : segment.source==='MELI_TREND_DESIRED' ? 0.66 : 0.56;
  const strength=clamp01(segment.base-(segment.base-floor)*decay);
  return {
    id:`meli-trend:${position}:${normalizeSearchText(input.keyword)}`,
    source:segment.source,
    kind:'DEMAND',
    strength,
    confidence:0.96,
    observedAt:input.observedAt ?? new Date().toISOString(),
    label:segment.label,
    rank:position,
    keyword:input.keyword,
    evidence:[`posição geral:${position}`,segment.label],
  };
}

export function buildMeliBestSellerSignal(input:{
  position:number;
  productExternalId:string;
  observedAt?:string;
}):CommerceSignal{
  const position=Math.max(1,Math.min(20,Math.round(input.position)));
  const strength=clamp01(1-((position-1)/19)*0.35);
  return {
    id:`meli-best:${input.productExternalId}:${position}`,
    source:'MELI_BEST_SELLER',
    kind:'BEST_SELLER',
    strength,
    confidence:0.98,
    observedAt:input.observedAt ?? new Date().toISOString(),
    label:'Mercado Livre · mais vendido na categoria',
    rank:position,
    productExternalId:input.productExternalId,
    evidence:[`bestseller #${position}`],
  };
}

export type ShopeeManualSignalType =
  | 'SHOPEE_RECOMMENDATION'
  | 'SHOPEE_EXTRA_COMMISSION'
  | 'SHOPEE_TOP_SALES';

export function buildShopeeManualSignals(input:{
  type:ShopeeManualSignalType;
  keyword:string;
  productExternalId:string;
  commissionRate?:number;
  rank?:number;
  observedAt?:string;
}):CommerceSignal[]{
  const observedAt=input.observedAt ?? new Date().toISOString();
  const signals:CommerceSignal[]=[];
  if(input.type==='SHOPEE_TOP_SALES'){
    const rank=Math.max(1,Math.min(100,Math.round(input.rank ?? 20)));
    signals.push({
      id:`shopee-sales:${input.productExternalId}:${rank}`,
      source:'SHOPEE_TOP_SALES',
      kind:'BEST_SELLER',
      strength:clamp01(0.9-((rank-1)/99)*0.35),
      confidence:input.rank ? 0.82 : 0.62,
      observedAt,
      label:'Shopee · Vendas Principais',
      rank:input.rank ? rank : undefined,
      keyword:input.keyword,
      productExternalId:input.productExternalId,
      evidence:[input.rank ? `posição informada:${rank}` : 'sinal manual: Vendas Principais'],
    });
  } else if(input.type==='SHOPEE_EXTRA_COMMISSION'){
    signals.push({
      id:`shopee-extra:${input.productExternalId}`,
      source:'SHOPEE_EXTRA_COMMISSION',
      kind:'YIELD',
      strength:typeof input.commissionRate==='number'
        ? clamp01(input.commissionRate/0.2)
        : 0.74,
      confidence:typeof input.commissionRate==='number' ? 0.9 : 0.7,
      observedAt,
      label:'Shopee · Comissão Extra',
      keyword:input.keyword,
      productExternalId:input.productExternalId,
      commissionRate:input.commissionRate,
      evidence:[typeof input.commissionRate==='number'
        ? `comissão informada:${(input.commissionRate*100).toFixed(2)}%`
        : 'selo Comissão Extra confirmado manualmente'],
    });
  } else {
    signals.push({
      id:`shopee-rec:${input.productExternalId}`,
      source:'SHOPEE_RECOMMENDATION',
      kind:'DEMAND',
      strength:0.62,
      confidence:0.66,
      observedAt,
      label:'Shopee · produto recomendado no programa de afiliados',
      keyword:input.keyword,
      productExternalId:input.productExternalId,
      evidence:['sinal manual: Recomendação da Shopee'],
    });
  }
  if(typeof input.commissionRate==='number' && input.type!=='SHOPEE_EXTRA_COMMISSION'){
    signals.push({
      id:`shopee-commission:${input.productExternalId}`,
      source:'SHOPEE_EXTRA_COMMISSION',
      kind:'YIELD',
      strength:clamp01(input.commissionRate/0.2),
      confidence:0.88,
      observedAt,
      label:'Shopee · taxa de comissão confirmada',
      keyword:input.keyword,
      productExternalId:input.productExternalId,
      commissionRate:input.commissionRate,
      evidence:[`comissão informada:${(input.commissionRate*100).toFixed(2)}%`],
    });
  }
  return signals;
}


export function buildShopeeOfferSignals(input:{
  keyword:string;
  productExternalId:string;
  sales?:number;
  commissionRate?:number;
  observedAt?:string;
}):CommerceSignal[]{
  const observedAt=input.observedAt ?? new Date().toISOString();
  const signals:CommerceSignal[]=[];
  if(typeof input.sales==='number' && input.sales>=0){
    signals.push({
      id:`shopee-api-sales:${input.productExternalId}`,
      source:'SHOPEE_TOP_SALES',
      kind:'BEST_SELLER',
      strength:clamp01(0.48+Math.log10(input.sales+1)*0.12),
      confidence:0.97,
      observedAt,
      label:'Shopee · vendas via Affiliate Open API',
      keyword:input.keyword,
      productExternalId:input.productExternalId,
      evidence:[`vendas oficiais:${Math.round(input.sales)}`],
    });
  }
  if(typeof input.commissionRate==='number' && input.commissionRate>=0){
    signals.push({
      id:`shopee-api-commission:${input.productExternalId}`,
      source:'SHOPEE_EXTRA_COMMISSION',
      kind:'YIELD',
      strength:clamp01(input.commissionRate/0.2),
      confidence:0.99,
      observedAt,
      label:'Shopee · comissão via Affiliate Open API',
      keyword:input.keyword,
      productExternalId:input.productExternalId,
      commissionRate:input.commissionRate,
      evidence:[`comissão oficial:${(input.commissionRate*100).toFixed(2)}%`],
    });
  }
  return signals;
}

export function buildPinterestTrendSignal(input:{
  keyword:string;
  strength:number;
  confidence:number;
  evidence:string[];
  observedAt?:string;
}):CommerceSignal{
  return {
    id:`pinterest-trend:${normalizeSearchText(input.keyword)}`,
    source:'PINTEREST_TRENDS',
    kind:'PINTEREST_DEMAND',
    strength:clamp01(input.strength),
    confidence:clamp01(input.confidence),
    observedAt:input.observedAt ?? new Date().toISOString(),
    label:'Pinterest Trends',
    keyword:input.keyword,
    evidence:input.evidence,
  };
}

function weightedSignalStrength(signals:CommerceSignal[], kinds:CommerceSignalKind[]){
  const relevant=signals.filter((signal)=>
    kinds.includes(signal.kind) &&
    !signal.futureProvider &&
    // Historic Radar 2 snapshots may have mislabeled search result counts as DEMAND.
    // Do not silently restore the false demand signal when reading persisted data.
    signal.source!=='MELI_SEARCH' &&
    signal.source!=='SHOPEE_SEARCH_ASSISTED'
  );
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

  const signalDemand=weightedSignalStrength(signals.signals,['DEMAND','BEST_SELLER','PINTEREST_DEMAND']) ?? 0.55;
  const soldQuantity=product.soldQuantity?.value;
  const salesDemand=typeof soldQuantity==='number' && soldQuantity>0
    ? clamp01(0.45+Math.log10(soldQuantity+1)*0.16)
    : 0;
  const demand=Math.max(signalDemand,salesDemand);
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
  const slug=normalizeSearchText(input.keyword).split(' ').filter(Boolean).slice(0,3).join('_').slice(0,32).toUpperCase() || 'PRODUTO';
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
  const salesReason=typeof product.soldQuantity?.value==='number'
    ? [`Vendas verificadas: ${Math.round(product.soldQuantity.value).toLocaleString('pt-BR')}`]
    : [];
  const rankingReasons=[
    ...salesReason,
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
    .sort((a,b)=>
      productPotentialPriority(b)-productPotentialPriority(a) ||
      b.score.score-a.score.score ||
      Number(b.product.soldQuantity?.value || 0)-Number(a.product.soldQuantity?.value || 0) ||
      b.confidence-a.confidence
    )
    .slice(0,limit)
    .map((opportunity)=>({
      ...opportunity,
      rankingReasons:[
        'Ordenação consolidada pelo NestScore 2.0',
        ...opportunity.rankingReasons,
      ],
    }));
}


export function relevantSignalsForProduct(
  product:ProductTruth,
  keyword:string,
  signals:CommerceSignal[],
){
  return signals.filter((signal)=>{
    if(signal.productExternalId && signal.productExternalId===product.externalId) return true;
    if(!signal.keyword) return false;
    const queryMatch=titleSimilarity(signal.keyword,keyword);
    const productMatch=titleSimilarity(signal.keyword,product.title.value);
    return Math.max(queryMatch,productMatch)>=0.28;
  });
}

export function signalResolverFromSnapshots(signals:CommerceSignal[]){
  return (product:ProductTruth,keyword:string):OpportunitySignals=>{
    const relevant=relevantSignalsForProduct(product,keyword,signals);
    const commissionSignal=relevant
      .filter((signal)=>typeof signal.commissionRate==='number')
      .sort((a,b)=>(b.commissionRate ?? 0)-(a.commissionRate ?? 0))[0];
    return {
      signals:relevant,
      commissionRate:commissionSignal?.commissionRate,
    };
  };
}


export function parseMeliTrendsPayload(payload:unknown,observedAt=new Date().toISOString()):CommerceSignal[]{
  if(!Array.isArray(payload)) throw new Error('MELI_TRENDS_PAYLOAD_INVALID');
  return payload.slice(0,50).map((row,index)=>{
    if(!row || typeof row!=='object') throw new Error('MELI_TRENDS_ROW_INVALID');
    const keyword=String((row as {keyword?:unknown}).keyword ?? '').trim();
    if(!keyword) throw new Error('MELI_TRENDS_KEYWORD_MISSING');
    return buildMeliTrendSignal({position:index+1,keyword,observedAt});
  });
}

export function parseMeliHighlightsPayload(payload:unknown,observedAt=new Date().toISOString()):CommerceSignal[]{
  if(!payload || typeof payload!=='object') throw new Error('MELI_HIGHLIGHTS_PAYLOAD_INVALID');
  const content=(payload as {content?:unknown}).content;
  if(!Array.isArray(content)) throw new Error('MELI_HIGHLIGHTS_CONTENT_INVALID');
  return content.slice(0,20).map((row,index)=>{
    if(!row || typeof row!=='object') throw new Error('MELI_HIGHLIGHTS_ROW_INVALID');
    const item=row as {id?:unknown;position?:unknown};
    const externalId=String(item.id ?? '').trim();
    if(!externalId) throw new Error('MELI_HIGHLIGHTS_ID_MISSING');
    const rawPosition=Number(item.position ?? index+1);
    const position=Number.isFinite(rawPosition) ? rawPosition : index+1;
    return buildMeliBestSellerSignal({position,productExternalId:externalId,observedAt});
  });
}

export function parseMeliOfficialSignals(input:{
  mode:'TRENDS'|'HIGHLIGHTS';
  raw:string;
  observedAt?:string;
}){
  let payload:unknown;
  try{
    payload=JSON.parse(input.raw);
  }catch{
    throw new Error('MELI_SIGNAL_JSON_INVALID');
  }
  return input.mode==='TRENDS'
    ? parseMeliTrendsPayload(payload,input.observedAt)
    : parseMeliHighlightsPayload(payload,input.observedAt);
}

export { assessRevenueOpportunity, revenueEvidence } from './revenueAssessment';
export type { RevenueAssessment, DemandEvidence, EvidenceStatus, OpportunityTrack, RevenueConfidence } from './revenueAssessment';
export { findComparableOffers } from './offerCompare';
export type { ComparableOffer } from './offerCompare';

// Side-by-side versioned scoring and discovery. Legacy exports remain stable.
export * from './opportunityV4';

export * from './problemIntents';
