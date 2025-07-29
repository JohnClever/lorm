import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'utils/index': 'src/utils/index.ts',
    'utils/plugin-system': 'src/utils/plugin-system.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  treeshake: true,
  external: [
    '@orpc/server',
    'drizzle-orm',
    'zod',
    'chalk',
    'execa',
    'which',
    'cac',
    'fs',
    'path',
    'os'
  ],
});