import { describe, expect, it } from 'vitest';
import type { ProductTruth, SceneProfile } from '../../packages/core/src/index';
import { buildConversionPinCopy, buildPinterestCreativePack, buildSceneProfile, compactPinText, isGenericLegacyPinCopy } from '../../packages/creative-engine/src/index';
const stamp='2026-10-10T10:00:00.000Z';
function product(title:string): ProductTruth{
 return {organizationId:'org-test',productId:'p1',externalId:'MLB123456789',
  marketplace:'MELI',title:{value:title,source:'public-page-metadata-unverified',observedAt:stamp},
  url:{value:'https://www.mercadolivre.com.br/p/MLB123456789',source:'public-page-metadata-unverified',observedAt:stamp},
  availability:{value:'unknown',source:'public-page-metadata-unverified',observedAt:stamp},
  currency:{value:'BRL',source:'public-page-metadata-unverified',observedAt:stamp},assetRights:'UNKNOWN',
  listingVerified:false
 };
}
function packFor(title:string,locale:'pt-BR'|'en'|'es'='pt-BR',keyword=title){
 return buildPinterestCreativePack({organizationId:'org-test',campaignId:'c1',
   campaignVersion:2,product:product(title),keyword,locale,createdAt:stamp});
}
const BANNED=/uma ideia (prática|editorial|útil)|uma solução prática para o dia a dia|curadoria editorial|sem custo adicional para você\.?$/i;
describe('Conversion Copy 2.0 — real buyer intent, factual and editorial',()=>{
 it('replaces stale panel copy with a specific hook and truthful colors/quantity',()=>{
   const title='Conjunto Panelas Antiaderente 10 Peças Teflon Várias Cores Preto Com Bege';
   const p=packFor(title);
   const {titles,descriptions}=p.copy;
   expect(p.creativeDirection.productCategory).toBe('kitchen-utensils');
   expect(p.copy.recommendedBoardName).toContain('Panelas');
   expect(titles[0]).toMatch(/panelas 10 peças preto e bege/i);
   expect(titles[0]).toMatch(/cozinha/i);
   expect(titles).toHaveLength(3);
   expect(new Set(titles)).toHaveLength(3);
   expect(titles.every(t=>t.length>=33&&t.length<=100&&!BANNED.test(t))).toBe(true);
   expect(descriptions).toHaveLength(2);
   expect(descriptions.every(d=>d.length>=140&&d.length<=500&&/link de afiliado/i.test(d))).toBe(true);
   expect(descriptions[0]).toMatch(/fotos/i);
   expect(descriptions[0]).toMatch(/avaliações/i);
   expect(p.copy.primaryKeyword).toBe('jogo de panelas 10 peças');
   expect(p.copy.longTailKeywords).toContain('panelas preto e bege');
   expect(p.copy.headline.length).toBeLessThanOrEqual(57);
   expect([p.copy.headline,...titles,...descriptions].join(' ')).not.toMatch(/mais vendido|menor preço|garantid[oa]|frete grátis|50% off/i);
   expect(p.copy.disclosure).toMatch(/comissão/i);
 });
 it('does not invent color, count, pan coating, verified demand, price or commission',()=>{
   const p=packFor('Conjunto de panelas');
   expect(p.copy.titles.join(' ')).not.toMatch(/10 peças|preto|bege|antiaderente/i);
   expect(p.copy.descriptions.join(' ')).not.toMatch(/10 peças|preto|bege|antiaderente|melhor do brasil|r\$\s*\d/i);
 });
 it('is not polluted by legacy placeholders provided from new campaign narrative',()=>{
   const title='Conjunto Panelas Antiaderente 10 Peças Preto Com Bege';
   const scene=buildSceneProfile({product:product(title),keyword:title,boardName:'Organização de Cozinha'});
   const result=buildConversionPinCopy({locale:'pt-BR',product:product(title),scene,keyword:title,existing:{
     headline:'Uma ideia prática para '+title,
     pinterestTitle:title+': uma solução prática para o dia a dia',
     description:'Uma ideia editorial para '+title,
     disclosure:'Aviso de afiliado personalizado',
     subheadline:'Contexto útil',altText:'Produto',cta:'Ver a ideia',
   }});
   expect(result.titles[0]).not.toContain('uma solução prática');
   expect(result.descriptions[0]).not.toContain('Uma ideia editorial');
   expect(result.disclosure).toBe('Aviso de afiliado personalizado');
 });
 it.each([
   ['Luminária de mesa para quarto','iluminação'],
   ['Cadeira de escritório rosa para home office','home office'],
   ['Ralo linear inox para box de banheiro','banheiro'],
   ['Organizador giratório para cozinha','cozinha'],
   ['Tapete para sala bege','decorar'],
   ['Comedouro para gato','pet'],
 ])('creates category-appropriate hooks for %s', (title,keyword)=>{
   const p=packFor(title);
   expect(p.copy.titles.join(' ').toLowerCase()).toContain(keyword);
   expect(p.copy.titles).toHaveLength(3);
   expect(new Set(p.copy.titles).size).toBe(3);
   expect(p.copy.descriptions.every(d=>!BANNED.test(d))).toBe(true);
   expect(p.copy.primaryKeyword.length).toBeGreaterThan(6);
 });
 it('preserves language in English and Spanish without injecting Portuguese boilerplate',()=>{
   for(const locale of ['en','es'] as const){
     const p=packFor('Luminária de mesa',locale);
     expect(p.copy.titles).toHaveLength(3);
     expect(p.copy.descriptions).toHaveLength(2);
     expect(p.copy.titles[0]).not.toMatch(/uma ideia prática|para sua casa/i);
     expect(p.copy.descriptions.join(' ')).not.toMatch(/conteúdo com link de afiliado/i);
   }
 });
 it('keeps headings intact at word boundaries',()=>{
   const result=compactPinText('Panelas preto e bege para uma cozinha linda e funcional',38);
   expect(result.length).toBeLessThanOrEqual(38);
   expect(result).toMatch(/^(?:.*)\b[a-záéíóúãõç]+$/i);
   expect(result.endsWith('funci')).toBe(false);
 });
 it('recognizes old default copy without suppressing handmade text',()=>{
   expect(isGenericLegacyPinCopy('Jogo de panelas: uma solução prática para o dia a dia')).toBe(true);
   expect(isGenericLegacyPinCopy('Jogo de panelas 10 peças: ideias para a cozinha')).toBe(false);
 });
});
