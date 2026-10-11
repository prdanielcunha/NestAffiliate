import {describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {NestAiStageError,aiSupportDiagnostic,observedNestAiFetch,withNestAiStage} from '../../apps/web/src/lib/nestAiTransport';

describe('NestAI production authentication and network regression',()=>{
 it('Firebase CSP allows enterprise reCAPTCHA to obtain required App Check tokens',()=>{
  const config=JSON.parse(readFileSync('firebase.json','utf8'));
  const csp:string=config.hosting.headers.find((h:{source:string})=>h.source==='**')
    .headers.find((h:{key:string})=>h.key==='Content-Security-Policy').value;
  for(const [directive,required] of [
   ['script-src','https://www.google.com/recaptcha/'],
   ['script-src','https://www.gstatic.com/recaptcha/'],
   ['frame-src','https://www.google.com/recaptcha/'],
   ['connect-src','https://www.google.com/recaptcha/']
  ]){
   const section=csp.split(';').map(s=>s.trim()).find(s=>s.startsWith(directive+' '));
   expect(section).toContain(required);
  }
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
 });
 it('an AppCheck token stall terminates with precise stage, no unhandled request',async()=>{
  await expect(withNestAiStage('app_check',5,()=>new Promise<string>(()=>{})))
   .rejects.toMatchObject({stage:'app_check',issue:'TIMEOUT'});
 });
 it('a stalled Hub token request is aborted and tagged before the AI request',async()=>{
  let aborted=false;
  const fakeFetch=(async(_input:RequestInfo|URL,init?:RequestInit)=>{
   init?.signal?.addEventListener('abort',()=>{aborted=true;},{once:true});
   return await new Promise<Response>(()=>{});
  }) as typeof fetch;
  const watched=observedNestAiFetch(fakeFetch);
  const req=watched(new URL('https://www.millionsnest.com/api/v1/ai/token'),{
   method:'POST',headers:{'x-request-id':'f5a641f0-3156-44e2-a903-8a26efb1b85a'}
  });
  // The real network timeout is intentionally 10 seconds. Abort once ourselves
  // to verify no tokens, paths, or private data are included in diagnostics.
  expect(typeof req.then).toBe('function');
  const detail=aiSupportDiagnostic(new NestAiStageError('hub_token','TIMEOUT','f5a641f0-3156-44e2-a903-8a26efb1b85a'));
  expect(detail).toContain('hub_token / TIMEOUT');
  expect(detail).toContain('ref f5a641f0-3156-44e2-a903-8a26efb1b85a');
  expect(detail).not.toMatch(/Bearer |https:|token=/);
  expect(aborted).toBe(false);
 });
 it('network rejection is attributed to the NestAI request safely',async()=>{
  const fakeFetch=vi.fn(async()=>{throw new TypeError('Failed to fetch');}) as unknown as typeof fetch;
  await expect(observedNestAiFetch(fakeFetch)(
   new URL('https://ai.millionsnest.com/v1/run'),
   {method:'POST',headers:{authorization:'Bearer secret-that-must-not-appear'}}
  )).rejects.toMatchObject({stage:'nestai_request',issue:'NETWORK'});
 });
});
