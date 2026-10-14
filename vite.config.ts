import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/myttcoach/',
  plugins: [preact()],
  build: { target: 'es2020', sourcemap: false },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
} as any);
