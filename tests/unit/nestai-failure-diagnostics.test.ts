import {describe,it,expect} from 'vitest';
import {classifyNestAiFailure,nestAiFailureLabel} from '../../apps/web/src/lib/nestAiFailure';
describe('NestAI failure reporting preserves user privacy and the actual cause',()=>{
 it.each([
  ['APP_CHECK_INVALID','APP_CHECK'],['NESTAI_ACCESS_DENIED','AUTH'],
  ['OUTPUT_SCHEMA_VALIDATION_FAILED','OUTPUT'],['AI_STRATEGY_INVALID_titles','OUTPUT'],
  ['PROVIDER_EMPTY_RESPONSE','PROVIDER'],['RATE_LIMITED','RATE_LIMIT'],
  ['NESTAI_STRATEGY_TIMEOUT','TIMEOUT'],['Failed to fetch','NETWORK'],
 ])('maps %s into a stable safe category', (error,expected)=>{
  expect(classifyNestAiFailure(new Error(error))).toBe(expected);
 });
 it('does not leak backend message or sensitive source data into display text',()=>{
  const cause=new Error('something https://meli.la/SECRET?tracking=abc');
  const code=classifyNestAiFailure(cause);
  const view=nestAiFailureLabel(code,'pt-BR');
  expect(view).not.toContain('SECRET');
  expect(view).not.toContain('abc');
  expect(view.length).toBeGreaterThan(15);
 });
});
