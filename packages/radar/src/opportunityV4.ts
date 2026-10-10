import type { ProductReferenceAsset, ProductTruth } from '@nestaffiliate/core';
import type { CommerceSignal, Opportunity } from './index';

export const SCORE_V4_VERSION='potential-v4.0' as const;
export type OpportunityStateV4 =
  | 'READY_NOW' | 'NEAR_READY' | 'PROMISING' | 'SOURCE_LIMITED'
  | 'UNDER_REVIEW' | 'REJECTED' | 'EXPIRED';
export type EvidenceTruthV4='VERIFIED'|'REPORTED'|'INFERRED'|'UNKNOWN'|'STALE';
export type EvidenceKindV4 =
  | 'PROVIDER_DEMAND'|'PROVIDER_LISTING'|'OWN_PIN_ANALYTICS'|'OWN_APPROVED_COMMISSION'
  | 'EDITORIAL_HYPOTHESIS'|'SUPPLY_DENSITY'|'USER_SUBMITTED';
export type ConfidenceV4='HIGH'|'MEDIUM'|'LOW'|'INSUFFICIENT';
export type OpportunityReasonCodeV4 =
  | 'PROVIDER_RATE_LIMITED' | 'CATALOG_ONLY' | 'LISTING_UNRESOLVED'
  | 'SALES_UNKNOWN' | 'INVENTORY_UNKNOWN' | 'PRICE_STALE'
  | 'AFFILIATE_LINK_MISSING' | 'AFFILIATE_CHANNEL_NOT_VERIFIED'
  | 'ASSET_RIGHTS_UNKNOWN' | 'REFERENCE_MISSING' | 'VISUAL_MISMATCH'
  | 'DUPLICATE_CREATIVE' | 'UNSAFE_DESTINATION' | 'WRONG_VARIANT'
  | 'COMMERCIAL_EVIDENCE_WEAK' | 'OFFER_EXPIRED' | 'APPROVAL_REQUIRED';

export interface OpportunityV4Assessment {
  version:typeof SCORE_V4_VERSION;
  potential:{lower:number;provisional?:number;upper:number};
  readiness:{score:number;blockers:OpportunityReasonCodeV4[];recoverable:OpportunityReasonCodeV4[]};
  confidence:ConfidenceV4;
  sourceCoverage:{observed:string[];unknown:string[]};
  reasons:Array<{code:string;label:string;evidenceIds:string[]}>;
  status:OpportunityStateV4;
  providerState?:'HEALTHY'|'RATE_LIMITED'|'AUTH_REQUIRED'|'UNAVAILABLE';
  evaluatedAt:string;
  /** This is an investigative rank, not a conversion percentage. */
  legacyScore?:number;
}

export const POTENTIAL_WEIGHTS_V4={
  demand:25,pinterestFit:20,economics:20,listingQuality:15,
  faithfulCreative:10,competition:5,seasonality:5,
} as const;
export const READINESS_WEIGHTS_V4={
  listing:20,freshness:20,variant:15,affiliate:15,
  reference:15,fidelity:10,approval:5,
} as const;

const clip=(x:number)=>Math.max(0,Math.min(1,x));
const dateAgeHours=(date:string|undefined,now:Date)=>{
  const t=date ? Date.parse(date) : NaN;
  return Number.isFinite(t) && t<=now.getTime()+300000 ? (now.getTime()-t)/3600000 : Infinity;
};
/** Restricts schemes, local/private origins and confusable or shortened destinations. */
export function isSafeOfferUrl(raw:string|undefined,marketplace:ProductTruth['marketplace']):boolean {
  if(!raw) return false;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:' || u.username || u.password || u.port || u.hostname.endsWith('.') || u.hostname.includes('..')) return false;
    const host=u.hostname.toLowerCase();
    const permitted:Record<ProductTruth['marketplace'],string[]>={
      MELI:['mercadolivre.com.br','mercadolibre.com.br','mercadolibre.com','mercadolivre.com'],
      SHOPEE:['shopee.com.br','shopee.com'],
      AMAZON:['amazon.com.br','amazon.com'],
    };
    return permitted[marketplace].some(d=>host===d || host.endsWith('.'+d));
  }catch{return false;}
}
export function isSafeAffiliateUrl(raw:string|undefined,marketplace:ProductTruth['marketplace']):boolean {
  // Reject opaque redirects. Allow marketplace-owned short links only when explicitly known.
  if(!raw)return false;
  if(isSafeOfferUrl(raw,marketplace))return true;
  try{
    const u=new URL(raw);
    return u.protocol==='https:' && !u.username && !u.password && !u.port &&
      ((marketplace==='SHOPEE' && ['s.shopee.com.br','shope.ee'].includes(u.hostname.toLowerCase())) ||
        (marketplace==='MELI' && u.hostname.toLowerCase()==='meli.la' && /^\/[a-zA-Z0-9_-]{3,80}\/?$/.test(u.pathname)));
  }catch{return false;}
}

export function isDiscoverableProduct(product:ProductTruth):boolean {
  return Boolean(product.organizationId && product.externalId && product.title?.value?.trim().length>=4 &&
    product.marketplace && product.availability?.value!=='unavailable');
}
export function isReferenceAiReady(reference:ProductReferenceAsset|undefined,product:ProductTruth):boolean {
  return Boolean(reference && reference.organizationId===product.organizationId &&
    reference.productId===product.productId &&
    reference.externalListingId===product.externalId &&
    reference.marketplace===product.marketplace &&
    reference.referenceStatus==='READY_FOR_AI' && reference.canSendToExternalAI &&
    ['USER_ATTESTED','PLATFORM_LICENSED'].includes(reference.rights) &&
    reference.sha256 && reference.rightsEvidence);
}
export interface AssessOpportunityV4Input {
  product:ProductTruth;
  keyword:string;
  signals?:CommerceSignal[];
  reference?:ProductReferenceAsset;
  fidelityReviewed?:boolean;
  humanApproved?:boolean;
  affiliateChannelVerified?:boolean;
  providerState?:OpportunityV4Assessment['providerState'];
  sourceLimited?:boolean;
  now?:Date;
  legacyScore?:number;
}
export function assessOpportunityV4(input:AssessOpportunityV4Input):OpportunityV4Assessment {
  const {product:p,signals=[],reference}=input;
  const now=input.now??new Date();
  const observed:string[]=[];
  const unknown:string[]=[];
  const reasons:OpportunityV4Assessment['reasons']=[];
  let lower=0,upper=0;
  // Unknown dimensions remain null: no optimistic 0.55/0.7 or invented purchase intent.
  const record=(key:keyof typeof POTENTIAL_WEIGHTS_V4,score:number|null,kind:string,evidenceIds:string[]=[])=>{
    const weight=POTENTIAL_WEIGHTS_V4[key];
    if(score===null){unknown.push(key);upper+=weight;return;}
    const points=clip(score)*weight;
    observed.push(key+':'+kind);
    lower+=points;upper+=points;
    reasons.push({code:key,label:kind,evidenceIds});
  };
  const currentSignals=signals.filter(s=>
    !s.futureProvider && dateAgeHours(s.observedAt,now)<=168 &&
    !['MELI_SEARCH','SHOPEE_SEARCH_ASSISTED'].includes(s.source));
  const demandSignals=currentSignals.filter(s=>['DEMAND','BEST_SELLER','PINTEREST_DEMAND','INTERNAL_PERFORMANCE'].includes(s.kind));
  // Supplier search count is SUPPLY_DENSITY, never evidence of demand.
  const demand=demandSignals.length? [...demandSignals].sort((a,b)=>b.confidence*b.strength-a.confidence*a.strength)[0]! : null;
  record('demand',demand ? demand.strength*demand.confidence : null,
    demand?'Sinal de procura reportado, não venda garantida':'Demanda desconhecida',demand?[demand.id]:[]);
  const context=(input.keyword+' '+p.title.value).toLocaleLowerCase('pt-BR');
  const hasProblem=/organiz|cozinha|banheiro|lavander|escrit|home office|prateleir|cesto|suporte|mesa|decora|espaço|espaco/.test(context);
  record('pinterestFit',hasProblem?0.7:0.42,'Hipótese editorial de problema visual (não é CTR)');
  const freshPrice=typeof p.price?.value==='number' && p.price.value>0 && dateAgeHours(p.price.observedAt,now)<=72;
  const freshCommission=typeof p.commissionRate?.value==='number' && p.commissionRate.value>0 && dateAgeHours(p.commissionRate.observedAt,now)<=72;
  record('economics',freshPrice && freshCommission
    ? clip(0.4+Math.min(p.commissionRate!.value,0.2)*2)
    : null, 'Preço e comissão informados; sem projeção de faturamento');
  const reputation=typeof p.rating?.value==='number' ? clip(p.rating.value/5) :
    typeof p.sellerReputation?.value==='number' ? clip(p.sellerReputation.value) : null;
  record('listingQuality',reputation,'Qualidade de anúncio segundo avaliação disponível');
  record('faithfulCreative',p.imageUrl?.value?0.62:null,
    'Viabilidade editorial de cena; direito de reutilização ainda exige comprovação');
  const competition=currentSignals.find(s=>s.kind==='COMPETITION_GAP');
  record('competition',competition?clip(competition.strength*competition.confidence):null,
    'Sinal de concorrência observado',competition?[competition.id]:[]);
  record('seasonality',0.5,'Regra neutra do calendário, não tendência comprovada');
  const hasIdentity=isSafeOfferUrl(p.url.value,p.marketplace) && p.listingVerified===true;
  const freshOffer=p.availability.value==='available' && dateAgeHours(p.availability.observedAt,now)<=48;
  const correctVariant=hasIdentity && Boolean(p.externalId) && !p.catalogProductId?.startsWith('CATALOG_ONLY');
  const affiliate=isSafeAffiliateUrl(p.affiliateUrl?.value,p.marketplace) && input.affiliateChannelVerified===true;
  const asset=isReferenceAiReady(reference,p);
  const fidelity=asset && input.fidelityReviewed===true;
  const approval=input.humanApproved===true;
  const conditions=[
    {ok:hasIdentity,weight:20,reason:'LISTING_UNRESOLVED' as const},
    {ok:freshOffer,weight:20,reason:'PRICE_STALE' as const},
    {ok:correctVariant,weight:15,reason:'WRONG_VARIANT' as const},
    {ok:affiliate,weight:15,reason:!p.affiliateUrl?'AFFILIATE_LINK_MISSING' as const:'AFFILIATE_CHANNEL_NOT_VERIFIED' as const},
    {ok:asset,weight:15,reason:!reference?'REFERENCE_MISSING' as const:'ASSET_RIGHTS_UNKNOWN' as const},
    {ok:fidelity,weight:10,reason:'VISUAL_MISMATCH' as const},
    {ok:approval,weight:5,reason:'APPROVAL_REQUIRED' as const},
  ];
  const blockers:OpportunityReasonCodeV4[]=conditions.filter(c=>!c.ok).map(c=>c.reason);
  if(!isSafeOfferUrl(p.url.value,p.marketplace))blockers.unshift('UNSAFE_DESTINATION');
  const readiness=conditions.reduce((sum,c)=>sum+(c.ok?c.weight:0),0);
  const recoverable=[...new Set(blockers)].filter(x=>x!=='UNSAFE_DESTINATION' && x!=='VISUAL_MISMATCH');
  const criticalUnknown=['listing','demand','economics','listingQuality'].filter(k=>unknown.includes(k)).length;
  const confidence:ConfidenceV4=
    !isDiscoverableProduct(p) ? 'INSUFFICIENT' :
    demand && hasIdentity && criticalUnknown===0 ? 'HIGH' :
    hasIdentity && (demand || reputation!==null) ? 'MEDIUM' : 'LOW';
  const sourceIssue=input.sourceLimited || ['RATE_LIMITED','AUTH_REQUIRED','UNAVAILABLE'].includes(input.providerState??'');
  const status:OpportunityStateV4=
    p.availability.value==='unavailable' ? 'EXPIRED' :
    !isDiscoverableProduct(p) ? 'REJECTED' :
    sourceIssue ? 'SOURCE_LIMITED' :
    !hasIdentity ? 'PROMISING' :
    blockers.filter(x=>x!=='APPROVAL_REQUIRED').length===0 ? 'READY_NOW' :
    blockers.filter(x=>x!=='APPROVAL_REQUIRED').length<=2 ? 'NEAR_READY' :
    confidence==='INSUFFICIENT' ? 'UNDER_REVIEW' : 'PROMISING';
  const result:OpportunityV4Assessment={
    version:SCORE_V4_VERSION,
    potential:{lower:Math.round(lower),upper:Math.round(upper)},
    readiness:{score:readiness,blockers:[...new Set(blockers)],recoverable},
    confidence,sourceCoverage:{observed,unknown},reasons,status,
    providerState:input.providerState,evaluatedAt:now.toISOString(),legacyScore:input.legacyScore,
  };
  if(observed.length>=3)result.potential.provisional=Math.round((lower+upper)/2);
  return result;
}
export function rankCandidatePoolV4(
  opportunities:Opportunity[],
  evaluations:Record<string,OpportunityV4Assessment>,
  maxPerCluster=2,
):Opportunity[]{
  const sorted=[...opportunities].sort((a,b)=>{
    const aa=evaluations[a.id],bb=evaluations[b.id];
    // Measured lower bound first; uncertain upper bound is not disguised as confirmed demand.
    const order=(e?:OpportunityV4Assessment)=>e
      ? e.potential.lower + (e.confidence==='HIGH'?8:e.confidence==='MEDIUM'?4:0)
        + (e.status==='READY_NOW'?6:e.status==='NEAR_READY'?3:0)
      : 0;
    return order(bb)-order(aa) || a.id.localeCompare(b.id);
  });
  const counts=new Map<string,number>();
  const head:Opportunity[]=[];const tail:Opportunity[]=[];
  for(const opp of sorted){
    const key=(opp.cluster[0]??opp.keyword).toLocaleLowerCase('pt-BR');
    if((counts.get(key)??0)<maxPerCluster){head.push(opp);counts.set(key,(counts.get(key)??0)+1);}
    else tail.push(opp);
  }
  return [...head,...tail];
}

export interface RadarFunnelV4 {
  examined:number;
  discovery:number;
  resolvedListings:number;
  promising:number;
  nearReady:number;
  readyToPrepare:number;
  readyToPublish:number;
  sourceLimited:number;
  byReason:Record<string,number>;
}
export function buildRadarFunnelV4(
  evaluated:OpportunityV4Assessment[],
  examined:number,
):RadarFunnelV4 {
  const byReason:Record<string,number>={};
  for(const entry of evaluated)for(const reason of entry.readiness.blockers){
    byReason[reason]=(byReason[reason]??0)+1;
  }
  return {
    examined,discovery:evaluated.length,
    resolvedListings:evaluated.filter(e=>!e.readiness.blockers.includes('LISTING_UNRESOLVED')).length,
    promising:evaluated.filter(e=>e.status==='PROMISING').length,
    nearReady:evaluated.filter(e=>e.status==='NEAR_READY').length,
    readyToPrepare:evaluated.filter(e=>e.status==='READY_NOW').length,
    readyToPublish:evaluated.filter(e=>e.readiness.blockers.length===0).length,
    sourceLimited:evaluated.filter(e=>e.status==='SOURCE_LIMITED').length,
    byReason,
  };
}
