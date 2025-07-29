import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/pg': 'src/adapters/pg.ts',
    'adapters/mysql': 'src/adapters/mysql.ts',
    'adapters/sqlite': 'src/adapters/sqlite.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  external: ['drizzle-orm'],
});