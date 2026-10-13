import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Firebase production SDK support floor',()=>{
 it('pins a version with Auth/AppCheck Enterprise conflict and iOS Safari persistence fixes',()=>{
  const web=JSON.parse(readFileSync('apps/web/package.json','utf8'));
  expect(web.dependencies.firebase).toBe('12.19.0');
  const actual=JSON.parse(readFileSync('apps/web/node_modules/firebase/package.json','utf8'));
  expect(actual.version).toBe('12.19.0');
 });
 it('keeps real Firebase App Check mandatory for NestAI without blocking Firebase Auth initialisation',()=>{
  const firebase=readFileSync('apps/web/src/lib/firebase.ts','utf8');
  const auth=firebase.indexOf('getAuth(firebaseApp)');
  const appCheck=firebase.indexOf('nestAiAppCheck = initializeAppCheck(firebaseApp');
  expect(auth).toBeGreaterThan(-1);
  expect(appCheck).toBeGreaterThan(auth);
  expect(firebase).toContain('validatedAppCheckTokenResult(await readAppCheckToken(nestAiAppCheck, false))');
  const service=readFileSync('apps/web/src/services/nestAiClient.ts','utf8');
  expect(service).toContain("withNestAiStage('app_check',20000,getNestAffiliateAppCheckToken)");
  expect(service).toContain('await'); // the App Check preflight is tested separately
 });
});
