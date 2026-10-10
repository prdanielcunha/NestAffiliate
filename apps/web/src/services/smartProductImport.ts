import type { User } from 'firebase/auth';
import type { ProductTruth } from '@nestaffiliate/core';
import { cleanSharedListingUrl } from '@nestaffiliate/integrations';
import { isSafeOfferUrl, isSafeAffiliateUrl } from '@nestaffiliate/radar';

const HUB=(import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com').replace(/\/$/,'');
export type SmartResolveResult={
  status:'RESOLVED'|'SOURCE_LIMITED'|'UNRESOLVED';
  product?:ProductTruth;
  canonicalUrl?:string;
  reason?:string;
  metadataOnly?:boolean;
};
export async function resolveOfficialProductLink(input:{
  user:User;organizationId:string;url:string;
}):Promise<SmartResolveResult>{
  const source=cleanSharedListingUrl(input.url);
  if(!source)throw new Error('INVALID_PRODUCT_URL');
  const parsed=new URL(source);
  const host=parsed.hostname.toLowerCase();
  if(host!=='meli.la'&&!['mercadolivre.com.br','mercadolibre.com.br','mercadolibre.com'].some(domain=>host===domain||host.endsWith('.'+domain)))
    throw new Error('PROVIDER_NOT_SUPPORTED');
  const token=await input.user.getIdToken();
  const response=await fetch(HUB+'/api/v1/nestaffiliate/mercadolivre/resolve',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({organizationId:input.organizationId,url:source}),
    signal:AbortSignal.timeout(19000),
  });
  if(!response.ok)throw new Error('PRODUCT_RESOLVE_'+response.status);
  const data=await response.json() as SmartResolveResult;
  if(data.status==='RESOLVED'&&data.product){
    const p=data.product;
    if(p.organizationId!==input.organizationId || p.marketplace!=='MELI' ||
      !(isSafeOfferUrl(p.url.value,'MELI') || (data.metadataOnly===true && isSafeAffiliateUrl(p.url.value,'MELI'))) ||
      !p.title?.value || !p.externalId)
      throw new Error('PRODUCT_RESOLVE_INVALID_IDENTITY');
  }
  return data;
}
export function attachDeclaredAffiliateUrl(product:ProductTruth,sourceUrl:string,declared:boolean):ProductTruth{
  if(!declared)return {...product,affiliateUrl:undefined,affiliateAttestation:undefined};
  const url=cleanSharedListingUrl(sourceUrl);
  if(!url)throw new Error('INVALID_AFFILIATE_LINK');
  const u=new URL(url);
  const hostname=u.hostname.toLowerCase();
  const accepted=product.marketplace==='MELI'
    ? hostname==='meli.la'||['mercadolivre.com.br','mercadolibre.com.br','mercadolibre.com'].some(domain=>hostname===domain||hostname.endsWith('.'+domain))
    : ['shopee.com.br','www.shopee.com.br','s.shopee.com.br','shope.ee','shopee.com'].includes(hostname);
  if(!accepted)throw new Error('AFFILIATE_MARKETPLACE_MISMATCH');
  return {...product,affiliateUrl:{value:url,source:'user-declared-affiliate-unverified',observedAt:new Date().toISOString()},
    affiliateAttestation:undefined};
}
