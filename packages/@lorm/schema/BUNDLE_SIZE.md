# Bundle Size Analysis

## @lorm/schema

This document outlines the bundle size analysis and monitoring for the `@lorm/schema` package.

## Scripts

### Analysis
```bash
pnpm size:check
```

### CI Integration
Bundle size checks are automatically run in CI/CD pipeline to ensure size limits are maintained.

## Size Limits

| Bundle Type | File | Size Limit |
|-------------|------|------------|
| ESM Bundle | `dist/index.js` | 40 KB |
| CJS Bundle | `dist/index.cjs` | 40 KB |
| Type Definitions | `dist/index.d.ts` | 4 KB |
| PG Adapter | `dist/pg.js` | 15 KB |
| PG Adapter CJS | `dist/pg.cjs` | 15 KB |
| MySQL Adapter | `dist/mysql.js` | 15 KB |
| MySQL Adapter CJS | `dist/mysql.cjs` | 15 KB |
| SQLite Adapter | `dist/sqlite.js` | 15 KB |
| SQLite Adapter CJS | `dist/sqlite.cjs` | 15 KB |

## Analysis Output

The bundle size analysis provides:

- **Raw Size**: Uncompressed file size
- **Gzipped Size**: Compressed size (closer to network transfer size)
- **Percentage**: Current size as percentage of limit
- **Status**: ✅ Pass / ❌ Fail based on size limits

## Database Adapters

The schema package includes optimized adapters for different databases:

- **PostgreSQL (PG)**: Full-featured adapter with advanced type support
- **MySQL**: Optimized for MySQL-specific features and constraints
- **SQLite**: Lightweight adapter for embedded database scenarios

Each adapter is bundled separately to enable tree-shaking and reduce bundle size for applications using only specific databases.

## Optimization Guidelines

- Keep schema definitions lightweight
- Optimize database adapters for specific use cases
- Use tree-shaking friendly exports
- Monitor bundle size on every change
- Consider lazy loading for less common adapters
- Minimize type definition overhead

## CI Integration

Bundle size checks run automatically on:
- Pull requests
- Main branch commits
- Release builds

Failing size checks will block CI pipeline