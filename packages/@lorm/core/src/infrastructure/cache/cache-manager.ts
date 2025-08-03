import { join } from 'path';
import { MemoryCache } from './memory-cache.js';
import { DiskCache } from './disk-cache.js';
import { HybridCache } from './hybrid-cache.js';
import type { ICache, CacheConfig, CacheStats } from './types.js';

/**
 * Project-scoped cache manager for LORM CLI v2
 * Manages cache lifecycle and provides unified interface
 */
export class ProjectScopedCache implements ICache {
  private cache: ICache;
  private config: CacheConfig;
  private projectRoot: string;

  constructor(projectRoot: string, config: CacheConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.cache = this.createCache();
  }

  /**
   * Create appropriate cache implementation based on strategy
   */
  private createCache(): ICache {
    if (!this.config.enabled) {
      return new NoOpCache();
    }

    const cacheDir = join(this.projectRoot, '.lorm', 'cache');

    switch (this.config.strategy) {
      case 'memory':
        return new MemoryCache({
          maxEntries: 1000,
          checkPeriod: 60000 // 1 minute
        });

      case 'disk':
        return new DiskCache({
          cacheDir,
          compression: false,
          fileExtension: '.cache'
        });

      case 'hybrid':
        return new HybridCache({
          memoryOptions: {
            maxEntries: 500,
            checkPeriod: 60000
          },
          diskOptions: {
            cacheDir,
            compression: false,
            fileExtension: '.cache'
          },
          memoryThreshold: 10 * 1024 // 10KB threshold
        });

      default:
        throw new Error(`Unknown cache strategy: ${this.config.strategy}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTtl = ttl ?? this.config.ttl;
    return this.cache.set(key, value, effectiveTtl);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    return this.cache.clear();
  }

  async getStats(): Promise<CacheStats> {
    return this.cache.getStats();
  }

  async cleanup(): Promise<void> {
    return this.cache.cleanup();
  }

  /**
   * Cache a function result with automatic key generation
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Cache a function result with automatic key generation based on arguments
   */
  async cachedWithArgs<T, TArgs extends readonly unknown[]>(
    keyPrefix: string,
    args: TArgs,
    fn: (...args: TArgs) => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const key = this.generateKey(keyPrefix, args);
    return this.cached(key, () => fn(...args), ttl);
  }

  /**
   * Generate cache key from prefix and arguments
   */
  private generateKey(prefix: string, args: readonly unknown[]): string {
    const argsHash = this.hashArgs(args);
    return `${prefix}:${argsHash}`;
  }

  /**
   * Create hash from arguments for cache key
   */
  private hashArgs(args: readonly unknown[]): string {
    try {
      const serialized = JSON.stringify(args);
      // Simple hash function for cache keys
      let hash = 0;
      for (let i = 0; i < serialized.length; i++) {
        const char = serialized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(36);
    } catch {
      // Fallback for non-serializable arguments
      return Date.now().toString(36);
    }
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Get project root
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Destroy cache and cleanup resources
   */
  async destroy(): Promise<void> {
    await this.cleanup();
    
    // Cleanup specific cache implementations
    this.cache.destroy?.();
  }
}

/**
 * No-op cache implementation for when caching is disabled
 */
class NoOpCache implements ICache {
  async get<T>(): Promise<T | null> {
    return null;
  }

  async set(): Promise<void> {
    // No-op
  }

  async has(): Promise<boolean> {
    return false;
  }

  async delete(): Promise<boolean> {
    return false;
  }

  async clear(): Promise<void> {
    // No-op
  }

  async getStats(): Promise<CacheStats> {
    return {
      hits: 0,
      misses: 0,
      size: 0,
      entryCount: 0,
      hitRate: 0,
      memoryUsage: 0,
      diskUsage: 0
    };
  }

  async cleanup(): Promise<void> {
    // No-op
  }
}