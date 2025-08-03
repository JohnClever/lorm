/**
 * Unified Cache System - Main Entry Point
 * 
 * This module provides the main exports for the unified cache system,
 * offering a clean and comprehensive API for cache operations.
 */

// Core types and interfaces
export type {
  // Core types
  CacheLayer,
  EvictionStrategy,
  CompressionAlgorithm,
  CacheOperation,
  CacheNamespace,
  CacheOptions,
  CacheStats,
  CacheEntryMetadata,
  CacheEntry,
  CacheLayerConfig,
  CacheConfig,
  CacheWarmingConfig,
  CachePerformanceMetrics,
  CacheHealth,
  CacheMigrationStatus,
  LegacyCacheAdapter,
  CacheEvents,
  CacheKey,
  CacheKeyUtils,
  
  // Core interfaces
  UnifiedCache,
  CacheLayerInterface,
  CacheStrategyInterface,
  CacheMonitorInterface,
  CacheConfigManagerInterface,
  CacheMigrationInterface,
  NamespacedCache,
  CacheFactoryInterface
} from './core/types.js';

// Core implementations
export { CacheEngine } from './core/engine.js';

// Cache layers
export { MemoryCacheLayer } from './layers/memory.js';
export { DiskCacheLayer } from './layers/disk.js';

// Strategy management
export { CacheStrategyManager } from './strategies/manager.js';

// Monitoring
export { CacheMonitor } from './monitoring/monitor.js';

// Configuration
export { CacheConfigManager } from './config/manager.js';

// Migration
export { CacheMigrator, migrationUtils } from './migration/migrator.js';

// Utilities
export { compressionUtils } from './utils/compression.js';

// Factory (main entry point)
export { CacheFactory, cacheFactory } from './factory.js';
export { default as createCache } from './factory.js';

/**
 * Quick start functions for common use cases
 */

/**
 * Create a cache instance with automatic environment detection
 */
export async function createUnifiedCache(options?: {
  projectRoot?: string;
  environment?: 'development' | 'production' | 'test';
  config?: any;
}): Promise<import('./core/types.js').UnifiedCache> {
  const { cacheFactory } = await import('./factory.js');
  
  const environment = options?.environment || 
    (process.env.NODE_ENV as 'development' | 'production' | 'test') || 
    'development';
  
  switch (environment) {
    case 'production':
      return cacheFactory.createProduction(options?.projectRoot);
    case 'test':
      return cacheFactory.createTest();
    case 'development':
    default:
      return cacheFactory.createDevelopment(options?.projectRoot);
  }
}

/**
 * Create a namespaced cache for a specific use case
 */
export async function createNamespacedCache(
  namespace: import('./core/types.js').CacheNamespace,
  options?: {
    projectRoot?: string;
    environment?: 'development' | 'production' | 'test';
  }
): Promise<import('./core/types.js').NamespacedCache> {
  const cache = await createUnifiedCache(options);
  return cache.namespace(namespace);
}

/**
 * Migrate from legacy cache implementations
 */
export async function migrateLegacyCaches(options?: {
  projectRoot?: string;
  backupBeforeMigration?: boolean;
  cleanupAfterMigration?: boolean;
}): Promise<import('./core/types.js').CacheMigrationStatus[]> {
  const { migrationUtils } = await import('./migration/migrator.js');
  const cache = await createUnifiedCache({ projectRoot: options?.projectRoot });
  
  return migrationUtils.migrateAll(cache);
}

/**
 * Validate cache system health
 */
export async function validateCacheHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const { cacheFactory } = await import('./factory.js');
  const factory = cacheFactory.getInstance();
  return factory.validateHealth();
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<import('./core/types.js').CacheStats | null> {
  const { cacheFactory } = await import('./factory.js');
  const factory = cacheFactory.getInstance();
  const cache = factory.getCache();
  
  if (!cache) {
    return null;
  }
  
  return cache.stats();
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  const { cacheFactory } = await import('./factory.js');
  const factory = cacheFactory.getInstance();
  const cache = factory.getCache();
  
  if (cache) {
    await cache.clear();
  }
}

/**
 * Shutdown cache system
 */
export async function shutdownCache(): Promise<void> {
  const { cacheFactory } = await import('./factory.js');
  const factory = cacheFactory.getInstance();
  await factory.shutdown();
}

/**
 * Cache decorators for common patterns
 */
export const cacheDecorators = {
  /**
   * Memoize function results with cache
   */
  memoize: <T extends (...args: any[]) => any>(
    fn: T,
    options?: {
      namespace?: import('./core/types.js').CacheNamespace;
      ttl?: number;
      keyGenerator?: (...args: Parameters<T>) => string;
    }
  ) => {
    const keyGen = options?.keyGenerator || ((...args) => JSON.stringify(args));
    const namespace = options?.namespace || 'custom';
    const ttl = options?.ttl || 60 * 60 * 1000; // 1 hour default
    
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const cache = await createNamespacedCache(namespace);
      const key = `memoize:${fn.name}:${keyGen(...args)}`;
      
      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }
      
      // Execute function and cache result
      const result = await fn(...args);
      await cache.set(key, result, { ttl });
      
      return result;
    };
  },
  
  /**
   * Cache-aside pattern for data loading
   */
  cacheAside: <T>(
    loader: (key: string) => Promise<T>,
    options?: {
      namespace?: import('./core/types.js').CacheNamespace;
      ttl?: number;
    }
  ) => {
    const namespace = options?.namespace || 'custom';
    const ttl = options?.ttl || 30 * 60 * 1000; // 30 minutes default
    
    return async (key: string): Promise<T> => {
      const cache = await createNamespacedCache(namespace);
      
      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }
      
      // Load data and cache it
      const data = await loader(key);
      await cache.set(key, data, { ttl });
      
      return data;
    };
  },
  
  /**
   * Write-through cache pattern
   */
  writeThrough: <T>(
    writer: (key: string, value: T) => Promise<void>,
    options?: {
      namespace?: import('./core/types.js').CacheNamespace;
      ttl?: number;
    }
  ) => {
    const namespace = options?.namespace || 'custom';
    const ttl = options?.ttl || 60 * 60 * 1000; // 1 hour default
    
    return async (key: string, value: T): Promise<void> => {
      const cache = await createNamespacedCache(namespace);
      
      // Write to both cache and storage
      await Promise.all([
        cache.set(key, value, { ttl }),
        writer(key, value)
      ]);
    };
  }
};

/**
 * Cache utilities for common operations
 */
export const cacheUtils = {
  /**
   * Batch operations
   */
  async batchGet<T>(
    keys: string[],
    namespace?: import('./core/types.js').CacheNamespace
  ): Promise<Map<string, T>> {
    const cache = await createNamespacedCache(namespace || 'custom');
    const results = new Map<string, T>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await cache.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      })
    );
    
    return results;
  },
  
  async batchSet<T>(
    entries: Map<string, T>,
    options?: {
      namespace?: import('./core/types.js').CacheNamespace;
      ttl?: number;
    }
  ): Promise<void> {
    const cache = await createNamespacedCache(options?.namespace || 'custom');
    
    await Promise.all(
      Array.from(entries.entries()).map(([key, value]) =>
        cache.set(key, value, { ttl: options?.ttl })
      )
    );
  },
  
  async batchDelete(
    keys: string[],
    namespace?: import('./core/types.js').CacheNamespace
  ): Promise<void> {
    const cache = await createNamespacedCache(namespace || 'custom');
    
    await Promise.all(
      keys.map(key => cache.delete(key))
    );
  },
  
  /**
   * Pattern-based operations
   */
  async getByPattern(
    pattern: RegExp,
    namespace?: import('./core/types.js').CacheNamespace
  ): Promise<Map<string, any>> {
    const cache = await createNamespacedCache(namespace || 'custom');
    const keys = await cache.keys();
    const matchingKeys = keys.filter(key => pattern.test(key));
    
    return this.batchGet(matchingKeys, namespace);
  },
  
  async deleteByPattern(
    pattern: RegExp,
    namespace?: import('./core/types.js').CacheNamespace
  ): Promise<number> {
    const cache = await createNamespacedCache(namespace || 'custom');
    const keys = await cache.keys();
    const matchingKeys = keys.filter(key => pattern.test(key));
    
    await this.batchDelete(matchingKeys, namespace);
    return matchingKeys.length;
  },
  
  /**
   * Cache warming utilities
   */
  async warmNamespace(
    namespace: import('./core/types.js').CacheNamespace,
    dataLoader: () => Promise<Map<string, any>>,
    options?: { ttl?: number }
  ): Promise<number> {
    const cache = await createNamespacedCache(namespace);
    const data = await dataLoader();
    
    await this.batchSet(data, { namespace, ttl: options?.ttl });
    return data.size;
  },
  
  /**
   * Cache statistics helpers
   */
  async getNamespaceStats(
    namespace: import('./core/types.js').CacheNamespace
  ): Promise<{
    keyCount: number;
    estimatedSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    const cache = await createNamespacedCache(namespace);
    const keys = await cache.keys();
    
    // This is a simplified implementation
    // In a real scenario, you'd want more detailed statistics
    return {
      keyCount: keys.length,
      estimatedSize: keys.length * 1024, // Rough estimate
      oldestEntry: undefined, // Would need metadata access
      newestEntry: undefined  // Would need metadata access
    };
  }
};

/**
 * Version information
 */
export const version = '1.0.0';

/**
 * Default export for convenience
 */
export default {
  createUnifiedCache,
  createNamespacedCache,
  migrateLegacyCaches,
  validateCacheHealth,
  getCacheStats,
  clearAllCaches,
  shutdownCache,
  cacheDecorators,
  cacheUtils,
  version
};