import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts', 
    'src/config.ts', 
    'src/router.ts', 
    'src/load.ts', 
    'src/server.ts',
    'src/infrastructure/index.ts',
    'src/infrastructure/cache/index.ts',
    'src/infrastructure/performance/index.ts',
    'src/infrastructure/security/index.ts',
    'src/infrastructure/plugin-system/index.ts'
  ],
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
    'zod',
    'fast-glob',
    'fs-extra',
    'semver',
    'node-fetch'
  ],
});