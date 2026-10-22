import { defineConfig } from 'vitest/config';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {alias: {
    react: fileURLToPath(new URL('./apps/web/node_modules/react',import.meta.url)),
    'react-dom': fileURLToPath(new URL('./apps/web/node_modules/react-dom',import.meta.url)),
  }},
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}']
  }
});
