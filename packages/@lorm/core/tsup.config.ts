import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  external: [
    '@libsql/client',
    '@lorm/lib',
    '@neondatabase/serverless',
    'typed-rpc',
    '@planetscale/database',
    'better-sqlite3',
    'dotenv',
    'drizzle-orm',
    'mysql2',
    'postgres',
    'zod'
  ],
});