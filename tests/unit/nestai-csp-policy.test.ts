import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('NestAI first-party Firebase Hosting CSP',()=>{
 const firebase=JSON.parse(readFileSync('firebase.json','utf8'));
 const policy:string=firebase.hosting.headers.find((h:{source:string})=>h.source==='**')
  .headers.find((h:{key:string})=>h.key==='Content-Security-Policy').value;
 const connect=policy.match(/(?:^|; )connect-src ([^;]+)/)?.[1]||'';
 it('allows the exact NestAI Workers domain used by the authenticated SDK',()=>{
  expect(connect.split(/\s+/)).toContain('https://ai.millionsnest.com');
  expect(connect.split(/\s+/)).toContain('https://www.millionsnest.com');
 });
 it('does not allow all arbitrary remote connections',()=>{
  expect(connect).not.toContain('https: ');
  expect(connect).not.toContain('https://*');
  expect(policy).toContain("default-src 'self'");
 });
});
