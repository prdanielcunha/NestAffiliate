import {describe,it,expect} from 'vitest';
import {sanitizePinCopyDraft} from '../../apps/web/src/features/NestAiDraftReview';
describe('NestAI creative draft is advisory and human reviewed',()=>{
 it('retains only constrained Pinterest copy fields',()=>{
  const result=sanitizePinCopyDraft({title:'  A bright kitchen solution  ',description:'A useful visual concept to improve the organized home routine',tags:['home','home','small kitchen']} );
  expect(result.title).toBe('A bright kitchen solution');
  expect(result.tags).toEqual(['home','small kitchen']);
 });
 it('refuses empty or unstructured AI results',()=>{
  expect(()=>sanitizePinCopyDraft({title:'',description:'',tags:[]})).toThrow('NESTAI_EMPTY_OR_INVALID_DRAFT');
  expect(()=>sanitizePinCopyDraft({title:'one',description:'ok',tags:[]})).toThrow();
 });
 it('clips title and description to Pinterest safe draft limits, not an automatic publication',()=>{
  const r=sanitizePinCopyDraft({title:'T'.repeat(160),description:'D'.repeat(700),tags:Array.from({length:22},(_,i)=>'tag'+i)});
  expect(r.title).toHaveLength(100);expect(r.description).toHaveLength(500);expect(r.tags).toHaveLength(12);
 });
});
