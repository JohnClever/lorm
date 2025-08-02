/**
 * Base Adapter - Base implementation for performance adapters
 */

import type {
  PerformanceAdapter,
  AdapterConfig,
  AdapterType,
  AdapterStats,
  MonitorableComponent,
  ComponentHealth,
  Metric,
  MetricCollection
} from '../types/index.js';
import { AdapterStatus, HealthStatus, MetricType } from '../types/index.js';

/**
 * Base performance adapter implementation
 */
export abstract class BasePerformanceAdapter implements PerformanceAdapter {
  protected _config: AdapterConfig;
  protected _status: AdapterStatus;
  protected _stats: AdapterStats;
  protected _startTime: number = 0;
  protected _eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  protected _collectionInterval?: NodeJS.Timeout;

  constructor(config: AdapterConfig) {
    this._config = { ...config };
    this._status = AdapterStatus.INITIALIZING;
    this._stats = this.initializeStats();
  }

  get config(): AdapterConfig {
    return { ...this._config };
  }

  get status(): AdapterStatus {
    return this._status;
  }

  get type(): AdapterType {
    return this._config.type;
  }

  getId(): string {
    return this._config.id;
  }

  getType(): AdapterType {
    return this._config.type;
  }

  isRunning(): boolean {
    return this._status === AdapterStatus.ACTIVE;
  }

  async initialize(): Promise<void> {
    if (this._status !== AdapterStatus.INITIALIZING) {
      throw new Error(`Adapter ${this._config.id} is not in initializing state`);
    }

    try {
      await this.onInitialize();
      this._status = AdapterStatus.INACTIVE;
      this._startTime = Date.now();
      
      this.emitEvent('adapter:initialized', {
        adapterId: this._config.id,
        adapterType: this._config.type
      });
    } catch (error) {
      this._status = AdapterStatus.ERROR;
      this._stats.errorCount++;
      
      this.emitEvent('adapter:error', {
        adapterId: this._config.id,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack
        }
      });
      
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this._status === AdapterStatus.ACTIVE) {
      return;
    }

    if (this._status !== AdapterStatus.INACTIVE) {
      throw new Error(`Adapter ${this._config.id} cannot be started from ${this._status} state`);
    }

    try {
      await this.onStart();
      this._status = AdapterStatus.ACTIVE;
      
      // Start automatic collection if interval is configured
      if (this._config.collectionInterval && this._config.collectionInterval > 0) {
        this._collectionInterval = setInterval(
          () => this.collectMetrics().catch(error => this.handleError(error)),
          this._config.collectionInterval
        );
      }
      
      this.emitEvent('adapter:started', {
        adapterId: this._config.id,
        adapterType: this._config.type
      });
    } catch (error) {
      this._status = AdapterStatus.ERROR;
      this._stats.errorCount++;
      this.handleError(error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._status === AdapterStatus.INACTIVE) {
      return;
    }

    try {
      // Stop automatic collection
      if (this._collectionInterval) {
        clearInterval(this._collectionInterval);
        this._collectionInterval = undefined;
      }
      
      await this.onStop();
      this._status = AdapterStatus.INACTIVE;
      
      this.emitEvent('adapter:stopped', {
        adapterId: this._config.id,
        adapterType: this._config.type,
        uptime: Date.now() - this._startTime
      });
    } catch (error) {
      this._status = AdapterStatus.ERROR;
      this._stats.errorCount++;
      this.handleError(error as Error);
      throw error;
    }
  }

  async dispose(): Promise<void> {
    try {
      if (this._status === AdapterStatus.ACTIVE) {
        await this.stop();
      }
      
      await this.onDispose();
      this._status = AdapterStatus.DISPOSED;
      
      // Clear all event listeners
      this._eventListeners.clear();
      
      this.emitEvent('adapter:disposed', {
        adapterId: this._config.id,
        adapterType: this._config.type
      });
    } catch (error) {
      this._status = AdapterStatus.ERROR;
      this._stats.errorCount++;
      this.handleError(error as Error);
      throw error;
    }
  }

  async collectMetrics(): Promise<MetricCollection> {
    if (this._status !== AdapterStatus.ACTIVE) {
      throw new Error(`Adapter ${this._config.id} is not active`);
    }

    const startTime = Date.now();
    
    try {
      const metrics = await this.doCollectMetrics();
      const collection: MetricCollection = {
        id: `${this._config.id}_${Date.now()}`,
        name: `${this._config.name} Collection`,
        component: this._config.id,
        metrics,
        timestamp: Date.now(),
        metadata: {
          adapterId: this._config.id,
          adapterType: this._config.type,
          collectionDuration: Date.now() - startTime
        }
      };

      this._stats.totalMetrics += metrics.length;
      this._stats.collectionCount++;
      this._stats.lastCollection = Date.now();
      this._stats.averageCollectionTime = this.updateAverage(
        this._stats.averageCollectionTime,
        Date.now() - startTime,
        this._stats.collectionCount
      );

      this.emitEvent('metrics:collected', {
        adapterId: this._config.id,
        collection,
        duration: Date.now() - startTime
      });

      return collection;
    } catch (error) {
      this._stats.errorCount++;
      this.handleError(error as Error);
      throw error;
    }
  }

  async getHealth(): Promise<ComponentHealth> {
    try {
      const health = await this.doGetHealth();
      
      this.emitEvent('health:updated', {
        adapterId: this._config.id,
        health
      });
      
      return health;
    } catch (error) {
      this._stats.errorCount++;
      this.handleError(error as Error);
      
      return {
        status: HealthStatus.UNHEALTHY,
        score: 0,
        checks: [{
          id: 'adapter_error',
          name: 'Adapter Error Check',
          status: HealthStatus.UNHEALTHY,
          duration: 0,
          metadata: { error: (error as Error).message }
        }],
        lastChecked: Date.now()
      };
    }
  }

  async getStats(): Promise<AdapterStats> {
    return {
      ...this._stats,
      uptime: this._startTime > 0 ? Date.now() - this._startTime : 0
    };
  }

  on(event: string, listener: (data: unknown) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: unknown) => void): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: unknown): void {
    this.emitEvent(event, data);
  }

  protected emitEvent(event: string, data: unknown): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }

    // Also emit to 'all' listeners
    const allListeners = this._eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener({ event, data });
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }
  }

  protected handleError(error: Error): void {
    this._stats.errorCount++;
    
    this.emitEvent('adapter:error', {
      adapterId: this._config.id,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });

    // Log error if logger is available
    if (console && console.error) {
      console.error(`[Adapter:${this._config.id}] Error:`, error);
    }
  }

  protected updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  protected initializeStats(): AdapterStats {
    return {
      adapterId: this._config.id,
      totalMetrics: 0,
      collectionCount: 0,
      lastCollection: 0,
      averageCollectionTime: 0,
      errorCount: 0,
      uptime: 0,
      memoryUsage: {
        used: 0,
        allocated: 0,
        peak: 0
      }
    };
  }

  protected createMetric(
    name: string,
    type: 'counter' | 'gauge' | 'histogram' | 'timer' | 'rate',
    value: number,
    tags?: Record<string, string>
  ): Metric {
    const timestamp = Date.now();
    const baseMetric = {
      id: `${this._config.id}_${name}_${timestamp}`,
      name,
      timestamp,
      component: this._config.id,
      tags: {
        adapter: this._config.id,
        adapterType: this._config.type,
        ...this._config.tags,
        ...tags
      }
    };

    switch (type) {
      case 'counter':
        return {
          ...baseMetric,
          type: MetricType.COUNTER,
          value
        };
      case 'gauge':
        return {
          ...baseMetric,
          type: MetricType.GAUGE,
          value
        };
      case 'histogram':
        return {
          ...baseMetric,
          type: MetricType.HISTOGRAM,
          buckets: [],
          count: 1,
          sum: value
        };
      case 'timer':
        return {
          ...baseMetric,
          type: MetricType.TIMER,
          duration: value,
          startTime: timestamp - value,
          endTime: timestamp,
          success: true
        };
      case 'rate':
        return {
          ...baseMetric,
          type: MetricType.RATE,
          count: 1,
          window: 1000,
          rate: value
        };
      default:
        throw new Error(`Unsupported metric type: ${type}`);
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onDispose(): Promise<void>;
  protected abstract doCollectMetrics(): Promise<Metric[]>;
  protected abstract doGetHealth(): Promise<ComponentHealth>;
}

/**
 * Simple adapter implementation for testing
 */
export class SimpleAdapter extends BasePerformanceAdapter {
  protected async onInitialize(): Promise<void> {
    // Simple implementation - no initialization needed
  }

  protected async onStart(): Promise<void> {
    // Simple implementation - no startup logic
  }

  protected async onStop(): Promise<void> {
    // Simple implementation - no shutdown logic
  }

  protected async onDispose(): Promise<void> {
    // Simple implementation - no disposal logic
  }

  protected async doCollectMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    // Add basic health metric
    metrics.push(
      this.createMetric('adapter.health', 'gauge', 1, { status: 'healthy' })
    );
    
    // Add uptime metric
    if (this._startTime > 0) {
      metrics.push(
        this.createMetric('adapter.uptime', 'gauge', Date.now() - this._startTime)
      );
    }
    
    // Add collection count metric
    metrics.push(
      this.createMetric('adapter.collections', 'counter', this._stats.collectionCount)
    );
    
    return metrics;
  }

  protected async doGetHealth(): Promise<ComponentHealth> {
    return {
      status: this._status === AdapterStatus.ACTIVE ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      score: this._status === AdapterStatus.ACTIVE ? 100 : 0,
      checks: [{
        id: 'adapter_status',
        name: 'Adapter Status Check',
        status: this._status === AdapterStatus.ACTIVE ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        duration: 0,
        metadata: {
          adapterStatus: this._status,
          uptime: this._startTime > 0 ? Date.now() - this._startTime : 0,
          collections: this._stats.collectionCount,
          errors: this._stats.errorCount
        }
      }],
      lastChecked: Date.now()
    };
  }
}

/**
 * Memory adapter implementation
 */
export class MemoryAdapter extends BasePerformanceAdapter {
  private _memoryData: Map<string, unknown> = new Map();

  protected async onInitialize(): Promise<void> {
    // Initialize memory storage
    this._memoryData.clear();
  }

  protected async onStart(): Promise<void> {
    // Start memory monitoring
  }

  protected async onStop(): Promise<void> {
    // Stop memory monitoring
  }

  protected async onDispose(): Promise<void> {
    // Clear memory data
    this._memoryData.clear();
  }

  protected async doCollectMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    // Collect memory usage metrics
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      
      metrics.push(
        this.createMetric('memory.heap.used', 'gauge', memUsage.heapUsed),
        this.createMetric('memory.heap.total', 'gauge', memUsage.heapTotal),
        this.createMetric('memory.heap.usage_ratio', 'gauge', memUsage.heapUsed / memUsage.heapTotal),
        this.createMetric('memory.external', 'gauge', memUsage.external),
        this.createMetric('memory.rss', 'gauge', memUsage.rss)
      );
      
      // Update internal memory tracking
      this._stats.memoryUsage.used = memUsage.heapUsed;
      this._stats.memoryUsage.allocated = memUsage.heapTotal;
      this._stats.memoryUsage.peak = Math.max(this._stats.memoryUsage.peak, memUsage.heapUsed);
    }
    
    // Add adapter-specific metrics
    metrics.push(
      this.createMetric('adapter.memory.entries', 'gauge', this._memoryData.size),
      this.createMetric('adapter.health', 'gauge', 1, { status: 'healthy' })
    );
    
    return metrics;
  }

  protected async doGetHealth(): Promise<ComponentHealth> {
    const memUsage = typeof process !== 'undefined' ? process.memoryUsage() : null;
    const healthScore = this._status === AdapterStatus.ACTIVE ? 100 : 0;
    
    return {
      status: this._status === AdapterStatus.ACTIVE ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      score: healthScore,
      checks: [{
        id: 'adapter_status',
        name: 'Adapter Status Check',
        status: this._status === AdapterStatus.ACTIVE ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        duration: 0,
        metadata: {
          adapterStatus: this._status,
          uptime: this._startTime > 0 ? Date.now() - this._startTime : 0,
          memoryEntries: this._memoryData.size,
          heapUsed: memUsage?.heapUsed || 0,
          heapTotal: memUsage?.heapTotal || 0,
          collections: this._stats.collectionCount,
          errors: this._stats.errorCount
        }
      }],
      lastChecked: Date.now()
    };
  }

  // Memory-specific methods
  setData(key: string, value: unknown): void {
    this._memoryData.set(key, value);
  }

  getData(key: string): unknown {
    return this._memoryData.get(key);
  }

  deleteData(key: string): boolean {
    return this._memoryData.delete(key);
  }

  clearData(): void {
    this._memoryData.clear();
  }

  getDataSize(): number {
    return this._memoryData.size;
  }
}