/**
 * @fileoverview Performance Optimization Module
 * 
 * Provides performance optimizations for the plugin system including
 * lazy loading, caching, memory management, and performance monitoring.
 * 
 * @example
 * ```typescript
 * import { PerformanceManager } from './performance';
 * 
 * const perfManager = new PerformanceManager();
 * await perfManager.preloadCriticalPlugins(['core-plugin']);
 * const plugin = await perfManager.loadPluginLazy('my-plugin');
 * ```
 */

import type { Plugin, PluginMetadata } from '../types/index.js';
import { EventEmitter } from 'events';

/**
 * Performance metrics for monitoring plugin system performance.
 */
export interface PerformanceMetrics {
  /** Plugin loading times in milliseconds */
  readonly loadTimes: Map<string, number>;
  
  /** Memory usage per plugin in bytes */
  readonly memoryUsage: Map<string, number>;
  
  /** Cache hit/miss ratios */
  readonly cacheStats: {
    hits: number;
    misses: number;
    ratio: number;
  };
  
  /** Plugin initialization times */
  readonly initTimes: Map<string, number>;
  
  /** Total plugins loaded */
  readonly totalLoaded: number;
  
  /** Active plugins count */
  readonly activePlugins: number;
}

/**
 * Configuration for performance optimization.
 */
export interface PerformanceConfig {
  /** Enable lazy loading */
  readonly lazyLoading: boolean;
  
  /** Cache size limit (number of plugins) */
  readonly cacheSize: number;
  
  /** Memory threshold in MB before cleanup */
  readonly memoryThreshold: number;
  
  /** Preload critical plugins on startup */
  readonly preloadCritical: boolean;
  
  /** Critical plugins to preload */
  readonly criticalPlugins: readonly string[];
  
  /** Enable performance monitoring */
  readonly monitoring: boolean;
  
  /** Cleanup interval in milliseconds */
  readonly cleanupInterval: number;
}

/**
 * Default performance configuration.
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  lazyLoading: true,
  cacheSize: 50,
  memoryThreshold: 100, // 100MB
  preloadCritical: true,
  criticalPlugins: [],
  monitoring: true,
  cleanupInterval: 300000 // 5 minutes
};

/**
 * Plugin cache entry with metadata.
 */
interface CacheEntry {
  plugin: Plugin;
  lastAccessed: number;
  accessCount: number;
  memorySize: number;
}

/**
 * Performance manager for optimizing plugin system performance.
 */
export class PerformanceManager extends EventEmitter {
  private readonly config: PerformanceConfig;
  private readonly pluginCache = new Map<string, CacheEntry>();
  private readonly loadPromises = new Map<string, Promise<Plugin>>();
  private readonly metrics: PerformanceMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  
  constructor(config: Partial<PerformanceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.metrics = {
      loadTimes: new Map(),
      memoryUsage: new Map(),
      cacheStats: { hits: 0, misses: 0, ratio: 0 },
      initTimes: new Map(),
      totalLoaded: 0,
      activePlugins: 0
    };
    
    this.startCleanupTimer();
  }
  
  /**
   * Load a plugin with lazy loading support.
   */
  async loadPluginLazy(
    pluginName: string,
    loader: () => Promise<Plugin>
  ): Promise<Plugin> {
    // Check cache first
    const cached = this.getFromCache(pluginName);
    if (cached) {
      this.updateCacheStats(true);
      return cached;
    }
    
    this.updateCacheStats(false);
    
    // Check if already loading
    const existingPromise = this.loadPromises.get(pluginName);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Start loading
    const loadPromise = this.performLoad(pluginName, loader);
    this.loadPromises.set(pluginName, loadPromise);
    
    try {
      const plugin = await loadPromise;
      this.addToCache(pluginName, plugin);
      return plugin;
    } finally {
      this.loadPromises.delete(pluginName);
    }
  }
  
  /**
   * Preload critical plugins for better startup performance.
   */
  async preloadCriticalPlugins(
    criticalPlugins: string[] = this.config.criticalPlugins,
    loader: (name: string) => Promise<Plugin>
  ): Promise<void> {
    if (!this.config.preloadCritical || criticalPlugins.length === 0) {
      return;
    }
    
    const startTime = Date.now();
    
    try {
      // Load critical plugins in parallel
      await Promise.all(
        criticalPlugins.map(async (pluginName) => {
          try {
            await this.loadPluginLazy(pluginName, () => loader(pluginName));
          } catch (error) {
            console.warn(`Failed to preload critical plugin ${pluginName}:`, error);
          }
        })
      );
      
      const loadTime = Date.now() - startTime;
      this.emit('criticalPluginsLoaded', { count: criticalPlugins.length, loadTime });
    } catch (error) {
      this.emit('preloadError', error);
    }
  }
  
  /**
   * Get plugin from cache if available.
   */
  private getFromCache(pluginName: string): Plugin | null {
    const entry = this.pluginCache.get(pluginName);
    if (!entry) {
      return null;
    }
    
    // Update access metadata
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    return entry.plugin;
  }
  
  /**
   * Add plugin to cache with LRU eviction.
   */
  private addToCache(pluginName: string, plugin: Plugin): void {
    // Check cache size limit
    if (this.pluginCache.size >= this.config.cacheSize) {
      this.evictLeastRecentlyUsed();
    }
    
    const memorySize = this.estimateMemoryUsage(plugin);
    const entry: CacheEntry = {
      plugin,
      lastAccessed: Date.now(),
      accessCount: 1,
      memorySize
    };
    
    this.pluginCache.set(pluginName, entry);
    this.metrics.memoryUsage.set(pluginName, memorySize);
    
    // Check memory threshold
    if (this.getTotalMemoryUsage() > this.config.memoryThreshold * 1024 * 1024) {
      this.performMemoryCleanup();
    }
  }
  
  /**
   * Perform the actual plugin loading with timing.
   */
  private async performLoad(
    pluginName: string,
    loader: () => Promise<Plugin>
  ): Promise<Plugin> {
    const startTime = Date.now();
    
    try {
      const plugin = await loader();
      
      const loadTime = Date.now() - startTime;
      this.metrics.loadTimes.set(pluginName, loadTime);
      
      // Initialize plugin if needed
      if (plugin.initialize) {
        const initStartTime = Date.now();
        await plugin.initialize();
        const initTime = Date.now() - initStartTime;
        this.metrics.initTimes.set(pluginName, initTime);
      }
      
      this.updateMetrics();
      this.emit('pluginLoaded', { pluginName, loadTime });
      
      return plugin;
    } catch (error) {
      this.emit('loadError', { pluginName, error });
      throw error;
    }
  }
  
  /**
   * Evict least recently used plugin from cache.
   */
  private evictLeastRecentlyUsed(): void {
    let oldestEntry: string | null = null;
    let oldestTime = Date.now();
    
    for (const [pluginName, entry] of this.pluginCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestEntry = pluginName;
      }
    }
    
    if (oldestEntry) {
      this.removeFromCache(oldestEntry);
    }
  }
  
  /**
   * Remove plugin from cache.
   */
  private removeFromCache(pluginName: string): void {
    const entry = this.pluginCache.get(pluginName);
    if (entry) {
      this.pluginCache.delete(pluginName);
      this.metrics.memoryUsage.delete(pluginName);
      this.emit('pluginEvicted', { pluginName, memoryFreed: entry.memorySize });
    }
  }
  
  /**
   * Perform memory cleanup when threshold is exceeded.
   */
  private performMemoryCleanup(): void {
    const entries = Array.from(this.pluginCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    
    for (let i = 0; i < toRemove; i++) {
      const [pluginName] = entries[i];
      this.removeFromCache(pluginName);
    }
    
    this.emit('memoryCleanup', { removedCount: toRemove });
  }
  
  /**
   * Estimate memory usage of a plugin.
   */
  private estimateMemoryUsage(plugin: Plugin): number {
    // Simple estimation based on JSON serialization
    try {
      return JSON.stringify(plugin).length * 2; // Rough estimate
    } catch {
      return 1024; // Default 1KB if serialization fails
    }
  }
  
  /**
   * Get total memory usage of cached plugins.
   */
  private getTotalMemoryUsage(): number {
    return Array.from(this.metrics.memoryUsage.values())
      .reduce((total, usage) => total + usage, 0);
  }
  
  /**
   * Update cache statistics.
   */
  private updateCacheStats(hit: boolean): void {
    if (hit) {
      this.metrics.cacheStats.hits++;
    } else {
      this.metrics.cacheStats.misses++;
    }
    
    const total = this.metrics.cacheStats.hits + this.metrics.cacheStats.misses;
    this.metrics.cacheStats.ratio = total > 0 ? this.metrics.cacheStats.hits / total : 0;
  }
  
  /**
   * Update general metrics.
   */
  private updateMetrics(): void {
    (this.metrics as any).totalLoaded = this.metrics.loadTimes.size;
    (this.metrics as any).activePlugins = this.pluginCache.size;
  }
  
  /**
   * Start cleanup timer for periodic maintenance.
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.performPeriodicCleanup();
      }, this.config.cleanupInterval);
    }
  }
  
  /**
   * Perform periodic cleanup of stale cache entries.
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    
    const staleEntries = Array.from(this.pluginCache.entries())
      .filter(([, entry]) => now - entry.lastAccessed > staleThreshold);
    
    for (const [pluginName] of staleEntries) {
      this.removeFromCache(pluginName);
    }
    
    if (staleEntries.length > 0) {
      this.emit('periodicCleanup', { removedCount: staleEntries.length });
    }
  }
  
  /**
   * Get current performance metrics.
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Clear all cached plugins.
   */
  clearCache(): void {
    const count = this.pluginCache.size;
    this.pluginCache.clear();
    this.metrics.memoryUsage.clear();
    this.emit('cacheCleared', { count });
  }
  
  /**
   * Get cache information.
   */
  getCacheInfo(): {
    size: number;
    memoryUsage: number;
    entries: Array<{ name: string; lastAccessed: number; accessCount: number }>;
  } {
    return {
      size: this.pluginCache.size,
      memoryUsage: this.getTotalMemoryUsage(),
      entries: Array.from(this.pluginCache.entries()).map(([name, entry]) => ({
        name,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount
      }))
    };
  }
  
  /**
   * Cleanup resources.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.clearCache();
    this.removeAllListeners();
  }
}

/**
 * Plugin loader with performance optimizations.
 */
export class OptimizedPluginLoader {
  private readonly performanceManager: PerformanceManager;
  private readonly loadStrategies = new Map<string, () => Promise<Plugin>>();
  
  constructor(performanceConfig?: Partial<PerformanceConfig>) {
    this.performanceManager = new PerformanceManager(performanceConfig);
  }
  
  /**
   * Register a loading strategy for a plugin.
   */
  registerLoadStrategy(pluginName: string, loader: () => Promise<Plugin>): void {
    this.loadStrategies.set(pluginName, loader);
  }
  
  /**
   * Load a plugin using the optimized loader.
   */
  async loadPlugin(pluginName: string): Promise<Plugin> {
    const loader = this.loadStrategies.get(pluginName);
    if (!loader) {
      throw new Error(`No load strategy registered for plugin: ${pluginName}`);
    }
    
    return this.performanceManager.loadPluginLazy(pluginName, loader);
  }
  
  /**
   * Preload critical plugins.
   */
  async preloadCriticalPlugins(criticalPlugins?: string[]): Promise<void> {
    return this.performanceManager.preloadCriticalPlugins(
      criticalPlugins,
      (name) => {
        const loader = this.loadStrategies.get(name);
        if (!loader) {
          throw new Error(`No load strategy for critical plugin: ${name}`);
        }
        return loader();
      }
    );
  }
  
  /**
   * Get performance metrics.
   */
  getMetrics(): PerformanceMetrics {
    return this.performanceManager.getMetrics();
  }
  
  /**
   * Get cache information.
   */
  getCacheInfo() {
    return this.performanceManager.getCacheInfo();
  }
  
  /**
   * Clear plugin cache.
   */
  clearCache(): void {
    this.performanceManager.clearCache();
  }
  
  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.performanceManager.destroy();
  }
}

/**
 * Performance monitoring utilities.
 */
export class PerformanceMonitor {
  private static instance?: PerformanceMonitor;
  private readonly timers = new Map<string, number>();
  private readonly metrics = new Map<string, number[]>();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Start timing an operation.
   */
  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }
  
  /**
   * End timing an operation and record the result.
   */
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      throw new Error(`Timer not started for operation: ${operation}`);
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(operation);
    
    // Record metric
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
    
    return duration;
  }
  
  /**
   * Get average time for an operation.
   */
  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return 0;
    }
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  /**
   * Get all recorded metrics.
   */
  getAllMetrics(): Record<string, { average: number; count: number; total: number }> {
    const result: Record<string, { average: number; count: number; total: number }> = {};
    
    for (const [operation, times] of this.metrics.entries()) {
      const total = times.reduce((sum, time) => sum + time, 0);
      result[operation] = {
        average: times.length > 0 ? total / times.length : 0,
        count: times.length,
        total
      };
    }
    
    return result;
  }
  
  /**
   * Clear all metrics.
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}