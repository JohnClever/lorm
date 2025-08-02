/**
 * Cache System - High-performance caching with compression and reliability
 * Provides memory and file-based caching with advanced features
 */

export { BaseCache } from "./core/base-cache.js";
export { CacheManager, cacheManager } from "./core/cache-manager.js";
export { ConfigCache } from "./core/config-cache.js";

// Operations
export {
  clearCache,
  getCacheStats,
  getCacheStatsWithFileSystem,
  warmupCache,
  cleanupExpiredEntries,
  invalidateConfigCache,
  getCacheHealth,
} from "./operations/cache-operations.js";

// Utils
export {
  generateCacheKey,
  generateFileCacheKey,
  generateDirectoryCacheKey,
  serializeForCache,
  deserializeFromCache,
  validateCacheEntry,
  isCacheEntryExpired,
  calculateCacheEntrySize,
  formatCacheSize,
  formatCacheDuration,
  createConfigCacheKey,
  getFileHashesSync,
  hasFileChanges,
  debounceCache,
  withRetry,
} from "./utils/index.js";

// Instances
export { defaultCache, configCache } from "./core/index.js";

// Adapters
export {
  CachePerformanceAdapter,
  getCachePerformanceAdapter,
  createCachePerformanceAdapter,
  type CachePerformanceMetrics,
} from "./adapters/index.js";

// Services
export {
  CompressionService,
  getCompressionService,
  type CompressionOptions,
  type CompressionResult,
  type DecompressionResult,
} from "./services/compression-service.js";
export {
  ObjectPool,
  BufferPool,
  CacheEntryPool,
  MemoryPoolManager,
  getMemoryPoolManager,
  type PoolOptions,
  type PoolStats,
} from "./services/memory-pool.js";
export {
  BatchProcessor,
  CacheBatchOperations,
  type BatchOperation,
  type BatchResult,
  type BatchStats,
  type BatchOptions,
  type BatchCacheOperations,
} from "./services/batch-operations.js";
export {
  CircuitBreaker,
  getFileSystemCircuitBreaker,
  type CircuitBreakerOptions,
  type CircuitBreakerStats,
  type CircuitState,
} from "./services/circuit-breaker.js";
export {
  AtomicFileOperations,
  getAtomicFileOperations,
  type AtomicWriteResult,
  type AtomicWriteOptions,
} from "./services/atomic-operations.js";
export {
  PartitionedStorage,
  getPartitionedStorage,
  type PartitionOptions,
} from "./services/partitioned-storage.js";
export {
  BackgroundWorkerManager,
  getBackgroundWorkerManager,
  type WorkerOptions,
  type WorkerStats,
} from "./services/background-workers.js";
export {
  MemoryPressureDetector,
  getMemoryPressureDetector,
  type MemoryPressureOptions,
  type MemoryStats,
  type MemoryPressureEvent,
} from "./services/memory-pressure.js";

// Types
export type {
  CacheOptions,
  CacheEntry,
  CacheStats,
  CacheEventData,
  CacheEventListener,
  ICache,
  ICacheManager,
  IConfigCache,
  ConfigCacheEntry,
  ValidationResult,
  ConfigValidationOptions,
} from "./types/types.js";