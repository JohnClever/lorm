import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/config.ts', 'src/router.ts', 'src/load.ts', 'src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  minify: false, // Disable minification for debugging
  target: 'es2020',
  outDir: 'dist',
  external: [
    '@libsql/client',
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