import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: !isProduction,
  minify: isProduction,
  target: 'es2020',
  outDir: 'dist',
  shims: true,
  treeshake: true,
  metafile: true, // Generate metafile for bundle analysis
  bundle: true,
  platform: 'node',
  onSuccess: isProduction ? 'node scripts/analyze-bundle.js' : undefined,
  external: [
    '@inquirer/prompts',
    '@lorm/core',
    'cac',
    'chalk',
    'chokidar',
    'drizzle-kit',
    'execa',
    'which'
  ],
});