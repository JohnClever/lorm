import { join } from 'path';
import { MemoryCache } from './memory-cache.js';
import { DiskCache } from './disk-cache.js';
import { HybridCache } from './hybrid-cache.js';
import type { ICache, CacheConfig, CacheStats } from './types.js';

/**
 * Enhanced Project-scoped cache manager with improved resource management
 */
export class ProjectScopedCache implements ICache {
  private cache: ICache;
  private config: CacheConfig;
  private projectRoot: string;
  private isDestroyed = false;
  private createdAt: number;

  constructor(projectRoot: string, config: CacheConfig) {
    this.projectRoot = projectRoot;
    this.config = { ...config }; // Deep copy to prevent external mutations
    this.createdAt = Date.now();
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
          maxEntries: this.config.maxSize ? Math.floor(this.config.maxSize / 1024) : 1000,
          checkPeriod: 60000
        });

      case 'disk':
        return new DiskCache({
          cacheDir,
          compression: this.config.compression ?? false,
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
            compression: this.config.compression ?? false,
            fileExtension: '.cache'
          },
          memoryThreshold: 10 * 1024
        });

      default:
        throw new Error(`Unknown cache strategy: ${this.config.strategy}`);
    }
  }

  private ensureNotDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('Cache has been destroyed and cannot be used');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.ensureNotDestroyed();
    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      console.warn(`Cache get operation failed for key '${key}':`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.ensureNotDestroyed();
    try {
      const effectiveTtl = ttl ?? this.config.ttl;
      await this.cache.set(key, value, effectiveTtl);
    } catch (error) {
      console.warn(`Cache set operation failed for key '${key}':`, error instanceof Error ? error.message : String(error));
      // Don't throw - cache failures shouldn't break the application
    }
  }

  async has(key: string): Promise<boolean> {
    this.ensureNotDestroyed();
    try {
      return await this.cache.has(key);
    } catch (error) {
      console.warn(`Cache has operation failed for key '${key}':`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    this.ensureNotDestroyed();
    try {
      return await this.cache.delete(key);
    } catch (error) {
      console.warn(`Cache delete operation failed for key '${key}':`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async clear(): Promise<void> {
    this.ensureNotDestroyed();
    try {
      await this.cache.clear();
    } catch (error) {
      console.warn('Cache clear operation failed:', error instanceof Error ? error.message : String(error));
      throw error; // Clear failures should be reported
    }
  }

  async getStats(): Promise<CacheStats> {
    this.ensureNotDestroyed();
    try {
      const stats = await this.cache.getStats();
      return stats;
    } catch (error) {
      console.warn('Cache stats operation failed:', error instanceof Error ? error.message : String(error));
      return this.getEmptyStats();
    }
  }

  async cleanup(): Promise<void> {
    this.ensureNotDestroyed();
    try {
      await this.cache.cleanup();
    } catch (error) {
      console.warn('Cache cleanup operation failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Enhanced cached method with better error handling
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    this.ensureNotDestroyed();
    
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      // Don't cache errors, just propagate them
      throw error;
    }
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
   * Get cache configuration (read-only)
   */
  getConfig(): Readonly<CacheConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get project root (read-only)
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Check if cache is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (this.isDestroyed) return false;
    
    try {
      // Perform a simple health check
      const testKey = '__health_check__';
      await this.set(testKey, 'ok', 1); // 1 second TTL
      const result = await this.get(testKey);
      await this.delete(testKey);
      return result === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Enhanced destroy method with proper cleanup
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      // Cleanup cache data
      await this.cleanup();
      
      // Destroy underlying cache implementation
      if (this.cache.destroy) {
        this.cache.destroy();
      }
      
      this.isDestroyed = true;
    } catch (error) {
      console.warn(`Cache destruction warning: ${error instanceof Error ? error.message : String(error)}`);
      this.isDestroyed = true; // Mark as destroyed even if cleanup failed
    }
  }

  private getEmptyStats(): CacheStats {
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
}

/**
 * Enhanced No-op cache implementation
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

  destroy(): void {
    // No-op
  }
}