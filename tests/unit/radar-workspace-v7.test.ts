import {describe,it,expect} from 'vitest';
import type {Opportunity} from '@nestaffiliate/radar';
import type {ProductTruth} from '@nestaffiliate/core';
import {
 addRecentSearch,normalizeRadarKeyword,radarOfferId,sanitizeRadarWorkspace,
 snapshotRadarOffer,sortRadarOpportunities,toggleSavedRadarOffer,
} from '../../apps/web/src/lib/radarWorkspace';

const observedAt='2026-10-14T17:00:00.000Z';
const at=new Date('2026-10-14T19:00:00.000Z');
function offer(id:string,marketplace:'MELI'|'SHOPEE',price:number|null,sales:number|null,commission:number|null):Opportunity{
 const product:ProductTruth={
  productId:id,externalId:id,marketplace,organizationId:'org1',
  title:{value:'Organizador '+id,source:'official',observedAt},
  url:{value:marketplace==='MELI'?'https://www.mercadolivre.com.br/item/'+id:'https://shopee.com.br/'+id,source:'official',observedAt},
  currency:{value:'BRL',source:'official',observedAt},
  availability:{value:'available',source:'official',observedAt},
  listingVerified:true,assetRights:'UNKNOWN',
  ...(price!==null?{price:{value:price,source:'official',observedAt}}:{}),
  ...(sales!==null?{soldQuantity:{value:sales,source:'official',observedAt}}:{}),
  ...(commission!==null?{commissionRate:{value:commission,source:'affiliate-official',observedAt}}:{}),
 };
 return {
  id:'opp-'+id,organizationId:'org1',keyword:'organizador',product,
  score:{score:50,dimensions:{},confidence:'medium',reasons:[]} as Opportunity['score'],
  confidence:0.6,cluster:[],reasons:[],commercialSignals:[],rankingReasons:[],trackingCode:'test',createdAt:observedAt,
 };
}

describe('Radar 7 private workspace and evidence-aware decisions',()=>{
 it('deduplicates recent queries accent-insensitively and respects bounded history',()=>{
  expect(normalizeRadarKeyword('  OrganizAÇÃO   de COZINHA ')).toBe('organizacao de cozinha');
  expect(addRecentSearch(['Organização de cozinha','pets'],'organizacao de cozinha')).toEqual(['organizacao de cozinha','pets']);
  expect(Array.from({length:17}).reduce<string[]>((prev,_,i)=>addRecentSearch(prev,'item '+i),[])).toHaveLength(12);
 });
 it('sorts prices and observed sales without pretending missing numbers are zero',()=>{
  const items=[offer('unknown','MELI',null,null,null),offer('b','MELI',99,8,0.08),offer('a','SHOPEE',45,10,0.1)];
  expect(sortRadarOpportunities(items,'recommended').map(i=>i.product.externalId)).toEqual(['unknown','b','a']);
  expect(sortRadarOpportunities(items,'priceAsc').map(i=>i.product.externalId)).toEqual(['a','b','unknown']);
  expect(sortRadarOpportunities(items,'sales').map(i=>i.product.externalId)).toEqual(['a','b','unknown']);
  expect(sortRadarOpportunities(items,'commission').map(i=>i.product.externalId)).toEqual(['a','b','unknown']);
 });
 it('never conflates marketplace IDs, and saved snapshots preserve only verified offer links',()=>{
  const meli=offer('123','MELI',99,10,null),shopee=offer('123','SHOPEE',80,null,null);
  expect(radarOfferId(meli.product)).not.toBe(radarOfferId(shopee.product));
  const first=snapshotRadarOffer(meli,at);
  const selected=toggleSavedRadarOffer([],first);
  expect(toggleSavedRadarOffer(selected,first)).toHaveLength(0);
  expect(first.url).toContain('mercadolivre.com.br');
  const phish=offer('bad','MELI',20,null,null);
  phish.product.url.value='https://fake-mercadolivre.com.br/phishing';
  expect(snapshotRadarOffer(phish,at).url).toBeNull();
 });
 it('sanitizes prior records, drops stale data and rejects unauthorized destinations',()=>{
  const good=snapshotRadarOffer(offer('safe','MELI',120,null,null),at);
  const old={...good,id:'old',savedAt:'2026-08-01T00:00:00Z'};
  const evil={...good,id:'evil',url:'javascript:alert(1)'};
  const data=sanitizeRadarWorkspace({recentSearches:['pets','PETS'],saved:[good,old,evil],preferredCategory:'pet'},at);
  expect(data.saved).toHaveLength(2);
  expect(data.saved.find(v=>v.id==='evil')?.url).toBeNull();
  expect(data.recentSearches).toEqual(['PETS']);
  expect(data.preferredCategory).toBe('pet');
 });
});
