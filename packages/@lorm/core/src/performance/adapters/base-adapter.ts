/**
 * Base Adapter - Foundation for all performance adapters
 */

import type {
  PerformanceAdapter,
  AdapterConfig,
  BaseAdapterConfig,
  AdapterStats,
  ComponentHealth,
  Metric,
  AdapterEvent
} from '../types/index.js';
import { MetricType, AdapterStatus, AdapterEventType, AdapterType } from '../types/index.js';
import { BasePerformanceAdapter } from '../core/base-adapter.js';

/**
 * Enhanced base adapter with additional functionality
 */
export abstract class EnhancedBaseAdapter extends BasePerformanceAdapter {
  protected _eventHandlers: Map<AdapterEventType, ((event: AdapterEvent) => void)[]> = new Map();
  protected _middleware: AdapterMiddleware[] = [];
  protected _metricsBuffer: Metric[] = [];
  protected _bufferSize = 100;
  protected _flushInterval = 5000; // 5 seconds
  protected _flushTimer?: NodeJS.Timeout;
  protected _lastFlush = 0;

  constructor(config: BaseAdapterConfig) {
    // Convert BaseAdapterConfig to AdapterConfig for parent class
    const adapterConfig = {
      ...config,
      type: config.type || AdapterType.CUSTOM
    } as AdapterConfig;
    super(adapterConfig);
  }

  getId(): string {
    return this._config.id;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Start metrics buffering
    this.startMetricsBuffering();
    
    this.emitEvent(AdapterEventType.ADAPTER_STARTED, {
      adapterType: this.type,
      config: this._config
    });
  }

  async start(): Promise<void> {
    await super.start();
    
    this.emitEvent(AdapterEventType.ADAPTER_STARTED, {
      adapterType: this.type,
      startTime: Date.now()
    });
  }

  async stop(): Promise<void> {
    this.stopMetricsBuffering();
    await this.flushMetrics();
    
    await super.stop();
    
    this.emitEvent(AdapterEventType.ADAPTER_STOPPED, {
      adapterType: this.type,
      stopTime: Date.now()
    });
  }

  async dispose(): Promise<void> {
    this._eventHandlers.clear();
    this._middleware = [];
    this._metricsBuffer = [];
    
    await super.dispose();
    
    this.emitEvent(AdapterEventType.ADAPTER_STOPPED, {
      adapterType: this.type
    });
  }

  // Event handling
  on(eventType: AdapterEventType, handler: (event: AdapterEvent) => void): void {
    if (!this._eventHandlers.has(eventType)) {
      this._eventHandlers.set(eventType, []);
    }
    this._eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: AdapterEventType, handler: (event: AdapterEvent) => void): void {
    const handlers = this._eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  protected emitEvent(type: AdapterEventType, data?: any): void {
    const event: AdapterEvent = {
      type: type as any, // Map AdapterEventType to PerformanceEventType
      timestamp: Date.now(),
      payload: {
        adapterId: this.getId(),
        adapterType: this.type,
        ...data
      }
    };

    const handlers = this._eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[${this.getId()}] Event handler error:`, error);
        }
      });
    }
  }

  // Middleware support
  use(middleware: AdapterMiddleware): void {
    this._middleware.push(middleware);
    this._middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  protected async applyMiddleware(context: MiddlewareContext): Promise<MiddlewareContext> {
    let currentContext = context;
    
    for (const middleware of this._middleware) {
      try {
        if (middleware.shouldApply && !middleware.shouldApply(currentContext)) {
          continue;
        }
        
        currentContext = await middleware.apply(currentContext);
      } catch (error) {
        console.error(`[${this.getId()}] Middleware error:`, error);
        if (middleware.onError) {
          currentContext = await middleware.onError(error as Error, currentContext);
        }
      }
    }
    
    return currentContext;
  }

  // Enhanced metrics collection with buffering
  protected async recordMetric(metric: Metric): Promise<void> {
    // Apply middleware to metric
    const context = await this.applyMiddleware({
      type: 'metric',
      data: metric,
      adapter: this as unknown as PerformanceAdapter
    });
    
    const processedMetric = context.data as Metric;
    
    // Add to buffer
    this._metricsBuffer.push(processedMetric);
    
    // Flush if buffer is full
    if (this._metricsBuffer.length >= this._bufferSize) {
      await this.flushMetrics();
    }
  }

  protected async recordMetrics(metrics: Metric[]): Promise<void> {
    for (const metric of metrics) {
      await this.recordMetric(metric);
    }
  }

  private startMetricsBuffering(): void {
    this._flushTimer = setInterval(() => {
      this.flushMetrics().catch(error => {
        console.error(`[${this.getId()}] Metrics flush error:`, error);
      });
    }, this._flushInterval);
  }

  private stopMetricsBuffering(): void {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = undefined;
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this._metricsBuffer.length === 0) {
      return;
    }

    const metricsToFlush = this._metricsBuffer.splice(0);
    this._lastFlush = Date.now();
    
    try {
      // In a real implementation, this would send metrics to the performance system
      this.emitEvent(AdapterEventType.METRICS_FLUSHED, {
        count: metricsToFlush.length,
        timestamp: this._lastFlush
      });
    } catch (error) {
      // Re-add metrics to buffer for retry
      this._metricsBuffer.unshift(...metricsToFlush);
      throw error;
    }
  }

  // Enhanced stats with additional information
  async getStats(): Promise<AdapterStats> {
    const baseStats = await super.getStats();
    
    return {
      ...baseStats
    };
  }

  // Configuration update with validation
  async updateConfig(config: BaseAdapterConfig): Promise<void> {
    const oldConfig = { ...this._config };
    
    // Validate configuration
    await this.validateConfig(config);
    
    // Update configuration - convert BaseAdapterConfig to AdapterConfig
    const adapterConfig = {
      ...this._config,
      ...config,
      type: config.type || this._config.type
    } as AdapterConfig;
    this._config = adapterConfig;
    
    // Apply configuration changes
    await this.applyConfigChanges(oldConfig, this._config);
    
    this.emitEvent(AdapterEventType.CONFIG_UPDATED, {
      oldConfig,
      newConfig: this._config
    });
  }

  protected async validateConfig(config: BaseAdapterConfig): Promise<void> {
    // Override in subclasses for specific validation
  }

  protected async applyConfigChanges(
    oldConfig: BaseAdapterConfig,
    newConfig: BaseAdapterConfig
  ): Promise<void> {
    // Update buffer size if changed
    if (newConfig.config?.bufferSize && newConfig.config?.bufferSize !== oldConfig.config?.bufferSize) {
      this._bufferSize = newConfig.config.bufferSize as number;
    }
    
    // Update flush interval if changed
    if (newConfig.config?.flushInterval && newConfig.config?.flushInterval !== oldConfig.config?.flushInterval) {
      this._flushInterval = newConfig.config.flushInterval as number;
      
      // Restart buffering with new interval
      if (this._status === AdapterStatus.ACTIVE) {
        this.stopMetricsBuffering();
        this.startMetricsBuffering();
      }
    }
  }

  // Health check with detailed information
  async getHealth(): Promise<ComponentHealth> {
    const baseHealth = await super.getHealth();
    
    // Add adapter-specific health checks
    const additionalChecks = await this.performAdapterHealthChecks();
    
    return {
      ...baseHealth,
      metadata: {
        ...baseHealth.metadata,
        bufferHealth: {
          size: this._metricsBuffer.length,
          maxSize: this._bufferSize,
          utilizationPercent: (this._metricsBuffer.length / this._bufferSize) * 100
        },
        lastFlush: this._lastFlush,
        ...additionalChecks
      }
    };
  }

  protected async performAdapterHealthChecks(): Promise<Record<string, any>> {
    // Override in subclasses for specific health checks
    return {};
  }

  // Utility methods
  protected createMetric(
    name: string,
    type: 'counter' | 'gauge' | 'histogram' | 'timer' | 'rate' = 'gauge',
    value: number,
    tags?: Record<string, string>
  ): Metric {
    return {
      id: `${this._config.id}-${name}-${Date.now()}`,
      name,
      type,
      value,
      timestamp: Date.now(),
      component: this._config.id,
      tags: {
        adapter: this._config.id,
        adapterType: this.type,
        ...tags
      }
    } as Metric;
  }

  protected createTimerMetric(name: string, startTime: number, endTime: number = Date.now(), success: boolean = true, tags?: Record<string, string>): Metric {
    return {
      id: `${this._config.id}-${name}-${Date.now()}`,
      name,
      type: 'timer',
      timestamp: Date.now(),
      component: this._config.id,
      duration: endTime - startTime,
      startTime,
      endTime,
      success,
      tags: {
        adapter: this._config.id,
        adapterType: this.type,
        ...tags
      }
    } as Metric;
  }

  protected createCounterMetric(name: string, increment = 1, tags?: Record<string, string>): Metric {
    return this.createMetric(
      name,
      'counter',
      increment,
      tags
    );
  }

  protected createHistogramMetric(
    name: string,
    buckets: { upperBound: number; count: number }[],
    count: number,
    sum: number,
    tags?: Record<string, string>
  ): Metric {
    return {
      id: `${this._config.id}-${name}-${Date.now()}`,
      name,
      type: 'histogram',
      timestamp: Date.now(),
      component: this._config.id,
      buckets,
      count,
      sum,
      tags: {
        adapter: this._config.id,
        adapterType: this.type,
        ...tags
      }
    } as Metric;
  }
}

// Middleware interfaces
export interface AdapterMiddleware {
  name: string;
  priority?: number;
  shouldApply?(context: MiddlewareContext): boolean;
  apply(context: MiddlewareContext): Promise<MiddlewareContext>;
  onError?(error: Error, context: MiddlewareContext): Promise<MiddlewareContext>;
}

export interface MiddlewareContext {
  type: 'metric' | 'event' | 'health' | 'config';
  data: any;
  adapter: PerformanceAdapter;
  metadata?: Record<string, any>;
}

// Common middleware implementations
export class TagEnrichmentMiddleware implements AdapterMiddleware {
  name = 'tag-enrichment';
  priority = 100;
  
  constructor(private additionalTags: Record<string, string>) {}

  async apply(context: MiddlewareContext): Promise<MiddlewareContext> {
    if (context.type === 'metric') {
      const metric = context.data as Metric;
      metric.tags = {
        ...metric.tags,
        ...this.additionalTags
      };
    }
    
    return context;
  }
}

export class MetricFilterMiddleware implements AdapterMiddleware {
  name = 'metric-filter';
  priority = 200;
  
  constructor(private filter: (metric: Metric) => boolean) {}

  shouldApply(context: MiddlewareContext): boolean {
    return context.type === 'metric';
  }

  async apply(context: MiddlewareContext): Promise<MiddlewareContext> {
    const metric = context.data as Metric;
    
    if (!this.filter(metric)) {
      // Mark metric as filtered out
      context.metadata = {
        ...context.metadata,
        filtered: true
      };
    }
    
    return context;
  }
}

export class MetricTransformMiddleware implements AdapterMiddleware {
  name = 'metric-transform';
  priority = 50;
  
  constructor(private transformer: (metric: Metric) => Metric) {}

  shouldApply(context: MiddlewareContext): boolean {
    return context.type === 'metric';
  }

  async apply(context: MiddlewareContext): Promise<MiddlewareContext> {
    const metric = context.data as Metric;
    context.data = this.transformer(metric);
    return context;
  }
}