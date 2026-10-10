import type {ProductTruth} from '@nestaffiliate/core';
import {cleanSharedListingUrl,inferShopeeTitleFromUrl,parseShopeeProductReference} from '@nestaffiliate/integrations';
import {searchShopeeBrokerDetailed} from './shopeeBroker';
import type {User} from 'firebase/auth';

export type ShopeeLinkResolution =
 | {status:'RESOLVED';product:ProductTruth;source:'OFFICIAL_API'}
 | {status:'SOURCE_LIMITED'|'UNRESOLVED';reason:string};

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
 const reference=parseShopeeProductReference(source);
 if(!reference.itemId||!reference.shopId)
  return {status:'SOURCE_LIMITED',reason:'SHOPEE_SHORTLINK_NO_OFFICIAL_ID'};
 const title=inferShopeeTitleFromUrl(source);
 if(title.length<7)return {status:'SOURCE_LIMITED',reason:'SHOPEE_NO_SEARCHABLE_TITLE'};
 let candidates:ProductTruth[];
 try{
  const found=await searchShopeeBrokerDetailed({
   user:input.user,organizationId:input.organizationId,query:title,limit:50,
  });
  candidates=found.products;
 }catch{
  return {status:'SOURCE_LIMITED',reason:'SHOPEE_OFFICIAL_BROKER_UNAVAILABLE'};
 }
 const matching=candidates.find(p=>{
  if(p.marketplace!=='SHOPEE'||p.organizationId!==input.organizationId||p.listingVerified!==true)return false;
  const fromUrl=parseShopeeProductReference(p.url?.value??'');
  return (p.externalId===reference.itemId || fromUrl.itemId===reference.itemId)
    &&fromUrl.shopId===reference.shopId&&p.title?.value?.trim().length>=7
    &&p.url?.value?.startsWith('https://');
 });
 if(!matching)return {status:'SOURCE_LIMITED',reason:'SHOPEE_NO_EXACT_OFFICIAL_MATCH'};
 return {status:'RESOLVED',product:matching,source:'OFFICIAL_API'};
}
