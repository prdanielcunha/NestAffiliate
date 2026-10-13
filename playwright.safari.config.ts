import {defineConfig,devices} from '@playwright/test';

/* iOS Safari-like WebKit smoke. Narrow in scope by design: protect the exact
 * customer-reported review navigation rather than tripling all E2E suites. */
export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:['review-in-place-copy.spec.ts','pin-studio-flow.spec.ts'],
  timeout:30_000,
  retries:1,
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  projects:[{name:'ios-webkit',use:{...devices['iPhone 13']}}],
  webServer:{
    command:'VITE_E2E_MOCK_AUTH=true VITE_DEMO_DATA_ENABLED=true pnpm --filter @nestaffiliate/web build && pnpm --filter @nestaffiliate/web preview --host 127.0.0.1 --port 4173',
    url:'http://127.0.0.1:4173',
    timeout:120_000,
  },
});
