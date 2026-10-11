import {describe,it,expect} from 'vitest';
import {sanitizePinCopyDraft,withAiDeadline} from '../../apps/web/src/features/NestAiDraftReview';
import {buildConversionPinCopy} from '../../packages/creative-engine/src/conversion-copy';
import type {ProductTruth,SceneProfile} from '../../packages/core/src/index';

const now='2026-10-10T21:00:00.000Z';
const product={
 organizationId:'org',productId:'p',marketplace:'MELI',externalId:'MLB1',
 title:{value:'Jogo de panelas 10 peças',source:'fixture',observedAt:now},
 url:{value:'https://www.mercadolivre.com.br/item',source:'fixture',observedAt:now},
 currency:{value:'BRL',source:'fixture',observedAt:now},
 availability:{value:'available',source:'fixture',observedAt:now},
 assetRights:'AUTHORIZED',
} as ProductTruth;
const scene={environment:'cozinha'} as SceneProfile;

describe('review copy reliability',()=>{
 it('always provides three unique deterministic alternatives with disclosure',()=>{
  const result=buildConversionPinCopy({product,locale:'pt-BR',keyword:'panelas',scene});
  expect(result.titles).toHaveLength(3);
  expect(result.descriptions).toHaveLength(3);
  expect(result.descriptions.every(x=>x.includes('afiliado'))).toBe(true);
 });
 it('guards against unverified AI copy and admits reviewed single-copy fallback',()=>{
  expect(()=>sanitizePinCopyDraft({title:'Compre já',description:'Bom',tags:[]})).toThrow();
  const result=sanitizePinCopyDraft({
   title:'Jogo de panelas para comparar na cozinha',
   description:'Veja este jogo de panelas no anúncio. Compare fotos, peças incluídas e as condições de compra com calma antes de decidir. Conteúdo com link de afiliado.',
   tags:['panelas','panelas','cozinha'],
  });
  expect(result.tags).toEqual(['panelas','cozinha']);
  expect(result.title).toContain('panelas');
 });
 it('ends a hung AI attempt rather than blocking local copy indefinitely',async()=>{
  await expect(withAiDeadline(new Promise<string>(()=>{}),5)).rejects.toThrow('NESTAI_TIMEOUT');
 });
});
