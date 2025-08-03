import { MemoryCache } from './memory-cache.js';
import { DiskCache } from './disk-cache.js';
import type { ICache, CacheStats, HybridCacheOptions } from './types.js';

/**
 * Hybrid cache implementation combining memory and disk caching
 * Small, frequently accessed items stay in memory
 * Large or less frequently accessed items go to disk
 */
export class HybridCache implements ICache {
  private memoryCache: MemoryCache;
  private diskCache: DiskCache;
  private memoryThreshold: number;

  constructor(options: HybridCacheOptions) {
    this.memoryCache = new MemoryCache(options.memoryOptions);
    this.diskCache = new DiskCache(options.diskOptions);
    this.memoryThreshold = options.memoryThreshold;
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryResult = await this.memoryCache.get<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Try disk cache
    const diskResult = await this.diskCache.get<T>(key);
    if (diskResult !== null) {
      // Promote to memory cache if small enough
      const size = this.calculateSize(diskResult);
      if (size <= this.memoryThreshold) {
        // Get TTL from disk cache entry (we'll need to modify this)
        await this.memoryCache.set(key, diskResult);
      }
      return diskResult;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const size = this.calculateSize(value);

    if (size <= this.memoryThreshold) {
      // Store in memory cache
      await this.memoryCache.set(key, value, ttl);
      
      // Also remove from disk cache if it exists there
      await this.diskCache.delete(key);
    } else {
      // Store in disk cache
      await this.diskCache.set(key, value, ttl);
      
      // Remove from memory cache if it exists there
      await this.memoryCache.delete(key);
    }
  }

  async has(key: string): Promise<boolean> {
    const inMemory = await this.memoryCache.has(key);
    if (inMemory) return true;

    return await this.diskCache.has(key);
  }

  async delete(key: string): Promise<boolean> {
    const [memoryDeleted, diskDeleted] = await Promise.all([
      this.memoryCache.delete(key),
      this.diskCache.delete(key)
    ]);

    return memoryDeleted || diskDeleted;
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.memoryCache.clear(),
      this.diskCache.clear()
    ]);
  }

  async getStats(): Promise<CacheStats> {
    const [memoryStats, diskStats] = await Promise.all([
      this.memoryCache.getStats(),
      this.diskCache.getStats()
    ]);

    return {
      hits: memoryStats.hits + diskStats.hits,
      misses: memoryStats.misses + diskStats.misses,
      size: memoryStats.size + diskStats.size,
      entryCount: memoryStats.entryCount + diskStats.entryCount,
      hitRate: this.calculateCombinedHitRate(memoryStats, diskStats),
      memoryUsage: memoryStats.memoryUsage,
      diskUsage: diskStats.diskUsage
    };
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.memoryCache.cleanup(),
      this.diskCache.cleanup()
    ]);
  }

  /**
   * Get memory cache instance (for advanced operations)
   */
  getMemoryCache(): MemoryCache {
    return this.memoryCache;
  }

  /**
   * Get disk cache instance (for advanced operations)
   */
  getDiskCache(): DiskCache {
    return this.diskCache;
  }

  /**
   * Calculate combined hit rate from both caches
   */
  private calculateCombinedHitRate(memoryStats: CacheStats, diskStats: CacheStats): number {
    const totalHits = memoryStats.hits + diskStats.hits;
    const totalMisses = memoryStats.misses + diskStats.misses;
    const total = totalHits + totalMisses;
    
    return total > 0 ? totalHits / total : 0;
  }

  /**
   * Calculate approximate size of a value in bytes
   */
  private calculateSize(value: unknown): number {
    if (value === null || value === undefined) {
      return 8;
    }

    if (typeof value === 'string') {
      return value.length * 2; // Approximate UTF-16 encoding
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // Fallback for non-serializable objects
      }
    }

    return 1024; // Default fallback
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.memoryCache.destroy();
    // DiskCache doesn't have a destroy method as it doesn't hold resources
  }
}