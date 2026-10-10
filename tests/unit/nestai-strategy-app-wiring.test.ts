import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {classifyNestAiFailure,nestAiFailureLabel} from '../../apps/web/src/lib/nestAiFailure';

describe('NestAffiliate NestAI strategy wiring',()=>{
  it('declares the exact strategy task used by the UI',()=>{
    const manifest=JSON.parse(readFileSync(new URL('../../millionsnest.app.json',import.meta.url),'utf8')) as {
      ai:{tasks:string[]};
    };
    expect(manifest.ai.tasks).toContain('affiliate.pin.strategy');
    expect(manifest.ai.tasks).toContain('affiliate.pin.copy');
  });
  it('distinguishes unregistered tasks and timeouts without exposing raw errors',()=>{
    expect(classifyNestAiFailure(new Error('TASK_NOT_REGISTERED'))).toBe('PROVIDER');
    expect(classifyNestAiFailure(new Error('NESTAI_TIMEOUT'))).toBe('TIMEOUT');
    expect(nestAiFailureLabel('TIMEOUT','pt-BR')).toMatch(/tempo/);
  });
});
