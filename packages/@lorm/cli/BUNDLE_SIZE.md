# Bundle Size Analysis

This package includes automated bundle size analysis to ensure optimal performance and prevent bundle bloat.

## Scripts

- `pnpm size` - Analyze current bundle sizes
- `pnpm size:check` - Build and analyze bundle sizes
- `pnpm size:watch` - Build, analyze, and watch for changes

## Size Limits

| Bundle | Limit | Current | Status |
|--------|-------|---------|--------|
| ESM Bundle | 55 KB | ~52.8 KB | ✅ |
| CJS Bundle | 60 KB | ~58.05 KB | ✅ |
| Type Definitions | 5 KB | ~13 B | ✅ |

## Analysis Output

The bundle analysis provides:
- **Raw size**: Uncompressed file size
- **Gzipped size**: Compressed size (closer to real-world transfer size)
- **Percentage**: Usage of the defined limit
- **Status**: Pass/fail indicator

## CLI-Specific Considerations

### Bundle Size Expectations
- CLI tools typically have larger bundles due to dependencies
- Current sizes are well within acceptable limits for Node.js CLI applications
- Gzipped sizes (ESM: ~6.6 KB, CJS: ~7.43 KB) are excellent for CLI tools

### Dependencies Impact
- `@inquirer/prompts`: Interactive CLI prompts
- `cac`: Command-line argument parsing
- `chalk`: Terminal string styling
- `chokidar`: File watching capabilities
- `execa`: Process execution utilities

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
- Ensure consistent CLI startup time
- Track impact of new dependencies
- Maintain fast installation times

## Performance Notes

- CLI startup time is directly related to bundle size
- Keep dependencies minimal and well-justified
- Consider lazy loading for heavy operations
- Monitor gzipped sizes for npm install performance