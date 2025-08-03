# Unified Cache System

A comprehensive, hierarchical caching system for the `@lorm/cli` package that consolidates all fragmented cache implementations into a unified, type-safe, and performant solution.

## Overview

The Unified Cache System replaces over seven fragmented cache implementations with a single, cohesive architecture that provides:

- **Hierarchical Caching**: Memory and disk layers with intelligent routing
- **Smart Strategies**: LRU, LFU, and adaptive eviction policies
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Performance Monitoring**: Real-time metrics, health checks, and alerting
- **Cache Warming**: Preload critical data for optimal performance
- **Seamless Migration**: Automatic migration from legacy cache implementations
- **Namespace Support**: Isolated cache spaces for different use cases

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Cache API                        │
├─────────────────────────────────────────────────────────────┤
│                    Cache Engine                             │
├─────────────────────────────────────────────────────────────┤
│  Strategy Manager  │  Monitor  │  Config Manager  │ Migration │
├─────────────────────────────────────────────────────────────┤
│     Memory Layer           │           Disk Layer            │
├─────────────────────────────────────────────────────────────┤
│              Compression & Utilities                        │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Cache Engine**: Central orchestrator managing all cache operations
2. **Memory Layer**: Fast in-memory cache with LRU eviction and TTL support
3. **Disk Layer**: Persistent file-system cache with compression
4. **Strategy Manager**: Intelligent routing and eviction policies
5. **Monitor**: Performance metrics, health checks, and alerting
6. **Config Manager**: Dynamic configuration with validation
7. **Migration System**: Seamless transition from legacy implementations

## Quick Start

### Basic Usage

```typescript
import { createUnifiedCache } from '@lorm/cli/cache';

// Create cache with automatic environment detection
const cache = await createUnifiedCache();

// Basic operations
await cache.set('user:123', { name: 'John', email: 'john@example.com' });
const user = await cache.get('user:123');
await cache.delete('user:123');

// Check if key exists
const exists = await cache.has('user:123');

// Get all keys
const keys = await cache.keys();

// Clear all cache
await cache.clear();
```

### Namespaced Cache

```typescript
import { createNamespacedCache } from '@lorm/cli/cache';

// Create cache for specific namespace
const pluginCache = await createNamespacedCache('plugin');
const configCache = await createNamespacedCache('config');

// Operations are isolated by namespace
await pluginCache.set('eslint', { version: '8.0.0', enabled: true });
await configCache.set('eslint', { rules: { 'no-console': 'error' } });

// These are different values in different namespaces
const pluginData = await pluginCache.get('eslint'); // { version: '8.0.0', enabled: true }
const configData = await configCache.get('eslint'); // { rules: { 'no-console': 'error' } }
```

### Environment-Specific Configuration

```typescript
import { cacheFactory } from '@lorm/cli/cache';

// Development environment
const devCache = await cacheFactory.createDevelopment();

// Production environment
const prodCache = await cacheFactory.createProduction();

// Test environment
const testCache = await cacheFactory.createTest();
```

## Advanced Usage

### Custom Configuration

```typescript
import { CacheFactory } from '@lorm/cli/cache';

const factory = CacheFactory.getInstance();
const cache = await factory.create({
  layers: {
    memory: {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 5000,
      ttl: 60 * 60 * 1000, // 1 hour
      evictionPolicy: 'lru'
    },
    disk: {
      enabled: true,
      basePath: '.cache',
      maxSize: 500 * 1024 * 1024, // 500MB
      maxItems: 25000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      compression: 'gzip'
    }
  },
  strategies: {
    routing: {
      rules: [
        {
          condition: { namespace: 'plugin' },
          target: 'memory',
          priority: 1
        },
        {
          condition: { sizeThreshold: 1024 * 1024 }, // 1MB
          target: 'disk',
          priority: 2
        }
      ]
    }
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30000,
    healthCheckInterval: 60000,
    alertThresholds: {
      memoryUsage: 0.9,
      diskUsage: 0.8,
      hitRatio: 0.7
    }
  }
});
```

### Cache Decorators

```typescript
import { cacheDecorators } from '@lorm/cli/cache';

// Memoize function results
const memoizedFunction = cacheDecorators.memoize(
  async (userId: string) => {
    // Expensive operation
    return await fetchUserFromDatabase(userId);
  },
  {
    namespace: 'user',
    ttl: 30 * 60 * 1000, // 30 minutes
    keyGenerator: (userId) => `user:${userId}`
  }
);

// Cache-aside pattern
const loadUser = cacheDecorators.cacheAside(
  async (userId: string) => {
    return await fetchUserFromDatabase(userId);
  },
  { namespace: 'user', ttl: 60 * 60 * 1000 }
);

// Write-through pattern
const saveUser = cacheDecorators.writeThrough(
  async (userId: string, userData: any) => {
    await saveUserToDatabase(userId, userData);
  },
  { namespace: 'user', ttl: 60 * 60 * 1000 }
);
```

### Batch Operations

```typescript
import { cacheUtils } from '@lorm/cli/cache';

// Batch get
const users = await cacheUtils.batchGet(['user:1', 'user:2', 'user:3'], 'user');

// Batch set
const userData = new Map([
  ['user:1', { name: 'John' }],
  ['user:2', { name: 'Jane' }],
  ['user:3', { name: 'Bob' }]
]);
await cacheUtils.batchSet(userData, { namespace: 'user', ttl: 3600000 });

// Pattern-based operations
const userCaches = await cacheUtils.getByPattern(/^user:/, 'user');
const deletedCount = await cacheUtils.deleteByPattern(/^temp:/, 'custom');
```

### Monitoring and Health Checks

```typescript
import { validateCacheHealth, getCacheStats } from '@lorm/cli/cache';

// Health validation
const health = await validateCacheHealth();
if (!health.healthy) {
  console.log('Issues:', health.issues);
  console.log('Recommendations:', health.recommendations);
}

// Performance statistics
const stats = await getCacheStats();
console.log(`Hit ratio: ${stats.hitRatio}`);
console.log(`Memory usage: ${stats.memoryUsage}`);
console.log(`Total operations: ${stats.operations}`);
```

## Migration from Legacy Caches

The system automatically migrates data from legacy cache implementations:

### Automatic Migration

```typescript
import { migrateLegacyCaches } from '@lorm/cli/cache';

// Migrate all legacy caches
const results = await migrateLegacyCaches({
  backupBeforeMigration: true,
  cleanupAfterMigration: false // Conservative default
});

for (const result of results) {
  console.log(`Migration ${result.planId}: ${result.status}`);
  console.log(`Migrated ${result.migratedCount} items`);
}
```

### Manual Migration Control

```typescript
import { CacheMigrator } from '@lorm/cli/cache';

const migrator = new CacheMigrator({
  batchSize: 100,
  maxConcurrency: 3,
  preserveMetadata: true,
  validateData: true
});

await migrator.initialize();

// Get available migration plans
const plans = migrator.getPlans();
console.log('Available migration plans:', plans.map(p => p.name));

// Execute specific plan
const cache = await createUnifiedCache();
const status = await migrator.executePlan(plans[0].id, cache);

console.log(`Migration status: ${status.status}`);
console.log(`Progress: ${status.progress * 100}%`);
```

### Legacy Cache Mapping

The migration system handles these legacy implementations:

| Legacy Cache | Target Namespace | Description |
|--------------|------------------|-------------|
| `CommandCache` | `custom` | File-based command cache |
| `ConfigValidationCache` | `config` | Configuration validation results |
| `LazyLoader` cache | `plugin` | Module loading cache |
| `PluginManager` cache | `plugin` | Plugin instance cache |
| `PerformanceManager` cache | `plugin` | Performance optimization cache |
| `ValidationService` cache | `config` | Plugin validation cache |
| Generic file caches | `custom` | Various file-based caches |

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  layers: {
    memory: {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 5000,
      ttl: 60 * 60 * 1000, // 1 hour
      evictionPolicy: 'lru',
      compressionThreshold: 1024 // 1KB
    },
    disk: {
      enabled: true,
      basePath: '.cache',
      maxSize: 500 * 1024 * 1024, // 500MB
      maxItems: 25000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      compression: 'gzip',
      atomicWrites: true
    }
  },
  strategies: {
    eviction: {
      algorithm: 'adaptive',
      memoryPressureThreshold: 0.8,
      diskPressureThreshold: 0.9
    },
    routing: {
      rules: [
        { condition: { namespace: 'plugin' }, target: 'memory' },
        { condition: { sizeThreshold: 1024 * 1024 }, target: 'disk' }
      ]
    }
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes
    alertThresholds: {
      memoryUsage: 0.9,
      diskUsage: 0.8,
      hitRatio: 0.7,
      errorRate: 0.05
    }
  },
  warming: {
    enabled: true,
    criticalNamespaces: ['plugin', 'config'],
    maxItems: 100,
    timeout: 10000,
    preloadData: {}
  }
};
```

### Environment-Specific Overrides

#### Development
- Smaller cache sizes for faster startup
- Disabled disk cache for simplicity
- More frequent health checks
- Disabled cache warming

#### Production
- Larger cache sizes for better performance
- Enabled disk cache for persistence
- Optimized monitoring intervals
- Enabled cache warming

#### Test
- Minimal cache sizes
- Disabled monitoring and warming
- In-memory only for isolation

## Performance Considerations

### Memory Management

- **LRU Eviction**: Automatically removes least recently used items
- **Memory Pressure Detection**: Proactive eviction when memory is low
- **Compression**: Reduces memory footprint for large values
- **TTL Support**: Automatic expiration of stale data

### Disk Optimization

- **Atomic Writes**: Prevents corruption during writes
- **Compression**: Reduces disk space usage
- **Efficient Storage**: Optimized file organization
- **Background Cleanup**: Removes expired entries

### Network and I/O

- **Batch Operations**: Reduces overhead for multiple operations
- **Async Operations**: Non-blocking cache operations
- **Connection Pooling**: Efficient resource utilization
- **Error Recovery**: Graceful handling of failures

## Monitoring and Alerting

### Metrics Collected

- **Hit Ratio**: Cache effectiveness
- **Memory Usage**: Current memory consumption
- **Disk Usage**: Current disk consumption
- **Operation Latency**: Performance metrics
- **Error Rates**: Reliability metrics
- **Eviction Rates**: Cache pressure indicators

### Health Checks

- **Layer Health**: Individual layer status
- **Configuration Validation**: Config integrity
- **Resource Availability**: Memory and disk space
- **Performance Thresholds**: Latency and throughput

### Alerting

```typescript
// Configure alert thresholds
const cache = await createUnifiedCache();
const monitor = cache.getMonitor();

monitor.on('alert', (alert) => {
  console.log(`Alert: ${alert.type} - ${alert.message}`);
  
  switch (alert.type) {
    case 'high_memory_usage':
      // Handle high memory usage
      break;
    case 'low_hit_ratio':
      // Handle poor cache performance
      break;
    case 'high_error_rate':
      // Handle errors
      break;
  }
});
```

## Best Practices

### Key Design

- Use descriptive, hierarchical keys: `user:profile:123`
- Include version information: `config:v2:eslint`
- Avoid special characters that might cause issues
- Keep keys reasonably short but meaningful

### TTL Strategy

- Set appropriate TTL based on data volatility
- Use shorter TTL for frequently changing data
- Use longer TTL for stable configuration data
- Consider cache warming for critical data

### Namespace Organization

- `plugin`: Plugin-related data and metadata
- `config`: Configuration and validation results
- `custom`: Application-specific data
- `temp`: Short-lived temporary data

### Error Handling

```typescript
try {
  const data = await cache.get('key');
  if (data === null) {
    // Handle cache miss
    const freshData = await loadFromSource();
    await cache.set('key', freshData);
    return freshData;
  }
  return data;
} catch (error) {
  // Handle cache errors gracefully
  console.warn('Cache error:', error);
  return await loadFromSource(); // Fallback to source
}
```

## Troubleshooting

### Common Issues

#### High Memory Usage

```typescript
// Check memory statistics
const stats = await cache.stats();
if (stats.memoryUsage > 0.9) {
  // Clear non-critical caches
  await cache.namespace('temp').clear();
  
  // Optimize cache configuration
  await cache.optimize();
}
```

#### Poor Hit Ratio

```typescript
// Analyze cache performance
const stats = await cache.stats();
if (stats.hitRatio < 0.7) {
  // Increase cache size
  // Adjust TTL settings
  // Review caching strategy
}
```

#### Migration Issues

```typescript
// Validate legacy data before migration
const migrator = new CacheMigrator();
const validation = await migrator.validateLegacyData(adapter);

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  // Fix data issues before migration
}
```

### Debug Mode

```typescript
// Enable debug logging
process.env.CACHE_DEBUG = 'true';

const cache = await createUnifiedCache();

// Monitor cache events
cache.on('hit', (key) => console.log(`Cache hit: ${key}`));
cache.on('miss', (key) => console.log(`Cache miss: ${key}`));
cache.on('error', (error) => console.error('Cache error:', error));
```

## API Reference

For complete API documentation, see the TypeScript definitions in the source code. Key interfaces include:

- `UnifiedCache`: Main cache interface
- `NamespacedCache`: Namespace-specific cache
- `CacheConfig`: Configuration options
- `CacheStats`: Performance statistics
- `CacheHealth`: Health status information

## Contributing

When contributing to the cache system:

1. Follow the existing code patterns and conventions
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider backward compatibility
5. Test migration scenarios thoroughly

## License

This cache system is part of the `@lorm/cli` package and follows the same license terms.