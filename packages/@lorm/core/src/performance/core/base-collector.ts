/**
 * Base Collector - Base implementation for performance collectors
 */

import type {
  PerformanceCollector,
  MonitorableComponent,
  Metric,
  MetricCollection
} from '../types/index.js';
import type { CollectorConfig } from '../types/monitoring.js';
import { MetricType } from '../types/index.js';

/**
 * Extended collector configuration
 */
export interface ExtendedCollectorConfig {
  /** Collector identifier */
  id: string;
  /** Collector name */
  name: string;
  /** Whether collector is enabled */
  enabled: boolean;
  /** Supported component types */
  supportedTypes?: string[];
  /** Collection interval (ms) */
  interval?: number;
  /** Timeout for collection (ms) */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
  /** Collector-specific settings */
  settings?: Record<string, unknown>;
}

/**
 * Collector status enumeration
 */
export enum CollectorStatus {
  IDLE = 'idle',
  COLLECTING = 'collecting',
  ERROR = 'error'
}

/**
 * Base performance collector implementation
 */
export abstract class BasePerformanceCollector implements PerformanceCollector {
  protected _config: ExtendedCollectorConfig;
  protected _status: CollectorStatus = CollectorStatus.IDLE;
  protected _stats: CollectorStats;
  protected _eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

  constructor(config: ExtendedCollectorConfig) {
    this._config = { ...config };
    this._stats = this.initializeStats();
  }

  get id(): string {
    return this._config.id;
  }

  get name(): string {
    return this._config.name;
  }

  get config(): ExtendedCollectorConfig {
    return { ...this._config };
  }

  get status(): string {
    return this._status;
  }

  get isCollecting(): boolean {
    return this._status === CollectorStatus.COLLECTING;
  }

  // PerformanceCollector interface implementation
  get collectorId(): string {
    return this._config.id;
  }

  get collectorName(): string {
    return this._config.name;
  }

  get supportedComponents(): string[] {
    return this._config.supportedTypes || [];
  }

  canHandle(component: MonitorableComponent): boolean {
    return this.canCollect(component);
  }

  getConfig(): CollectorConfig {
    return {
      enabled: this._config.enabled,
      interval: this._config.interval || 5000,
      timeout: this._config.timeout || 30000,
      retry: this._config.retry || { maxAttempts: 3, backoffMs: 1000 },
      settings: this._config.settings || {}
    };
  }

  async collect(component: MonitorableComponent): Promise<MetricCollection> {
    if (this._status === CollectorStatus.COLLECTING) {
      throw new Error(`Collector ${this.id} is already collecting`);
    }

    const startTime = Date.now();
    this._status = CollectorStatus.COLLECTING;

    try {
      const metrics = await this.doCollect(component);
      const collection: MetricCollection = {
        id: `${this.id}_${component.componentId}_${Date.now()}`,
        name: `${this.name} Collection`,
        component: component.componentId,
        timestamp: Date.now(),
        metrics,
        metadata: {
          collectorId: this.id,
          collectorName: this.name,
          componentName: component.componentName,
          collectionDuration: Date.now() - startTime
        }
      };

      this._stats.totalCollections++;
      this._stats.totalMetrics += metrics.length;
      this._stats.lastCollection = Date.now();
      this._stats.averageCollectionTime = this.updateAverage(
        this._stats.averageCollectionTime,
        Date.now() - startTime,
        this._stats.totalCollections
      );

      this._status = CollectorStatus.IDLE;
      this.emitEvent('collection:completed', {
        collectorId: this.id,
        componentId: component.componentId,
        metricsCount: metrics.length,
        duration: Date.now() - startTime
      });

      return collection;
    } catch (error) {
      this._status = CollectorStatus.ERROR;
      this._stats.errors++;
      
      this.emitEvent('collection:error', {
        collectorId: this.id,
        componentId: component.componentId,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack
        }
      });

      throw error;
    } finally {
      if (this._status === CollectorStatus.COLLECTING) {
        this._status = CollectorStatus.IDLE;
      }
    }
  }

  canCollect(component: MonitorableComponent): boolean {
    // Check if collector supports this component type
    if (this._config.supportedTypes && this._config.supportedTypes.length > 0) {
      // For now, accept all components since we don't have a type property
      return true;
    }
    
    // Default implementation - can collect from any component
    return true;
  }

  getStats(): CollectorStats {
    return { ...this._stats };
  }

  updateConfig(config: Partial<ExtendedCollectorConfig>): void {
    const oldConfig = { ...this._config };
    this._config = { ...this._config, ...config };
    
    this.emitEvent('config:updated', {
      collectorId: this.id,
      oldConfig,
      newConfig: this._config
    });
    
    this.onConfigUpdate(oldConfig, this._config);
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

  protected emitEvent(event: string, data: unknown): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[Collector:${this.id}] Event listener error:`, error);
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
          console.error(`[Collector:${this.id}] Event listener error:`, error);
        }
      });
    }
  }

  protected updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  protected initializeStats(): CollectorStats {
    return {
      totalCollections: 0,
      totalMetrics: 0,
      errors: 0,
      lastCollection: 0,
      averageCollectionTime: 0
    };
  }

  protected createMetric(
    name: string,
    type: MetricType,
    value: number,
    component: MonitorableComponent,
    tags?: Record<string, string>
  ): Metric {
    const timestamp = Date.now();
    const baseMetric = {
      id: `${component.componentId}_${name}_${timestamp}`,
      name,
      value,
      timestamp,
      component: component.componentId,
      tags: {
        component: component.componentId,
        componentName: component.componentName,
        collector: this.id,
        ...tags
      }
    };

    switch (type) {
      case MetricType.COUNTER:
        return { ...baseMetric, type: MetricType.COUNTER, value };
      case MetricType.GAUGE:
        return { ...baseMetric, type: MetricType.GAUGE, value };
      case MetricType.HISTOGRAM:
        return { 
          ...baseMetric, 
          type: MetricType.HISTOGRAM, 
          buckets: [], 
          count: 1, 
          sum: value 
        };
      case MetricType.TIMER:
        return { 
          ...baseMetric, 
          type: MetricType.TIMER, 
          duration: value, 
          startTime: timestamp - value, 
          endTime: timestamp, 
          success: true 
        };
      case MetricType.RATE:
        return { 
          ...baseMetric, 
          type: MetricType.RATE, 
          count: 1, 
          window: 1000, 
          rate: value 
        };
      default:
        return { ...baseMetric, type: MetricType.GAUGE, value };
    }
  }

  protected createCounterMetric(
    name: string,
    value: number,
    component: MonitorableComponent,
    tags?: Record<string, string>
  ): Metric {
    return this.createMetric(name, MetricType.COUNTER, value, component, tags);
  }

  protected createGaugeMetric(
    name: string,
    value: number,
    component: MonitorableComponent,
    tags?: Record<string, string>
  ): Metric {
    return this.createMetric(name, MetricType.GAUGE, value, component, tags);
  }

  protected createHistogramMetric(
    name: string,
    value: number,
    component: MonitorableComponent,
    tags?: Record<string, string>
  ): Metric {
    return this.createMetric(name, MetricType.HISTOGRAM, value, component, tags);
  }

  protected createTimerMetric(
    name: string,
    value: number,
    component: MonitorableComponent,
    tags?: Record<string, string>
  ): Metric {
    return this.createMetric(name, MetricType.TIMER, value, component, tags);
  }

  protected createRateMetric(
    name: string,
    value: number,
    component: MonitorableComponent,
    tags?: Record<string, string>
  ): Metric {
    return this.createMetric(name, MetricType.RATE, value, component, tags);
  }

  // Abstract method to be implemented by subclasses
  protected abstract doCollect(component: MonitorableComponent): Promise<Metric[]>;
  
  // Optional hook method
  protected onConfigUpdate(oldConfig: ExtendedCollectorConfig, newConfig: ExtendedCollectorConfig): void {
    // Default implementation does nothing
    // Subclasses can override to handle config updates
  }
}

/**
 * Collector statistics interface
 */
export interface CollectorStats {
  /** Total collections performed */
  totalCollections: number;
  /** Total metrics collected */
  totalMetrics: number;
  /** Collection errors */
  errors: number;
  /** Last collection timestamp */
  lastCollection: number;
  /** Average collection time */
  averageCollectionTime: number;
}

/**
 * Basic system collector implementation
 */
export class BasicSystemCollector extends BasePerformanceCollector {
  constructor(config?: Partial<ExtendedCollectorConfig>) {
    super({
      id: 'basic-system',
      name: 'Basic System Collector',
      enabled: true,
      supportedTypes: ['system', 'process'],
      ...config
    });
  }

  protected async doCollect(component: MonitorableComponent): Promise<Metric[]> {
    const metrics: Metric[] = [];
    const timestamp = Date.now();

    // Collect basic system metrics
    if (typeof process !== 'undefined') {
      // Memory usage
      const memUsage = process.memoryUsage();
      metrics.push(
        this.createGaugeMetric('system.memory.used', memUsage.heapUsed, component),
        this.createGaugeMetric('system.memory.total', memUsage.heapTotal, component),
        this.createGaugeMetric('system.memory.external', memUsage.external, component)
      );

      // CPU usage (basic)
      const cpuUsage = process.cpuUsage();
      metrics.push(
        this.createGaugeMetric('system.cpu.user', cpuUsage.user, component),
        this.createGaugeMetric('system.cpu.system', cpuUsage.system, component)
      );

      // Uptime
      metrics.push(
        this.createGaugeMetric('system.uptime', process.uptime() * 1000, component)
      );
    }

    // Component uptime metric (using current timestamp as baseline)
    metrics.push(
      this.createGaugeMetric('component.uptime', timestamp, component)
    );

    // Health metric
    metrics.push(
      this.createGaugeMetric('component.health', 1, component, { status: 'healthy' })
    );

    return metrics;
  }
}

/**
 * Memory collector implementation
 */
export class MemoryCollector extends BasePerformanceCollector {
  constructor(config?: Partial<ExtendedCollectorConfig>) {
    super({
      id: 'memory',
      name: 'Memory Collector',
      enabled: true,
      supportedTypes: ['cache', 'storage', 'database'],
      ...config
    });
  }

  protected async doCollect(component: MonitorableComponent): Promise<Metric[]> {
    const metrics: Metric[] = [];

    // Collect memory-related metrics
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      
      metrics.push(
        this.createGaugeMetric('memory.heap.used', memUsage.heapUsed, component),
        this.createGaugeMetric('memory.heap.total', memUsage.heapTotal, component),
        this.createGaugeMetric('memory.heap.usage_ratio', memUsage.heapUsed / memUsage.heapTotal, component),
        this.createGaugeMetric('memory.external', memUsage.external, component),
        this.createGaugeMetric('memory.rss', memUsage.rss, component)
      );

      // Array buffers if available
      if ('arrayBuffers' in memUsage) {
        metrics.push(
          this.createGaugeMetric('memory.array_buffers', (memUsage as any).arrayBuffers, component)
        );
      }
    }

    return metrics;
  }
}

/**
 * Performance timing collector implementation
 */
export class PerformanceTimingCollector extends BasePerformanceCollector {
  private _performanceObserver?: PerformanceObserver;
  private _performanceEntries: PerformanceEntry[] = [];

  constructor(config?: Partial<ExtendedCollectorConfig>) {
    super({
      id: 'performance-timing',
      name: 'Performance Timing Collector',
      enabled: true,
      supportedTypes: ['http', 'websocket', 'compute'],
      ...config
    });

    this.initializePerformanceObserver();
  }

  private initializePerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this._performanceObserver = new PerformanceObserver((list) => {
        this._performanceEntries.push(...list.getEntries());
        // Keep only recent entries (last 100)
        if (this._performanceEntries.length > 100) {
          this._performanceEntries = this._performanceEntries.slice(-100);
        }
      });

      try {
        this._performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        // Performance observer not supported or failed to start
        console.warn('Performance observer not available:', error);
      }
    }
  }

  protected async doCollect(component: MonitorableComponent): Promise<Metric[]> {
    const metrics: Metric[] = [];

    // Collect performance timing metrics
    if (typeof performance !== 'undefined') {
      // Navigation timing
      if ('navigation' in performance && performance.navigation) {
        const navigation = performance.navigation as any;
        metrics.push(
          this.createCounterMetric('performance.navigation.redirects', navigation.redirectCount || 0, component),
          this.createGaugeMetric('performance.navigation.type', navigation.type || 0, component)
        );
      }

      // Timing metrics
      if ('timing' in performance && performance.timing) {
        const timing = performance.timing as any;
        const navigationStart = timing.navigationStart || 0;
        
        if (timing.loadEventEnd && navigationStart) {
          metrics.push(
            this.createTimerMetric('performance.page.load_time', timing.loadEventEnd - navigationStart, component),
            this.createTimerMetric('performance.page.dom_ready', timing.domContentLoadedEventEnd - navigationStart, component)
          );
        }
      }

      // Memory info (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metrics.push(
          this.createGaugeMetric('performance.memory.used', memory.usedJSHeapSize, component),
          this.createGaugeMetric('performance.memory.total', memory.totalJSHeapSize, component),
          this.createGaugeMetric('performance.memory.limit', memory.jsHeapSizeLimit, component)
        );
      }
    }

    // Process recent performance entries
    const recentEntries = this._performanceEntries.filter(
      entry => Date.now() - entry.startTime < 60000 // Last minute
    );

    for (const entry of recentEntries) {
      metrics.push(
        this.createTimerMetric(
          `performance.${entry.entryType}.${entry.name}`,
          entry.duration,
          component,
          { entryType: entry.entryType }
        )
      );
    }

    return metrics;
  }

  dispose(): void {
    if (this._performanceObserver) {
      this._performanceObserver.disconnect();
      this._performanceObserver = undefined;
    }
    this._performanceEntries = [];
  }
}