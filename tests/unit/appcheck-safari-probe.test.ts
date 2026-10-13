import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {describeAppCheckSignals,type AppCheckSignals} from '../../apps/web/src/lib/appCheckProbe';

const clear:AppCheckSignals={
 enterpriseRuntime:false,scriptAttempt:false,captchaRequestAttempt:false,
 exchangeAttempt:false,cspBlocked:false,online:true
};
describe('Privacy-safe diagnostic after P0 Safari App Check timeout',()=>{
 it('classifies only boolean stage markers and never embeds raw credentials or URLs',()=>{
  const diagnosis=describeAppCheckSignals({...clear,enterpriseRuntime:true,
    scriptAttempt:true,captchaRequestAttempt:true,exchangeAttempt:false});
  expect(diagnosis).toContain('runtime=ready');
  expect(diagnosis).toContain('script=observed');
  expect(diagnosis).toContain('challenge=observed');
  expect(diagnosis).toContain('exchange=not-observed');
  expect(diagnosis).not.toMatch(/https?:|Bearer |token=|6LcpY|firebaseappcheck\.googleapis\.com/);
 });
 it('distinguishes CSP errors from requests not observed and offline mode',()=>{
  expect(describeAppCheckSignals({...clear,cspBlocked:true,online:false})).toContain('csp=blocked');
  expect(describeAppCheckSignals({...clear,cspBlocked:true,online:false})).toContain('online=no');
 });
 it('captures signals only in the App Check failure path without touching campaigns',()=>{
  const src=readFileSync('apps/web/src/features/NestAiDraftReview.tsx','utf8');
  expect(src).toContain('const stopProbe=beginAppCheckProbe();');
  expect(src).toContain("failure==='APP_CHECK'?trace+' · '+safeProbe:trace");
  expect(src).toContain('setSuggestion(data)');
  expect(src).toContain('onApply({title:titles[titleIndex]!');
  expect(src).toContain('stopProbe();');
 });
});
