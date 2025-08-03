import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  external: [
    // Mark all dependencies as external to avoid bundling them
    'cac',
    'picocolors',
    'fast-glob',
    'fs-extra',
    'semver',
    'node-fetch',
    'yaml'
  ],
  // No shebang needed since we use bin/cli.js as entry point
  onSuccess: async () => {
    console.log('✅ Build completed successfully');
  }
});