import {describe,it,expect} from 'vitest';
import {normalizeAppCheckFailure,validatedAppCheckTokenResult} from '../../apps/web/src/lib/firebase';
import {aiSupportDiagnostic} from '../../apps/web/src/lib/nestAiTransport';

describe('P0 Safari Firebase App Check exchange diagnosis without leaking secrets',()=>{
 it('identifies 400/403 from the SDK without exposing response body, site keys or API tokens',()=>{
  const e=normalizeAppCheckFailure({
   code:'appCheck/fetch-status-error',
   customData:{httpStatus:403,apiKey:'private',requestBody:'recaptcha-secret'},
   message:'secret raw response and URL must never appear',
  });
  expect(e.message).toBe('APP_CHECK_EXCHANGE_REJECTED_HTTP_403');
  expect(aiSupportDiagnostic(e)).toBe('app_check / EXCHANGE_REJECTED · http=403');
  expect(e.message).not.toMatch(/private|secret|https?:|token/i);
 });
 it('reports a real reCAPTCHA SDK throw instead of generic APP_CHECK',()=>{
  const e=normalizeAppCheckFailure({code:'appCheck/recaptcha-error',message:'secret'});
  expect(aiSupportDiagnostic(e)).toBe('app_check / RECAPTCHA');
  expect(normalizeAppCheckFailure({code:'appCheck/initial-throttle'}).message)
    .toBe('APP_CHECK_INITIAL_THROTTLE');
 });
 it('reports no untrusted customData when SDK code is unrecognized',()=>{
  const e=normalizeAppCheckFailure({code:'external/evil-key?token=test',
   customData:{httpStatus:200,authorization:'do not log'},message:'token=abc'});
  expect(e.message).toBe('APP_CHECK_SDK_UNKNOWN');
  expect(aiSupportDiagnostic(e)).toBe('app_check / SDK_UNKNOWN');
 });
 it('handles SDK dummy token errors by converting their typed metadata',()=>{
  expect(()=>validatedAppCheckTokenResult({
   token:'dummy-do-not-forward',error:{
     code:'appCheck/fetch-status-error',customData:{httpStatus:'400'}
   }
  })).toThrow('APP_CHECK_EXCHANGE_REJECTED_HTTP_400');
  expect(aiSupportDiagnostic(normalizeAppCheckFailure({code:'appCheck/fetch-parse-error'})))
    .toBe('app_check / EXCHANGE_PARSE_ERROR');
 });
 it('leaves real App Check tokens intact and does not force refresh',()=>{
  expect(validatedAppCheckTokenResult({token:'opaque-test-value',error:null}))
   .toBe('opaque-test-value');
 });
});
