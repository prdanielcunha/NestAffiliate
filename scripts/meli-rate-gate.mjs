/**
 * Provider-level serialized request gate for official Mercado Livre API calls.
 * Never retries from here: callers remain responsible for bounded retries.
 * Responses 429 impose a shared cooldown on all queued requests, preventing
 * parallel retries from re-triggering the same client-ID rate limit.
 */
export function createMeliRateGate({
  spacingMs=450,
  now=()=>Date.now(),
  wait=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms)),
}={}){
  if(!Number.isFinite(spacingMs)||spacingMs<0)throw new Error('MELI_SPACING_INVALID');
  let tail=Promise.resolve();
  let nextAllowedAt=0;
  function retryAfterMs(header){
    if(!header)return 0;
    const seconds=Number(header);
    if(Number.isFinite(seconds)&&seconds>=0)return Math.max(0,seconds*1000);
    const date=Date.parse(header);
    return Number.isFinite(date)?Math.max(0,date-now()):0;
  }
  async function run(fetchResponse){
    const result=tail.then(async()=>{
      const delay=Math.max(0,nextAllowedAt-now());
      if(delay)await wait(delay);
      const response=await fetchResponse();
      const timestamp=now();
      nextAllowedAt=Math.max(nextAllowedAt,timestamp+spacingMs);
      if(response.status===429){
        // Honor the provider's Retry-After. In its absence, back off the
        // *entire* queue for a short interval rather than a per-call retry storm.
        nextAllowedAt=Math.max(nextAllowedAt,timestamp+Math.max(2500,retryAfterMs(response.headers?.get?.('retry-after'))));
      }
      return response;
    });
    // A failed fetch must not permanently wedge the shared queue.
    tail=result.then(()=>undefined,()=>undefined);
    return result;
  }
  return {run};
}
