import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nestaffiliate/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@nestaffiliate/scoring': path.resolve(__dirname, '../../packages/scoring/src/index.ts'),
      '@nestaffiliate/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@nestaffiliate/ai-router': path.resolve(__dirname, '../../packages/ai-router/src/index.ts'),
      '@nestaffiliate/integrations': path.resolve(__dirname, '../../packages/integrations/src/index.ts'),
      '@nestaffiliate/compliance': path.resolve(__dirname, '../../packages/compliance/src/index.ts'),
      '@nestaffiliate/creative-engine': path.resolve(__dirname, '../../packages/creative-engine/src/index.ts'),
      '@nestaffiliate/radar': path.resolve(__dirname, '../../packages/radar/src/index.ts'),
      '@nestaffiliate/analytics': path.resolve(__dirname, '../../packages/analytics/src/index.ts'),
      '@nestaffiliate/learning': path.resolve(__dirname, '../../packages/learning/src/index.ts')
    }
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 700
  }
});
