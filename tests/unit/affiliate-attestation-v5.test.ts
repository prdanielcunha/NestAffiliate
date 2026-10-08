import { describe, expect, it } from 'vitest';
import { inspectAffiliateAttestation, isMarketplaceAffiliateDestination, runPublishingGuard } from '../../packages/compliance/src/index';
import type { ProductTruth } from '../../packages/core/src/index';

const now=new Date('2026-10-08T12:00:00.000Z');
const base:ProductTruth={
  organizationId:'test-org',productId:'p1',marketplace:'MELI',externalId:'MLB123',
  title:{value:'Organizador',source:'fixture',observedAt:now.toISOString()},
  url:{value:'https://www.mercadolivre.com.br/p/MLB123',source:'fixture',observedAt:now.toISOString()},
  affiliateUrl:{value:'https://www.mercadolivre.com.br/p/MLB123?tracking_id=example',source:'fixture',observedAt:now.toISOString()},
  currency:{value:'BRL',source:'fixture',observedAt:now.toISOString()},
  availability:{value:'available',source:'fixture',observedAt:now.toISOString()},assetRights:'AUTHORIZED',
};
const destination=base.affiliateUrl!.value;
const guard=(product:ProductTruth,dest=destination)=>runPublishingGuard({
 product, destinationUrl:dest,disclosure:'Posso receber comissão por este link de afiliado.',
 headline:'Organização prática',description:'Uma ideia para a cozinha',
 requireAffiliateAttestation:true,now,
});
const proof:NonNullable<ProductTruth['affiliateAttestation']>={
 method:'USER_CONFIRMED_IN_AFFILIATE_PORTAL',marketplace:'MELI',
 externalId:'MLB123',channel:'PINTEREST',url:destination,confirmedAt:now.toISOString(),
};
describe('Affiliate verification v5',()=>{
 it('does not mistake a secure HTTPS URL for proof of earning commission',()=>{
   const outcome=guard(base);
   expect(outcome.outcome).toBe('BLOCK');
   expect(outcome.checks.find(c=>c.key==='affiliate-attestation')?.outcome).toBe('BLOCK');
 });
 it('requires exact listing, channel, URL and fresh explicit user attestation',()=>{
   expect(inspectAffiliateAttestation({...base,affiliateAttestation:proof},now)).toBe('SELF_CONFIRMED');
   expect(guard({...base,affiliateAttestation:proof}).checks.find(c=>c.key==='affiliate-attestation')?.outcome).toBe('PASS');
   expect(guard({...base,affiliateAttestation:{...proof,url:base.url.value}}).outcome).toBe('BLOCK');
   expect(guard({...base,affiliateAttestation:{...proof,externalId:'MLB999'}}).outcome).toBe('BLOCK');
   expect(guard({...base,affiliateAttestation:{...proof,confirmedAt:'2026-09-01T00:00:00Z'}}).outcome).toBe('BLOCK');
   expect(guard({...base,affiliateAttestation:proof},base.url.value).outcome).toBe('BLOCK');
 });
 it('rejects unrelated HTTPS domains, deceptive hostnames and URL credentials',()=>{
   expect(isMarketplaceAffiliateDestination('https://example.org/safe','MELI')).toBe(false);
   expect(isMarketplaceAffiliateDestination('https://mercadolivre.com.br.evil.tld/a','MELI')).toBe(false);
   expect(isMarketplaceAffiliateDestination('https://person:secret@mercadolivre.com.br/a','MELI')).toBe(false);
   expect(isMarketplaceAffiliateDestination(destination,'MELI')).toBe(true);
   expect(isMarketplaceAffiliateDestination('https://meli.la/AbC123','MELI')).toBe(true);
   expect(isMarketplaceAffiliateDestination('https://sub.meli.la/AbC123','MELI')).toBe(false);
   expect(isMarketplaceAffiliateDestination('https://meli.la/','MELI')).toBe(false);
   expect(isMarketplaceAffiliateDestination('https://meli.la.evil.tld/AbC123','MELI')).toBe(false);
 });
 it('retains the legacy campaign behavior when the new flag is off',()=>{
   const old=runPublishingGuard({product:base,destinationUrl:destination,disclosure:'Link de afiliado; posso receber comissão.',headline:'Organização prática',description:'Ideia útil',now});
   expect(old.outcome).toBe('PASS');
   expect(old.checks.some(c=>c.key==='affiliate-attestation')).toBe(false);
 });
});
