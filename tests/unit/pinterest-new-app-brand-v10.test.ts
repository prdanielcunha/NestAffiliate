import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('NestAffiliate premium identity and Pinterest replacement app',()=>{
 it('serves the new gradient vector icon in PWA, favicon and service worker',()=>{
   const icon=read('apps/web/public/icon.svg');
   expect(icon).toContain('linearGradient');
   expect(icon).toContain('NestAffiliate');
   expect(icon).not.toContain('M132 356V156');
   expect(read('apps/web/index.html')).toContain('/icon.svg?v=2');
   expect(read('apps/web/public/manifest.webmanifest')).toContain('/icon.svg?v=2');
   expect(read('apps/web/public/sw.js')).toContain('nestaffiliate-shell-v3');
 });
 it('uses the same official monogram on login, sidebar, mobile header and public legal pages',()=>{
   const app=read('apps/web/src/App.tsx');
   expect(app.match(/src="\/icon\.svg\?v=2"/g)?.length).toBe(3);
   expect(app).toContain('brand-wordmark');
   expect(read('apps/web/src/features/PublicLegalPage.tsx')).toContain('src="/icon.svg?v=2"');
   expect(app).not.toContain('className="brand-mark">N</');
 });
 it('uses the new public App ID only, without treating Trial pending as approved',()=>{
   const config=read('packages/config/src/index.ts');
   const connections=read('apps/web/src/features/ConnectionCenter.tsx');
   const docs=read('docs/PINTEREST_DEVELOPER_SUBMISSION.md');
   expect(config).toContain("id: '1625057'");
   expect(connections).toContain('PINTEREST_DEVELOPER_APP.id');
   expect(connections).toContain('Trial pendente');
   expect(config).not.toContain("id: '1618597'");
   expect(docs).toContain('1625057');
   expect(docs).toContain('Trial pending');
 });
});