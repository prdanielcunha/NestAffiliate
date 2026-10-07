import type { ProductTruth } from '@nestaffiliate/core';
import type { CommerceSignal, Opportunity } from './index';

export type EvidenceStatus='VERIFIED'|'REPORTED'|'INFERRED'|'UNKNOWN'|'STALE';
export type OpportunityTrack='VALIDATED'|'EXPLORATORY'|'REVIEW_REQUIRED'|'BLOCKED';
export type RevenueConfidence='UNKNOWN'|'LOW'|'MEDIUM'|'HIGH';
export interface DemandEvidence {
  source:string;
  observedAt:string;
  evidenceType:'SEARCH_TREND'|'BESTSELLER'|'OWN_PERFORMANCE'|'SUPPLY_DENSITY'|'MANUAL_RESEARCH';
  status:EvidenceStatus;
  provenanceId:string;
  evidence:string[];
  sourceUrl?:string;
}
export interface RevenueAssessment {
  baseNestScore:number;
  scoreVersion:string;
  demandConfidence:'LOW'|'MEDIUM'|'HIGH';
  offerConfidence:'LOW'|'MEDIUM'|'HIGH';
  revenueConfidence:RevenueConfidence;
  track:OpportunityTrack;
  reasons:string[];
  uncertainties:string[];
  evidence:DemandEvidence[];
  observedAt:string;
}
const DEMAND_SOURCES=new Set([
  'MELI_TREND_GROWTH','MELI_TREND_DESIRED','MELI_TREND_POPULAR',
  'MELI_BEST_SELLER','PINTEREST_TRENDS','INTERNAL_PERFORMANCE'
]);
function validDate(value:string){const time=Date.parse(value);return Number.isFinite(time)?time:null;}
function oldEnough(value:string,now:Date,hours:number) {
  const parsed=validDate(value);
  return parsed===null || parsed>now.getTime()+300_000 || now.getTime()-parsed>hours*3_600_000;
}
function publicHttps(raw?:string):boolean {
  if(!raw) return false;
  try{
    const u=new URL(raw);
    return u.protocol==='https:' && !u.username && !u.password && u.hostname.includes('.') &&
      u.hostname!=='localhost' && !u.hostname.endsWith('.localhost');
  }catch{return false;}
}
export function revenueEvidence(signal:CommerceSignal,now=new Date()):DemandEvidence {
  const evidenceType:DemandEvidence['evidenceType']=
    signal.kind==='SUPPLY_DENSITY' || ['MELI_SEARCH','SHOPEE_SEARCH_ASSISTED'].includes(signal.source)
      ? 'SUPPLY_DENSITY'
      : signal.kind==='BEST_SELLER' ? 'BESTSELLER'
        : signal.kind==='INTERNAL_PERFORMANCE' ? 'OWN_PERFORMANCE'
          : DEMAND_SOURCES.has(signal.source) ? 'SEARCH_TREND' : 'MANUAL_RESEARCH';
  const stale=oldEnough(signal.observedAt,now,168);
  return {
    source:signal.source,
    observedAt:signal.observedAt,
    evidenceType,
    // A declared provider source is reported evidence; only external authenticated
    // verification could promote it to VERIFIED.
    status:stale ? 'STALE' : signal.futureProvider ? 'UNKNOWN' :
      DEMAND_SOURCES.has(signal.source) ? 'REPORTED' : 'INFERRED',
    provenanceId:signal.id,
    evidence:signal.evidence,
  };
}
export function assessRevenueOpportunity(
  opportunity:Pick<Opportunity,'product'|'score'|'commercialSignals'>,
  now=new Date(),
):RevenueAssessment {
  const p:ProductTruth=opportunity.product;
  const evidence=opportunity.commercialSignals.map((signal)=>revenueEvidence(signal,now));
  const corroborating=evidence.filter((item)=>
    ['BESTSELLER','SEARCH_TREND','OWN_PERFORMANCE'].includes(item.evidenceType) && item.status==='REPORTED'
  );
  const independentSources=new Set(corroborating.map((item)=>item.source));
  const demandConfidence=independentSources.size>=2 ? 'HIGH' : independentSources.size===1 ? 'MEDIUM' : 'LOW';
  const uncertainties:string[]=[];
  const reasons:string[]=[];
  const sold=p.soldQuantity?.value;
  const itemValid=p.listingVerified===true && p.availability.value==='available' &&
    typeof sold==='number' && Number.isFinite(sold) && sold>=100 &&
    (p.availableQuantity===undefined || (Number.isFinite(p.availableQuantity.value) && p.availableQuantity.value>0));
  const staleProduct=oldEnough(p.availability.observedAt,now,48);
  const commissionConfirmed=typeof p.commissionRate?.value==='number' &&
    Number.isFinite(p.commissionRate.value) &&
    p.commissionRate.value>0 && p.commissionRate.value<=1 &&
    /affiliate|manual-confirmed|official/i.test(p.commissionRate.source) &&
    !oldEnough(p.commissionRate.observedAt,now,72);
  if(p.listingVerified!==true) uncertainties.push('LISTING_NOT_VERIFIED');
  if(typeof sold!=='number' || !Number.isFinite(sold)) uncertainties.push('UNKNOWN_SALES');
  if(!commissionConfirmed) uncertainties.push('COMMISSION_UNCONFIRMED');
  if(demandConfidence==='LOW') uncertainties.push('DEMAND_NOT_VERIFIED');
  if(staleProduct) uncertainties.push('OFFER_STALE');
  if(!['AUTHORIZED','PLATFORM_PROVIDED','USER_PROVIDED','GENERATED'].includes(p.assetRights)) uncertainties.push('ASSET_RIGHTS_UNKNOWN');
  if(!publicHttps(p.affiliateUrl?.value)) uncertainties.push('AFFILIATE_LINK_NOT_CONFIRMED');
  if(itemValid) reasons.push('VERIFIED_LISTING_AND_SALES');
  if(corroborating.length) reasons.push('INDEPENDENT_DEMAND_EVIDENCE');
  if(commissionConfirmed) reasons.push('PROVIDER_COMMISSION');
  const invalidDestination=!publicHttps(p.url.value);
  const blocked=invalidDestination || p.availability.value==='unavailable' || p.assetRights==='BLOCKED';
  const track:OpportunityTrack=blocked ? 'BLOCKED' :
    !itemValid ? 'EXPLORATORY' :
      staleProduct || !['AUTHORIZED','PLATFORM_PROVIDED','USER_PROVIDED','GENERATED'].includes(p.assetRights)
        ? 'REVIEW_REQUIRED' : 'VALIDATED';
  return {
    baseNestScore:opportunity.score.score,
    scoreVersion:opportunity.score.version,
    demandConfidence,
    offerConfidence:itemValid && !staleProduct ? 'HIGH' : p.listingVerified===true && !staleProduct ? 'MEDIUM' : 'LOW',
    revenueConfidence:commissionConfirmed && itemValid ? 'MEDIUM' : 'UNKNOWN',
    track,
    reasons,uncertainties,evidence,observedAt:now.toISOString(),
  };
}
