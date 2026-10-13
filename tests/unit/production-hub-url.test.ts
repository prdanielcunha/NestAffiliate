import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';

describe('Production deploy Hub navigation never points back to NestAffiliate',()=>{
 it('uses the canonical MillionsNest Hub URL in the production Firebase build',()=>{
  const workflow=readFileSync('.github/workflows/firebase-production.yml','utf8');
  expect(workflow).toContain('echo "VITE_HUB_URL=https://www.millionsnest.com"');
  expect(workflow).not.toContain('echo "VITE_HUB_URL=https://$LIVE_DOMAIN"');
  expect(workflow).toContain('FIREBASE_SITE: mn-nestaffiliate-555464791734');
  expect(workflow).toContain('FIREBASE_PROJECT: millionsnest');
 });
 it('renders the configured Hub URL as a real anchor on the sign-in screen',()=>{
  const app=readFileSync('apps/web/src/App.tsx','utf8');
  expect(app).toContain("href={import.meta.env.VITE_HUB_URL || 'https://www.millionsnest.com'}");
 });
});
