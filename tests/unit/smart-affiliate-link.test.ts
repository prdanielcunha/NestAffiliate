import {describe,expect,it} from 'vitest';
import type {ProductTruth} from '@nestaffiliate/core';
import {attachDeclaredAffiliateUrl} from '../../apps/web/src/services/smartProductImport';
const product={
  organizationId:'org',marketplace:'MELI',productId:'meli:MLB123',externalId:'MLB123',
  title:{value:'Jogo de panelas',source:'official',observedAt:'2026-10-10'},
  url:{value:'https://www.mercadolivre.com.br/p/MLB123',source:'official',observedAt:'2026-10-10'},
  currency:{value:'BRL',source:'official',observedAt:'2026-10-10'},
  availability:{value:'unknown',source:'official',observedAt:'2026-10-10'},assetRights:'UNKNOWN'
} as ProductTruth;
describe('affiliate input selection',()=>{
 it('copies original short URL only when user declares link to be affiliated',()=>{
   const url='https://meli.la/2GDhhKL';
   expect(attachDeclaredAffiliateUrl(product,url,true).affiliateUrl?.value).toBe(url);
   expect(attachDeclaredAffiliateUrl(product,url,true).affiliateAttestation).toBeUndefined();
   expect(attachDeclaredAffiliateUrl(product,url,false).affiliateUrl).toBeUndefined();
 });
 it('rejects unrelated unsafe domains and malformed links',()=>{
   expect(()=>attachDeclaredAffiliateUrl(product,'https://other.example/item',true)).toThrow();
   expect(()=>attachDeclaredAffiliateUrl(product,'http://meli.la/id',true)).toThrow();
 });
});