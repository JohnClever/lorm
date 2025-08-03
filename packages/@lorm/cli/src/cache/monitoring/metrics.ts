/**
 * Cache metrics collection and reporting
 * 
 * Provides detailed performance metrics for the unified caching system,
 * including hit rates, operation timings, and resource usage.
 */

import { EventEmitter } from 'events';
import type { CachePerformanceMetrics, CacheOperation } from '../core/types.js';

export interface MetricsOptions {
  enabled?: boolean;
  collectionInterval?: number;
  retentionPeriod?: number;
  aggregationWindow?: number;
}

export interface OperationMetrics {
  operation: CacheOperation;
  key: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache metrics collector
 */
export class CacheMetrics extends EventEmitter {
  private readonly options: Required<MetricsOptions>;
  private readonly operations: OperationMetrics[] = [];
  private readonly hitCounts = new Map<string, number>();
  private readonly missCounts = new Map<string, number>();
  private readonly errorCounts = new Map<string, number>();
  private readonly layerStats = new Map<string, { hits: number; misses: number; errors: number }>();
  
  private isStarted = false;
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: MetricsOptions = {}) {
    super();
    this.options = {
      enabled: options.enabled ?? true,
      collectionInterval: options.collectionInterval ?? 30000, // 30 seconds
      retentionPeriod: options.retentionPeriod ?? 3600000, // 1 hour
      aggregationWindow: options.aggregationWindow ?? 300000 // 5 minutes
    };
  }

  /**
   * Start metrics collection
   */
  async start(): Promise<void> {
    if (!this.options.enabled || this.isStarted) {
      return;
    }

    this.isStarted = true;

    // Start periodic metrics aggregation
    this.metricsInterval = setInterval(() => {
      this.aggregateMetrics();
    }, this.options.collectionInterval);

    // Start cleanup of old metrics
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.options.retentionPeriod / 4); // Cleanup every quarter of retention period

    this.emit('metrics:started');
  }

  /**
   * Stop metrics collection
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.emit('metrics:stopped');
  }

  /**
   * Record a cache operation
   */
  recordOperation(
    operation: CacheOperation,
    key: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.options.enabled) {
      return;
    }

    const operationMetrics: OperationMetrics = {
      operation,
      key,
      duration,
      success,
      timestamp: Date.now(),
      metadata
    };

    this.operations.push(operationMetrics);

    // Update counters
    const namespace = metadata?.namespace as string || 'default';
    const layer = metadata?.layer as string;

    if (operation === 'get') {
      if (success) {
        this.incrementCounter(this.hitCounts, namespace);
        if (layer) {
          this.updateLayerStats(layer, 'hits');
        }
      } else {
        this.incrementCounter(this.missCounts, namespace);
        if (layer) {
          this.updateLayerStats(layer, 'misses');
        }
      }
    }

    if (!success && metadata?.error) {
      this.incrementCounter(this.errorCounts, namespace);
      if (layer) {
        this.updateLayerStats(layer, 'errors');
      }
    }

    this.emit('metrics:operation', operationMetrics);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): CachePerformanceMetrics {
    const now = Date.now();
    const windowStart = now - this.options.aggregationWindow;
    
    const recentOperations = this.operations.filter(
      op => op.timestamp >= windowStart
    );

    const totalOperations = recentOperations.length;
    const successfulOperations = recentOperations.filter(op => op.success).length;
    const getOperations = recentOperations.filter(op => op.operation === 'get');
    const hits = getOperations.filter(op => op.success).length;
    const misses = getOperations.filter(op => !op.success).length;

    const avgResponseTime = totalOperations > 0
      ? recentOperations.reduce((sum, op) => sum + op.duration, 0) / totalOperations
      : 0;

    const hitRatio = (hits + misses) > 0 ? hits / (hits + misses) : 0;
    const errorRate = totalOperations > 0 ? (totalOperations - successfulOperations) / totalOperations : 0;

    return {
      hitRatio,
      missRatio: 1 - hitRatio,
      errorRate,
      avgResponseTime,
      totalOperations,
      memoryUsage: this.getMemoryUsage(),
      diskUsage: this.getDiskUsage(),
      layerStats: this.getLayerStats(),
      timestamp: now
    };
  }

  /**
   * Get metrics for a specific namespace
   */
  getNamespaceMetrics(namespace: string): Partial<CachePerformanceMetrics> {
    const now = Date.now();
    const windowStart = now - this.options.aggregationWindow;
    
    const namespaceOperations = this.operations.filter(
      op => op.timestamp >= windowStart && 
           (op.metadata?.namespace === namespace || (!op.metadata?.namespace && namespace === 'default'))
    );

    const totalOperations = namespaceOperations.length;
    const getOperations = namespaceOperations.filter(op => op.operation === 'get');
    const hits = getOperations.filter(op => op.success).length;
    const misses = getOperations.filter(op => !op.success).length;

    const hitRatio = (hits + misses) > 0 ? hits / (hits + misses) : 0;
    const avgResponseTime = totalOperations > 0
      ? namespaceOperations.reduce((sum, op) => sum + op.duration, 0) / totalOperations
      : 0;

    return {
      hitRatio,
      missRatio: 1 - hitRatio,
      avgResponseTime,
      totalOperations,
      timestamp: now
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.operations.length = 0;
    this.hitCounts.clear();
    this.missCounts.clear();
    this.errorCounts.clear();
    this.layerStats.clear();
    this.emit('metrics:reset');
  }

  private incrementCounter(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) || 0) + 1);
  }

  private updateLayerStats(layer: string, type: 'hits' | 'misses' | 'errors'): void {
    const stats = this.layerStats.get(layer) || { hits: 0, misses: 0, errors: 0 };
    stats[type]++;
    this.layerStats.set(layer, stats);
  }

  private aggregateMetrics(): void {
    const metrics = this.getMetrics();
    this.emit('metrics:aggregated', metrics);
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.options.retentionPeriod;
    const initialLength = this.operations.length;
    
    // Remove old operations
    let i = 0;
    while (i < this.operations.length && this.operations[i].timestamp < cutoff) {
      i++;
    }
    
    if (i > 0) {
      this.operations.splice(0, i);
      this.emit('metrics:cleanup', { removed: i, remaining: this.operations.length });
    }
  }

  private getMemoryUsage(): number {
    // Estimate memory usage based on operations array and maps
    const operationsSize = this.operations.length * 200; // Rough estimate per operation
    const mapsSize = (this.hitCounts.size + this.missCounts.size + this.errorCounts.size) * 50;
    return operationsSize + mapsSize;
  }

  private getDiskUsage(): number {
    // This would need to be implemented based on actual disk layer usage
    // For now, return 0 as placeholder
    return 0;
  }

  private getLayerStats(): Record<string, { hits: number; misses: number; errors: number }> {
    const stats: Record<string, { hits: number; misses: number; errors: number }> = {};
    
    for (const [layer, layerStats] of this.layerStats.entries()) {
      stats[layer] = { ...layerStats };
    }
    
    return stats;
  }
}