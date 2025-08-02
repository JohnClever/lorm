/**
 * Performance Bridge - Compatibility layer between cache system and performance monitoring
 * Provides the interface expected by BaseCache while using the dedicated performance system
 */

import { CachePerformanceAdapter, createCacheAdapter } from '../../performance/adapters/cache-adapter.js';
import type { CacheStats } from '../types/types.js';

// Legacy interface types for compatibility
export interface ComponentMetrics {
  componentId: string;
  componentType: string;
  timestamp: number;
  errorRate: number;
  operationsPerSecond: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  [key: string]: any;
}

export interface CachePerformanceMetrics {
  componentId: string;
  componentType: string;
  timestamp: number;
  errorRate: number;
  operationsPerSecond: number;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
  diskUsage: number;
  evictionRate: number;
  compressionRatio?: number;
}

/**
 * Bridge adapter that provides the legacy interface while using the performance system
 */
export class CachePerformanceBridge {
  private performanceAdapter: CachePerformanceAdapter;
  private componentId: string;
  private operationTimes: number[] = [];
  private lastCollectionTime = Date.now();
  private operationCount = 0;
  private errorCount = 0;
  private metricsHistory: CachePerformanceMetrics[] = [];
  private currentMetrics: CachePerformanceMetrics | null = null;
  private isActive = false;

  constructor(componentId: string = 'cache', cacheInstance?: any) {
    this.componentId = componentId;
    this.isActive = true;
    
    // Create the performance system's cache adapter
    this.performanceAdapter = createCacheAdapter(cacheInstance);

    // Initialize asynchronously without blocking constructor
    this.performanceAdapter.initialize().catch(err => {
      console.warn('Failed to initialize performance adapter:', err);
    });
  }

  /**
   * Record cache operation timing
   */
  recordOperation(operation: string, duration: number, success: boolean = true): void {
    if (!this.isActive) return;
    
    this.operationTimes.push(duration);
    this.operationCount++;
    
    if (!success) {
      this.errorCount++;
    }

    // Keep only recent operation times (last 1000 operations)
    if (this.operationTimes.length > 1000) {
      this.operationTimes = this.operationTimes.slice(-1000);
    }

    // Record in the performance system using instrumentation
    if (this.performanceAdapter && typeof this.performanceAdapter.instrumentCacheOperation === 'function') {
      // Use the adapter's instrumentation method
      this.performanceAdapter.instrumentCacheOperation(operation, 'unknown', async () => {
        return { duration, success };
      }).catch(err => {
        console.warn('Failed to record performance metric:', err);
      });
    }
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(stats: CacheStats): void {
    if (!this.isActive) return;
    
    const now = Date.now();
    const timeSinceLastCollection = now - this.lastCollectionTime;
    
    // Calculate derived metrics
    const hitRate = stats.totalHits > 0 ? stats.totalHits / (stats.totalHits + stats.totalMisses) : 0;
    const missRate = 1 - hitRate;
    const averageResponseTime = this.operationTimes.length > 0 
      ? this.operationTimes.reduce((sum, time) => sum + time, 0) / this.operationTimes.length 
      : 0;
    const errorRate = this.operationCount > 0 ? this.errorCount / this.operationCount : 0;
    const evictionRate = stats.expiredEntries / (timeSinceLastCollection / 1000);

    const cacheMetrics: CachePerformanceMetrics = {
      componentId: this.componentId,
      componentType: 'cache',
      timestamp: now,
      hitRate,
      missRate,
      averageResponseTime,
      cacheSize: stats.totalSize,
      memoryUsage: stats.totalSize, // Approximate memory usage
      diskUsage: 0, // Would need file system stats
      evictionRate,
      errorRate,
      operationsPerSecond: this.operationCount / (timeSinceLastCollection / 1000),
    };

    // Store current metrics
    this.currentMetrics = cacheMetrics;
    
    // Add to history (keep last 100 entries)
    this.metricsHistory.push(cacheMetrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    // Reset counters
    this.operationCount = 0;
    this.errorCount = 0;
    this.lastCollectionTime = now;

    // Record in performance system using collectCacheMetrics
    if (this.performanceAdapter && typeof this.performanceAdapter.collectCacheMetrics === 'function') {
      this.performanceAdapter.collectCacheMetrics().catch(err => {
        console.warn('Failed to collect cache metrics:', err);
      });
    }
  }

  /**
   * Record cache hit
   */
  recordHit(key: string, responseTime: number): void {
    this.recordOperation('hit', responseTime, true);
  }

  /**
   * Record cache miss
   */
  recordMiss(key: string, responseTime: number): void {
    this.recordOperation('miss', responseTime, true);
  }

  /**
   * Record cache set operation
   */
  recordSet(key: string, size: number, responseTime: number, compressed: boolean = false): void {
    this.recordOperation('set', responseTime, true);
  }

  /**
   * Record cache delete operation
   */
  recordDelete(key: string, responseTime: number): void {
    this.recordOperation('delete', responseTime, true);
  }

  /**
   * Record cache error
   */
  recordError(operation: string, error: Error, responseTime: number): void {
    this.recordOperation(operation, responseTime, false);
  }

  /**
   * Get current cache performance metrics
   */
  getCurrentMetrics(): CachePerformanceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): CachePerformanceMetrics[] {
    if (limit && limit > 0) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Start monitoring
   */
  start(): void {
    this.isActive = true;
    this.performanceAdapter.start().catch(err => {
      console.warn('Failed to start performance adapter:', err);
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isActive = false;
    this.performanceAdapter.stop().catch(err => {
      console.warn('Failed to stop performance adapter:', err);
    });
  }

  /**
   * Destroy adapter and cleanup resources
   */
  destroy(): void {
    this.isActive = false;
    this.metricsHistory = [];
    this.currentMetrics = null;
    this.operationTimes = [];
    this.performanceAdapter.dispose().catch(err => {
      console.warn('Failed to dispose performance adapter:', err);
    });
  }

  /**
   * Get the underlying performance adapter for advanced usage
   */
  getPerformanceAdapter(): CachePerformanceAdapter {
    return this.performanceAdapter;
  }
}

// Global cache performance bridge instance
let globalCacheBridge: CachePerformanceBridge | null = null;

/**
 * Get or create global cache performance bridge
 */
export function getCachePerformanceAdapter(): CachePerformanceBridge {
  if (!globalCacheBridge) {
    globalCacheBridge = new CachePerformanceBridge('default-cache');
  }
  return globalCacheBridge;
}

/**
 * Create a new cache performance bridge for a specific cache instance
 */
export function createCachePerformanceAdapter(cacheId: string, cacheInstance?: any): CachePerformanceBridge {
  return new CachePerformanceBridge(cacheId, cacheInstance);
}

// Export types for compatibility
export { CachePerformanceBridge as CachePerformanceAdapter };