// Public-domain Firebase App Check smoke. No accounts, secrets, cookies or tokens are logged.
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const target='https://nestaffiliate.millionsnest.com';
const bundle=fs.readFileSync('/tmp/nestaffiliate-appcheck-smoke.js','utf8');
// Firebase Hosting's reserved init.json does not necessarily include appId.
// Extract the public web app identifier used by the ACTUALLY deployed bundle.
const htmlResponse=await fetch(target+'/');
if(!htmlResponse.ok)throw new Error('LIVE_INDEX_FETCH_FAILED');
const html=await htmlResponse.text();
const jsPaths=[...html.matchAll(/<script\b[^>]*src=[\"']([^\"']+\.js(?:\?[^\"']*)?)[\"']/gi)].map(m=>new URL(m[1],target).href);
if(jsPaths.length===0)throw new Error('NO_LIVE_SCRIPT_ASSET');
const matches=new Set();
for(const src of jsPaths){
 const response=await fetch(src,{signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw new Error('LIVE_SCRIPT_UNAVAILABLE');
 const script=await response.text();
 for(const m of script.matchAll(/1:555464791734:web:[0-9a-zA-Z]+/g))matches.add(m[0]);
}
if(matches.size!==1)throw new Error('LIVE_WEB_APP_ID_NOT_UNIQUE_'+matches.size);
const deployedAppId=[...matches][0];
console.log('LIVE_PUBLISHED_FIREBASE_APP_ID_DETECTED',{count:matches.size,prefix:deployedAppId.split(':').slice(0,3).join(':')});
console.log('PUBLISHED_WEB_APP_MATCHES_FIREBASE_MILLIONSNEST',deployedAppId==="1:555464791734:web:6f916a69f26e74b9767817");
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:3,
  locale:'pt-BR',
  // Chromium mobile emulation rather than claiming to run real Safari.
  isMobile:true,hasTouch:true,
 });
 const page=await context.newPage();
 await page.addInitScript(value=>{window.__NESTAFFILIATE_PUBLISHED_APP_ID__=value;},deployedAppId);
 const blocked=[];
 const safeConsoleHints=[];
 const authResponses=[];
 const authFailures=[];
 page.on('response',res=>{
  try{
   const u=new URL(res.url());
   const host=u.hostname.toLowerCase();
   if(host==='firebaseappcheck.googleapis.com')
    authResponses.push({service:'appcheck_exchange',status:res.status(),response:res});
   else if(host==='www.google.com'||host==='recaptcha.google.com'||host==='www.gstatic.com'||host==='www.recaptcha.net')
    authResponses.push({service:host.includes('gstatic')?'recaptcha_assets':'recaptcha',status:res.status()});
  }catch{/* ignore malformed diagnostic urls */}
 });
 page.on('requestfailed',req=>{
  try{
   const host=new URL(req.url()).hostname.toLowerCase();
   if(host==='firebaseappcheck.googleapis.com'||host.includes('recaptcha')||host==='www.google.com'||host==='www.gstatic.com')
    authFailures.push({service:host==='firebaseappcheck.googleapis.com'?'appcheck_exchange':'recaptcha',failureCode:String(req.failure()?.errorText??'NETWORK').split(' ')[0].slice(0,30)});
  }catch{/* ignore diagnostic parsing errors */}
 });
 page.on('console',message=>{
   if(message.type()==='error' && /Content Security Policy|Refused to load|recaptcha|app.?check/i.test(message.text())) {
     const txt=message.text();
     blocked.push(/Content Security Policy|Refused to load/i.test(txt)?'CSP_BLOCK':'RECAPTCHA_CONSOLE_ERROR');
     // Only preapproved diagnostic words. Never echo raw console messages,
     // cookies, credentials, URLs or user data.
     const terms=txt.match(/invalid|domain|sitekey|unauthorized|blocked|throttle|network|timeout|403|400|429|captcha|firebase/gi)??[];
     safeConsoleHints.push(...terms.map(x=>x.toLowerCase()));
   }
 });
 await page.route('**/__nestaffiliate_appcheck_smoke.js',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:bundle,
   headers:{'cache-control':'no-store'},
 }));
 const response=await page.goto(target+'/',{waitUntil:'domcontentloaded',timeout:30000});
 if(!response || response.status()!==200)throw new Error('LIVE_SITE_UNAVAILABLE');
 await page.addScriptTag({type:'module',url:target+'/__nestaffiliate_appcheck_smoke.js'});
 let result;
 try{
  const handle=await page.waitForFunction(()=>{
    const p=window.__nestAffiliateLiveAppCheckSmoke;
    return p && (p.status==='success'||p.status==='error')?p:null;
  },null,{timeout:28000});
  result=await handle.jsonValue();
 }catch{
  result={status:'timeout',code:'TOKEN_NOT_SETTLED_28S',elapsedMs:28000};
 }
 const failures=await Promise.all(authResponses.filter(x=>x.service==='appcheck_exchange'&&x.status>=400).map(async rec=>{
   let errorStatus='UNKNOWN';
   try{const body=await rec.response.json(); if(typeof body?.error?.status==='string'&&/^[A-Z_]{2,48}$/.test(body.error.status))errorStatus=body.error.status;}catch{}
   return {service:rec.service,httpStatus:rec.status,errorStatus};
 }));
 console.log('LIVE_APPCHECK_NETWORK',JSON.stringify({
   statuses:authResponses.map(({service,status})=>({service,status})).slice(0,20),
   failures,requestFailures:authFailures.slice(0,10),
 }));
 console.log('LIVE_APPCHECK_SMOKE',JSON.stringify({status:result.status,code:result.code??null,elapsedMs:result.elapsedMs,configSummary:result.configSummary??null,consoleFlags:[...new Set(blocked)],consoleHints:[...new Set(safeConsoleHints)].slice(0,15)}));
 if(result.status!=='success')process.exitCode=1;
 await context.close();
}finally{await browser.close();}
