import {describe,it,expect} from 'vitest';
import {PROBLEM_INTENTS,uniqueIntentQueries} from '../../packages/radar/src/problemIntents';
describe('Radar problem-first research',()=>{
 it('contains explicit hypotheses and user-reviewable search phrases',()=>{
   expect(PROBLEM_INTENTS.length).toBeGreaterThanOrEqual(5);
   expect(PROBLEM_INTENTS.every(p=>p.commercialStatus==='HYPOTHESIS' && p.keyword && p.problem['pt-BR'])).toBe(true);
 });
 it('never multiplies provider searches without the user choosing them',()=>{
   expect(uniqueIntentQueries(PROBLEM_INTENTS,3)).toHaveLength(3);
   expect(uniqueIntentQueries([PROBLEM_INTENTS[0]!,PROBLEM_INTENTS[0]!] )).toHaveLength(1);
 });
});
