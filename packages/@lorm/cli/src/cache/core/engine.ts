/**
 * Unified Cache Engine
 * 
 * This module implements the core cache engine that orchestrates all cache
 * operations across multiple layers, handles routing, and provides the main
 * unified cache interface implementation.
 */

import { EventEmitter } from 'node:events';
import type {
  UnifiedCache,
  CacheLayerInterface,
  CacheMonitorInterface,
  CacheConfigManagerInterface,
  CacheStrategyInterface,
  NamespacedCache
} from './interface.js';
import type {
  CacheOptions,
  CacheStats,
  CacheNamespace,
  CacheLayer,
  CacheHealth,
  CachePerformanceMetrics,
  CacheEntry,
  CacheEvents,
  CacheConfig,
  CacheOperation
} from './types.js';
import { CacheKeyUtils } from '../utils/key-utils.js';
import { CacheMetrics } from '../monitoring/metrics.js';

/**
 * Core cache engine implementation
 * 
 * Orchestrates cache operations across multiple layers with automatic
 * routing, performance monitoring, and strategy execution.
 */
export class CacheEngine extends EventEmitter implements UnifiedCache {
  private readonly layers = new Map<CacheLayer, CacheLayerInterface>();
  private readonly strategies = new Map<string, CacheStrategyInterface>();
  private readonly monitor: CacheMonitorInterface;
  private readonly configManager: CacheConfigManagerInterface;
  private readonly keyUtils: CacheKeyUtils;
  private readonly metricsCollector: CacheMetrics;
  private config: CacheConfig;
  private isInitialized = false;
  private shutdownPromise?: Promise<void>;

  constructor(
    config: CacheConfig,
    monitor: CacheMonitorInterface,
    configManager: CacheConfigManagerInterface
  ) {
    super();
    this.config = config;
    this.monitor = monitor;
    this.configManager = configManager;
    this.keyUtils = new CacheKeyUtils();
    this.metricsCollector = new CacheMetrics();

    // Subscribe to configuration changes
    this.configManager.onConfigChange((newConfig) => {
      this.config = newConfig;
      this.emit('config:changed', newConfig);
    });
  }

  /**
   * Initialize the cache engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize all layers
      for (const layer of this.layers.values()) {
        await layer.initialize();
      }

      // Start monitoring
      await this.monitor.start();

      // Start metrics collection
      await this.metricsCollector.start();

      this.isInitialized = true;
      this.emit('engine:initialized');
    } catch (error) {
      this.emit('engine:error', { operation: 'initialize', error });
      throw error;
    }
  }

  /**
   * Shutdown the cache engine
   */
  async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this._performShutdown();
    return this.shutdownPromise;
  }

  private async _performShutdown(): Promise<void> {
    try {
      // Stop monitoring
      await this.monitor.stop();

      // Stop metrics collection
      await this.metricsCollector.stop();

      // Shutdown all layers
      await Promise.all(
        Array.from(this.layers.values()).map(layer => layer.shutdown())
      );

      this.isInitialized = false;
      this.emit('engine:shutdown');
    } catch (error) {
      this.emit('engine:error', { operation: 'shutdown', error });
      throw error;
    }
  }

  /**
   * Register a cache layer
   */
  registerLayer(layer: CacheLayerInterface): void {
    this.layers.set(layer.name, layer);
    this.emit('layer:registered', { layer: layer.name });
  }

  /**
   * Register a cache strategy
   */
  registerStrategy(strategy: CacheStrategyInterface): void {
    this.strategies.set(strategy.name, strategy);
    this.emit('strategy:registered', { strategy: strategy.name });
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const operation: CacheOperation = 'get';
    
    try {
      this._validateKey(key);
      
      const layers = this._getLayersForOperation(options);
      
      for (const layerName of layers) {
        const layer = this.layers.get(layerName);
        if (!layer) continue;

        const entry = await layer.get<T>(key);
        if (entry) {
          // Check if entry is expired
          if (this._isExpired(entry)) {
            await layer.delete(key);
            continue;
          }

          // Update access metadata
          entry.metadata.lastAccessed = new Date();
          entry.metadata.accessCount++;
          await layer.set(key, entry.value, options);

          // Promote to higher layers if needed
          await this._promoteToHigherLayers(key, entry, layerName, layers);

          const duration = Date.now() - startTime;
          this.metricsCollector.recordOperation(operation, key, duration, true, {
            layer: layerName,
            namespace: options.namespace
          });

          this.emit('cache:hit', {
            key,
            namespace: options.namespace || 'custom',
            layer: layerName
          });

          return entry.value;
        }
      }

      // Cache miss
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, false, {
        namespace: options.namespace
      });

      this.emit('cache:miss', {
        key,
        namespace: options.namespace || 'custom'
      });

      return null;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, false, { error });
      this.emit('cache:error', { operation, key, error: error as Error });
      throw error;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = unknown>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const startTime = Date.now();
    const operation: CacheOperation = 'set';
    
    try {
      this._validateKey(key);
      this._validateValue(value);
      
      const layers = this._getLayersForOperation(options);
      const serializedSize = this._calculateSize(value);
      
      // Set in all specified layers
      await Promise.all(
        layers.map(async (layerName) => {
          const layer = this.layers.get(layerName);
          if (layer) {
            await layer.set(key, value, options);
            
            this.emit('cache:set', {
              key,
              namespace: options.namespace || 'custom',
              layer: layerName,
              size: serializedSize
            });
          }
        })
      );

      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, true, {
        layers,
        size: serializedSize,
        namespace: options.namespace
      });

      // Trigger optimization if needed
      await this._checkOptimizationTriggers();
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, false, { error });
      this.emit('cache:error', { operation, key, error: error as Error });
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    const operation: CacheOperation = 'delete';
    
    try {
      this._validateKey(key);
      
      const layers = this._getLayersForOperation(options);
      let deleted = false;
      
      // Delete from all layers
      await Promise.all(
        layers.map(async (layerName) => {
          const layer = this.layers.get(layerName);
          if (layer) {
            const wasDeleted = await layer.delete(key);
            if (wasDeleted) {
              deleted = true;
              this.emit('cache:delete', {
                key,
                namespace: options.namespace || 'custom',
                layer: layerName
              });
            }
          }
        })
      );

      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, true, {
        layers,
        deleted,
        namespace: options.namespace
      });

      return deleted;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, false, { error });
      this.emit('cache:error', { operation, key, error: error as Error });
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string, options: CacheOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    const operation: CacheOperation = 'has';
    
    try {
      this._validateKey(key);
      
      const layers = this._getLayersForOperation(options);
      
      for (const layerName of layers) {
        const layer = this.layers.get(layerName);
        if (layer && await layer.has(key)) {
          const duration = Date.now() - startTime;
          this.metricsCollector.recordOperation(operation, key, duration, true, {
            layer: layerName,
            namespace: options.namespace
          });
          return true;
        }
      }

      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, true, {
        found: false,
        namespace: options.namespace
      });

      return false;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, key, duration, false, { error });
      this.emit('cache:error', { operation, key, error: error as Error });
      throw error;
    }
  }

  /**
   * Clear cache entries
   */
  async clear(namespace?: CacheNamespace, pattern?: string): Promise<void> {
    const startTime = Date.now();
    const operation: CacheOperation = 'clear';
    
    try {
      let entriesRemoved = 0;
      
      // Clear from all layers
      await Promise.all(
        Array.from(this.layers.values()).map(async (layer) => {
          const keysBefore = await layer.keys(namespace, pattern);
          await layer.clear(namespace, pattern);
          const keysAfter = await layer.keys(namespace, pattern);
          entriesRemoved += keysBefore.length - keysAfter.length;
        })
      );

      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, pattern || '*', duration, true, {
        namespace,
        entriesRemoved
      });

      this.emit('cache:cleanup', { namespace, entriesRemoved });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, pattern || '*', duration, false, { error });
      this.emit('cache:error', { operation, key: pattern || '*', error: error as Error });
      throw error;
    }
  }

  /**
   * Get all cache keys
   */
  async keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]> {
    const startTime = Date.now();
    const operation: CacheOperation = 'keys';
    
    try {
      const allKeys = new Set<string>();
      
      // Collect keys from all layers
      await Promise.all(
        Array.from(this.layers.values()).map(async (layer) => {
          const layerKeys = await layer.keys(namespace, pattern);
          layerKeys.forEach(key => allKeys.add(key));
        })
      );

      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, pattern || '*', duration, true, {
        namespace,
        keyCount: allKeys.size
      });

      return Array.from(allKeys);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordOperation(operation, pattern || '*', duration, false, { error });
      this.emit('cache:error', { operation, key: pattern || '*', error: error as Error });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async stats(namespace?: CacheNamespace): Promise<CacheStats> {
    try {
      const layerStats = await Promise.all(
        Array.from(this.layers.values()).map(layer => layer.stats())
      );

      // Aggregate stats from all layers
      const aggregatedStats: CacheStats = {
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRatio: 0,
        memoryUsage: 0,
        diskUsage: 0,
        entryCount: 0,
        averageLatency: 0,
        evictions: 0,
        lastCleanup: new Date(),
        namespaceStats: {} as any
      };

      for (const stats of layerStats) {
        if (stats.totalOperations) aggregatedStats.totalOperations += stats.totalOperations;
        if (stats.hits) aggregatedStats.hits += stats.hits;
        if (stats.misses) aggregatedStats.misses += stats.misses;
        if (stats.memoryUsage) aggregatedStats.memoryUsage += stats.memoryUsage;
        if (stats.diskUsage) aggregatedStats.diskUsage += stats.diskUsage;
        if (stats.entryCount) aggregatedStats.entryCount += stats.entryCount;
        if (stats.evictions) aggregatedStats.evictions += stats.evictions;
      }

      // Calculate derived metrics
      aggregatedStats.hitRatio = aggregatedStats.totalOperations > 0 
        ? aggregatedStats.hits / aggregatedStats.totalOperations 
        : 0;

      return aggregatedStats;
    } catch (error) {
      this.emit('cache:error', { operation: 'stats', key: 'global', error: error as Error });
      throw error;
    }
  }

  /**
   * Get cache health status
   */
  async health(): Promise<CacheHealth> {
    return this.monitor.getHealth();
  }

  /**
   * Get performance metrics
   */
  async metrics(): Promise<CachePerformanceMetrics> {
    return this.metricsCollector.getMetrics();
  }

  /**
   * Warm cache with critical data
   */
  async warm<T = unknown>(
    keys: string[],
    loader: (key: string) => Promise<T>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const warmingPromises = keys.map(async (key) => {
        try {
          // Check if already cached
          const exists = await this.has(key);
          if (!exists) {
            const value = await loader(key);
            await this.set(key, value, { namespace: 'custom' });
          }
        } catch (error) {
          this.emit('cache:warning', {
            message: `Failed to warm cache for key: ${key}`,
            context: { key, error }
          });
        }
      });

      await Promise.allSettled(warmingPromises);
      
      const duration = Date.now() - startTime;
      this.emit('cache:warmed', { keys, duration });
    } catch (error) {
      this.emit('cache:error', { operation: 'warm', key: 'multiple', error: error as Error });
      throw error;
    }
  }

  /**
   * Optimize cache performance
   */
  async optimize(): Promise<void> {
    try {
      // Execute all registered optimization strategies
      const context = {
        stats: await this.stats(),
        metrics: await this.metrics(),
        layers: Array.from(this.layers.values())
      };

      const optimizationPromises = Array.from(this.strategies.values())
        .filter(strategy => strategy.shouldApply(context))
        .map(strategy => strategy.execute(context));

      await Promise.allSettled(optimizationPromises);
      
      this.emit('cache:optimized');
    } catch (error) {
      this.emit('cache:error', { operation: 'optimize', key: 'global', error: error as Error });
      throw error;
    }
  }

  /**
   * Get cache entry with metadata
   */
  async getEntry<T = unknown>(key: string, options: CacheOptions = {}): Promise<CacheEntry<T> | null> {
    try {
      this._validateKey(key);
      
      const layers = this._getLayersForOperation(options);
      
      for (const layerName of layers) {
        const layer = this.layers.get(layerName);
        if (!layer) continue;

        const entry = await layer.get<T>(key);
        if (entry && !this._isExpired(entry)) {
          return entry;
        }
      }

      return null;
    } catch (error) {
      this.emit('cache:error', { operation: 'getEntry', key, error: error as Error });
      throw error;
    }
  }

  /**
   * Set multiple values in cache
   */
  async setMany<T = unknown>(
    entries: Array<{ key: string; value: T }>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const setPromises = entries.map(({ key, value }) => 
        this.set(key, value, options)
      );
      
      await Promise.all(setPromises);
    } catch (error) {
      this.emit('cache:error', { operation: 'setMany', key: 'multiple', error: error as Error });
      throw error;
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMany<T = unknown>(
    keys: string[],
    options: CacheOptions = {}
  ): Promise<Map<string, T>> {
    try {
      const result = new Map<string, T>();
      
      const getPromises = keys.map(async (key) => {
        const value = await this.get<T>(key, options);
        if (value !== null) {
          result.set(key, value);
        }
      });
      
      await Promise.all(getPromises);
      return result;
    } catch (error) {
      this.emit('cache:error', { operation: 'getMany', key: 'multiple', error: error as Error });
      throw error;
    }
  }

  /**
   * Delete multiple values from cache
   */
  async deleteMany(keys: string[], options: CacheOptions = {}): Promise<number> {
    try {
      const deletePromises = keys.map(key => this.delete(key, options));
      const results = await Promise.all(deletePromises);
      
      return results.filter(deleted => deleted).length;
    } catch (error) {
      this.emit('cache:error', { operation: 'deleteMany', key: 'multiple', error: error as Error });
      throw error;
    }
  }

  /**
   * Create a namespaced cache instance
   */
  createNamespacedCache<T = unknown>(namespace: CacheNamespace): NamespacedCache<T> {
    return new NamespacedCacheImpl<T>(this, namespace);
  }

  // Private helper methods

  private _validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string');
    }
    if (key.length > 250) {
      throw new Error('Cache key too long (max 250 characters)');
    }
  }

  private _validateValue(value: unknown): void {
    if (value === undefined) {
      throw new Error('Cannot cache undefined values');
    }
  }

  private _getLayersForOperation(options: CacheOptions): CacheLayer[] {
    if (options.layers && options.layers.length > 0) {
      return options.layers;
    }

    // Default layer order: memory -> disk
    const availableLayers: CacheLayer[] = [];
    if (this.config.layers.memory.enabled && this.layers.has('memory')) {
      availableLayers.push('memory');
    }
    if (this.config.layers.disk.enabled && this.layers.has('disk')) {
      availableLayers.push('disk');
    }

    return availableLayers;
  }

  private _isExpired(entry: CacheEntry): boolean {
    if (!entry.metadata.expiresAt) {
      return false;
    }
    return new Date() > entry.metadata.expiresAt;
  }

  private async _promoteToHigherLayers(
    key: string,
    entry: CacheEntry,
    currentLayer: CacheLayer,
    availableLayers: CacheLayer[]
  ): Promise<void> {
    const currentIndex = availableLayers.indexOf(currentLayer);
    if (currentIndex <= 0) return; // Already in highest layer

    // Promote to higher layers (lower index = higher priority)
    for (let i = 0; i < currentIndex; i++) {
      const higherLayer = this.layers.get(availableLayers[i]);
      if (higherLayer) {
        await higherLayer.set(key, entry.value, {
          ttl: entry.metadata.ttl,
          namespace: entry.metadata.namespace
        });
      }
    }
  }

  private _calculateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 0;
    }
  }

  private async _checkOptimizationTriggers(): Promise<void> {
    const stats = await this.stats();
    const metrics = await this.metrics();

    // Check if optimization is needed
    if (
      metrics.memoryUsage > 100 * 1024 * 1024 || // 100MB threshold
      metrics.diskUsage > 500 * 1024 * 1024 || // 500MB threshold
      stats.hitRatio < 0.7
    ) {
      // Run optimization in background
      setImmediate(() => this.optimize().catch(() => {}));
    }
  }
}

/**
 * Namespaced cache implementation
 */
class NamespacedCacheImpl<T = unknown> implements NamespacedCache<T> {
  constructor(
    private readonly cache: UnifiedCache,
    private readonly namespace: CacheNamespace
  ) {}

  async get(key: string, options: Omit<CacheOptions, 'namespace'> = {}): Promise<T | null> {
    return this.cache.get<T>(key, { ...options, namespace: this.namespace });
  }

  async set(key: string, value: T, options: Omit<CacheOptions, 'namespace'> = {}): Promise<void> {
    return this.cache.set(key, value, { ...options, namespace: this.namespace });
  }

  async delete(key: string, options: Omit<CacheOptions, 'namespace'> = {}): Promise<boolean> {
    return this.cache.delete(key, { ...options, namespace: this.namespace });
  }

  async has(key: string, options: Omit<CacheOptions, 'namespace'> = {}): Promise<boolean> {
    return this.cache.has(key, { ...options, namespace: this.namespace });
  }

  async clear(pattern?: string): Promise<void> {
    return this.cache.clear(this.namespace, pattern);
  }

  async keys(pattern?: string): Promise<string[]> {
    return this.cache.keys(this.namespace, pattern);
  }

  async stats(): Promise<CacheStats> {
    return this.cache.stats(this.namespace);
  }
}