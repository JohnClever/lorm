/**
 * Cache Performance Adapter - Bridges cache system with performance monitoring
 */

import type {
  CacheAdapterConfig,
  PerformanceAdapter,
  AdapterStats,
  ComponentHealth,
  Metric
} from '../types/index.js';
import { AdapterStatus, AdapterType } from '../types/index.js';
import { EnhancedBaseAdapter } from './base-adapter.js';

/**
 * Performance adapter for cache systems
 */
export class CachePerformanceAdapter extends EnhancedBaseAdapter {
  private _cacheInstance: any;
  private _operationCounts: Map<string, number> = new Map();
  private _operationTimes: Map<string, number[]> = new Map();
  private _errorCounts: Map<string, number> = new Map();
  private _lastCacheStats: any = {};
  private _monitoringInterval?: NodeJS.Timeout;

  constructor(config: CacheAdapterConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    const cacheConfig = this._config as CacheAdapterConfig;
    
    // Store cache instance reference
    if (this._cacheInstance) {
      await this.instrumentCacheInstance();
    }
    
    // Initialize operation tracking
    this.initializeOperationTracking();
  }

  async start(): Promise<void> {
    await super.start();
    
    // Start periodic cache monitoring
    this.startCacheMonitoring();
    
    // Record adapter start metric
    await this.recordMetric(this.createMetric(
      'cache.adapter.started',
      'counter',
      1,
      { cache_type: this.getCacheType() }
    ));
  }

  async stop(): Promise<void> {
    this.stopCacheMonitoring();
    
    // Record adapter stop metric
    await this.recordMetric(this.createMetric(
      'cache.adapter.stopped',
      'counter',
      1,
      { cache_type: this.getCacheType() }
    ));
    
    await super.stop();
  }

  async dispose(): Promise<void> {
    this._operationCounts.clear();
    this._operationTimes.clear();
    this._errorCounts.clear();
    this._lastCacheStats = {};
    
    await super.dispose();
  }

  // Required abstract method implementations
  protected async onInitialize(): Promise<void> {
    // Cache-specific initialization
    this.initializeOperationTracking();
  }

  protected async onStart(): Promise<void> {
    // Start cache monitoring
    this.startCacheMonitoring();
  }

  protected async onStop(): Promise<void> {
    // Stop cache monitoring
    this.stopCacheMonitoring();
  }

  protected async onDispose(): Promise<void> {
    // Clean up cache-specific resources
    this._operationCounts.clear();
    this._operationTimes.clear();
    this._errorCounts.clear();
    this._lastCacheStats = {};
  }

  protected async doCollectMetrics(): Promise<Metric[]> {
    return await this.collectCacheMetrics();
  }

  protected async doGetHealth(): Promise<ComponentHealth> {
    return await this.getHealth();
  }

  // Cache operation instrumentation
  async instrumentCacheOperation<T>(
    operation: string,
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Record operation start
      this.incrementOperationCount(operation);
      
      await this.recordMetric(this.createMetric(
        'cache.operation.started',
        'counter',
        1,
        {
          operation,
          key_hash: this.hashKey(key),
          operation_id: operationId
        }
      ));
      
      // Execute operation
      const result = await fn();
      
      // Record success metrics
      const duration = Date.now() - startTime;
      this.recordOperationTime(operation, duration);
      
      await this.recordMetrics([
        this.createTimerMetric(
          'cache.operation.duration',
          startTime,
          Date.now(),
          true,
          {
            operation,
            key_hash: this.hashKey(key),
            operation_id: operationId,
            status: 'success'
          }
        ),
        this.createMetric(
          'cache.operation.completed',
          'counter',
          1,
          {
            operation,
            key_hash: this.hashKey(key),
            operation_id: operationId,
            status: 'success'
          }
        )
      ]);
      
      // Record hit/miss for get operations
      if (operation === 'get') {
        const hitStatus = result !== null && result !== undefined ? 'hit' : 'miss';
        await this.recordMetric(this.createMetric(
          `cache.${hitStatus}`,
          'counter',
          1,
          {
            key_hash: this.hashKey(key),
            operation_id: operationId
          }
        ));
      }
      
      return result;
    } catch (error) {
      // Record error metrics
      const duration = Date.now() - startTime;
      this.incrementErrorCount(operation);
      
      await this.recordMetrics([
        this.createTimerMetric(
          'cache.operation.duration',
          startTime,
          Date.now(),
          false,
          {
            operation,
            key_hash: this.hashKey(key),
            operation_id: operationId,
            status: 'error'
          }
        ),
        this.createMetric(
          'cache.operation.error',
          'counter',
          1,
          {
            operation,
            key_hash: this.hashKey(key),
            operation_id: operationId,
            error_type: (error as Error).name,
            error_message: (error as Error).message
          }
        )
      ]);
      
      throw error;
    }
  }

  // Cache statistics collection
  async collectCacheMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    const timestamp = Date.now();
    
    try {
      // Collect basic operation metrics
      for (const [operation, count] of this._operationCounts) {
        metrics.push(this.createMetric(
          'cache.operations.total',
          'counter',
          count,
          { operation }
        ));
      }
      
      // Collect operation timing metrics
      for (const [operation, times] of this._operationTimes) {
        if (times.length > 0) {
          const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
          const maxTime = Math.max(...times);
          const minTime = Math.min(...times);
          
          metrics.push(
            this.createMetric(
              'cache.operation.avg_duration',
              'gauge',
              avgTime,
              { operation }
            ),
            this.createMetric(
              'cache.operation.max_duration',
              'gauge',
              maxTime,
              { operation }
            ),
            this.createMetric(
              'cache.operation.min_duration',
              'gauge',
              minTime,
              { operation }
            )
          );
        }
      }
      
      // Collect error metrics
      for (const [operation, count] of this._errorCounts) {
        metrics.push(this.createMetric(
          'cache.errors.total',
          'counter',
          count,
          { operation }
        ));
      }
      
      // Collect cache-specific metrics if cache instance is available
      if (this._cacheInstance) {
        const cacheMetrics = await this.collectCacheInstanceMetrics();
        metrics.push(...cacheMetrics);
      }
      
      // Calculate hit rate
      const hits = this._operationCounts.get('hit') || 0;
      const misses = this._operationCounts.get('miss') || 0;
      const total = hits + misses;
      
      if (total > 0) {
        const hitRate = (hits / total) * 100;
        metrics.push(this.createMetric(
          'cache.hit_rate',
          'gauge',
          hitRate,
          { cache_type: this.getCacheType() }
        ));
      }
      
    } catch (error) {
      console.error(`[${this._config.id}] Error collecting cache metrics:`, error);
    }
    
    return metrics;
  }

  async getStats(): Promise<AdapterStats> {
    const baseStats = await super.getStats();
    
    const totalOperations = Array.from(this._operationCounts.values())
      .reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this._errorCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    const hits = this._operationCounts.get('hit') || 0;
    const misses = this._operationCounts.get('miss') || 0;
    const hitRate = (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 0;
    
    return {
      ...baseStats,
      totalOperations,
      totalErrors,
      hitRate,
      operationCounts: Object.fromEntries(this._operationCounts),
      errorCounts: Object.fromEntries(this._errorCounts),
      cacheType: this.getCacheType(),
      lastCacheStats: this._lastCacheStats
    } as AdapterStats;
  }

  async getHealth(): Promise<ComponentHealth> {
    const baseHealth = await super.getHealth();
    
    // Perform cache-specific health checks
    const cacheHealthChecks = await this.performCacheHealthChecks();
    
    return {
      ...baseHealth,
      cacheHealthChecks
    } as ComponentHealth;
  }

  // Private methods
  private async instrumentCacheInstance(): Promise<void> {
    if (!this._cacheInstance) {
      return;
    }
    
    // Instrument common cache methods
    const methodsToInstrument = ['get', 'set', 'delete', 'clear', 'has'];
    
    for (const method of methodsToInstrument) {
      if (typeof this._cacheInstance[method] === 'function') {
        const originalMethod = this._cacheInstance[method].bind(this._cacheInstance);
        
        this._cacheInstance[method] = async (...args: any[]) => {
          const key = args[0] || 'unknown';
          return this.instrumentCacheOperation(method, key, () => originalMethod(...args));
        };
      }
    }
  }

  private initializeOperationTracking(): void {
    // Initialize common operation counters
    const operations = ['get', 'set', 'delete', 'clear', 'has', 'hit', 'miss'];
    for (const operation of operations) {
      this._operationCounts.set(operation, 0);
      this._operationTimes.set(operation, []);
      this._errorCounts.set(operation, 0);
    }
  }

  private startCacheMonitoring(): void {
    const config = this._config as CacheAdapterConfig;
    const interval = config.collectionInterval || 30000; // 30 seconds default
    
    this._monitoringInterval = setInterval(() => {
      this.collectAndRecordMetrics().catch(error => {
        console.error(`[${this._config.id}] Cache monitoring error:`, error);
      });
    }, interval);
  }

  private stopCacheMonitoring(): void {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = undefined;
    }
  }

  private async collectAndRecordMetrics(): Promise<void> {
    try {
      const metrics = await this.collectCacheMetrics();
      await this.recordMetrics(metrics);
    } catch (error) {
      console.error(`[${this._config.id}] Error collecting cache metrics:`, error);
    }
  }

  private async collectCacheInstanceMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Try to get cache statistics if available
      if (typeof this._cacheInstance.getStats === 'function') {
        const stats = await this._cacheInstance.getStats();
        this._lastCacheStats = stats;
        
        // Convert cache stats to metrics
        if (stats.size !== undefined) {
          metrics.push(this.createMetric(
            'cache.size',
            'gauge',
            stats.size,
            { cache_type: this.getCacheType() }
          ));
        }
        
        if (stats.memoryUsage !== undefined) {
          metrics.push(this.createMetric(
            'cache.memory_usage',
            'gauge',
            stats.memoryUsage,
            { cache_type: this.getCacheType() }
          ));
        }
        
        if (stats.maxSize !== undefined) {
          metrics.push(this.createMetric(
            'cache.max_size',
            'gauge',
            stats.maxSize,
            { cache_type: this.getCacheType() }
          ));
        }
      }
      
      // Try to get cache size if available
      if (typeof this._cacheInstance.size === 'number') {
        metrics.push(this.createMetric(
          'cache.size',
          'gauge',
          this._cacheInstance.size,
          { cache_type: this.getCacheType() }
        ));
      }
      
    } catch (error) {
      console.error(`[${this._config.id}] Error collecting cache instance metrics:`, error);
    }
    
    return metrics;
  }

  private async performCacheHealthChecks(): Promise<Record<string, any>> {
    const healthChecks: Record<string, any> = {};
    
    try {
      // Check if cache instance is available
      healthChecks.instanceAvailable = !!this._cacheInstance;
      
      // Check cache connectivity
      if (this._cacheInstance) {
        try {
          // Try a simple operation to test connectivity
          const testKey = `__health_check_${Date.now()}`;
          await this._cacheInstance.set(testKey, 'test', { ttl: 1000 });
          const result = await this._cacheInstance.get(testKey);
          await this._cacheInstance.delete(testKey);
          
          healthChecks.connectivity = result === 'test' ? 'healthy' : 'degraded';
        } catch (error) {
          healthChecks.connectivity = 'unhealthy';
          healthChecks.connectivityError = (error as Error).message;
        }
      }
      
      // Check error rates
      const totalOperations = Array.from(this._operationCounts.values())
        .reduce((sum, count) => sum + count, 0);
      const totalErrors = Array.from(this._errorCounts.values())
        .reduce((sum, count) => sum + count, 0);
      
      const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
      healthChecks.errorRate = errorRate;
      healthChecks.errorRateStatus = errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'unhealthy';
      
      // Check hit rate
      const hits = this._operationCounts.get('hit') || 0;
      const misses = this._operationCounts.get('miss') || 0;
      const hitRate = (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 0;
      
      healthChecks.hitRate = hitRate;
      healthChecks.hitRateStatus = hitRate > 80 ? 'healthy' : hitRate > 50 ? 'degraded' : 'unhealthy';
      
    } catch (error) {
      healthChecks.error = (error as Error).message;
    }
    
    return healthChecks;
  }

  private incrementOperationCount(operation: string): void {
    const current = this._operationCounts.get(operation) || 0;
    this._operationCounts.set(operation, current + 1);
  }

  private recordOperationTime(operation: string, duration: number): void {
    const times = this._operationTimes.get(operation) || [];
    times.push(duration);
    
    // Keep only last 100 times to prevent memory growth
    if (times.length > 100) {
      times.shift();
    }
    
    this._operationTimes.set(operation, times);
  }

  private incrementErrorCount(operation: string): void {
    const current = this._errorCounts.get(operation) || 0;
    this._errorCounts.set(operation, current + 1);
  }

  private getCacheType(): string {
    const config = this._config as CacheAdapterConfig;
    return config.config?.cacheType || 'unknown';
  }

  private hashKey(key: string): string {
    // Simple hash function for key anonymization
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  protected async validateConfig(config: CacheAdapterConfig): Promise<void> {
    await super.validateConfig(config);
    
    // Validate cache-specific configuration
    if (config.collectionInterval && config.collectionInterval < 1000) {
      throw new Error('Collection interval must be at least 1000ms');
    }
  }

  protected async applyConfigChanges(
    oldConfig: CacheAdapterConfig,
    newConfig: CacheAdapterConfig
  ): Promise<void> {
    await super.applyConfigChanges(oldConfig, newConfig);
    
    // Restart monitoring if interval changed
    if (newConfig.collectionInterval !== oldConfig.collectionInterval) {
      this.stopCacheMonitoring();
      if (this._status === AdapterStatus.ACTIVE) {
        this.startCacheMonitoring();
      }
    }
  }
}

// Helper functions for cache adapter integration
export function createCacheAdapter(cacheInstance: any, config: Partial<CacheAdapterConfig> = {}): CachePerformanceAdapter {
  const baseConfig: CacheAdapterConfig = {
    id: config.id || 'cache-adapter',
    name: config.name || 'Cache Adapter',
    type: AdapterType.CACHE,
    enabled: config.enabled !== false,
    config: {
      cacheType: detectCacheType(cacheInstance),
      trackHitRatio: true,
      trackResponseTime: true,
      ...config.config
    },
    ...config
  };
  
  const adapter = new CachePerformanceAdapter(baseConfig);
  (adapter as any)._cacheInstance = cacheInstance;
  return adapter;
}

export function detectCacheType(cacheInstance: any): string {
  if (!cacheInstance) {
    return 'unknown';
  }
  
  // Try to detect cache type based on constructor name or properties
  const constructorName = cacheInstance.constructor?.name;
  
  if (constructorName) {
    if (constructorName.toLowerCase().includes('redis')) {
      return 'redis';
    }
    if (constructorName.toLowerCase().includes('memory')) {
      return 'memory';
    }
    if (constructorName.toLowerCase().includes('lru')) {
      return 'lru';
    }
  }
  
  // Check for specific methods or properties
  if (typeof cacheInstance.redis === 'object') {
    return 'redis';
  }
  
  if (typeof cacheInstance.max === 'number') {
    return 'lru';
  }
  
  return 'generic';
}

// Cache operation wrapper for easy integration
export function withCacheMonitoring<T extends Record<string, any>>(
  cacheInstance: T,
  adapter: CachePerformanceAdapter
): T {
  const wrappedCache = { ...cacheInstance };
  
  // Wrap common cache methods
  const methodsToWrap = ['get', 'set', 'delete', 'clear', 'has'] as const;
  
  for (const method of methodsToWrap) {
    if (typeof cacheInstance[method] === 'function') {
      const originalMethod = cacheInstance[method].bind(cacheInstance);
      
      (wrappedCache as any)[method] = async (...args: any[]) => {
        const key = args[0] || 'unknown';
        return adapter.instrumentCacheOperation(method, key, () => originalMethod(...args));
      };
    }
  }
  
  return wrappedCache;
}