/**
 * Cache Services - Performance optimization services for @lorm/core
 * Exports async compression, memory pooling, batch operations, and scalability services
 */

export {
  CompressionService,
  getCompressionService,
  destroyCompressionService,
  type CompressionOptions,
  type CompressionResult,
  type DecompressionResult,
} from "./compression-service.js";

export {
  ObjectPool,
  BufferPool,
  CacheEntryPool,
  MemoryPoolManager,
  getMemoryPoolManager,
  destroyMemoryPoolManager,
  type PoolOptions,
  type PoolStats,
} from "./memory-pool.js";

export {
  BatchProcessor,
  CacheBatchOperations,
  createBatchGet,
  createBatchSet,
  createBatchDelete,
  createBatchHas,
  type BatchOperation,
  type BatchResult,
  type BatchStats,
  type BatchOptions,
  type BatchCacheOperations,
} from "./batch-operations.js";

export {
  CircuitBreaker,
  getFileSystemCircuitBreaker,
  type CircuitBreakerOptions,
  type CircuitBreakerStats,
  type CircuitState,
} from "./circuit-breaker.js";

export {
  AtomicFileOperations,
  getAtomicFileOperations,
  type AtomicWriteResult,
  type AtomicWriteOptions,
} from "./atomic-operations.js";

export {
  ChecksumValidator,
  getChecksumValidator,
  type ChecksumOptions,
} from "./checksum-validation.js";

// Phase 4: Scalability Services
export {
  PartitionedStorage,
  getPartitionedStorage,
  destroyPartitionedStorage,
  type PartitionOptions,
} from "./partitioned-storage.js";

export {
  BackgroundWorkerManager,
  getBackgroundWorkerManager,
  destroyBackgroundWorkerManager,
  type WorkerOptions,
  type CleanupTask,
  type ValidationTask,
  type CompressionTask,
  type WorkerStats,
} from "./background-workers.js";

export {
  MemoryPressureDetector,
  getMemoryPressureDetector,
  destroyMemoryPressureDetector,
  defaultEvictionStrategies,
  type MemoryPressureOptions,
  type MemoryStats,
  type MemoryPressureEvent,
} from "./memory-pressure.js";