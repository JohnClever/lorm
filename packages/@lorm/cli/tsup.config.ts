import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true, // Enable code splitting to reduce bundle size
  sourcemap: true,
  minify: false, // Disable minification for debugging
  target: 'es2020',
  outDir: 'dist',
  shims: true, // Add shims for import.meta and other ESM features in CJS
  treeshake: true, // Enable tree shaking
  external: [
    '@inquirer/prompts',
    '@lorm/core',
    '@lorm/lib',
    'cac',
    'chalk',
    'chokidar',
    'drizzle-kit',
    'execa',
    'which'
  ],
});