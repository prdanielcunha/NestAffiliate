import {describe,it,expect,vi} from 'vitest';
import type {ProductTruth} from '@nestaffiliate/core';
import {parseSharedProductText} from '../../packages/integrations/src/index';
import {resolveShopeeProductLink} from '../../apps/web/src/services/shopeeProductResolver';
vi.mock('../../apps/web/src/services/shopeeBroker',()=>({searchShopeeBrokerDetailed:vi.fn()}));
import {searchShopeeBrokerDetailed} from '../../apps/web/src/services/shopeeBroker';
const search=vi.mocked(searchShopeeBrokerDetailed);
const user={getIdToken:async()=> 'synthetic-token'} as any;
const stamp='2026-10-10T15:00:00.000Z';
const product=(item='98765',shop='12345')=>({
 productId:'shopee:'+item,externalId:item,organizationId:'org',marketplace:'SHOPEE',listingVerified:true,
 title:{value:'Organizador de Cozinha',source:'shopee-affiliate-open-api',observedAt:stamp},
 shopId:{value:shop,source:'shopee-affiliate-open-api',observedAt:stamp},
 url:{value:'https://shopee.com.br/Organizador-de-Cozinha-i.'+shop+'.'+item,source:'shopee-affiliate-open-api',observedAt:stamp},
 currency:{value:'BRL',source:'shopee-affiliate-open-api',observedAt:stamp},
 availability:{value:'available',source:'shopee-affiliate-open-api',observedAt:stamp},assetRights:'UNKNOWN',
}) as ProductTruth;
const respond=(products:ProductTruth[])=>search.mockResolvedValue({
 products,query:'Organizador de Cozinha',source:'shopee-affiliate-open-api',
 provider:'SHOPEE',observedAt:stamp,meta:{catalogTotal:products.length,candidates:products.length,
 usable:products.length,minSoldQuantity:0,rejectedUnavailable:0,rejectedLowSales:0,rejectedUnverified:0,hasNextPage:false},
});
const input={user,organizationId:'org',url:'https://shopee.com.br/Organizador-de-Cozinha-i.12345.98765'};
describe('Shopee official link resolution',()=>{
 it('requires an exact shop and item match from the broker',async()=>{
  respond([product('11111'),product('98765','88888'),product()]);
  const result=await resolveShopeeProductLink(input);
  expect(result.status).toBe('RESOLVED');
  if(result.status==='RESOLVED')expect(result.product.externalId).toBe('98765');
 });
 it('accepts shop ID from official API if broker returns short product link',async()=>{
  const candidate=product();
  candidate.url.value='https://s.shopee.com.br/xyz987';
  respond([candidate]);
  expect((await resolveShopeeProductLink(input)).status).toBe('RESOLVED');
 });
 it('never verifies an unrelated item with similar title',async()=>{
  respond([product('11111')]);
  expect(await resolveShopeeProductLink(input)).toMatchObject({
   status:'SOURCE_LIMITED',reason:'SHOPEE_NO_EXACT_OFFICIAL_MATCH',
  });
 });
 it('does not infer product ids from opaque affiliate shortlinks',async()=>{
  search.mockClear();
  expect(await resolveShopeeProductLink({...input,url:'https://s.shopee.com.br/abc123'})).toMatchObject({
   status:'SOURCE_LIMITED',reason:'SHOPEE_SHORTLINK_NO_OFFICIAL_ID',
  });
  expect(search).not.toHaveBeenCalled();
 });
 it('rejects lookalike hosts and recognizes shortlinks in shared text',async()=>{
  expect(await resolveShopeeProductLink({...input,url:'https://shopee.com.br.evil.org/product/1/2'}))
   .toMatchObject({status:'UNRESOLVED'});
  expect(parseSharedProductText('https://s.shopee.com.br/abc123').marketplace).toBe('SHOPEE');
  expect(parseSharedProductText('https://shope.ee/abc123').marketplace).toBe('SHOPEE');
 });
});
