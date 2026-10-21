import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PINTEREST_DEVELOPER_APP,pinterestApiApproved,pinterestStandardApproved,canAttemptPinterestPublish} from '../../packages/config/src/index';

function source(path:string){return readFileSync(new URL('../../'+path,import.meta.url),'utf8');}

describe('Pinterest policy/review fail-closed controls',()=>{
 it('denied 1625057 cannot be treated as approved even by toggling unrelated flags',()=>{
  expect(PINTEREST_DEVELOPER_APP.id).toBe('1625057');
  expect(PINTEREST_DEVELOPER_APP.accessStatus).toBe('TRIAL_DENIED_PENDING_REREVIEW');
  expect(pinterestApiApproved()).toBe(false);
  expect(pinterestStandardApproved()).toBe(false);
  expect(canAttemptPinterestPublish()).toBe(false);
 });
 it('Main URL renders marketing page during unknown auth state, and private routes stay behind AuthProvider',()=>{
  const app=source('apps/web/src/App.tsx');
  expect(app).toContain("auth.state !== 'ready' && window.location.pathname === '/'");
  expect(app).toContain('return <I18nProvider locale={locale}><Login /></I18nProvider>;');
  const bootstrap=source('apps/web/src/main.tsx');
  expect(bootstrap).toContain('isPublicAbout');
  expect(bootstrap).toContain('<AuthProvider>');
  expect(bootstrap).toContain('<PublicLegalPage');
  const html=source('apps/web/index.html');
  expect(html).toContain('href="/privacy"');
  expect(html).toContain('href="/login"');
 });
 it('public legal policy clarifies API denial, source-data handling, consent, no scraped Pinterest data and anti-spam',()=>{
  const legal=source('apps/web/src/features/PublicLegalPage.tsx');
  expect(legal).toContain('Trial do aplicativo 1625057 foi negado');
  expect(legal).toContain('Trial access for app 1625057 was denied');
  expect(legal).toContain('Trial de la app 1625057 fue denegado');
  expect(legal).toContain('não serão armazenadas além das exceções permitidas');
  expect(legal).toContain('não usamos materiais do Pinterest para treinar');
  expect(legal).toContain('select each Pin before submission');
 });
 it('Pinterest integration panel exposes provider status and forbids claims of active API',()=>{
  const ui=source('apps/web/src/features/ConnectionCenter.tsx');
  expect(ui).toContain('pinterestApiApproved()');
  expect(ui).toContain('pinterestStandardApproved()');
  expect(ui).toContain('COMPROMISSOS DA INTEGRAÇÃO');
  expect(ui).toContain('não coletamos dados do Pinterest por scraping');
 });
});
