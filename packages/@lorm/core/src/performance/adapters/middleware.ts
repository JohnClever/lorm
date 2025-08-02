/**
 * Adapter Middleware - Provides extensible middleware functionality for performance adapters
 */

import type {
  AdapterMiddleware,
  MiddlewareAdapter,
  Metric,
  PerformanceAdapter,
  BaseAdapterConfig,
  AdapterType,
  AdapterStatus
} from '../types/index.js';
import { EventEmitter } from 'events';

// MiddlewareContext is imported from types/index.js

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Metric enricher function
 */
export type MetricEnricher = (metric: Metric, context: { adapterId: string; adapterType: string; [key: string]: any }) => Promise<void>;

/**
 * Cache entry interface
 */
export interface CacheEntry {
  value: any;
  expiresAt: number;
}

/**
 * Extended middleware interface with additional properties
 */
export interface ExtendedAdapterMiddleware extends AdapterMiddleware {
  /** Middleware priority (higher = executed first) */
  priority?: number;
  /** Initialize middleware */
  initialize?(config?: any): Promise<void>;
  /** Dispose middleware */
  dispose?(): Promise<void>;
  /** Check if middleware is enabled */
  isEnabled?(): boolean;
  /** Enable middleware */
  enable?(): void;
  /** Disable middleware */
  disable?(): void;
}

/**
 * Base middleware implementation
 */
export abstract class BaseMiddleware implements ExtendedAdapterMiddleware {
  public name: string;
  public priority: number;
  private _enabled = true;

  constructor(name: string, priority = 0) {
    this.name = name;
    this.priority = priority;
  }

  getName(): string {
    return this.name;
  }

  getPriority(): number {
    return this.priority;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  enable(): void {
    this._enabled = true;
  }

  disable(): void {
    this._enabled = false;
  }

  async beforeCollect(adapter: PerformanceAdapter): Promise<void> {
    // Default implementation - do nothing
  }

  async afterCollect(adapter: PerformanceAdapter, metrics: any): Promise<any> {
    // Default implementation - return metrics unchanged
    return metrics;
  }

  async onError(adapter: PerformanceAdapter, error: Error): Promise<void> {
    // Default implementation - do nothing
  }

  async initialize(config?: any): Promise<void> {
    // Default implementation - do nothing
  }

  async dispose(): Promise<void> {
    // Default implementation - do nothing
  }
}

/**
 * Logging middleware - Logs adapter operations
 */
export class LoggingMiddleware extends BaseMiddleware {
  private _logger: Logger;
  private _logLevel: LogLevel;

  constructor(logger?: Logger, logLevel: LogLevel = 'info') {
    super('logging', 10);
    this._logger = logger || console;
    this._logLevel = logLevel;
  }

  async beforeCollect(adapter: PerformanceAdapter): Promise<void> {
    this.log('debug', `[${adapter.getId()}] Starting metrics collection`);
  }

  async afterCollect(adapter: PerformanceAdapter, metrics: any): Promise<any> {
    this.log('info', `[${adapter.getId()}] Completed metrics collection with ${Array.isArray(metrics?.metrics) ? metrics.metrics.length : 0} metrics`);
    return metrics;
  }

  async onError(adapter: PerformanceAdapter, error: Error): Promise<void> {
    this.log('error', `[${adapter.getId()}] Adapter error:`, error);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.shouldLog(level)) {
      if (data) {
        this._logger[level](message, data);
      } else {
        this._logger[level](message);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this._logLevel];
  }
}

/**
 * Metrics enrichment middleware - Adds additional tags and metadata to metrics
 */
export class MetricsEnrichmentMiddleware extends BaseMiddleware {
  private _globalTags: Record<string, string>;
  private _enrichers: MetricEnricher[];

  constructor(globalTags: Record<string, string> = {}) {
    super('metrics-enrichment', 20);
    this._globalTags = globalTags;
    this._enrichers = [];
  }

  addEnricher(enricher: MetricEnricher): void {
    this._enrichers.push(enricher);
  }

  removeEnricher(enricher: MetricEnricher): void {
    const index = this._enrichers.indexOf(enricher);
    if (index > -1) {
      this._enrichers.splice(index, 1);
    }
  }

  async afterCollect(adapter: PerformanceAdapter, metrics: any): Promise<any> {
    if (metrics?.metrics && Array.isArray(metrics.metrics)) {
      for (const metric of metrics.metrics) {
        await this.enrichMetric(metric, adapter);
      }
    }
    return metrics;
  }

  private async enrichMetric(metric: Metric, adapter: PerformanceAdapter): Promise<void> {
    // Add global tags
    metric.tags = { ...metric.tags, ...this._globalTags };

    // Add adapter-specific tags
    metric.tags.adapter_id = adapter.getId();
    metric.tags.adapter_type = adapter.getType();

    // Apply custom enrichers
    for (const enricher of this._enrichers) {
      try {
        await enricher(metric, { adapterId: adapter.getId(), adapterType: adapter.getType() } as any);
      } catch (error) {
        console.error(`[${this.getName()}] Error in metric enricher:`, error);
      }
    }
  }
}

/**
 * Rate limiting middleware - Controls the rate of operations
 */
export class RateLimitingMiddleware extends BaseMiddleware {
  private _maxOperationsPerSecond: number;
  private _operationCounts: Map<string, number[]> = new Map();
  private _cleanupInterval?: NodeJS.Timeout;

  constructor(maxOperationsPerSecond = 100) {
    super('rate-limiting', 5);
    this._maxOperationsPerSecond = maxOperationsPerSecond;
    this.startCleanup();
  }

  async beforeCollect(adapter: PerformanceAdapter): Promise<void> {
    const key = `${adapter.getId()}:collect`;

    if (await this.isRateLimited(key)) {
      throw new Error(`Rate limit exceeded for metrics collection on adapter ${adapter.getId()}`);
    }

    this.recordOperation(key);
  }

  async dispose(): Promise<void> {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = undefined;
    }
  }

  private async isRateLimited(key: string): Promise<boolean> {
    const now = Date.now();
    const operations = this._operationCounts.get(key) || [];
    
    // Count operations in the last second
    const recentOperations = operations.filter(timestamp => now - timestamp < 1000);
    
    return recentOperations.length >= this._maxOperationsPerSecond;
  }

  private recordOperation(key: string): void {
    const now = Date.now();
    const operations = this._operationCounts.get(key) || [];
    
    operations.push(now);
    this._operationCounts.set(key, operations);
  }

  private startCleanup(): void {
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [key, operations] of this._operationCounts) {
        const recentOperations = operations.filter(timestamp => now - timestamp < 5000);
        
        if (recentOperations.length === 0) {
          this._operationCounts.delete(key);
        } else {
          this._operationCounts.set(key, recentOperations);
        }
      }
    }, 5000);
  }
}

/**
 * Caching middleware - Caches operation results
 */
export class CachingMiddleware extends BaseMiddleware {
  private _cache: Map<string, CacheEntry> = new Map();
  private _ttl: number;
  private _maxSize: number;
  private _cleanupInterval?: NodeJS.Timeout;

  constructor(ttl = 60000, maxSize = 1000) {
    super('caching', 15);
    this._ttl = ttl;
    this._maxSize = maxSize;
    this.startCleanup();
  }

  async afterCollect(adapter: PerformanceAdapter, metrics: any): Promise<any> {
    const cacheKey = this.generateCacheKey(adapter.getId(), 'collect', metrics);
    
    // Cache the metrics result
    if (metrics !== undefined) {
      this.setInCache(cacheKey, metrics);
    }
    
    return metrics;
  }



  async dispose(): Promise<void> {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = undefined;
    }
    this._cache.clear();
  }

  private isCacheableOperation(operation: string): boolean {
    const cacheableOps = ['getMetrics', 'getStats', 'getHealth'];
    return cacheableOps.includes(operation);
  }

  private generateCacheKey(adapterId: string, operation: string, data?: any): string {
    const dataHash = data ? JSON.stringify(data) : '';
    return `${adapterId}:${operation}:${dataHash}`;
  }

  private getFromCache(key: string): CacheEntry | null {
    const entry = this._cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return null;
    }
    
    return entry;
  }

  private setInCache(key: string, value: any): void {
    // Evict oldest entries if cache is full
    if (this._cache.size >= this._maxSize) {
      const oldestKey = this._cache.keys().next().value;
      if (oldestKey !== undefined) {
        this._cache.delete(oldestKey);
      }
    }
    
    this._cache.set(key, {
      value,
      expiresAt: Date.now() + this._ttl
    });
  }

  private startCleanup(): void {
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this._cache) {
        if (now > entry.expiresAt) {
          this._cache.delete(key);
        }
      }
    }, this._ttl);
  }
}

/**
 * Error handling middleware - Provides error recovery and retry logic
 */
export class ErrorHandlingMiddleware extends BaseMiddleware {
  private _maxRetries: number;
  private _retryDelay: number;
  private _retryableErrors: Set<string>;

  constructor(maxRetries = 3, retryDelay = 1000) {
    super('error-handling', 1);
    this._maxRetries = maxRetries;
    this._retryDelay = retryDelay;
    this._retryableErrors = new Set([
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED'
    ]);
  }

  async onError(adapter: PerformanceAdapter, error: Error): Promise<void> {
    // Log the error for monitoring
    console.error(`[${adapter.getId()}] Error in adapter:`, error);
  }

  async beforeCollect(adapter: PerformanceAdapter): Promise<void> {
    // Prepare for potential retries
  }

  async afterCollect(adapter: PerformanceAdapter, metrics: any): Promise<any> {
    return metrics;
  }

  private isRetryableError(error: Error): boolean {
    return this._retryableErrors.has(error.message) || 
           this._retryableErrors.has((error as any).code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Middleware adapter - Wraps an adapter with middleware functionality
 */
export class MiddlewareAdapterWrapper extends EventEmitter implements MiddlewareAdapter {
  private _adapter: PerformanceAdapter;
  private _middlewares: ExtendedAdapterMiddleware[] = [];

  constructor(adapter: PerformanceAdapter) {
    super();
    this._adapter = adapter;
    this.setupEventForwarding();
  }

  // Required PerformanceAdapter properties
  get config(): BaseAdapterConfig {
    return this._adapter.config;
  }

  get status(): AdapterStatus {
    return this._adapter.status;
  }

  get type(): AdapterType {
    return this._adapter.type;
  }

  // Delegate adapter interface
  getId(): string {
    return this._adapter.getId();
  }

  getType(): any {
    return this._adapter.getType();
  }

  isRunning(): boolean {
    return this._adapter.isRunning();
  }

  async initialize(): Promise<void> {
    return this._adapter.initialize();
  }

  async start(): Promise<void> {
    return this._adapter.start();
  }

  async stop(): Promise<void> {
    return this._adapter.stop();
  }

  async dispose(): Promise<void> {
    // Dispose middlewares first
    for (const middleware of this._middlewares) {
      if (middleware.dispose) {
        try {
          await middleware.dispose();
        } catch (error) {
          console.error(`Error disposing middleware ${middleware.name}:`, error);
        }
      }
    }
    
    return this._adapter.dispose();
  }

  async collectMetrics(): Promise<any> {
    try {
      // Execute beforeCollect middleware
      for (const middleware of this._middlewares) {
        if (middleware.beforeCollect) {
          await middleware.beforeCollect(this._adapter);
        }
      }
      
      // Execute the actual adapter method
      let result = await this._adapter.collectMetrics();
      
      // Execute afterCollect middleware
      for (const middleware of this._middlewares) {
        if (middleware.afterCollect) {
          result = await middleware.afterCollect(this._adapter, result);
        }
      }
      
      return result;
    } catch (error) {
      // Execute onError middleware
      for (const middleware of this._middlewares) {
        if (middleware.onError) {
          await middleware.onError(this._adapter, error as Error);
        }
      }
      throw error;
    }
  }

  // Note: recordMetric is not part of the PerformanceAdapter interface
  // This method is kept for backward compatibility but delegates to the underlying adapter
  async recordMetric(metric: any): Promise<void> {
    if ('recordMetric' in this._adapter && typeof (this._adapter as any).recordMetric === 'function') {
      return (this._adapter as any).recordMetric(metric);
    }
    // If the adapter doesn't have recordMetric, we could emit an event or handle it differently
    console.warn(`Adapter ${this._adapter.getId()} does not support recordMetric method`);
  }

  async getHealth(): Promise<any> {
    return this._adapter.getHealth();
  }

  async getStats(): Promise<any> {
    return this._adapter.getStats();
  }

  // Middleware management
  addMiddleware(middleware: AdapterMiddleware): void {
    const extendedMiddleware = middleware as ExtendedAdapterMiddleware;
    this._middlewares.push(extendedMiddleware);
    this._middlewares.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  removeMiddleware(name: string): boolean {
    const index = this._middlewares.findIndex(m => m.name === name);
    if (index > -1) {
      this._middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  getMiddleware(): AdapterMiddleware[] {
    return [...this._middlewares];
  }

  // Private methods
  private setupEventForwarding(): void {
    // Forward all adapter events
    this._adapter.on('started', (...args) => this.emit('started', ...args));
    this._adapter.on('stopped', (...args) => this.emit('stopped', ...args));
    this._adapter.on('error', (...args) => this.emit('error', ...args));
    this._adapter.on('metric', (...args) => this.emit('metric', ...args));
  }
}





// Helper functions
export function createMiddlewareAdapter(adapter: PerformanceAdapter): MiddlewareAdapterWrapper {
  return new MiddlewareAdapterWrapper(adapter);
}

export function withMiddleware(adapter: PerformanceAdapter, ...middlewares: AdapterMiddleware[]): MiddlewareAdapterWrapper {
  const wrapper = new MiddlewareAdapterWrapper(adapter);
  
  for (const middleware of middlewares) {
    wrapper.addMiddleware(middleware);
  }
  
  return wrapper;
}

// Middleware presets
export class MiddlewarePresets {
  static basic(): AdapterMiddleware[] {
    return [
      new ErrorHandlingMiddleware(),
      new LoggingMiddleware()
    ];
  }
  
  static performance(): AdapterMiddleware[] {
    return [
      new ErrorHandlingMiddleware(),
      new RateLimitingMiddleware(),
      new CachingMiddleware(),
      new MetricsEnrichmentMiddleware(),
      new LoggingMiddleware()
    ];
  }
  
  static production(): AdapterMiddleware[] {
    return [
      new ErrorHandlingMiddleware(5, 2000),
      new RateLimitingMiddleware(50),
      new CachingMiddleware(30000, 500),
      new MetricsEnrichmentMiddleware({ environment: 'production' }),
      new LoggingMiddleware(console, 'warn')
    ];
  }
  
  static development(): AdapterMiddleware[] {
    return [
      new ErrorHandlingMiddleware(1, 500),
      new MetricsEnrichmentMiddleware({ environment: 'development' }),
      new LoggingMiddleware(console, 'debug')
    ];
  }
}

// Export middleware instances for convenience
export const loggingMiddleware = new LoggingMiddleware();
export const metricsEnrichmentMiddleware = new MetricsEnrichmentMiddleware();
export const rateLimitingMiddleware = new RateLimitingMiddleware();
export const cachingMiddleware = new CachingMiddleware();
export const errorHandlingMiddleware = new ErrorHandlingMiddleware();