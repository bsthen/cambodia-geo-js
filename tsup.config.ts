import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', lite: 'src/lite.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2020',
  sourcemap: false,
  // Keep Khmer text as real UTF-8 instead of \uXXXX escapes (about 3x smaller).
  esbuildOptions(options) {
    options.charset = 'utf8';
  },
});
