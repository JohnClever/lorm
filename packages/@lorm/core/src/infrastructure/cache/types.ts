/**
 * Cache configuration options
 */
export interface CacheConfig {
  enabled: boolean;
  strategy: 'memory' | 'disk' | 'hybrid';
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size in bytes
  compression?: boolean;
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size: number;
  hits: number;
  lastAccessed: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entryCount: number;
  hitRate: number;
  memoryUsage: number;
  diskUsage: number;
}

/**
 * Cache operation result
 */
export interface CacheResult<T = unknown> {
  success: boolean;
  value?: T;
  fromCache: boolean;
  error?: Error;
}

/**
 * Cache interface for all cache implementations
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
  cleanup(): Promise<void>;
  destroy?(): void;
}

/**
 * Memory cache specific options
 */
export interface MemoryCacheOptions {
  maxEntries?: number;
  checkPeriod?: number; // Cleanup interval in ms
}

/**
 * Disk cache specific options
 */
export interface DiskCacheOptions {
  cacheDir: string;
  compression?: boolean;
  fileExtension?: string;
}

/**
 * Hybrid cache specific options
 */
export interface HybridCacheOptions {
  memoryOptions: MemoryCacheOptions;
  diskOptions: DiskCacheOptions;
  memoryThreshold: number; // Size threshold for memory vs disk
}