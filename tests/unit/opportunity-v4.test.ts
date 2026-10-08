import { describe,expect,it } from 'vitest';
import { retryAfterMs } from '../../apps/web/src/services/mercadoLivreBroker';
import type { ProductTruth,ProductReferenceAsset } from '@nestaffiliate/core';
import { assessOpportunityV4,buildRadarFunnelV4,isDiscoverableProduct,isReferenceAiReady,isSafeOfferUrl,isSafeAffiliateUrl } from '../../packages/radar/src/opportunityV4';
const now=new Date('2026-10-08T13:00:00Z');
const product:ProductTruth={
 productId:'p1',organizationId:'org-1',marketplace:'MELI',externalId:'MLB-1',
 title:{value:'Organizador de cozinha',source:'official',observedAt:now.toISOString()},
 url:{value:'https://www.mercadolivre.com.br/item/MLB-1',source:'official',observedAt:now.toISOString()},
 currency:{value:'BRL',source:'official',observedAt:now.toISOString()},
 availability:{value:'available',source:'official',observedAt:now.toISOString()},
 listingVerified:true,assetRights:'UNKNOWN',
};
describe('Opportunity V4: evidence and hard gates',()=>{
 it('discovers when sales quantity is absent, but does not publish',()=>{
  const item=assessOpportunityV4({product,keyword:'organizador',now});
  expect(isDiscoverableProduct(product)).toBe(true);
  expect(item.status).toBe('PROMISING');
  expect(item.readiness.blockers).toContain('AFFILIATE_LINK_MISSING');
  expect(item.sourceCoverage.unknown).toContain('demand');
  expect(item.potential.upper).toBeGreaterThan(item.potential.lower);
 });
 it('does not treat number of listings as demand',()=>{
  const item=assessOpportunityV4({product,keyword:'cozinha',now,signals:[{
   id:'search1',kind:'SUPPLY_DENSITY',source:'MELI_SEARCH',strength:1,confidence:1,
   observedAt:now.toISOString(),label:'many items',evidence:[],
  }]});
  expect(item.sourceCoverage.unknown).toContain('demand');
 });
 it('does not confuse score with probability nor allow a rights-unknown image',()=>{
  const item=assessOpportunityV4({product,keyword:'cozinha',now});
  expect(item.readiness.blockers).toContain('REFERENCE_MISSING');
  expect(item.readiness.score).toBeLessThan(100);
  expect(item.version).toBe('potential-v4.0');
 });
 it('keeps provider rate-limit distinct from rejection',()=>{
  expect(assessOpportunityV4({product,keyword:'cozinha',providerState:'RATE_LIMITED',now}).status).toBe('SOURCE_LIMITED');
 });
 it('rejects invalid domains, private urls and URL credentials',()=>{
  expect(isSafeOfferUrl('https://127.0.0.1/a','MELI')).toBe(false);
  expect(isSafeOfferUrl('http://www.mercadolivre.com.br/a','MELI')).toBe(false);
  expect(isSafeOfferUrl('https://phishmercadolivre.com.br/a','MELI')).toBe(false);
  expect(isSafeOfferUrl(product.url.value,'MELI')).toBe(true);
 });
 it('requires owner evidence and exact listing for external AI reference',()=>{
  const ref:ProductReferenceAsset={
   id:'ref1',organizationId:'org-1',productId:'p1',marketplace:'MELI',
   externalListingId:'MLB-1',sourceType:'USER_OWN_PHOTO',rights:'USER_ATTESTED',
   referenceStatus:'READY_FOR_AI',canSendToExternalAI:true,rightsEvidence:'Own photograph, 2026-10-08',
   sha256:'a'.repeat(64),capturedAt:now.toISOString(),updatedAt:now.toISOString(),
  };
  expect(isReferenceAiReady(ref,product)).toBe(true);
  expect(isReferenceAiReady({...ref,externalListingId:'MLB-2'},product)).toBe(false);
  expect(isReferenceAiReady({...ref,rights:'VIEW_ONLY'},product)).toBe(false);
 });
 it('reports reasons even for empty publication funnel',()=>{
  const e=assessOpportunityV4({product,keyword:'cozinha',now});
  const funnel=buildRadarFunnelV4([e],105);
  expect(funnel.examined).toBe(105);
  expect(funnel.readyToPublish).toBe(0);
  expect(funnel.discovery).toBe(1);
  expect(funnel.byReason.AFFILIATE_LINK_MISSING).toBe(1);
 });
});

describe('Radar V4 source resilience and safe affiliate destinations',()=>{
 it('uses bounded Retry-After seconds and absolute HTTP date',()=>{
  const now=Date.parse('2026-10-08T17:00:00Z');
  expect(retryAfterMs('120',now)).toBe(120_000);
  expect(retryAfterMs('Thu, 08 Oct 2026 17:03:00 GMT',now)).toBe(180_000);
  expect(retryAfterMs(null,now)).toBe(60_000);
  expect(retryAfterMs('0',now)).toBe(60_000);
  expect(retryAfterMs('9999999',now)).toBe(3_600_000);
  expect(retryAfterMs('nonsense',now)).toBe(60_000);
 });
 it('does not launch arbitrary affiliate redirects',()=>{
  expect(isSafeAffiliateUrl('https://evil.example/steal','MELI')).toBe(false);
  expect(isSafeAffiliateUrl('http://www.mercadolivre.com.br/a','MELI')).toBe(false);
  expect(isSafeAffiliateUrl('https://www.mercadolivre.com.br/item/MLB-1','MELI')).toBe(true);
  expect(isSafeAffiliateUrl('https://s.shopee.com.br/offer','SHOPEE')).toBe(true);
  expect(isSafeAffiliateUrl('https://s.shopee.com.br.evil.test/offer','SHOPEE')).toBe(false);
 });
});
