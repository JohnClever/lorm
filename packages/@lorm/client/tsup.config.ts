import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  minify: false, // Disable minification for debugging
  target: 'es2020',
  outDir: 'dist',
  external: [
    'typed-rpc',
    'zod',
    'fs',
    'path',
    'url',
    'node:fs',
    'node:path',
    'node:url'
  ],
  treeshake: true,
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
    options.keepNames = false;
  },
});