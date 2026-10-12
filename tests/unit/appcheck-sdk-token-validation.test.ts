import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {validatedAppCheckTokenResult} from '../../apps/web/src/lib/firebase';
import {classifyNestAiFailure} from '../../apps/web/src/lib/nestAiFailure';
import {aiSupportDiagnostic} from '../../apps/web/src/lib/nestAiTransport';

describe('App Check fail-closed initialization and Firebase SDK dummy tokens',()=>{
  it('activates Enterprise App Check before creating Auth, Firestore or Storage',()=>{
    const source=readFileSync('apps/web/src/lib/firebase.ts','utf8');
    const init=source.indexOf('nestAiAppCheck = initializeAppCheck(firebaseApp,');
    const auth=source.indexOf('getAuth(firebaseApp)');
    const firestore=source.indexOf('getFirestore(firebaseApp)');
    const storage=source.indexOf('getStorage(firebaseApp)');
    expect(init).toBeGreaterThan(-1);
    expect(init).toBeLessThan(auth);
    expect(init).toBeLessThan(firestore);
    expect(init).toBeLessThan(storage);
  });
  it('rejects SDK dummy token with recaptcha-error rather than forwarding it',()=>{
    expect(()=>validatedAppCheckTokenResult({
      token:'DUMMY_ERROR_TOKEN_SHOULD_NEVER_BE_USED',error:{code:'appCheck/recaptcha-error'},
    })).toThrow('APP_CHECK_RECAPTCHA_ERROR');
    expect(classifyNestAiFailure(new Error('APP_CHECK_RECAPTCHA_ERROR'))).toBe('APP_CHECK');
    expect(aiSupportDiagnostic(new Error('APP_CHECK_RECAPTCHA_ERROR'))).toBe('app_check / RECAPTCHA');
  });
  it('rejects throttled and failed token exchanges with an actionable safe category',()=>{
    for(const [sdk,expected,issue] of [
      ['appCheck/initial-throttle','APP_CHECK_INITIAL_THROTTLE','THROTTLED'],
      ['appCheck/fetch-status-error','APP_CHECK_EXCHANGE_REJECTED','EXCHANGE_REJECTED'],
      ['appCheck/fetch-network-error','APP_CHECK_EXCHANGE_NETWORK','EXCHANGE_NETWORK'],
    ]){
      expect(()=>validatedAppCheckTokenResult({token:'DUMMY',error:{code:sdk}})).toThrow(expected);
      expect(aiSupportDiagnostic(new Error(expected))).toBe('app_check / '+issue);
    }
  });
  it('accepts only normal SDK token results and fails on empty tokens',()=>{
    expect(validatedAppCheckTokenResult({token:'opaque-valid-test-token'})).toBe('opaque-valid-test-token');
    expect(()=>validatedAppCheckTokenResult({token:''})).toThrow('APP_CHECK_EMPTY_TOKEN');
  });
});
