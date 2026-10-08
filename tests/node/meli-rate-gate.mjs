import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeliRateGate } from '../../scripts/meli-rate-gate.mjs';

const ok={status:200,headers:{get:()=>null}};
test('serializes official Mercado Livre requests with minimum spacing',async()=>{
  let tick=0;
  const starts=[];
  const limiter=createMeliRateGate({spacingMs:450,now:()=>tick,wait:async(ms)=>{tick+=ms;}});
  const pending=[1,2,3].map((n)=>limiter.run(async()=>{starts.push({n,tick});return ok;}));
  await Promise.all(pending);
  assert.deepEqual(starts,[{n:1,tick:0},{n:2,tick:450},{n:3,tick:900}]);
});
test('a single 429 pauses all other queued requests using Retry-After',async()=>{
  let tick=0;
  const starts=[];
  const limiter=createMeliRateGate({spacingMs:300,now:()=>tick,wait:async(ms)=>{tick+=ms;}});
  const first=limiter.run(async()=>{starts.push(tick);return {status:429,headers:{get:()=> '6'}};});
  const second=limiter.run(async()=>{starts.push(tick);return ok;});
  await Promise.all([first,second]);
  assert.deepEqual(starts,[0,6000]);
});
test('when no Retry-After exists, 429 has a conservative shared cooldown',async()=>{
  let tick=0;
  const starts=[];
  const limiter=createMeliRateGate({spacingMs:450,now:()=>tick,wait:async(ms)=>{tick+=ms;}});
  await limiter.run(async()=>{starts.push(tick);return {status:429,headers:{get:()=>null}};});
  await limiter.run(async()=>{starts.push(tick);return ok;});
  assert.deepEqual(starts,[0,2500]);
});
test('fetch errors do not deadlock future retries',async()=>{
  let tick=0;
  const limiter=createMeliRateGate({spacingMs:450,now:()=>tick,wait:async(ms)=>{tick+=ms;}});
  await assert.rejects(limiter.run(async()=>{throw new Error('offline');}),/offline/);
  const response=await limiter.run(async()=>ok);
  assert.equal(response.status,200);
});
