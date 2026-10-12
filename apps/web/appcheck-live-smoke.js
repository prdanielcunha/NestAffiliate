// Public, non-authenticated App Check smoke only. Not included in the application bundle.
// App Check tokens are never copied into diagnostics or CI logs.
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

const publish=(value)=>{window.__nestAffiliateLiveAppCheckSmoke=value;};
const started=performance.now();
let configSummary={};
publish({status:'pending'});
try {
  const response=await fetch('/__/firebase/init.json',{cache:'no-store'});
  if(!response.ok)throw Object.assign(new Error('FIREBASE_HOSTING_CONFIG_MISSING'),{code:'HOSTING_CONFIG_MISSING'});
  const config=await response.json();
  configSummary={projectId:typeof config.projectId==='string'?config.projectId:'missing',appIdPrefix:typeof config.appId==='string'?config.appId.split(':').slice(0,3).join(':'):'missing',appIdPresent:Boolean(config.appId)};
  if(config.projectId!=='millionsnest'||typeof config.appId!=='string'||!config.appId.startsWith('1:555464791734:'))
    throw Object.assign(new Error('FIREBASE_WRONG_APP'),{code:'WRONG_PROJECT_OR_WEB_APP'});
  const app=initializeApp(config,'nestaffiliate-live-appcheck-smoke');
  const appCheck=initializeAppCheck(app,{
    provider:new ReCaptchaEnterpriseProvider('6LcpY-EtAAAAAElqBbIL_K7nAkm2wpuF6fbhsggG'),
    isTokenAutoRefreshEnabled:false,
  });
  const result=await getToken(appCheck,false);
  if(!result?.token)throw Object.assign(new Error('EMPTY_APP_CHECK_TOKEN'),{code:'EMPTY_TOKEN'});
  publish({status:'success',elapsedMs:Math.round(performance.now()-started)});
} catch(error){
  const code=typeof error?.code==='string'&&/^[\w/.-]{1,90}$/.test(error.code)?error.code:'UNKNOWN';
  publish({status:'error',code,configSummary,elapsedMs:Math.round(performance.now()-started)});
}
