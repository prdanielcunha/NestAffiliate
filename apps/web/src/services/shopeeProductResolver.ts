import type {ProductTruth} from '@nestaffiliate/core';
import {cleanSharedListingUrl,inferShopeeTitleFromUrl,parseShopeeProductReference} from '../../../../packages/integrations/src/index';
import {searchShopeeBrokerDetailed} from './shopeeBroker';
import {isSafeOfferUrl} from '../../../../packages/radar/src/index';
import type {User} from 'firebase/auth';

export type ShopeeLinkResolution =
 | {status:'RESOLVED';product:ProductTruth;source:'OFFICIAL_API'}
 | {status:'SOURCE_LIMITED'|'UNRESOLVED';reason:string;titleHint?:string;canonicalUrl?:string};

/** Official source match only. A URL slug/shortlink is never verification. */
export async function resolveShopeeProductLink(input:{
 user:User;organizationId:string;url:string;
}):Promise<ShopeeLinkResolution>{
 const source=cleanSharedListingUrl(input.url);
 if(!source)return {status:'UNRESOLVED',reason:'SHOPEE_INVALID_LINK'};
 const host=new URL(source).hostname.toLowerCase();
 if(!(host==='shope.ee'||host==='shopee.com.br'||host.endsWith('.shopee.com.br')||
      host==='shopee.com'||host.endsWith('.shopee.com')))
  return {status:'UNRESOLVED',reason:'SHOPEE_INVALID_HOST'};
 let canonical=source;
 let titleHint='';
 // Only the Hub follows short redirects: browsers may be blocked by CORS,
 // and affiliate/tracking URLs are never treated as verified catalog data.
 if(new URL(source).hostname.toLowerCase()==='shope.ee'||
    new URL(source).hostname.toLowerCase()==='s.shopee.com.br'){
  try{
   const token=await input.user.getIdToken();
   const hub=(import.meta.env.VITE_HUB_URL||'https://www.millionsnest.com').replace(/\/$/,'');
   const response=await fetch(hub+'/api/v1/nestaffiliate/shopee/resolve',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({organizationId:input.organizationId,url:source}),
    signal:AbortSignal.timeout(29_000),
   });
   if(response.ok){
    const resolution=await response.json() as {
     status:string;canonicalUrl?:string;titleHint?:string;reason?:string;
    };
    if(resolution.canonicalUrl){
     const normalized=cleanSharedListingUrl(resolution.canonicalUrl);
     const host=normalized?new URL(normalized).hostname.toLowerCase():'';
     if(host==='shope.ee'||host==='shopee.com.br'||host==='www.shopee.com.br'||
        host==='shopee.com'||host==='www.shopee.com'||host==='s.shopee.com.br')
       canonical=normalized;
    }
    titleHint=(resolution.titleHint||'').slice(0,160);
   }
  }catch{
   // Keep original affiliate share URL untouched; opaque link stays pending.
  }
 }
 const reference=parseShopeeProductReference(canonical);
 if(!reference.itemId||!reference.shopId)
  return {status:'SOURCE_LIMITED',reason:'SHOPEE_SHORTLINK_NO_OFFICIAL_ID',canonicalUrl:canonical};
 const title=inferShopeeTitleFromUrl(canonical)||titleHint;
 if(title.length<7)return {status:'SOURCE_LIMITED',reason:'SHOPEE_NO_SEARCHABLE_TITLE',canonicalUrl:canonical};
 let candidates:ProductTruth[];
 try{
  const found=await searchShopeeBrokerDetailed({
   user:input.user,organizationId:input.organizationId,query:title,limit:50,
   signal:AbortSignal.timeout(12_000),
  });
  candidates=found.products;
 }catch{
  return {status:'SOURCE_LIMITED',reason:'SHOPEE_OFFICIAL_BROKER_UNAVAILABLE',titleHint:title,canonicalUrl:canonical};
 }
 const matching=candidates.find(p=>{
  if(p.marketplace!=='SHOPEE'||p.organizationId!==input.organizationId||p.listingVerified!==true)return false;
  const fromUrl=parseShopeeProductReference(p.url?.value??'');
  const trustedShop=p.shopId?.source==='shopee-affiliate-open-api'?p.shopId.value:fromUrl.shopId;
  return (p.externalId===reference.itemId || fromUrl.itemId===reference.itemId)
    &&trustedShop===reference.shopId&&p.title?.value?.trim().length>=7
    &&isSafeOfferUrl(p.url?.value??'','SHOPEE');
 });
 if(!matching)return {status:'SOURCE_LIMITED',reason:'SHOPEE_NO_EXACT_OFFICIAL_MATCH',titleHint:title,canonicalUrl:canonical};
 return {status:'RESOLVED',product:matching,source:'OFFICIAL_API'};
}
