import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/simple-cli.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false, // Disable splitting for simpler output
  sourcemap: false,
  minify: true, // Enable minification for smaller bundle
  target: 'es2020',
  outDir: 'dist',
  shims: true,
  treeshake: true,
  external: [
    '@inquirer/prompts',
    '@lorm/core',
    'cac',
    'chalk',
    'drizzle-kit'
  ],
});