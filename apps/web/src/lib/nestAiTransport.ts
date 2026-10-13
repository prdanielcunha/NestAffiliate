/** Reuse exactly one attestation promise across concurrent SDK header/token calls.
 * Cache only while in flight; Firebase itself manages the expiry of successful tokens.
 */
export function singleFlight<T>(operation:()=>Promise<T>):()=>Promise<T>{
 let pending:Promise<T>|null=null;
 return ()=>{
  if(pending)return pending;
  const started=Promise.resolve().then(operation);
  pending=started;
  void started.then(
   ()=>{if(pending===started)pending=null;},
   ()=>{if(pending===started)pending=null;},
  );
  return started;
 };
}

/** Browser-only, sanitized NestAI diagnostics. Never serialize bearer tokens or user data. */
export type NestAiStage='app_check'|'firebase_token'|'hub_token'|'nestai_request';
export class NestAiStageError extends Error {
 constructor(public readonly stage:NestAiStage,public readonly issue:'TIMEOUT'|'NETWORK',public readonly requestId?:string){
  super('NESTAI_STAGE_'+issue+'_'+stage.toUpperCase());
  this.name='NestAiStageError';
 }
}
/** Limits token acquisition itself, before any network fetch can start. */
export async function withNestAiStage<T>(stage:NestAiStage,timeoutMs:number,run:()=>Promise<T>):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 const guard=new Promise<never>((_,reject)=>{
  timer=setTimeout(()=>reject(new NestAiStageError(stage,'TIMEOUT')),timeoutMs);
 });
 try{return await Promise.race([run().catch(reason=>{
   if(reason instanceof NestAiStageError)throw reason;
   // Keep the precise SDK/AppCheck error for existing classification.
   throw reason;
 }),guard]);}
 finally{if(timer)clearTimeout(timer);}
}
function requestStage(input:RequestInfo|URL):NestAiStage{
 const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const path=new URL(raw,globalThis.location?.origin??'https://example.invalid').pathname;
 return path.includes('/api/v1/ai/token')?'hub_token':'nestai_request';
}
/** Every SDK fetch is bounded and actively aborted to avoid orphaned provider calls. */
export function observedNestAiFetch(fetchImpl:typeof fetch):typeof fetch {
 return async(input:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
  const stage=requestStage(input);
  const requestId=new Headers(init?.headers).get('x-request-id')??undefined;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  let timedOut=false;
  if(init?.signal?.aborted)controller.abort();
  const onAbort=()=>controller.abort();
  init?.signal?.addEventListener('abort',onAbort,{once:true});
  try{
   const limit=stage==='hub_token'?10000:16000;
   const timeout=new Promise<never>((_,reject)=>{
    timer=setTimeout(()=>{
     timedOut=true;controller.abort();
     reject(new NestAiStageError(stage,'TIMEOUT',requestId));
    },limit);
   });
   return await Promise.race([fetchImpl(input,{...init,signal:controller.signal}),timeout]);
  }catch(error){
   if(error instanceof NestAiStageError)throw error;
   if(timedOut)throw new NestAiStageError(stage,'TIMEOUT',requestId);
   if(error instanceof Error && (error.name==='AbortError'||/FAILED TO FETCH|NETWORK/i.test(error.message)))
    throw new NestAiStageError(stage,'NETWORK',requestId);
   throw error;
  }finally{
   if(timer)clearTimeout(timer);
   init?.signal?.removeEventListener('abort',onAbort);
  }
 };
}
/** Safe to display or paste into support; no URL, JWT, product title or provider payload. */
export function aiSupportDiagnostic(error:unknown,requestId?:string):string{
 const e=error instanceof Error?error:new Error('UNKNOWN');
 // Only normalized client-side App Check codes may flow to support UI.
 // The original FirebaseError can carry sensitive URL/body text and is dropped.
 const normalized=e.message.match(/^APP_CHECK_([A-Z_]+?)(?:_HTTP_([4-5][0-9]{2}))?$/);
 if(normalized){
   const category=normalized[1]??'SDK_UNKNOWN';
   const aliases:Record<string,string>={
     RECAPTCHA_ERROR:'RECAPTCHA',
     INITIAL_THROTTLE:'THROTTLED',
     THROTTLED:'THROTTLED',
     EXCHANGE_REJECTED:'EXCHANGE_REJECTED',
     EXCHANGE_NETWORK:'EXCHANGE_NETWORK',
     INITIALIZATION_FAILED:'INITIALIZATION',
   };
   const safe=aliases[category]??category;
   return 'app_check / '+safe+(normalized[2]?' · http='+normalized[2]:'');
 }
 const stage=e instanceof NestAiStageError?e.stage:
    /APP_?CHECK|RECAPTCHA/i.test(e.message)?'app_check':
    /^SDK_HUB|HUB_/.test(e.message)?'hub_token':'nestai_request';
 const issue=e instanceof NestAiStageError?e.issue:
    /RECAPTCHA_ERROR/i.test(e.message)?'RECAPTCHA':
    /INITIAL_THROTTLE|THROTTLED/i.test(e.message)?'THROTTLED':
    /EXCHANGE_REJECTED/i.test(e.message)?'EXCHANGE_REJECTED':
    /EXCHANGE_NETWORK/i.test(e.message)?'EXCHANGE_NETWORK':
    /INITIALIZATION_FAILED/i.test(e.message)?'INITIALIZATION':
    /TIMEOUT|ABORT/i.test(e.message)?'TIMEOUT':
    /APP_?CHECK|RECAPTCHA/i.test(e.message)?'APP_CHECK':
    /AUTH|401|403/i.test(e.message)?'AUTH':
    /RATE|QUOTA|429/i.test(e.message)?'RATE_LIMIT':
    /OUTPUT|JSON|SCHEMA/i.test(e.message)?'OUTPUT':
    /ROUTER|PROVIDER|503/i.test(e.message)?'PROVIDER':'OTHER';
 const safeId=(e instanceof NestAiStageError?e.requestId:undefined)??requestId;
 const id=safeId && /^[a-f\d-]{36}$/i.test(safeId)?' · ref '+safeId:'';
 return stage+' / '+issue+id;
}
