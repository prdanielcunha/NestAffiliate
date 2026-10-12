// Public-domain Firebase App Check smoke. No accounts, secrets, cookies or tokens are logged.
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const target='https://nestaffiliate.millionsnest.com';
const bundle=fs.readFileSync('/tmp/nestaffiliate-appcheck-smoke.js','utf8');
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:3,
  locale:'pt-BR',
  // Chromium mobile emulation rather than claiming to run real Safari.
  isMobile:true,hasTouch:true,
 });
 const page=await context.newPage();
 const blocked=[];
 page.on('console',message=>{
   if(message.type()==='error' && /Content Security Policy|Refused to load|recaptcha|app.?check/i.test(message.text())) {
     const txt=message.text();
     blocked.push(/Content Security Policy|Refused to load/i.test(txt)?'CSP_BLOCK':'RECAPTCHA_CONSOLE_ERROR');
   }
 });
 await page.route('**/__nestaffiliate_appcheck_smoke.js',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:bundle,
   headers:{'cache-control':'no-store'},
 }));
 const response=await page.goto(target+'/',{waitUntil:'domcontentloaded',timeout:30000});
 if(!response || response.status()!==200)throw new Error('LIVE_SITE_UNAVAILABLE');
 await page.addScriptTag({type:'module',url:target+'/__nestaffiliate_appcheck_smoke.js'});
 const handle=await page.waitForFunction(()=>{
   const p=window.__nestAffiliateLiveAppCheckSmoke;
   return p && (p.status==='success'||p.status==='error')?p:null;
 },null,{timeout:45000});
 const result=await handle.jsonValue();
 console.log('LIVE_APPCHECK_SMOKE',JSON.stringify({status:result.status,code:result.code??null,elapsedMs:result.elapsedMs,consoleFlags:[...new Set(blocked)]}));
 if(result.status!=='success')process.exitCode=1;
 await context.close();
}finally{await browser.close();}
