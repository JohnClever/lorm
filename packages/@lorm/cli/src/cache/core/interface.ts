/**
 * Unified Cache Interface
 * 
 * This module provides the main interface for the unified caching system,
 * offering type-safe operations across all cache layers with automatic
 * layer routing and performance optimization.
 */

import type {
  CacheOptions,
  CacheStats,
  CacheNamespace,
  CacheLayer,
  CacheHealth,
  CachePerformanceMetrics,
  CacheEntry,
  CacheKey,
  CacheEvents
} from './types.js';

/**
 * Main unified cache interface
 * 
 * Provides a single entry point for all cache operations with type safety,
 * automatic layer routing, and performance monitoring.
 */
export interface UnifiedCache {
  /**
   * Get a value from cache
   * @param key - Cache key
   * @param options - Cache options
   * @returns Promise resolving to cached value or null if not found
   */
  get<T = unknown>(key: string, options?: CacheOptions): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   * @returns Promise resolving when value is cached
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Delete a value from cache
   * @param key - Cache key
   * @param options - Cache options
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(key: string, options?: CacheOptions): Promise<boolean>;

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @param options - Cache options
   * @returns Promise resolving to true if key exists
   */
  has(key: string, options?: CacheOptions): Promise<boolean>;

  /**
   * Clear cache entries
   * @param namespace - Optional namespace to clear (clears all if not specified)
   * @param pattern - Optional key pattern to match
   * @returns Promise resolving when cache is cleared
   */
  clear(namespace?: CacheNamespace, pattern?: string): Promise<void>;

  /**
   * Get all cache keys
   * @param namespace - Optional namespace filter
   * @param pattern - Optional key pattern to match
   * @returns Promise resolving to array of cache keys
   */
  keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]>;

  /**
   * Get cache statistics
   * @param namespace - Optional namespace filter
   * @returns Promise resolving to cache statistics
   */
  stats(namespace?: CacheNamespace): Promise<CacheStats>;

  /**
   * Get cache health status
   * @returns Promise resolving to cache health information
   */
  health(): Promise<CacheHealth>;

  /**
   * Get performance metrics
   * @returns Promise resolving to performance metrics
   */
  metrics(): Promise<CachePerformanceMetrics>;

  /**
   * Warm cache with critical data
   * @param keys - Array of keys to warm
   * @param loader - Function to load data for keys
   * @returns Promise resolving when warming is complete
   */
  warm<T = unknown>(
    keys: string[],
    loader: (key: string) => Promise<T>
  ): Promise<void>;

  /**
   * Optimize cache performance
   * @returns Promise resolving when optimization is complete
   */
  optimize(): Promise<void>;

  /**
   * Subscribe to cache events
   * @param event - Event name
   * @param listener - Event listener
   */
  on<K extends keyof CacheEvents>(
    event: K,
    listener: (data: CacheEvents[K]) => void
  ): void;

  /**
   * Unsubscribe from cache events
   * @param event - Event name
   * @param listener - Event listener
   */
  off<K extends keyof CacheEvents>(
    event: K,
    listener: (data: CacheEvents[K]) => void
  ): void;

  /**
   * Get cache entry with metadata
   * @param key - Cache key
   * @param options - Cache options
   * @returns Promise resolving to cache entry or null
   */
  getEntry<T = unknown>(key: string, options?: CacheOptions): Promise<CacheEntry<T> | null>;

  /**
   * Set multiple values in cache
   * @param entries - Array of key-value pairs
   * @param options - Cache options
   * @returns Promise resolving when all values are cached
   */
  setMany<T = unknown>(
    entries: Array<{ key: string; value: T }>,
    options?: CacheOptions
  ): Promise<void>;

  /**
   * Get multiple values from cache
   * @param keys - Array of cache keys
   * @param options - Cache options
   * @returns Promise resolving to map of key-value pairs
   */
  getMany<T = unknown>(
    keys: string[],
    options?: CacheOptions
  ): Promise<Map<string, T>>;

  /**
   * Delete multiple values from cache
   * @param keys - Array of cache keys
   * @param options - Cache options
   * @returns Promise resolving to number of deleted entries
   */
  deleteMany(keys: string[], options?: CacheOptions): Promise<number>;
}

/**
 * Cache layer interface
 * 
 * Defines the interface that each cache layer (memory, disk, distributed)
 * must implement.
 */
export interface CacheLayerInterface {
  /**
   * Layer name
   */
  readonly name: CacheLayer;

  /**
   * Get a value from this layer
   */
  get<T = unknown>(key: string): Promise<CacheEntry<T> | null>;

  /**
   * Set a value in this layer
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Delete a value from this layer
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists in this layer
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear this layer
   */
  clear(namespace?: CacheNamespace, pattern?: string): Promise<void>;

  /**
   * Get all keys from this layer
   */
  keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]>;

  /**
   * Get layer statistics
   */
  stats(): Promise<Partial<CacheStats>>;

  /**
   * Optimize this layer
   */
  optimize(): Promise<void>;

  /**
   * Check layer health
   */
  health(): Promise<Partial<CacheHealth>>;

  /**
   * Initialize the layer
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the layer
   */
  shutdown(): Promise<void>;
}

/**
 * Cache strategy interface
 * 
 * Defines the interface for cache strategies like eviction policies,
 * warming strategies, and optimization algorithms.
 */
export interface CacheStrategyInterface {
  /**
   * Strategy name
   */
  readonly name: string;

  /**
   * Execute the strategy
   */
  execute(context: CacheStrategyContext): Promise<CacheStrategyResult>;

  /**
   * Check if strategy should be applied
   */
  shouldApply(context: CacheStrategyContext): boolean;

  /**
   * Get strategy configuration
   */
  getConfig(): Record<string, unknown>;

  /**
   * Update strategy configuration
   */
  updateConfig(config: Record<string, unknown>): void;
}

/**
 * Cache strategy context
 */
export interface CacheStrategyContext {
  /** Current cache statistics */
  stats: CacheStats;
  /** Performance metrics */
  metrics: CachePerformanceMetrics;
  /** Available cache layers */
  layers: CacheLayerInterface[];
  /** Strategy-specific data */
  data?: Record<string, unknown>;
}

/**
 * Cache strategy result
 */
export interface CacheStrategyResult {
  /** Whether strategy was successful */
  success: boolean;
  /** Actions performed */
  actions: Array<{
    type: 'evict' | 'warm' | 'optimize' | 'cleanup';
    target: string;
    result: boolean;
    metadata?: Record<string, unknown>;
  }>;
  /** Strategy metrics */
  metrics: {
    executionTime: number;
    itemsProcessed: number;
    memoryFreed?: number;
    diskFreed?: number;
  };
  /** Error information if any */
  error?: Error;
}

/**
 * Cache monitor interface
 * 
 * Defines the interface for cache monitoring and analytics.
 */
export interface CacheMonitorInterface {
  /**
   * Start monitoring
   */
  start(): Promise<void>;

  /**
   * Stop monitoring
   */
  stop(): Promise<void>;

  /**
   * Record cache operation
   */
  recordOperation(
    operation: string,
    key: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void;

  /**
   * Get current metrics
   */
  getMetrics(): Promise<CachePerformanceMetrics>;

  /**
   * Get health status
   */
  getHealth(): Promise<CacheHealth>;

  /**
   * Subscribe to monitoring events
   */
  on<K extends keyof CacheEvents>(
    event: K,
    listener: (data: CacheEvents[K]) => void
  ): void;

  /**
   * Unsubscribe from monitoring events
   */
  off<K extends keyof CacheEvents>(
    event: K,
    listener: (data: CacheEvents[K]) => void
  ): void;
}

/**
 * Cache configuration manager interface
 */
export interface CacheConfigManagerInterface {
  /**
   * Get current configuration
   */
  getConfig(): Promise<any>;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<any>): Promise<void>;

  /**
   * Validate configuration
   */
  validateConfig(config: any): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Reset to default configuration
   */
  resetConfig(): Promise<void>;

  /**
   * Subscribe to configuration changes
   */
  onConfigChange(listener: (config: any) => void): void;

  /**
   * Unsubscribe from configuration changes
   */
  offConfigChange(listener: (config: any) => void): void;
}

/**
 * Cache migration interface
 */
export interface CacheMigrationInterface {
  /**
   * Start migration from legacy caches
   */
  migrate(): Promise<void>;

  /**
   * Get migration status
   */
  getStatus(): Promise<any>;

  /**
   * Rollback migration
   */
  rollback(): Promise<void>;

  /**
   * Validate migrated data
   */
  validate(): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Clean up legacy caches
   */
  cleanup(): Promise<void>;
}

/**
 * Type-safe cache namespace interface
 */
export interface NamespacedCache<T = unknown> {
  /**
   * Get value with namespace prefix
   */
  get(key: string, options?: Omit<CacheOptions, 'namespace'>): Promise<T | null>;

  /**
   * Set value with namespace prefix
   */
  set(key: string, value: T, options?: Omit<CacheOptions, 'namespace'>): Promise<void>;

  /**
   * Delete value with namespace prefix
   */
  delete(key: string, options?: Omit<CacheOptions, 'namespace'>): Promise<boolean>;

  /**
   * Check if key exists with namespace prefix
   */
  has(key: string, options?: Omit<CacheOptions, 'namespace'>): Promise<boolean>;

  /**
   * Clear all entries in this namespace
   */
  clear(pattern?: string): Promise<void>;

  /**
   * Get all keys in this namespace
   */
  keys(pattern?: string): Promise<string[]>;

  /**
   * Get namespace statistics
   */
  stats(): Promise<CacheStats>;
}

/**
 * Cache factory interface
 */
export interface CacheFactoryInterface {
  /**
   * Create unified cache instance
   */
  createCache(config?: any): Promise<UnifiedCache>;

  /**
   * Create namespaced cache instance
   */
  createNamespacedCache<T = unknown>(namespace: CacheNamespace): NamespacedCache<T>;

  /**
   * Get default cache instance
   */
  getDefaultCache(): UnifiedCache;

  /**
   * Shutdown all cache instances
   */
  shutdown(): Promise<void>;
}