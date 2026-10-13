/**
 * Passive, same-page App Check diagnostics. No fetch, no reCAPTCHA execution,
 * no headers, credentials, URLs, browser fingerprint, persistent storage,
 * product titles, or remote telemetry.
 *
 * Resource Timing exposes request *attempts*, not proof of HTTP success.
 */
export type AppCheckSignals = {
  enterpriseRuntime: boolean;
  scriptAttempt: boolean;
  captchaRequestAttempt: boolean;
  exchangeAttempt: boolean;
  cspBlocked: boolean;
  online: boolean;
};

function recognizedAppCheckResource(name:string):'script'|'challenge'|'exchange'|null{
  try{
    const parsed=new URL(name);
    const host=parsed.hostname.toLowerCase();
    const path=parsed.pathname.toLowerCase();
    if(host==='firebaseappcheck.googleapis.com'||host==='content-firebaseappcheck.googleapis.com'){
      if(/exchangerecaptchaenterprisetoken/.test(path))return 'exchange';
      return null;
    }
    if(host==='www.google.com'||host==='www.recaptcha.net'||host==='recaptcha.google.com'){
      if(path.includes('/recaptcha/enterprise/reload')||path.includes('/recaptcha/enterprise/clr'))
        return 'challenge';
      if(path.includes('/recaptcha/enterprise.js')||path.includes('/recaptcha/enterprise/anchor'))
        return 'script';
    }
    if(host==='www.gstatic.com'&&path.includes('/recaptcha/'))return 'script';
  }catch{/* Non-URL resource entry; ignore it */}
  return null;
}

/** Diagnostic categories only; no raw request URLs can escape this function. */
export function describeAppCheckSignals(signals:AppCheckSignals):string{
  return [
    'probe=v1',
    'online='+ (signals.online?'yes':'no'),
    'runtime='+ (signals.enterpriseRuntime?'ready':'not-ready'),
    'script='+ (signals.scriptAttempt?'observed':'not-observed'),
    'challenge='+ (signals.captchaRequestAttempt?'observed':'not-observed'),
    'exchange='+ (signals.exchangeAttempt?'observed':'not-observed'),
    'csp='+ (signals.cspBlocked?'blocked':'not-observed'),
  ].join(' · ');
}

function enterpriseRuntimePresent():boolean{
  if(typeof window==='undefined')return false;
  const g=(window as unknown as {grecaptcha?:{
    enterprise?:{execute?:unknown}
  }}).grecaptcha;
  return typeof g?.enterprise?.execute==='function';
}

/** Invoke once at the beginning of the *user's* attempt, stop in finally. */
export function beginAppCheckProbe():()=>string{
  if(typeof window==='undefined'||typeof performance==='undefined')return ()=>
    'probe=v1 · browser=unavailable';
  let cspBlocked=false;
  const started=performance.now();
  const onCsp=(event:SecurityPolicyViolationEvent)=>{
    // No directive, blocked URI or other event data is retained or displayed.
    if(!/^(script-src|frame-src|connect-src)(-elem)?$/.test(event.effectiveDirective))return;
    if(/(?:recaptcha|google\.com|gstatic\.com|firebaseappcheck\.googleapis\.com)/i
      .test(event.blockedURI))cspBlocked=true;
  };
  window.addEventListener('securitypolicyviolation',onCsp);
  let result:string|null=null;
  return ()=>{
    if(result)return result;
    window.removeEventListener('securitypolicyviolation',onCsp);
    const names=performance.getEntriesByType('resource')
      .filter(item=>item.startTime>=started-250)
      .map(item=>item.name);
    const classes=names.map(recognizedAppCheckResource);
    result=describeAppCheckSignals({
      enterpriseRuntime:enterpriseRuntimePresent(),
      scriptAttempt:classes.includes('script'),
      captchaRequestAttempt:classes.includes('challenge'),
      exchangeAttempt:classes.includes('exchange'),
      cspBlocked,
      online:typeof navigator==='undefined'?true:navigator.onLine,
    });
    return result;
  };
}
