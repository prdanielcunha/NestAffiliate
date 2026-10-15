import {describe,it,expect} from 'vitest';
import type {ProductTruth} from '@nestaffiliate/core';
import {validGtin,assessOfferIdentity,offerFreshness,observationTime} from '../../packages/radar/src/offerTrust';

const stamp='2026-10-14T19:00:00.000Z';
const field=(value:string,source='official')=>({value,source,observedAt:stamp});
const product=(marketplace:'MELI'|'SHOPEE',externalId:string):ProductTruth=>({
 productId:externalId,externalId,marketplace,organizationId:'org-1',
 title:field('Organizador de cozinha'),url:field('https://www.mercadolivre.com.br/item/'+externalId),
 currency:field('BRL'),availability:{value:'available',source:'official',observedAt:stamp},
 assetRights:'UNKNOWN',
});

describe('Radar 9 official product identity and freshness',()=>{
 it('validates GS1 GTIN check digits before matching',()=>{
  expect(validGtin('4006381333931')).toBe('04006381333931');
  expect(validGtin('4006381333932')).toBeNull();
  expect(validGtin('1234567')).toBeNull();
  expect(validGtin('4006381333931-extra')).toBeNull();
 });
 it('proves exact cross-market identity only with matching valid official GTIN',()=>{
  const a={...product('MELI','MLB1'),gtin:field('4006381333931')};
  const b={...product('SHOPEE','SHP1'),gtin:field('4006381333931','shopee-affiliate-api')};
  expect(assessOfferIdentity(a,b).status).toBe('SAME_GTIN');
  expect(assessOfferIdentity(a,b).comparableAsSameProduct).toBe(true);
  expect(assessOfferIdentity(a,{...b,variantKey:field('azul')}).status).toBe('SAME_GTIN');
  expect(assessOfferIdentity({...a,variantKey:field('vermelho')},{...b,variantKey:field('azul')}).status).toBe('DIFFERENT');
 });
 it('does not infer equivalence from the same name or human/AI guessed GTIN',()=>{
  const a={...product('MELI','MLB1'),gtin:field('4006381333931','user-submitted')};
  const b={...product('SHOPEE','SHP1'),gtin:field('4006381333931','ai-estimate')};
  expect(assessOfferIdentity(a,b).status).toBe('NOT_VERIFIABLE');
  expect(assessOfferIdentity(a,b).comparableAsSameProduct).toBe(false);
  expect(assessOfferIdentity(product('MELI','MLB1'),product('MELI','MLB1')).status).toBe('SAME_LISTING');
 });
 it('flags different official GTINs, even if the product names look identical',()=>{
  const a={...product('MELI','MLB1'),gtin:field('4006381333931')};
  const b={...product('SHOPEE','SHP1'),gtin:field('9780306406157')};
  expect(assessOfferIdentity(a,b).status).toBe('DIFFERENT');
 });
 it('tracks age from the actual offer field, not only title date',()=>{
  const now=new Date('2026-10-14T21:00:00.000Z');
  expect(offerFreshness(stamp,now).status).toBe('CURRENT');
  expect(offerFreshness('2026-10-12T19:00:00.000Z',now).status).toBe('RECHECK');
  expect(offerFreshness('2026-10-01T19:00:00.000Z',now).status).toBe('STALE');
  expect(offerFreshness(undefined,now).status).toBe('UNKNOWN');
  expect(offerFreshness('2090-01-01T00:00:00Z',now).status).toBe('FUTURE');
  const p={...product('MELI','MLB1'),price:{value:40,source:'official',observedAt:'2026-10-01T19:00:00.000Z'}};
  expect(observationTime(p)).toBe('2026-10-01T19:00:00.000Z');
 });
});