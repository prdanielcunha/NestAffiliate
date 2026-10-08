import type { ProductTruth } from '@nestaffiliate/core';

export interface ComparableOffer {
  product:ProductTruth;
  equivalence:'REQUIRES_REVIEW';
  priceKnown:boolean;
  commissionConfirmed:boolean;
  estimatedCommissionPerSale:number|null;
  affiliateLinkReady:boolean;
  sellerDataKnown:boolean;
}
function tokens(text:string){
  const stop=new Set(['para','com','das','dos','the','and','de','da','do','em','um','uma','kit','pack','produto','novo','casa']);
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter((token)=>token.length>2&&!stop.has(token));
}
function roughSimilarity(a:string,b:string){
  const aa=new Set(tokens(a)),bb=new Set(tokens(b));
  if(!aa.size || !bb.size)return 0;
  const shared=[...aa].filter((token)=>bb.has(token)).length;
  return shared/Math.max(aa.size,bb.size);
}
function hasConflictingVariant(a:string,b:string){
  // Different sizes/models are NEVER silently normalized into the same offer.
  const sizes=(title:string)=>new Set((title.toLowerCase().match(/\b\d+(?:[.,]\d+)?\s?(?:cm|mm|ml|l|kg|g|unidades|pecas)\b/g)||[]).map(s=>s.replace(/\s/g,'')));
  const av=sizes(a),bv=sizes(b);
  return av.size>0 && bv.size>0 && [...av].every((item)=>!bv.has(item));
}
function isSafeLink(value?:string){
  if(!value)return false;
  try{
    const u=new URL(value);
    return u.protocol==='https:' && !u.username && !u.password &&
      u.hostname.includes('.') && u.hostname!=='localhost';
  }catch{return false;}
}
export function findComparableOffers(primary:ProductTruth,products:ProductTruth[],now=new Date()):ComparableOffer[]{
  return products.filter((item)=>
    item.marketplace!==primary.marketplace &&
    item.organizationId===primary.organizationId &&
    item.listingVerified===true &&
    item.availability.value==='available' &&
    !hasConflictingVariant(item.title.value,primary.title.value) &&
    roughSimilarity(primary.title.value,item.title.value)>=0.55
  ).map((product)=>{
    const rate=product.commissionRate;
    const commissionConfirmed=Boolean(rate && Number.isFinite(rate.value) &&
      rate.value>0 && rate.value<=1 &&
      /affiliate|manual-confirmed|official/i.test(rate.source) &&
      Number.isFinite(Date.parse(rate.observedAt)) &&
      now.getTime()-Date.parse(rate.observedAt)<=72*3_600_000);
    return {
      product,
      equivalence:'REQUIRES_REVIEW' as const,
      priceKnown:typeof product.price?.value==='number'&&Number.isFinite(product.price.value),
      commissionConfirmed,
      estimatedCommissionPerSale:commissionConfirmed && product.price && Number.isFinite(product.price.value)
        ? Number((product.price.value*rate!.value).toFixed(2)) : null,
      affiliateLinkReady:isSafeLink(product.affiliateUrl?.value),
      sellerDataKnown:Boolean(product.sellerName?.value),
    };
  });
}
