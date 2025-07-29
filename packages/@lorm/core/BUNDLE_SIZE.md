# Bundle Size Analysis

## @lorm/core

This document outlines the bundle size analysis and monitoring for the `@lorm/core` package.

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
| ESM Bundle | `dist/index.js` | 30 KB |
| CJS Bundle | `dist/index.cjs` | 30 KB |
| Type Definitions | `dist/index.d.ts` | 3 KB |

## Analysis Output

The bundle size analysis provides:

- **Raw Size**: Uncompressed file size
- **Gzipped Size**: Compressed size (closer to network transfer size)
- **Percentage**: Current size as percentage of limit
- **Status**: ✅ Pass / ❌ Fail based on size limits

## Optimization Guidelines

- Keep core functionality minimal and focused
- Avoid unnecessary dependencies
- Use tree-shaking friendly exports
- Monitor bundle size on every change
- Consider code splitting for larger features

## CI Integration

Bundle size checks run automatically on:
- Pull requests
- Main branch commits
- Release builds

Failing size checks will block CI pipeline until resolved.