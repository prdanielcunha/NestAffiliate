import {describe,it,expect} from 'vitest';
import {narrativeForConcept} from '../../apps/web/src/lib/creativeDirection';
import type {CampaignVersion,PinterestCreativePack} from '../../packages/core/src/index';
const n={headline:'Antigo',pinterestTitle:'Antigo título',description:'Antiga descrição',disclosure:'Afiliado',altText:'Imagem',cta:'Ver'};
const v={narrative:n} as CampaignVersion;
const p={copy:{titles:['Ideia A','Ideia B','Ideia C'],descriptions:['Contexto A','Contexto B']}} as PinterestCreativePack;
describe('Visual direction and copy are one action',()=>{
 it('gives three distinct truthful editorial narratives',()=>{
  expect([0,1,2].map(i=>narrativeForConcept(v,p,i).headline)).toEqual(['Ideia A','Ideia B','Ideia C']);
 });
 it('never discards disclosure, alt text or CTA',()=>{
  expect(narrativeForConcept(v,p,1).disclosure).toBe('Afiliado');
  expect(narrativeForConcept(v,p,1).altText).toBe('Imagem');
 });
});
