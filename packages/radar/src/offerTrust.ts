import type {ProductTruth,TruthValue} from '@nestaffiliate/core';

export type OfferEquivalence = 'SAME_LISTING'|'SAME_GTIN'|'DIFFERENT'|'NOT_VERIFIABLE';
export interface OfferIdentityAssessment {
  status:OfferEquivalence;
  evidence:string[];
  /** Only an identical official GTIN or listing identity is enough to prove equivalence. */
  comparableAsSameProduct:boolean;
}

/** Check-digit validated GS1 identifiers, not a title/model similarity heuristic. */
export function validGtin(value:string):string|null {
  const digits=value.replace(/[\s-]/g,'');
  if(!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(digits))return null;
  const values=digits.split('').map(Number);
  let sum=0;
  for(let i=values.length-2,p=0;i>=0;i--,p++){
    sum+=values[i]!*(p%2===0?3:1);
  }
  return ((10-(sum%10))%10===values[values.length-1])?digits.padStart(14,'0'):null;
}
function providerReported(value:TruthValue<string>|undefined):string|null {
  if(!value || !value.value || !Number.isFinite(Date.parse(value.observedAt)))return null;
  // Provenance must be a named provider/official source. User fields and AI guesses never match.
  if(!/(^official$|mercadolivre|meli-api|shopee.*api|manufacturer-catalog)/i.test(value.source))return null;
  return value.value.trim();
}
export function assessOfferIdentity(a:ProductTruth,b:ProductTruth):OfferIdentityAssessment {
  if(a.marketplace===b.marketplace && a.externalId && a.externalId===b.externalId){
    return {status:'SAME_LISTING',evidence:['marketplace','externalId'],comparableAsSameProduct:true};
  }
  const ga=validGtin(providerReported(a.gtin)??''),gb=validGtin(providerReported(b.gtin)??'');
  if(ga && gb && ga!==gb){
    return {status:'DIFFERENT',evidence:['different GTIN'],comparableAsSameProduct:false};
  }
  const va=providerReported(a.variantKey),vb=providerReported(b.variantKey);
  if(va && vb && va.localeCompare(vb,undefined,{sensitivity:'base'})!==0){
    return {status:'DIFFERENT',evidence:['different variants'],comparableAsSameProduct:false};
  }
  if(ga && gb && ga===gb){
    // A GTIN identifies the exact trade item. Optional model/variant disagreements
    // were excluded above; conflicting reported models require review rather than a match.
    const ma=providerReported(a.modelNumber),mb=providerReported(b.modelNumber);
    if(ma && mb && ma.toLowerCase()!==mb.toLowerCase()){
      return {status:'NOT_VERIFIABLE',evidence:['GTIN matches but model differs'],comparableAsSameProduct:false};
    }
    return {status:'SAME_GTIN',evidence:['validated identical official GTIN'],comparableAsSameProduct:true};
  }
  return {status:'NOT_VERIFIABLE',evidence:['No comparable official GTIN; visual/name similarity is insufficient'],comparableAsSameProduct:false};
}

export type ObservationFreshness = 'CURRENT'|'RECHECK'|'STALE'|'UNKNOWN'|'FUTURE';
export interface OfferFreshness{
  status:ObservationFreshness;
  ageHours:number|null;
}
/** A timestamp is NOT proof of current availability; age bands are research prompts. */
export function offerFreshness(observedAt:string|undefined,now=new Date()):OfferFreshness{
  if(!observedAt)return {status:'UNKNOWN',ageHours:null};
  const time=Date.parse(observedAt),age=now.getTime()-time;
  if(!Number.isFinite(time))return {status:'UNKNOWN',ageHours:null};
  if(age< -60*60_000)return {status:'FUTURE',ageHours:null};
  if(age>72*60*60_000)return {status:'STALE',ageHours:Math.max(0,Math.floor(age/3600000))};
  if(age>24*60*60_000)return {status:'RECHECK',ageHours:Math.max(0,Math.floor(age/3600000))};
  return {status:'CURRENT',ageHours:Math.max(0,Math.floor(age/3600000))};
}
export function observationTime(product:ProductTruth):string|undefined {
  // Use price observation when comparing prices; otherwise use stock observation,
  // not merely the timestamp of the product title.
  return product.price?.observedAt ?? product.availability?.observedAt;
}
