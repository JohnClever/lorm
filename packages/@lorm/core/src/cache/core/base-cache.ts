/**
 * BaseCache - Core caching functionality for @lorm/core
 * Provides memory and file system caching with LRU eviction, compression, and TTL management
 * Enhanced with async compression, batch operations, and memory pooling
 */

import { createHash } from "crypto";
import { resolve, join } from "path";
import { readFile, writeFile, unlink, readdir, stat, mkdir } from "fs/promises";
import { existsSync, statSync } from "fs";
import { getCompressionService, type CompressionService } from "../services/compression-service.js";
import { getMemoryPoolManager, type MemoryPoolManager } from "../services/memory-pool.js";
import { CacheBatchOperations, type BatchCacheOperations, type BatchOptions } from "../services/batch-operations.js";
import { getFileSystemCircuitBreaker, type CircuitBreaker } from "../services/circuit-breaker.js";
import { getAtomicFileOperations, type AtomicFileOperations } from "../services/atomic-operations.js";
import { getChecksumValidator, type ChecksumValidator, type CacheEntryWithChecksum } from "../services/checksum-validation.js";
import { getPartitionedStorage, type PartitionedStorage } from "../services/partitioned-storage.js";
import { getBackgroundWorkerManager, type BackgroundWorkerManager } from "../services/background-workers.js";
import { getMemoryPressureDetector, type MemoryPressureDetector, type MemoryPressureEvent } from "../services/memory-pressure.js";
import { CachePerformanceAdapter } from "../adapters/performance-bridge.js";
import type {
  CacheOptions,
  CacheEntry,
  CacheStats,
  CacheEventData,
  CacheEventListener,
  ICache,
  ChecksumResult,
  MemoryPressureLevel,
  PartitionStats,
  BackgroundWorkerStats,
  MemoryPressureStats,
  BackgroundTask,
  TaskResult,
} from "../types/types.js";

export class BaseCache implements ICache {
  private cacheDir: string;
  private options: Required<CacheOptions & { batchOptions?: BatchOptions }>;
  private memoryCache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    expiredEntries: 0,
    checksumFailures: 0,
    atomicOpFailures: 0,
    corruptedEntries: 0,
    recoveredEntries: 0,
    backupRestores: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;
  private eventListeners: CacheEventListener[] = [];
  private compressionService: CompressionService;
  private memoryPool: MemoryPoolManager;
  private batchOperations: CacheBatchOperations;
  private circuitBreaker: CircuitBreaker;
  private atomicOps: AtomicFileOperations;
  private checksumValidator: ChecksumValidator;
  private partitionedStorage: PartitionedStorage;
  private backgroundWorkers: BackgroundWorkerManager;
  private memoryPressureDetector: MemoryPressureDetector;
  private performanceAdapter: CachePerformanceAdapter;

  constructor(options: CacheOptions & { batchOptions?: BatchOptions } = {}) {
    this.options = {
      cacheId: 'default',
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 10 * 1024 * 1024, // 10MB
      enabled: process.env.LORM_CACHE !== "false",
      compression: true,
      compressionThreshold: 1024, // 1KB
      maxMemoryEntries: 100,
      cacheDir: resolve(process.cwd(), ".lorm", "cache"),
      cacheDirectory: resolve(process.cwd(), ".lorm", "cache"),
      autoCleanup: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableChecksum: true,
      checksumValidation: true,
      enableAtomicOps: true,
      atomicOperations: true,
      enableCircuitBreaker: true,
      circuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000, // 30 seconds
      enablePartitioning: true,
      partitionCount: 256,
      enableBackgroundWorkers: true,
      maxBackgroundWorkers: Math.max(1, Math.floor(require('os').cpus().length / 2)),
      enableMemoryPressureDetection: true,
      memoryWarningThreshold: 0.75,
      memoryCriticalThreshold: 0.90,
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: true
        },
        backgroundWorkers: {
          enabled: true
        },
        memoryPressureDetection: {
          enabled: true
        }
      },
      batchOptions: {
        maxBatchSize: 50,
        maxConcurrency: 5,
        timeout: 15000,
        enableStats: true,
        retryFailedOps: true,
        maxRetries: 2,
      },
      ...options,
    };

    this.cacheDir = this.options.cacheDir;
    this.ensureCacheDir();

    // Initialize services
    this.compressionService = getCompressionService({
      level: 6,
      useWorkers: true,
      maxWorkers: 2,
      workerThreshold: this.options.compressionThreshold,
    });
    
    this.memoryPool = getMemoryPoolManager({
      initialSize: 10,
      maxSize: 100,
      enableStats: true,
      autoShrink: true,
    });
    
    this.batchOperations = new CacheBatchOperations(this, this.options.batchOptions);
    
    // Initialize reliability services
    this.circuitBreaker = getFileSystemCircuitBreaker();
    this.atomicOps = getAtomicFileOperations();
    this.checksumValidator = getChecksumValidator();

    // Initialize Phase 4 scalability services
    this.partitionedStorage = getPartitionedStorage({
      partitionCount: this.options.partitionCount,
      baseDir: this.cacheDir,
      enableStats: true,
    });

    this.backgroundWorkers = getBackgroundWorkerManager({
      maxWorkers: this.options.maxBackgroundWorkers,
      enableStats: true,
    });

    this.memoryPressureDetector = getMemoryPressureDetector({
      warningThreshold: this.options.memoryWarningThreshold,
      criticalThreshold: this.options.memoryCriticalThreshold,
      autoEviction: true,
      enableDetailedTracking: true,
    });

    // Initialize partitioned storage if enabled
    if (this.options.enablePartitioning) {
      // Initialize synchronously to ensure it's ready before use
      this.partitionedStorage.initialize().then(() => {
        this.log('Partitioned storage initialized successfully');
      }).catch(err => {
        console.warn('Failed to initialize partitioned storage:', err);
        // Disable partitioning if initialization fails
        this.options.enablePartitioning = false;
      });
    }

    // Set up memory pressure event handlers
    if (this.options.enableMemoryPressureDetection) {
      this.memoryPressureDetector.on('memoryPressure', this.handleMemoryPressure.bind(this));
      this.memoryPressureDetector.on('evictionCompleted', this.handleEvictionCompleted.bind(this));
    }

    // Initialize performance adapter with cache instance
    this.performanceAdapter = new CachePerformanceAdapter(this.options.cacheId || 'default', this);

    if (this.options.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  async get<T>(key: string, inputHash?: string): Promise<T | null> {
    if (!this.options.enabled) return null;

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Check memory cache first
      const memEntry = this.memoryCache.get(key);
      if (memEntry && this.isValid(memEntry, inputHash)) {
        this.updateAccessOrder(key);
        memEntry.accessCount = (memEntry.accessCount || 0) + 1;
        memEntry.lastAccessed = Date.now();
        this.stats.totalHits++;
        success = true;
        return memEntry.data as T;
      }

      // Check file system cache with circuit breaker protection
      const filePath = this.getFilePath(key);
      const compressedPath = filePath + ".gz";

      let fileContent: string;
      let entry: CacheEntry<T>;

      const fileOperation = async () => {
        if (existsSync(compressedPath)) {
          const fileBuffer = await readFile(compressedPath);
          const decompressed = await this.compressionService.decompress(fileBuffer);
          return decompressed.data.toString("utf8");
        } else if (existsSync(filePath)) {
          return await readFile(filePath, "utf8");
        } else {
          return null;
        }
      };

      if (this.options.enableCircuitBreaker) {
        const result = await this.circuitBreaker.execute(fileOperation);
        if (result === null) {
          this.stats.totalMisses++;
          return null;
        }
        fileContent = result;
      } else {
        const result = await fileOperation();
        if (result === null) {
          this.stats.totalMisses++;
          return null;
        }
        fileContent = result;
      }

      entry = JSON.parse(fileContent);

      // Validate checksum if enabled
      if (this.options.enableChecksum && entry.checksum) {
        // Type guard to ensure entry has checksum for validation
        const entryWithChecksum = entry as CacheEntryWithChecksum<T>;
        const validation = this.checksumValidator.validateEntry(entryWithChecksum);
        if (!validation.isValid) {
          this.stats.checksumFailures++;
          this.stats.corruptedEntries++;
          this.log(`Checksum validation failed for key ${key}: ${validation.error}`);
          
          // Remove corrupted entry
          await this.delete(key);
          this.stats.totalMisses++;
          return null;
        }
      }

      if (this.isValid(entry, inputHash)) {
        entry.accessCount = (entry.accessCount || 0) + 1;
        entry.lastAccessed = Date.now();
        this.addToMemoryCache(key, entry);
        this.stats.totalHits++;
        success = true;
        return entry.data;
      }

      // Entry is invalid, remove it
      await this.delete(key);
      this.stats.totalMisses++;
      return null;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      this.stats.totalMisses++;
      return null;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record performance metrics
      if (success) {
        this.performanceAdapter.recordHit(key, duration);
      } else {
        this.performanceAdapter.recordMiss(key, duration);
      }
      if (error) {
        this.performanceAdapter.recordError('get', new Error(error), duration);
      }
      
      this.emitEvent({
        operation: "get",
        key,
        success,
        duration,
        error,
      });
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.options.enabled) return;

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const serializedData = JSON.stringify(data);
      const dataSize = Buffer.byteLength(serializedData, "utf8");

      if (dataSize > this.options.maxSize) {
        throw new Error(
          `Cache entry too large: ${dataSize} bytes > ${this.options.maxSize} bytes`
        );
      }

      // Use memory pool for cache entry
      const entry = this.memoryPool.getCacheEntry<T>();
      entry.data = data;
      entry.timestamp = Date.now();
      entry.hash = this.createHash(key);
      entry.size = dataSize;
      entry.accessCount = 1;
      entry.lastAccessed = Date.now();
      entry.ttl = ttl || this.options.ttl;

      // Calculate checksum if enabled
      if (this.options.enableChecksum) {
        const metadata = {
          timestamp: entry.timestamp,
          hash: entry.hash,
          size: entry.size,
          ttl: entry.ttl
        };
        entry.checksum = this.checksumValidator.calculateChecksum(data, metadata);
      }

      // Add to memory cache
      this.addToMemoryCache(key, entry as CacheEntry<T>);

      // Persist to file system
      const filePath = this.getFilePath(key);
      const entryJson = JSON.stringify(entry, null, 2);
      const shouldCompress =
        this.options.compression &&
        Buffer.byteLength(entryJson, "utf8") >
          this.options.compressionThreshold;

      const writeOperation = async () => {
        if (shouldCompress) {
          const compressionResult = await this.compressionService.compress(entryJson);
          
          if (this.options.enableAtomicOps) {
            const result = await this.atomicOps.writeFile(filePath + ".gz", compressionResult.data);
            if (!result.success) {
              this.stats.atomicOpFailures++;
              throw new Error(`Atomic write failed: ${result.error}`);
            }
            if (result.backupPath) {
              this.stats.backupRestores++;
            }
          } else {
            await writeFile(filePath + ".gz", compressionResult.data);
          }
          
          entry.compressed = true;

          // Remove uncompressed version if it exists
          if (existsSync(filePath)) {
            if (this.options.enableAtomicOps) {
              await this.atomicOps.deleteFile(filePath);
            } else {
              await unlink(filePath);
            }
          }
        } else {
          if (this.options.enableAtomicOps) {
            const result = await this.atomicOps.writeFile(filePath, entryJson);
            if (!result.success) {
              this.stats.atomicOpFailures++;
              throw new Error(`Atomic write failed: ${result.error}`);
            }
            if (result.backupPath) {
              this.stats.backupRestores++;
            }
          } else {
            await writeFile(filePath, entryJson, "utf8");
          }

          // Remove compressed version if it exists
          if (existsSync(filePath + ".gz")) {
            if (this.options.enableAtomicOps) {
              await this.atomicOps.deleteFile(filePath + ".gz");
            } else {
              await unlink(filePath + ".gz");
            }
          }
        }
      };

      if (this.options.enableCircuitBreaker) {
         await this.circuitBreaker.execute(writeOperation);
       } else {
         await writeOperation();
       }

      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record performance metrics
      if (success) {
        const dataSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        this.performanceAdapter.recordSet(key, dataSize, duration);
      }
      if (error) {
        this.performanceAdapter.recordError('set', new Error(error), duration);
      }
      
      this.emitEvent({
        operation: "set",
        key,
        success,
        duration,
        error,
      });
    }
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      this.removeFromAccessOrder(key);

      // Remove from file system with circuit breaker protection
      const filePath = this.getFilePath(key);
      const compressedPath = filePath + ".gz";

      const deleteOperation = async () => {
        const deletePromises: Promise<void>[] = [];

        if (existsSync(filePath)) {
          if (this.options.enableAtomicOps) {
            deletePromises.push(
              this.atomicOps.deleteFile(filePath).then(result => {
                if (!result.success) {
                  this.stats.atomicOpFailures++;
                  throw new Error(`Atomic delete failed: ${result.error}`);
                }
              })
            );
          } else {
            deletePromises.push(unlink(filePath));
          }
        }

        if (existsSync(compressedPath)) {
          if (this.options.enableAtomicOps) {
            deletePromises.push(
              this.atomicOps.deleteFile(compressedPath).then(result => {
                if (!result.success) {
                  this.stats.atomicOpFailures++;
                  throw new Error(`Atomic delete failed: ${result.error}`);
                }
              })
            );
          } else {
            deletePromises.push(unlink(compressedPath));
          }
        }

        await Promise.all(deletePromises);
      };

      if (this.options.enableCircuitBreaker) {
        await this.circuitBreaker.execute(deleteOperation);
      } else {
        await deleteOperation();
      }
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      // Don't throw on delete errors, just log them
    } finally {
      const duration = Date.now() - startTime;
      
      // Record performance metrics
      if (success) {
        this.performanceAdapter.recordDelete(key, duration);
      }
      if (error) {
        this.performanceAdapter.recordError('delete', new Error(error), duration);
      }
      
      this.emitEvent({
        operation: "delete",
        key,
        success,
        duration,
        error,
      });
    }
  }

  async clear(): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.accessOrder = [];

      // Clear file system cache with circuit breaker protection
      if (existsSync(this.cacheDir)) {
        const clearOperation = async () => {
          const files = await readdir(this.cacheDir);
          const deletePromises = files.map(async (file) => {
            const filePath = join(this.cacheDir, file);
            if (this.options.enableAtomicOps) {
              const result = await this.atomicOps.deleteFile(filePath);
              if (!result.success) {
                this.stats.atomicOpFailures++;
                throw new Error(`Atomic delete failed for ${file}: ${result.error}`);
              }
            } else {
              await unlink(filePath);
            }
          });
          await Promise.all(deletePromises);
        };

        if (this.options.enableCircuitBreaker) {
          await this.circuitBreaker.execute(clearOperation);
        } else {
          await clearOperation();
        }
      }

      // Reset stats
      this.stats.totalHits = 0;
      this.stats.totalMisses = 0;
      this.stats.expiredEntries = 0;

      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record performance metrics
      this.performanceAdapter.recordOperation('clear', duration, success);
      if (error) {
        this.performanceAdapter.recordError('clear', new Error(error), duration);
      }
      
      this.emitEvent({
        operation: "clear",
        key: "*",
        success,
        duration,
        error,
      });
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.options.enabled) return false;

    // Check memory cache
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      return this.isValid(entry);
    }

    // Check file system
    const filePath = this.getFilePath(key);
    const compressedPath = filePath + ".gz";

    return existsSync(filePath) || existsSync(compressedPath);
  }

  getStats(): CacheStats {
    let totalSize = 0;
    let compressedEntries = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
      if (entry.compressed) compressedEntries++;
      if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
      if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
    }

    const totalAccesses = this.stats.totalHits + this.stats.totalMisses;
    const circuitBreakerStats = this.circuitBreaker.getStats();

    return {
      memoryEntries: this.memoryCache.size,
      totalSize,
      hitRate: totalAccesses > 0 ? this.stats.totalHits / totalAccesses : 0,
      compressionRatio:
        this.memoryCache.size > 0
          ? compressedEntries / this.memoryCache.size
          : 0,
      oldestEntry: this.memoryCache.size > 0 ? oldestTimestamp : null,
      newestEntry: this.memoryCache.size > 0 ? newestTimestamp : null,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      expiredEntries: this.stats.expiredEntries,
      checksumFailures: this.stats.checksumFailures,
      atomicOpFailures: this.stats.atomicOpFailures,
      circuitBreaker: {
        state: circuitBreakerStats.state,
        failureCount: circuitBreakerStats.failures,
        successCount: circuitBreakerStats.successes,
        totalRequests: circuitBreakerStats.totalRequests,
      },
      reliability: {
        corruptedEntries: this.stats.corruptedEntries,
        recoveredEntries: this.stats.recoveredEntries,
        backupRestores: this.stats.backupRestores,
      },
    };
  }

  /**
   * Get performance metrics from the performance adapter
   */
  getPerformanceMetrics() {
    return this.performanceAdapter.getCurrentMetrics();
  }

  /**
   * Get performance metrics history from the performance adapter
   */
  getPerformanceMetricsHistory(limit?: number) {
    return this.performanceAdapter.getMetricsHistory(limit);
  }

  async cleanup(): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let cleanedCount = 0;

    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Find expired entries in memory
      for (const [key, entry] of this.memoryCache.entries()) {
        const entryTtl = entry.ttl || this.options.ttl;
        if (now - entry.timestamp > entryTtl) {
          expiredKeys.push(key);
        }
      }

      // Remove expired entries from memory
      for (const key of expiredKeys) {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
        cleanedCount++;
      }

      // Clean up file system entries
      if (existsSync(this.cacheDir)) {
        if (this.options.enableBackgroundWorkers) {
          // Use background workers for non-blocking cleanup
          try {
            const cleanupTask = {
              type: 'cleanup' as const,
              cacheDir: this.cacheDir,
              ttl: this.options.ttl,
              enableAtomic: this.options.enableAtomicOps,
              partitioned: this.options.enablePartitioning,
            };
            
            const result = await this.backgroundWorkers.submitTask(cleanupTask);
            if (result.success && result.result) {
              cleanedCount += result.result.cleanedCount || 0;
            }
          } catch (error) {
             // Fallback to synchronous cleanup if background worker fails
             cleanedCount = await this.performSynchronousCleanup(now, cleanedCount);
           }
         } else {
           // Perform synchronous cleanup
           cleanedCount = await this.performSynchronousCleanup(now, cleanedCount);
         }
      }

      this.stats.expiredEntries += cleanedCount;
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    } finally {
      const duration = Date.now() - startTime;
      
      // Record performance metrics
      this.performanceAdapter.recordOperation('cleanup', duration, success);
      if (error) {
        this.performanceAdapter.recordError('cleanup', new Error(error), duration);
      }
      
      this.emitEvent({
        operation: "cleanup",
        key: `${cleanedCount} entries`,
        success,
        duration,
        error,
      });
    }
  }

  createHash(input: string | number | boolean | object | null): string {
    return createHash("sha256").update(JSON.stringify(input)).digest("hex");
  }

  on(event: "operation", listener: CacheEventListener): void {
    this.eventListeners.push(listener);
  }

  off(event: "operation", listener: CacheEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.eventListeners = [];
    
    // Cleanup services
    this.memoryPool.destroy();
    this.compressionService.destroy();
    
    // Cleanup performance adapter
    if (this.performanceAdapter) {
      this.performanceAdapter.destroy();
    }
    
    // Cleanup Phase 4 services
    if (this.partitionedStorage) {
      this.partitionedStorage.destroy();
    }
    if (this.backgroundWorkers) {
      this.backgroundWorkers.destroy().catch(() => {});
    }
    if (this.memoryPressureDetector) {
      this.memoryPressureDetector.destroy();
    }
  }

  // Batch Operations
  async batchGet<T>(keys: string[], inputHashes?: string[]) {
    return this.batchOperations.batchGet<T>(keys, inputHashes);
  }

  async batchSet<T>(entries: Array<{ key: string; data: T; ttl?: number }>) {
    return this.batchOperations.batchSet(entries);
  }

  async batchDelete(keys: string[]) {
    return this.batchOperations.batchDelete(keys);
  }

  async batchHas(keys: string[]) {
    return this.batchOperations.batchHas(keys);
  }

  getBatchStats() {
    return this.batchOperations.getBatchStats();
  }

  resetBatchStats() {
    this.batchOperations.resetBatchStats();
  }

  getMemoryPoolStats() {
    return this.memoryPool.getStats();
  }

  private ensureCacheDir(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdir(this.cacheDir, { recursive: true }).catch(() => {});
      }
    } catch {
      // Ignore errors during directory creation
    }
  }

  private getFilePath(key: string): string {
    const hash = this.createHash(key);
    const filename = `${hash}.json`;
    
    if (this.options.enablePartitioning) {
      try {
        return this.partitionedStorage.getPartitionedPath(key, filename);
      } catch (error) {
        // Fallback to non-partitioned path if partitioned storage fails
        this.log(`Partitioned storage error, falling back to non-partitioned: ${error}`);
        return join(this.cacheDir, filename);
      }
    }
    
    return join(this.cacheDir, filename);
  }

  private isValid(entry: CacheEntry, inputHash?: string): boolean {
    const now = Date.now();
    const entryTtl = entry.ttl || this.options.ttl;

    // Check TTL
    if (now - entry.timestamp > entryTtl) {
      return false;
    }

    // Check input hash if provided
    if (inputHash && entry.hash !== inputHash) {
      return false;
    }

    return true;
  }

  private addToMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    if (this.memoryCache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    this.memoryCache.set(key, entry);
    this.accessOrder.push(key);

    // Implement LRU eviction
    while (this.memoryCache.size > this.options.maxMemoryEntries) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      }
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(() => {}); // Ignore cleanup errors
    }, this.options.cleanupInterval);
  }

  private emitEvent(data: CacheEventData): void {
    for (const listener of this.eventListeners) {
      try {
        listener(data);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private handleMemoryPressure(event: MemoryPressureEvent): void {
    this.log(`Memory pressure detected: ${event.message}`);
    
    if (event.type === 'critical') {
      // Trigger immediate cleanup
      this.cleanup().catch(() => {});
      
      // Reduce memory cache size temporarily
      const currentMax = this.options.maxMemoryEntries;
      const reducedMax = Math.floor(currentMax * 0.5);
      
      while (this.memoryCache.size > reducedMax) {
        const lruKey = this.accessOrder.shift();
        if (lruKey) {
          this.memoryCache.delete(lruKey);
        } else {
          break;
        }
      }
    }
  }

  private handleEvictionCompleted(event: any): void {
    this.log(`Eviction completed: ${event.totalEvicted} entries freed, ${event.totalFreed} bytes`);
  }

  // Phase 4 API methods
  getPartitionStats() {
    if (!this.options.enablePartitioning) {
      return [];
    }
    // Return synchronous partition stats
      const partitionInfos = this.partitionedStorage.getAllPartitionInfoSync();
      return partitionInfos.map(info => ({
        partitionInfo: info,
        hitRate: 0, // Would need to track this separately
        avgFileSize: info.fileCount > 0 ? info.totalSize / info.fileCount : 0,
        estimatedMemoryUsage: this.partitionedStorage.estimateMemoryUsage(info.partitionId)
      }));
  }

  getBackgroundWorkerStats() {
    if (!this.options.enableBackgroundWorkers) {
      return {
        activeWorkers: 0,
        queuedTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        avgExecutionTime: 0,
        utilization: 0
      };
    }
    const stats = this.backgroundWorkers.getStatsSync();
    return {
      activeWorkers: stats.activeWorkers,
      queuedTasks: stats.queuedTasks,
      completedTasks: stats.completedTasks,
      failedTasks: stats.failedTasks,
      avgExecutionTime: stats.averageTaskDuration,
      utilization: stats.workerUtilization
    };
  }

  getMemoryPressureStats(): MemoryPressureStats {
    if (!this.options.enableMemoryPressureDetection) {
      return {
        level: 'normal' as MemoryPressureLevel,
        memoryUsage: 0,
        availableMemory: 0,
        totalMemory: 0,
        pressureEvents: 0,
        lastPressureEvent: null,
        evictionStrategies: 0
      };
    }
    const stats = this.memoryPressureDetector.getStatsSync();
    return {
      level: stats.currentState as MemoryPressureLevel,
      memoryUsage: stats.currentStats.usagePercentage,
      availableMemory: stats.currentStats.availableMemory,
      totalMemory: stats.currentStats.totalSystemMemory,
      pressureEvents: stats.history.length,
      lastPressureEvent: null, // Would need timestamp tracking in MemoryStats
      evictionStrategies: this.memoryPressureDetector.getEvictionStrategyCount()
    };
  }

  async submitBackgroundTask(task: any) {
    if (!this.options.enableBackgroundWorkers) {
      throw new Error('Background workers are not enabled');
    }
    return this.backgroundWorkers.submitTask(task);
  }

  private async performSynchronousCleanup(now: number, cleanedCount: number): Promise<number> {
    const cleanupOperation = async () => {
      let localCleanedCount = cleanedCount;
      
      if (this.options.enablePartitioning) {
        // Clean up partitioned storage
        const partitionInfos = await this.partitionedStorage.getAllPartitionInfo();
        
        for (const partitionInfo of partitionInfos) {
          try {
            const files = await readdir(partitionInfo.partitionDir);
            const deletePromises = files.map(async (file) => {
              const filePath = join(partitionInfo.partitionDir, file);
              try {
                const stats = await stat(filePath);
                const fileAge = now - stats.mtime.getTime();
                
                if (fileAge > this.options.ttl) {
                  if (this.options.enableAtomicOps) {
                    const result = await this.atomicOps.deleteFile(filePath);
                    if (!result.success) {
                      this.stats.atomicOpFailures++;
                    } else {
                      localCleanedCount++;
                    }
                  } else {
                    await unlink(filePath);
                    localCleanedCount++;
                  }
                }
              } catch {
                // Ignore errors for individual files
              }
            });
            await Promise.all(deletePromises);
          } catch {
            // Ignore errors for individual partitions
          }
        }
      } else {
        // Clean up regular storage
        const files = await readdir(this.cacheDir);
        const deletePromises = files.map(async (file) => {
          const filePath = join(this.cacheDir, file);
          try {
            const stats = await stat(filePath);
            const fileAge = now - stats.mtime.getTime();
            
            if (fileAge > this.options.ttl) {
              if (this.options.enableAtomicOps) {
                const result = await this.atomicOps.deleteFile(filePath);
                if (!result.success) {
                  this.stats.atomicOpFailures++;
                } else {
                  localCleanedCount++;
                }
              } else {
                await unlink(filePath);
                localCleanedCount++;
              }
            }
          } catch {
            // Ignore errors for individual files
          }
        });
        await Promise.all(deletePromises);
      }
      
      return localCleanedCount;
    };

    if (this.options.enableCircuitBreaker) {
      return await this.circuitBreaker.execute(cleanupOperation).catch(() => cleanedCount);
    } else {
      return await cleanupOperation();
    }
  }

  private log(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BaseCache] ${message}`);
    }
  }
}
