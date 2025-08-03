/**
 * Core type definitions for the unified caching system
 * 
 * This module provides the foundational types and interfaces for the
 * hierarchical caching architecture, including cache layers, strategies,
 * and configuration options.
 */

import { EventEmitter } from 'node:events';

/**
 * Cache layer types for hierarchical caching
 */
export type CacheLayer = 'memory' | 'disk' | 'distributed';

/**
 * Cache eviction strategies
 */
export type EvictionStrategy = 'lru' | 'lfu' | 'ttl' | 'size' | 'adaptive';

/**
 * Cache compression algorithms
 */
export type CompressionAlgorithm = 'gzip' | 'brotli' | 'none';

/**
 * Cache operation types for monitoring
 */
export type CacheOperation = 'get' | 'set' | 'delete' | 'clear' | 'has' | 'keys';

/**
 * Cache namespace for organizing different cache types
 */
export type CacheNamespace = 
  | 'commands'
  | 'plugins' 
  | 'validation'
  | 'config'
  | 'performance'
  | 'modules'
  | 'dependencies'
  | 'registry'
  | 'custom';

/**
 * Cache options for individual cache operations
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Cache namespace */
  namespace?: CacheNamespace;
  /** Compression settings */
  compression?: {
    algorithm: CompressionAlgorithm;
    threshold: number; // Minimum size in bytes to compress
  };
  /** Cache layer preferences */
  layers?: CacheLayer[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Priority for eviction (higher = keep longer) */
  priority?: number;
}

/**
 * Cache statistics and metrics
 */
export interface CacheStats {
  /** Total number of cache operations */
  totalOperations: number;
  /** Cache hit count */
  hits: number;
  /** Cache miss count */
  misses: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Total memory usage in bytes */
  memoryUsage: number;
  /** Total disk usage in bytes */
  diskUsage: number;
  /** Number of cached entries */
  entryCount: number;
  /** Average operation latency in milliseconds */
  averageLatency: number;
  /** Eviction count */
  evictions: number;
  /** Last cleanup timestamp */
  lastCleanup: Date;
  /** Per-namespace statistics */
  namespaceStats: Record<CacheNamespace, {
    hits: number;
    misses: number;
    entryCount: number;
    memoryUsage: number;
  }>;
}

/**
 * Cache entry metadata
 */
export interface CacheEntryMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last access timestamp */
  lastAccessed: Date;
  /** Access count */
  accessCount: number;
  /** Entry size in bytes */
  size: number;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Cache namespace */
  namespace: CacheNamespace;
  /** Compression info */
  compression?: {
    algorithm: CompressionAlgorithm;
    originalSize: number;
    compressedSize: number;
  };
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Priority for eviction */
  priority: number;
}

/**
 * Cache entry with data and metadata
 */
export interface CacheEntry<T = unknown> {
  /** Cache key */
  key: string;
  /** Cached value */
  value: T;
  /** Entry metadata */
  metadata: CacheEntryMetadata;
}

/**
 * Cache layer configuration
 */
export interface CacheLayerConfig {
  /** Whether this layer is enabled */
  enabled: boolean;
  /** Maximum memory usage in bytes */
  maxMemory?: number;
  /** Maximum disk usage in bytes */
  maxDisk?: number;
  /** Maximum number of entries */
  maxEntries?: number;
  /** Default TTL in milliseconds */
  defaultTtl?: number;
  /** Eviction strategy */
  evictionStrategy: EvictionStrategy;
  /** Compression settings */
  compression: {
    algorithm: CompressionAlgorithm;
    threshold: number;
  };
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Memory layer configuration
 */
export interface MemoryLayerConfig {
  enabled: boolean;
  maxSize: number;
  maxItems: number;
  ttl: number;
  evictionPolicy: EvictionStrategy;
  compressionThreshold: number;
}

/**
 * Disk layer configuration
 */
export interface DiskLayerConfig {
  enabled: boolean;
  basePath: string;
  maxSize: number;
  maxItems: number;
  ttl: number;
  compression: CompressionAlgorithm;
  atomicWrites: boolean;
}

/**
 * Strategy configuration
 */
export interface StrategyConfig {
  eviction: {
    algorithm: EvictionStrategy;
    memoryPressureThreshold: number;
    diskPressureThreshold: number;
  };
  routing: {
    defaultStrategy: CacheLayer;
    rules: Array<{
      condition: {
        namespace?: CacheNamespace;
        keyPattern?: string;
        sizeThreshold?: number;
        ttl?: number;
        accessFrequency?: number;
      };
      target: CacheLayer;
      priority: number;
    }>;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  alertThresholds: {
    memoryUsage: number;
    diskUsage: number;
    hitRatio: number;
    errorRate: number;
  };
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  layers: {
    memory: MemoryLayerConfig;
    disk: DiskLayerConfig;
  };
  strategies: StrategyConfig;
  monitoring: MonitoringConfig;
  warming: {
    enabled: boolean;
    criticalNamespaces: CacheNamespace[];
    maxItems: number;
    timeout: number;
    preloadData: Record<string, unknown>;
  };
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  /** Enable cache warming */
  enabled: boolean;
  /** Critical cache keys to preload */
  criticalKeys: string[];
  /** Warming strategies */
  strategies: {
    /** Preload on startup */
    startup: boolean;
    /** Background warming */
    background: boolean;
    /** Predictive warming based on patterns */
    predictive: boolean;
  };
  /** Warming concurrency */
  concurrency: number;
  /** Warming timeout in milliseconds */
  timeout: number;
}

/**
 * Cache performance metrics
 */
export interface CachePerformanceMetrics {
  /** Hit ratio (0-1) */
  hitRatio: number;
  /** Miss ratio (0-1) */
  missRatio: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Average response time in milliseconds */
  avgResponseTime: number;
  /** Total operations count */
  totalOperations: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Disk usage in bytes */
  diskUsage: number;
  /** Layer statistics */
  layerStats: Record<string, { hits: number; misses: number; errors: number }>;
  /** Timestamp of metrics */
  timestamp: number;
}

/**
 * Cache health status
 */
export interface CacheHealth {
  /** Overall health status */
  status: 'healthy' | 'warning' | 'critical';
  /** Simple health indicator */
  healthy: boolean;
  /** Health checks */
  checks: {
    memoryUsage: 'ok' | 'warning' | 'critical';
    diskUsage: 'ok' | 'warning' | 'critical';
    hitRatio: 'ok' | 'warning' | 'critical';
    latency: 'ok' | 'warning' | 'critical';
  };
  /** Health messages */
  messages: string[];
  /** Health issues */
  issues: string[];
  /** Last health check timestamp */
  lastCheck: Date;
}

/**
 * Cache migration status
 */
export interface CacheMigrationStatus {
  planId: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
  progress: number;
  currentStep: number;
  totalSteps: number;
  migratedCount: number;
  errors: string[];
  startTime: Date;
  estimatedCompletion?: Date;
}

/**
 * Legacy cache adapter interface
 */
export interface LegacyCacheAdapter {
  readonly name: string;
  readonly version: string;
  getKeys(): Promise<string[]>;
  getData(key: string): Promise<CacheEntry | null>;
  cleanup(): Promise<void>;
}

/**
 * Configuration file structure
 */
export interface ConfigFile {
  version: string;
  cache: CacheConfig;
  lastModified: string;
  checksum?: string;
}

/**
 * Cache configuration manager interface
 */
export interface CacheConfigManagerInterface {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getConfig(): Promise<CacheConfig>;
  updateConfig(updates: Partial<CacheConfig>): Promise<void>;
  validateConfig(config?: Partial<CacheConfig>): Promise<void>;
  exportConfig(): Promise<string>;
  importConfig(configData: string): Promise<void>;
}

/**
 * Cache event types for monitoring
 */
export interface CacheEvents {
  'cache:hit': { key: string; namespace: CacheNamespace; layer: CacheLayer };
  'cache:miss': { key: string; namespace: CacheNamespace };
  'cache:set': { key: string; namespace: CacheNamespace; layer: CacheLayer; size: number };
  'cache:delete': { key: string; namespace: CacheNamespace; layer: CacheLayer };
  'cache:eviction': { key: string; namespace: CacheNamespace; strategy: EvictionStrategy };
  'cache:cleanup': { namespace?: CacheNamespace; entriesRemoved: number };
  'cache:error': { operation: CacheOperation; key: string; error: Error };
  'cache:warning': { message: string; context?: Record<string, unknown> };
}

/**
 * Type-safe cache key builder
 */
export type CacheKey<T extends string = string> = `${CacheNamespace}:${T}`;

/**
 * Cache key utilities
 */
export interface CacheKeyUtils {
  /** Build a cache key with namespace */
  build<T extends string>(namespace: CacheNamespace, key: T): CacheKey<T>;
  /** Parse a cache key to extract namespace and key */
  parse(cacheKey: string): { namespace: CacheNamespace; key: string } | null;
  /** Validate cache key format */
  validate(key: string): boolean;
  /** Generate cache key pattern for matching */
  pattern(namespace: CacheNamespace, keyPattern?: string): string;
}

/**
 * Cache layer interface
 */
export interface CacheLayerInterface {
  readonly name: CacheLayer;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  get<T = unknown>(key: string): Promise<CacheEntry<T> | null>;
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(namespace?: CacheNamespace, pattern?: string): Promise<void>;
  keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]>;
  stats(): Promise<CacheStats>;
}

/**
 * Cache strategy interface
 */
export interface CacheStrategyInterface {
  readonly name: string;
  shouldApply(context: any): boolean;
  execute(context: any): Promise<void>;
}

/**
 * Cache monitor interface
 */
export interface CacheMonitorInterface {
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): Promise<CacheHealth>;
  getMetrics(): Promise<CachePerformanceMetrics>;
  recordOperation(operation: CacheOperation, key: string, duration: number, success: boolean, metadata?: Record<string, unknown>): void;
}

/**
 * Namespaced cache interface
 */
export interface NamespacedCache<T = unknown> {
  get(key: string, options?: Omit<CacheOptions, 'namespace'>): Promise<T | null>;
  set(key: string, value: T, options?: Omit<CacheOptions, 'namespace'>): Promise<void>;
  delete(key: string, options?: Omit<CacheOptions, 'namespace'>): Promise<boolean>;
  has(key: string, options?: Omit<CacheOptions, 'namespace'>): Promise<boolean>;
  clear(pattern?: string): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  stats(): Promise<CacheStats>;
}

/**
 * Unified cache interface
 */
export interface UnifiedCache {
  // Core operations
  get<T = unknown>(key: string, options?: CacheOptions): Promise<T | null>;
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string, options?: CacheOptions): Promise<boolean>;
  has(key: string, options?: CacheOptions): Promise<boolean>;
  clear(namespace?: CacheNamespace, pattern?: string): Promise<void>;
  keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]>;
  
  // Batch operations
  getMany<T = unknown>(keys: string[], options?: CacheOptions): Promise<Map<string, T>>;
  setMany<T = unknown>(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<void>;
  deleteMany(keys: string[], options?: CacheOptions): Promise<number>;
  
  // Advanced operations
  getEntry<T = unknown>(key: string, options?: CacheOptions): Promise<CacheEntry<T> | null>;
  warm<T = unknown>(keys: string[], loader: (key: string) => Promise<T>): Promise<void>;
  optimize(): Promise<void>;
  
  // Monitoring and stats
  stats(namespace?: CacheNamespace): Promise<CacheStats>;
  health(): Promise<CacheHealth>;
  metrics(): Promise<CachePerformanceMetrics>;
  
  // Namespaced access
  createNamespacedCache<T = unknown>(namespace: CacheNamespace): NamespacedCache<T>;
  
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Cache factory interface
 */
export interface CacheFactoryInterface {
  createCache(config?: Partial<CacheConfig>): Promise<UnifiedCache>;
  createLayer(type: CacheLayer, config: any): Promise<CacheLayerInterface>;
  createStrategy(type: string, config: any): Promise<CacheStrategyInterface>;
  createMonitor(config: MonitoringConfig): Promise<CacheMonitorInterface>;
  validateConfig(config: CacheConfig): Promise<void>;
}