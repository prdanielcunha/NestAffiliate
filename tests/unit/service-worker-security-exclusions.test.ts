import {describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

type SwEvent={request:{url:string;method:string;mode:string};respondWith:(response:Promise<unknown>)=>void};
function setup(){
 const handlers:Record<string,(event:SwEvent)=>void>={};
 const network=vi.fn(async()=>({status:200}));
 const self={
   location:{origin:'https://nestaffiliate.millionsnest.com'},
   addEventListener:(name:string,callback:(event:SwEvent)=>void)=>{handlers[name]=callback;},
   skipWaiting:vi.fn(async()=>{}),clients:{claim:vi.fn(async()=>{})},
 };
 const caches={open:vi.fn(async()=>({match:vi.fn(async()=>null),addAll:vi.fn(async()=>{})})),
   keys:vi.fn(async()=>[]),delete:vi.fn(async()=>true)};
 runInNewContext(readFileSync('apps/web/public/sw.js','utf8'),{
   self,URL,Promise,fetch:network,caches,Response,
 });
 return {handler:handlers.fetch!,network};
}
describe('P0 Service Worker never corrupts external security requests',()=>{
 it.each([
  ['reCAPTCHA bootstrap','https://www.google.com/recaptcha/enterprise.js?render=public-site-key','no-cors'],
  ['reCAPTCHA enterprise script','https://www.gstatic.com/recaptcha/releases/release-id/recaptcha__pt_br.js','no-cors'],
  ['reCAPTCHA challenge','https://www.google.com/recaptcha/enterprise/reload?k=public-site-key','cors'],
  ['App Check token exchange','https://firebaseappcheck.googleapis.com/v1/projects/test/apps/id:exchangeRecaptchaEnterpriseToken','cors'],
  ['Google Identity','https://accounts.google.com/o/oauth2/v2/auth','navigate'],
  ['NestAI inference','https://ai.millionsnest.com/v1/run','cors'],
  ['Firebase API proxy','https://nestaffiliate.millionsnest.com/api/v1/nestaffiliate/mercadolivre/search','cors'],
  ['hashed JS chunk','https://nestaffiliate.millionsnest.com/assets/index-abc.js','no-cors'],
 ])('%s bypasses offline-shell responses',(_,url,mode)=>{
  const {handler,network}=setup();const respondWith=vi.fn();
  handler({request:{url,mode,method:'GET'},respondWith});
  expect(respondWith).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
 });
 it('handles only first-party document navigation',async()=>{
  const {handler,network}=setup();const respondWith=vi.fn();
  handler({request:{url:'https://nestaffiliate.millionsnest.com/campaigns',mode:'navigate',method:'GET'},respondWith});
  expect(respondWith).toHaveBeenCalledOnce();
  await respondWith.mock.calls[0]![0];expect(network).toHaveBeenCalledOnce();
 });
 it('does not cache the service worker itself for a year',()=>{
  const config=JSON.parse(readFileSync('firebase.json','utf8'));
  const headers=config.hosting.headers;
  const immutable=headers.findIndex((h:{source:string})=>h.source==='**/*.@(js|css)');
  const sw=headers.findIndex((h:{source:string})=>h.source==='/sw.js');
  expect(immutable).toBeGreaterThan(-1);
  expect(sw).toBeGreaterThan(immutable);
  expect(headers[sw].headers.find((x:{key:string})=>x.key==='Cache-Control').value)
    .toBe('no-cache,no-store,must-revalidate');
  expect(readFileSync('apps/web/public/sw.js','utf8')).toContain('nestaffiliate-shell-v3');
  expect(readFileSync('apps/web/public/sw.js','utf8')).toContain('self.skipWaiting()');
 });
});
