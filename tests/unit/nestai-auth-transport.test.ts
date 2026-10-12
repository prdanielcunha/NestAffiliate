import {describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {NestAiStageError,aiSupportDiagnostic,observedNestAiFetch,singleFlight,withNestAiStage} from '../../apps/web/src/lib/nestAiTransport';

describe('NestAI production authentication and network regression',()=>{
 it('deduplicates concurrent App Check attestation including Hub and NestAI headers',async()=>{
  let started=0;
  let finish:((token:string)=>void)|undefined;
  const fetchToken=singleFlight(()=>{
   started++;
   return new Promise<string>(resolve=>{finish=resolve;});
  });
  const one=fetchToken(),two=fetchToken();
  expect(one).toBe(two);
  await Promise.resolve();
  expect(started).toBe(1);
  finish?.('a-test-token');
  expect(await Promise.all([one,two])).toEqual(['a-test-token','a-test-token']);
  const three=fetchToken();
  await Promise.resolve();
  expect(started).toBe(2);
  finish?.('next-token');
  expect(await three).toBe('next-token');
 });
 it('clears failed App Check attestation for explicit retry',async()=>{
  let started=0;
  const getToken=singleFlight(async()=>{started++;if(started===1)throw new Error('ONE_TIME_FAILURE');return 'ok';});
  await expect(getToken()).rejects.toThrow('ONE_TIME_FAILURE');
  await expect(getToken()).resolves.toBe('ok');
  expect(started).toBe(2);
 });
 it('Firebase CSP allows enterprise reCAPTCHA to obtain required App Check tokens',()=>{
  const config=JSON.parse(readFileSync('firebase.json','utf8'));
  const csp:string=config.hosting.headers.find((h:{source:string})=>h.source==='**')
    .headers.find((h:{key:string})=>h.key==='Content-Security-Policy').value;
  for(const [directive,required] of [
   ['script-src','https://www.google.com/recaptcha/'],
   ['script-src','https://www.gstatic.com/recaptcha/'],
   ['frame-src','https://www.google.com/recaptcha/'],
   ['frame-src','https://recaptcha.google.com/recaptcha/'],
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
  vi.useFakeTimers();
  try{
   const watched=observedNestAiFetch(fakeFetch);
   const req=watched(new URL('https://www.millionsnest.com/api/v1/ai/token'),{
    method:'POST',headers:{'x-request-id':'f5a641f0-3156-44e2-a903-8a26efb1b85a'}
   });
   const assertion=expect(req).rejects.toMatchObject({stage:'hub_token',issue:'TIMEOUT'});
   await vi.advanceTimersByTimeAsync(10020);
   await assertion;
   expect(aborted).toBe(true);
   const detail=aiSupportDiagnostic(new NestAiStageError('hub_token','TIMEOUT','f5a641f0-3156-44e2-a903-8a26efb1b85a'));
   expect(detail).toContain('hub_token / TIMEOUT');
   expect(detail).toContain('ref f5a641f0-3156-44e2-a903-8a26efb1b85a');
   expect(detail).not.toMatch(/Bearer |https:|token=/);
  }finally{vi.useRealTimers();}
 });
 it('network rejection is attributed to the NestAI request safely',async()=>{
  const fakeFetch=vi.fn(async()=>{throw new TypeError('Failed to fetch');}) as unknown as typeof fetch;
  await expect(observedNestAiFetch(fakeFetch)(
   new URL('https://ai.millionsnest.com/v1/run'),
   {method:'POST',headers:{authorization:'Bearer secret-that-must-not-appear'}}
  )).rejects.toMatchObject({stage:'nestai_request',issue:'NETWORK'});
 });
});
