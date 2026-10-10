import {describe,it,expect} from 'vitest';
import type {ProductTruth,PinterestCreativePack} from '@nestaffiliate/core';
import {validateProductAiStrategy,overlayAiStrategy} from '../../apps/web/src/lib/aiProductStrategy';
const stamp='2026-10-10T15:00:00Z';
const product={organizationId:'org',marketplace:'MELI',productId:'p',externalId:'MLB12345',
 title:{value:'Jogo de panelas antiaderente 10 peças preto e bege',source:'user-provided',observedAt:stamp},
 url:{value:'https://meli.la/2GDhhKL',source:'user-provided',observedAt:stamp},
 currency:{value:'BRL',source:'user-provided',observedAt:stamp},
 availability:{value:'unknown',source:'user-provided',observedAt:stamp},
 assetRights:'UNKNOWN',listingVerified:false} as ProductTruth;
const good={"productType":"Jogo de panelas","buyerIntent":"Comparar conjuntos de panelas para a cozinha","audience":"Pessoas que cozinham em casa","positioning":"Visual do conjunto e composição de peças","factsUsed":["10 peças"],"unknowns":["Composição de cada peça não confirmada"],"angles":["Visual na cozinha","Conhecer itens do conjunto","Pesquisar novos utensílios"],"titles":["Jogo de panelas 10 peças: conheça este conjunto","Vai trocar suas panelas? Veja este conjunto","Panelas para cozinha: veja o jogo de 10 peças"],"descriptions":["Conheça este jogo de panelas de 10 peças. Confira as fotos e a composição do kit no anúncio antes de escolher. Conteúdo com link de afiliado.","Buscando um jogo de panelas para sua cozinha? Compare as peças, veja as imagens e as condições atuais na página do produto. Conteúdo com link de afiliado."],"keywords":["jogo de panelas","panelas 10 peças","conjunto de panelas","utensílios de cozinha","panelas domésticas"],"recommendedBoard":"Jogos de Panelas para Cozinha","headline":"Conheça este jogo de panelas","cta":"Ver detalhes"};
describe('AI product strategy is advisory and fact-grounded',()=>{
 it('accepts product-specific strategy, unlike a static category template',()=>{
  const r=validateProductAiStrategy(good,product);
  expect(r.titles).toHaveLength(3);
  expect(r.angles).toHaveLength(3);
  expect(r.buyerIntent).toContain('panelas');
 });
 it('rejects invented specifications, claims, and missing affiliate disclosure',()=>{
  expect(()=>validateProductAiStrategy({...good,titles:[good.titles[0],good.titles[1],'Jogo de panelas de 28 peças para cozinha']},product)).toThrow();
  expect(()=>validateProductAiStrategy({...good,titles:[good.titles[0],good.titles[1],'Jogo de panelas cerâmica para cozinha']},product)).toThrow();
  expect(()=>validateProductAiStrategy({...good,titles:[good.titles[0],good.titles[1],'Jogo de panelas com frete grátis na oferta']},product)).toThrow();
  expect(()=>validateProductAiStrategy({...good,descriptions:[good.descriptions[0],'Veja as panelas no anúncio e compare as fotos e cada item do conjunto antes de escolher entre as opções disponíveis para sua cozinha.']},product)).toThrow();
 });
 it('rejects off-topic copy and repetitive titles',()=>{
  expect(()=>validateProductAiStrategy({...good,titles:['Tênis esportivo: veja os modelos para corrida',good.titles[1],good.titles[2]]},product)).toThrow();
  expect(()=>validateProductAiStrategy({...good,titles:[good.titles[0],good.titles[0],good.titles[2]]},product)).toThrow();
 });
 it('applies AI as creative overlay without mutating Product Truth or the original pack',()=>{
  const pack={copy:{titles:['Local'],descriptions:['Local'],headline:'Local',cta:'Local',keywords:['local'],
    primaryKeyword:'local',secondaryKeywords:[],longTailKeywords:[],recommendedBoardName:'Geral'},
    imageConcepts:[],qualityExplanation:[]} as unknown as PinterestCreativePack;
  const before=structuredClone(pack);
  const next=overlayAiStrategy(pack,validateProductAiStrategy(good,product));
  expect(next.copy.titles[0]).toBe(good.titles[0]);
  expect(next.copy.recommendedBoardName).toBe(good.recommendedBoard);
  expect(pack).toEqual(before);
 });
});
