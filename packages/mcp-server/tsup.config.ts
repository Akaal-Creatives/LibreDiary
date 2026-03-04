import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    splitting: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: false,
    sourcemap: true,
    splitting: false,
  },
]);
