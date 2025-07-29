# Bundle Size Analysis

This package includes automated bundle size analysis to ensure optimal performance and prevent bundle bloat.

## Scripts

- `pnpm size` - Analyze current bundle sizes
- `pnpm size:check` - Build and analyze bundle sizes
- `pnpm size:watch` - Build, analyze, and watch for changes

## Size Limits

| Bundle | Limit | Current | Status |
|--------|-------|---------|--------|
| ESM Bundle | 6 KB | ~5.82 KB | ✅ |
| CJS Bundle | 6 KB | ~5.93 KB | ✅ |
| Type Definitions | 1 KB | ~884 B | ✅ |

## Analysis Output

The bundle analysis provides:
- **Raw size**: Uncompressed file size
- **Gzipped size**: Compressed size (closer to real-world transfer size)
- **Percentage**: Usage of the defined limit
- **Status**: Pass/fail indicator

## CI Integration

Add to your CI pipeline:

```bash
pnpm size:check
```

This will fail the build if any bundle exceeds its size limit.

## Monitoring

Regularly monitor bundle sizes to:
- Prevent performance regressions
- Identify opportunities for optimization
- Ensure consistent library size
- Track impact of new features