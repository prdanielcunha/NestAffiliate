import {describe,expect,it} from 'vitest';
import {buildGuidedPinFields} from '../../apps/web/src/lib/guidedPinFields';
import type {PublicationPackage} from '../../packages/core/src/index';
const pack={title:'Organize a rotina',description:'Veja esta ideia',disclosure:'Este post contém link de afiliado',destinationUrl:'https://www.mercadolivre.com.br/p/MLB123',boardName:'Casa funcional',altText:'Um organizador sobre a mesa',keywords:['organização','casa'],trackingCode:'ab12'} as PublicationPackage;
describe('One-screen guided Pinterest publishing',()=>{
 it('lists exact Pinterest fields with ready-to-copy values and where to paste',()=>{
  const fields=buildGuidedPinFields(pack,'pt-BR');
  expect(fields.find(f=>f.id==='title')?.value).toBe(pack.title);
  expect(fields.find(f=>f.id==='board')?.instruction).toContain('Pasta');
  expect(fields.find(f=>f.id==='destination')?.value).toBe(pack.destinationUrl);
  expect(fields.find(f=>f.id==='description')?.value).toContain(pack.disclosure);
 });
 it('never duplicates disclosure already present in the Pin description',()=>{
  const desc=buildGuidedPinFields({...pack,description:'Texto e '+pack.disclosure},'pt-BR').find(f=>f.id==='description')!.value;
  expect(desc.split(pack.disclosure).length).toBe(2);
 });
 it('labels tracking code as affiliate dashboard reference, not Pinterest destination field',()=>{
  const f=buildGuidedPinFields(pack,'en').find(f=>f.id==='tracking');
  expect(f?.optional).toBe(true);
  expect(f?.instruction).toContain('not a required Pinterest field');
 });
 it('supports Portuguese, English and Spanish field instructions',()=>{
  for(const locale of ['pt-BR','en','es'] as const)expect(buildGuidedPinFields(pack,locale).length).toBeGreaterThanOrEqual(5);
 });
});
