import type { ICache, CacheEntry, CacheStats, MemoryCacheOptions } from './types.js';

/**
 * In-memory cache implementation with LRU eviction
 */
export class MemoryCache implements ICache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private stats = {
    hits: 0,
    misses: 0,
    size: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private options: MemoryCacheOptions = {}) {
    const checkPeriod = options.checkPeriod ?? 60000; // 1 minute default
    
    if (checkPeriod > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, checkPeriod);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now > entry.timestamp + (entry.ttl * 1000)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.size -= entry.size;
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.hits++;
    entry.lastAccessed = now;
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const now = Date.now();
    const size = this.calculateSize(value);
    
    // Remove existing entry if it exists
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.size -= existingEntry.size;
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl,
      size,
      hits: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.size += size;

    // Evict if necessary
    await this.evictIfNecessary();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    if (now > entry.timestamp + (entry.ttl * 1000)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.size -= entry.size;
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.stats.size -= entry.size;
    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.stats.size = 0;
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.stats.size,
      entryCount: this.cache.size,
      hitRate,
      memoryUsage: this.stats.size,
      diskUsage: 0
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + (entry.ttl * 1000)) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  /**
   * Evict entries if cache exceeds limits
   */
  private async evictIfNecessary(): Promise<void> {
    const maxEntries = this.options.maxEntries ?? 1000;
    
    if (this.cache.size <= maxEntries) {
      return;
    }

    // Sort by access order (LRU)
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([key]) => key);

    // Remove oldest entries
    const entriesToRemove = this.cache.size - maxEntries;
    for (let i = 0; i < entriesToRemove; i++) {
      const keyToRemove = sortedEntries[i];
      if (keyToRemove) {
        await this.delete(keyToRemove);
      }
    }
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
   * Enhanced cleanup resources with better error handling
   */
  destroy(): void {
    try {
      // Clear the cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
      
      // Clear all cache data
      this.clear();
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        size: 0
      };
      
      this.accessCounter = 0;
    } catch (error) {
      // Log warning but don't throw - destruction should be safe
      console.warn(`MemoryCache destruction warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}