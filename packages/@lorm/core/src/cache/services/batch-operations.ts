/**
 * Batch Operations Service for @lorm/core cache system
 * Provides efficient batch processing for multiple cache operations
 */

import type { CacheEntry } from "../types/types.js";

export interface BatchOperation {
  /** Operation type */
  type: 'get' | 'set' | 'delete' | 'has';
  /** Cache key */
  key: string;
  /** Data for set operations */
  data?: any;
  /** TTL for set operations */
  ttl?: number;
  /** Input hash for get operations */
  inputHash?: string;
}

export interface BatchResult<T = any> {
  /** Operation key */
  key: string;
  /** Operation success status */
  success: boolean;
  /** Result data (for get/has operations) */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Operation duration in milliseconds */
  duration: number;
}

export interface BatchStats {
  /** Total operations processed */
  totalOperations: number;
  /** Successful operations */
  successfulOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Total processing time in milliseconds */
  totalDuration: number;
  /** Average operation time in milliseconds */
  averageDuration: number;
  /** Operations per second */
  operationsPerSecond: number;
}

export interface BatchOptions {
  /** Maximum batch size */
  maxBatchSize?: number;
  /** Maximum concurrent operations */
  maxConcurrency?: number;
  /** Timeout for batch operations in milliseconds */
  timeout?: number;
  /** Enable batch statistics */
  enableStats?: boolean;
  /** Retry failed operations */
  retryFailedOps?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
}

export class BatchProcessor {
  private options: Required<BatchOptions>;
  private stats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    totalDuration: 0
  };

  constructor(options: BatchOptions = {}) {
    this.options = {
      maxBatchSize: 100,
      maxConcurrency: 10,
      timeout: 30000, // 30 seconds
      enableStats: true,
      retryFailedOps: true,
      maxRetries: 3,
      ...options
    };
  }

  async processBatch<T>(
    operations: BatchOperation[],
    executor: (op: BatchOperation) => Promise<T>
  ): Promise<BatchResult<T>[]> {
    const startTime = Date.now();
    const results: BatchResult<T>[] = [];
    
    // Split into chunks if batch is too large
    const chunks = this.chunkOperations(operations);
    
    for (const chunk of chunks) {
      const chunkResults = await this.processChunk(chunk, executor);
      results.push(...chunkResults);
    }

    // Update statistics
    if (this.options.enableStats) {
      this.updateStats(results, Date.now() - startTime);
    }

    return results;
  }

  async processChunk<T>(
    operations: BatchOperation[],
    executor: (op: BatchOperation) => Promise<T>
  ): Promise<BatchResult<T>[]> {
    const semaphore = new Semaphore(this.options.maxConcurrency);
    const promises = operations.map(async (op) => {
      await semaphore.acquire();
      try {
        return await this.executeOperation(op, executor);
      } finally {
        semaphore.release();
      }
    });

    return Promise.all(promises);
  }

  private async executeOperation<T>(
    operation: BatchOperation,
    executor: (op: BatchOperation) => Promise<T>
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();
    let retries = 0;
    
    while (retries <= this.options.maxRetries) {
      try {
        const data = await Promise.race([
          executor(operation),
          this.createTimeoutPromise()
        ]);
        
        return {
          key: operation.key,
          success: true,
          data: data as T | undefined,
          duration: Date.now() - startTime
        };
      } catch (error) {
        retries++;
        
        if (retries > this.options.maxRetries || !this.options.retryFailedOps) {
          return {
            key: operation.key,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          };
        }
        
        // Exponential backoff for retries
        await this.delay(Math.pow(2, retries - 1) * 100);
      }
    }

    return {
      key: operation.key,
      success: false,
      error: 'Max retries exceeded',
      duration: Date.now() - startTime
    };
  }

  private chunkOperations(operations: BatchOperation[]): BatchOperation[][] {
    const chunks: BatchOperation[][] = [];
    for (let i = 0; i < operations.length; i += this.options.maxBatchSize) {
      chunks.push(operations.slice(i, i + this.options.maxBatchSize));
    }
    return chunks;
  }

  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateStats(results: BatchResult[], duration: number): void {
    this.stats.totalOperations += results.length;
    this.stats.successfulOperations += results.filter(r => r.success).length;
    this.stats.failedOperations += results.filter(r => !r.success).length;
    this.stats.totalDuration += duration;
  }

  getStats(): BatchStats {
    const avgDuration = this.stats.totalOperations > 0 
      ? this.stats.totalDuration / this.stats.totalOperations 
      : 0;
    
    const opsPerSecond = this.stats.totalDuration > 0 
      ? (this.stats.totalOperations / this.stats.totalDuration) * 1000 
      : 0;

    return {
      totalOperations: this.stats.totalOperations,
      successfulOperations: this.stats.successfulOperations,
      failedOperations: this.stats.failedOperations,
      totalDuration: this.stats.totalDuration,
      averageDuration: avgDuration,
      operationsPerSecond: opsPerSecond
    };
  }

  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalDuration: 0
    };
  }
}

class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

export interface BatchCacheOperations {
  /** Batch get operations */
  batchGet<T>(keys: string[], inputHashes?: string[]): Promise<BatchResult<T | null>[]>;
  /** Batch set operations */
  batchSet<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<BatchResult<void>[]>;
  /** Batch delete operations */
  batchDelete(keys: string[]): Promise<BatchResult<void>[]>;
  /** Batch has operations */
  batchHas(keys: string[]): Promise<BatchResult<boolean>[]>;
  /** Mixed batch operations */
  batchMixed(operations: BatchOperation[]): Promise<BatchResult[]>;
}

export class CacheBatchOperations implements BatchCacheOperations {
  private processor: BatchProcessor;
  private cache: any; // Will be injected

  constructor(cache: any, options: BatchOptions = {}) {
    this.cache = cache;
    this.processor = new BatchProcessor(options);
  }

  async batchGet<T>(keys: string[], inputHashes?: string[]): Promise<BatchResult<T | null>[]> {
    const operations: BatchOperation[] = keys.map((key, index) => ({
      type: 'get' as const,
      key,
      inputHash: inputHashes?.[index]
    }));

    return this.processor.processBatch(operations, async (op) => {
      return await this.cache.get(op.key, op.inputHash);
    });
  }

  async batchSet<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<BatchResult<void>[]> {
    const operations: BatchOperation[] = entries.map(entry => ({
      type: 'set' as const,
      key: entry.key,
      data: entry.data,
      ttl: entry.ttl
    }));

    return this.processor.processBatch(operations, async (op) => {
      await this.cache.set(op.key, op.data, op.ttl);
    });
  }

  async batchDelete(keys: string[]): Promise<BatchResult<void>[]> {
    const operations: BatchOperation[] = keys.map(key => ({
      type: 'delete' as const,
      key
    }));

    return this.processor.processBatch(operations, async (op) => {
      await this.cache.delete(op.key);
    });
  }

  async batchHas(keys: string[]): Promise<BatchResult<boolean>[]> {
    const operations: BatchOperation[] = keys.map(key => ({
      type: 'has' as const,
      key
    }));

    return this.processor.processBatch(operations, async (op) => {
      return await this.cache.has(op.key);
    });
  }

  async batchMixed(operations: BatchOperation[]): Promise<BatchResult[]> {
    return this.processor.processBatch(operations, async (op) => {
      switch (op.type) {
        case 'get':
          return await this.cache.get(op.key, op.inputHash);
        case 'set':
          await this.cache.set(op.key, op.data, op.ttl);
          return;
        case 'delete':
          await this.cache.delete(op.key);
          return;
        case 'has':
          return await this.cache.has(op.key);
        default:
          throw new Error(`Unknown operation type: ${(op as any).type}`);
      }
    });
  }

  getStats(): BatchStats {
    return this.processor.getStats();
  }

  resetStats(): void {
    this.processor.resetStats();
  }

  getBatchStats(): BatchStats {
    return this.getStats();
  }

  resetBatchStats(): void {
    this.resetStats();
  }
}

// Utility functions for creating batch operations
export function createBatchGet(keys: string[], inputHashes?: string[]): BatchOperation[] {
  return keys.map((key, index) => ({
    type: 'get' as const,
    key,
    inputHash: inputHashes?.[index]
  }));
}

export function createBatchSet<T>(entries: Array<{ key: string; data: T; ttl?: number }>): BatchOperation[] {
  return entries.map(entry => ({
    type: 'set' as const,
    key: entry.key,
    data: entry.data,
    ttl: entry.ttl
  }));
}

export function createBatchDelete(keys: string[]): BatchOperation[] {
  return keys.map(key => ({
    type: 'delete' as const,
    key
  }));
}

export function createBatchHas(keys: string[]): BatchOperation[] {
  return keys.map(key => ({
    type: 'has' as const,
    key
  }));
}