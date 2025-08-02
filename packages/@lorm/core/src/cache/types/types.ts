/**
 * Cache system types for @lorm/core
 * Provides comprehensive type definitions for the unified cache system
 */

export interface CompressionOptions {
  /** Enable compression */
  enabled: boolean;
  /** Compression level (1-9) */
  level?: number;
  /** Use worker threads for compression */
  useWorkers?: boolean;
  /** Maximum number of compression workers */
  maxWorkers?: number;
  /** Minimum size threshold for using workers */
  workerThreshold?: number;
}

export interface CircuitBreakerOptions {
  /** Enable circuit breaker */
  enabled: boolean;
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Number of successes needed to close circuit */
  successThreshold?: number;
  /** Timeout before attempting to close circuit */
  timeout?: number;
  /** Monitoring window for failure tracking */
  monitoringWindow?: number;
}

export interface PartitionedStorageOptions {
  /** Enable partitioned storage */
  enabled: boolean;
  /** Number of partitions */
  partitions?: number;
}

export interface BackgroundWorkersOptions {
  /** Enable background workers */
  enabled: boolean;
  /** Maximum number of workers */
  maxWorkers?: number;
  /** Batch size for operations */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushInterval?: number;
}

export interface MemoryPressureDetectionOptions {
  /** Enable memory pressure detection */
  enabled: boolean;
  /** Warning threshold (0-1) */
  warningThreshold?: number;
  /** Critical threshold (0-1) */
  criticalThreshold?: number;
  /** Monitoring interval in milliseconds */
  monitoringInterval?: number;
  /** Enable automatic eviction */
  autoEviction?: boolean;
}

export interface ScalabilityEnhancementsOptions {
  /** Partitioned storage configuration */
  partitionedStorage?: PartitionedStorageOptions;
  /** Background workers configuration */
  backgroundWorkers?: BackgroundWorkersOptions;
  /** Memory pressure detection configuration */
  memoryPressureDetection?: MemoryPressureDetectionOptions;
}

export interface CacheOptions {
  /** Cache instance identifier */
  cacheId?: string;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum size per cache entry in bytes (default: 10MB) */
  maxSize?: number;
  /** Enable/disable caching (default: true) */
  enabled?: boolean;
  /** Compression configuration (can be boolean for simple enable/disable or object for advanced config) */
  compression?: boolean | CompressionOptions;
  /** Minimum size threshold for compression in bytes (default: 1KB) */
  compressionThreshold?: number;
  /** Maximum number of entries in memory cache (default: 100) */
  maxMemoryEntries?: number;
  /** Cache directory path (default: .lorm/cache) */
  cacheDir?: string;
  /** Cache directory path (alternative name for compatibility) */
  cacheDirectory?: string;
  /** Enable automatic cleanup of expired entries (default: true) */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupInterval?: number;
  /** Enable checksum validation for data integrity (default: true) */
  enableChecksum?: boolean;
  /** Enable checksum validation (alternative name for compatibility) */
  checksumValidation?: boolean;
  /** Enable atomic file operations (default: true) */
  enableAtomicOps?: boolean;
  /** Enable atomic operations (alternative name for compatibility) */
  atomicOperations?: boolean;
  /** Enable circuit breaker for fault tolerance (default: true) */
  enableCircuitBreaker?: boolean;
  /** Circuit breaker configuration (can be boolean for simple enable/disable or object for advanced config) */
  circuitBreaker?: boolean | CircuitBreakerOptions;
  /** Circuit breaker failure threshold (default: 5) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker timeout in milliseconds (default: 30000) */
  circuitBreakerTimeout?: number;
  
  // Phase 4: Scalability Enhancements
  /** Enable partitioned storage for better scalability (default: false) */
  enablePartitioning?: boolean;
  /** Number of partitions for storage (default: 16) */
  partitionCount?: number;
  /** Enable background workers for non-blocking operations (default: false) */
  enableBackgroundWorkers?: boolean;
  /** Maximum number of background worker threads (default: 2) */
  maxBackgroundWorkers?: number;
  /** Enable memory pressure detection (default: false) */
  enableMemoryPressureDetection?: boolean;
  /** Memory usage threshold for warning level (0-1, default: 0.8) */
  memoryWarningThreshold?: number;
  /** Memory usage threshold for critical level (0-1, default: 0.9) */
  memoryCriticalThreshold?: number;
  /** Scalability enhancements configuration */
  scalabilityEnhancements?: ScalabilityEnhancementsOptions;
}

export interface CacheEntry<T = unknown> {
  /** The cached data */
  data: T;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Hash of the cache key for validation */
  hash: string;
  /** Size of the entry in bytes */
  size: number;
  /** Whether the entry is compressed */
  compressed?: boolean;
  /** Number of times this entry has been accessed */
  accessCount?: number;
  /** Timestamp of last access */
  lastAccessed?: number;
  /** TTL override for this specific entry */
  ttl?: number;
  /** Checksum information for data integrity */
  checksum?: ChecksumResult;
}

export interface ChecksumResult {
  /** Primary checksum */
  primary: string;
  /** Secondary checksum (if enabled) */
  secondary?: string;
  /** HMAC checksum (if secret key provided) */
  hmac?: string;
  /** Algorithm used */
  algorithm: string;
  /** Timestamp when checksum was calculated */
  timestamp: number;
  /** Data size in bytes */
  dataSize: number;
}

export interface CacheStats {
  /** Number of entries in memory cache */
  memoryEntries: number;
  /** Total size of cached data in bytes */
  totalSize: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Compression ratio (0-1) */
  compressionRatio: number;
  /** Timestamp of oldest entry */
  oldestEntry: number | null;
  /** Timestamp of newest entry */
  newestEntry: number | null;
  /** Total number of cache hits */
  totalHits: number;
  /** Total number of cache misses */
  totalMisses: number;
  /** Number of expired entries cleaned up */
  expiredEntries: number;
  /** Number of checksum validation failures */
  checksumFailures?: number;
  /** Number of atomic operation failures */
  atomicOpFailures?: number;
  /** Circuit breaker statistics */
  circuitBreaker?: {
    state: string;
    failureCount: number;
    successCount: number;
    totalRequests: number;
  };
  /** Reliability metrics */
  reliability?: {
    corruptedEntries: number;
    recoveredEntries: number;
    backupRestores: number;
  };
}

export interface ConfigCacheEntry {
  /** Validation result */
  result: ValidationResult;
  /** File hashes for invalidation detection */
  fileHashes: Record<string, string>;
  /** Timestamp when cached */
  timestamp: number;
  /** Validation options used */
  options: ConfigValidationOptions;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Suggested fixes */
  suggestions?: string[];
}

export interface ConfigValidationOptions {
  /** Require config file to exist */
  requireConfig?: boolean;
  /** Require schema file to exist */
  requireSchema?: boolean;
  /** Require router file to exist */
  requireRouter?: boolean;
  /** Check database connection */
  checkDatabase?: boolean;
  /** Check dependencies */
  checkDependencies?: boolean;
  /** Check environment variables */
  checkEnvironment?: boolean;
  /** Automatically fix issues */
  autoFix?: boolean;
}

export interface CacheEventData {
  /** Cache operation type */
  operation: 'get' | 'set' | 'delete' | 'clear' | 'cleanup';
  /** Cache key */
  key: string;
  /** Whether operation was successful */
  success: boolean;
  /** Operation duration in milliseconds */
  duration: number;
  /** Error message if operation failed */
  error?: string;
}

export type CacheEventListener = (data: CacheEventData) => void;

export interface ICacheManager {
  /** Get cache instance by name */
  getCache(name: string): ICache;
  /** Create new cache instance */
  createCache(name: string, options?: CacheOptions): ICache;
  /** Remove cache instance */
  removeCache(name: string): void;
  /** Get all cache names */
  getCacheNames(): string[];
  /** Get global cache statistics */
  getGlobalStats(): Record<string, CacheStats>;
  /** Clear all caches */
  clearAll(): Promise<void>;
  /** Cleanup expired entries in all caches */
  cleanupAll(): Promise<void>;
}

export interface ICache {
  /** Get value from cache */
  get<T>(key: string, inputHash?: string): Promise<T | null>;
  /** Set value in cache */
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  /** Delete value from cache */
  delete(key: string): Promise<void>;
  /** Clear all cache entries */
  clear(): Promise<void>;
  /** Check if key exists in cache */
  has(key: string): Promise<boolean>;
  /** Get cache statistics */
  getStats(): CacheStats;
  /** Cleanup expired entries */
  cleanup(): Promise<void>;
  /** Create hash for input */
  createHash(input: string | number | boolean | object | null): string;
  /** Add event listener */
  on(event: 'operation', listener: CacheEventListener): void;
  /** Remove event listener */
  off(event: 'operation', listener: CacheEventListener): void;
  /** Batch get operations */
  batchGet?<T>(keys: string[], inputHashes?: string[]): Promise<any[]>;
  /** Batch set operations */
  batchSet?<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<any[]>;
  /** Batch delete operations */
  batchDelete?(keys: string[]): Promise<any[]>;
  /** Batch has operations */
  batchHas?(keys: string[]): Promise<any[]>;
  /** Get batch operation statistics */
  getBatchStats?(): any;
  /** Reset batch operation statistics */
  resetBatchStats?(): void;
  /** Get memory pool statistics */
  getMemoryPoolStats?(): any;
  
  // Phase 4: Scalability API methods
  /** Get partition statistics */
  getPartitionStats?(): PartitionStats[];
  /** Get background worker statistics */
  getBackgroundWorkerStats?(): BackgroundWorkerStats;
  /** Get memory pressure statistics */
  getMemoryPressureStats?(): MemoryPressureStats;
  /** Submit background task */
  submitBackgroundTask?(task: BackgroundTask): Promise<TaskResult>;
}

export interface IConfigCache {
  /** Get cached validation result */
  get(options: ConfigValidationOptions, cwd?: string): Promise<ValidationResult | null>;
  /** Set validation result in cache */
  set(options: ConfigValidationOptions, result: ValidationResult, cwd?: string): Promise<void>;
  /** Invalidate cache for directory */
  invalidate(cwd?: string): Promise<void>;
  /** Get cache statistics */
  getStats(): CacheStats;
  /** Clear all cached validation results */
  clear(): Promise<void>;
}

// Phase 4: Scalability Enhancement Types

export interface PartitionInfo {
  /** Partition ID */
  partitionId: string;
  /** Partition directory path */
  partitionDir: string;
  /** Number of files in partition */
  fileCount: number;
  /** Total size of partition in bytes */
  totalSize: number;
  /** Last cleanup timestamp */
  lastCleanup: number;
}

export interface PartitionStats {
  /** Partition information */
  partitionInfo: PartitionInfo;
  /** Hit rate for this partition */
  hitRate: number;
  /** Average file size in bytes */
  avgFileSize: number;
  /** Estimated memory usage */
  estimatedMemoryUsage: number;
}

export interface BackgroundTask {
  /** Task type */
  type: 'cleanup' | 'validation' | 'compression';
  /** Cache directory */
  cacheDir?: string;
  /** TTL for cleanup tasks */
  ttl?: number;
  /** Enable atomic operations */
  enableAtomic?: boolean;
  /** Is partitioned storage */
  partitioned?: boolean;
  /** Additional task data */
  data?: any;
}

export interface TaskResult {
  /** Whether task was successful */
  success: boolean;
  /** Task result data */
  result?: any;
  /** Error message if failed */
  error?: string;
  /** Task execution time in milliseconds */
  executionTime: number;
}

export interface BackgroundWorkerStats {
  /** Number of active workers */
  activeWorkers: number;
  /** Number of queued tasks */
  queuedTasks: number;
  /** Total completed tasks */
  completedTasks: number;
  /** Total failed tasks */
  failedTasks: number;
  /** Average task execution time */
  avgExecutionTime: number;
  /** Worker utilization (0-1) */
  utilization: number;
}

export type MemoryPressureLevel = 'normal' | 'warning' | 'critical';

export interface MemoryPressureStats {
  /** Current memory pressure level */
  level: MemoryPressureLevel;
  /** Current memory usage (0-1) */
  memoryUsage: number;
  /** Available memory in bytes */
  availableMemory: number;
  /** Total memory in bytes */
  totalMemory: number;
  /** Number of pressure events triggered */
  pressureEvents: number;
  /** Last pressure event timestamp */
  lastPressureEvent: number | null;
  /** Number of registered eviction strategies */
  evictionStrategies: number;
}

export interface EvictionStrategy {
  /** Strategy name */
  name: string;
  /** Strategy priority (higher = executed first) */
  priority: number;
  /** Execute eviction strategy */
  execute: (pressureLevel: MemoryPressureLevel) => Promise<void>;
}