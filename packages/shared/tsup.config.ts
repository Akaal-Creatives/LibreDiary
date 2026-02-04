import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/types/index.ts', 'src/schemas/index.ts', 'src/utils/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
