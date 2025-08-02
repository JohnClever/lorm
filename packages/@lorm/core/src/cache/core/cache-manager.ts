/**
 * CacheManager - Centralized cache management for @lorm/core
 * Provides unified access to multiple cache instances with global operations
 */

import { BaseCache } from './base-cache.js';
import { ConfigCache } from './config-cache.js';
import type {
  CacheOptions,
  CacheStats,
  ICache,
  ICacheManager,
  IConfigCache
} from '../types/types.js';

export class CacheManager implements ICacheManager {
  private caches = new Map<string, ICache>();
  private configCache: IConfigCache;
  private static instance: CacheManager;

  constructor() {
    this.configCache = ConfigCache.getInstance();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  getCache(name: string): ICache {
    if (!this.caches.has(name)) {
      this.caches.set(name, new BaseCache());
    }
    return this.caches.get(name)!;
  }

  createCache(name: string, options?: CacheOptions): ICache {
    const cache = new BaseCache(options);
    this.caches.set(name, cache);
    return cache;
  }

  removeCache(name: string): void {
    const cache = this.caches.get(name);
    if (cache) {
      // Clean up the cache
      cache.clear().catch(() => {});
      if ('destroy' in cache && typeof cache.destroy === 'function') {
        (cache as any).destroy();
      }
      this.caches.delete(name);
    }
  }

  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  getGlobalStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    // Add config cache stats
    stats['config'] = this.configCache.getStats();
    
    // Add other cache stats
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    
    return stats;
  }

  async clearAll(): Promise<void> {
    const clearPromises: Promise<void>[] = [];
    
    // Clear config cache
    clearPromises.push(this.configCache.clear());
    
    // Clear all other caches
    for (const cache of this.caches.values()) {
      clearPromises.push(cache.clear());
    }
    
    await Promise.all(clearPromises);
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];
    
    // Cleanup all caches
    for (const cache of this.caches.values()) {
      cleanupPromises.push(cache.cleanup());
    }
    
    await Promise.all(cleanupPromises);
  }

  getConfigCache(): IConfigCache {
    return this.configCache;
  }

  /**
   * Get cache statistics summary across all caches
   */
  getGlobalStatsSummary(): {
    totalCaches: number;
    totalEntries: number;
    totalSize: number;
    averageHitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    const allStats = this.getGlobalStats();
    const cacheNames = Object.keys(allStats);
    
    let totalEntries = 0;
    let totalSize = 0;
    let totalHits = 0;
    let totalMisses = 0;
    let hitRateSum = 0;
    
    for (const stats of Object.values(allStats)) {
      totalEntries += stats.memoryEntries;
      totalSize += stats.totalSize;
      totalHits += stats.totalHits;
      totalMisses += stats.totalMisses;
      hitRateSum += stats.hitRate;
    }
    
    return {
      totalCaches: cacheNames.length,
      totalEntries,
      totalSize,
      averageHitRate: cacheNames.length > 0 ? hitRateSum / cacheNames.length : 0,
      totalHits,
      totalMisses
    };
  }

  /**
   * Destroy all caches and cleanup resources
   */
  destroy(): void {
    for (const [name, cache] of this.caches.entries()) {
      if ('destroy' in cache && typeof cache.destroy === 'function') {
        (cache as any).destroy();
      }
    }
    this.caches.clear();
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();