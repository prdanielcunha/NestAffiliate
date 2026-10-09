import {describe,expect,it} from 'vitest';
import type {ProductTruth} from '../../packages/core/src/index';
import {buildSceneProfile,buildImagePrompt} from '../../packages/creative-engine/src/index';
const product:ProductTruth={
 organizationId:'org',productId:'prod-1',marketplace:'MELI',externalId:'MLB123',
 title:{value:'Organizador de pratos para cozinha',source:'fixture',observedAt:'2026-10-09T00:00:00Z'},
 url:{value:'https://www.mercadolivre.com.br/p/MLB123',source:'fixture',observedAt:'2026-10-09T00:00:00Z'},
 availability:{value:'unknown',source:'fixture',observedAt:'2026-10-09T00:00:00Z'},
 currency:{value:'BRL',source:'fixture',observedAt:'2026-10-09T00:00:00Z'},assetRights:'UNKNOWN'
};
describe('English-first image prompt',()=>{
 const scene=buildSceneProfile({product,keyword:'organização cozinha'});
 it('generates all directions and safety rules in English by default',()=>{
  const p=buildImagePrompt({id:'prompt1',campaignId:'c1',campaignVersion:1,product,scene,artDirection:'produto útil na rotina'});
  expect(p.language).toBe('en');
  expect(p.prompt).toContain('TASK');
  expect(p.prompt).toContain('ART DIRECTION');
  expect(p.prompt).toContain('PRODUCT FIDELITY');
  expect(p.prompt).toContain('Organized residential kitchen');
  expect(p.prompt).not.toContain('Cozinha organizada');
  expect(p.prompt).not.toContain('Preserve o produto');
  expect(p.prompt).toContain(product.title.value);
  expect(p.prompt).toContain('If a detail is not visible, do not invent it.');
 });
 it('still supports explicit Portuguese translation without making it default',()=>{
  const p=buildImagePrompt({id:'prompt2',campaignId:'c1',campaignVersion:1,product,scene,artDirection:'produto útil',language:'pt-BR'});
  expect(p.language).toBe('pt-BR');
  expect(p.prompt).toContain('Crie uma imagem premium');
 });
});
