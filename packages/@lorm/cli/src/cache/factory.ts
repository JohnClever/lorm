/**
 * Unified Cache Factory
 * 
 * This module provides the main factory for creating and configuring
 * the unified cache system, orchestrating all components together.
 */

import type {
  UnifiedCache,
  CacheFactoryInterface,
  CacheConfig,
  CacheLayerInterface,
  CacheNamespace,
  NamespacedCache,
  CacheMonitorInterface,
  CacheStrategyInterface
} from './core/types.js';
import { CacheEngine } from './core/engine.js';
import { MemoryCacheLayer } from './layers/memory.js';
import { DiskCacheLayer } from './layers/disk.js';
import { CacheStrategyManager } from './strategies/manager.js';
import { CacheMonitor } from './monitoring/monitor.js';
import { CacheConfigManager } from './config/manager.js';
import { CacheMigrator, migrationUtils } from './migration/migrator.js';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Factory configuration options
 */
interface FactoryOptions {
  configPath?: string;
  autoMigrate?: boolean;
  enableMonitoring?: boolean;
  enableWarming?: boolean;
  projectRoot?: string;
  environment?: 'development' | 'production' | 'test';
}

/**
 * Cache factory implementation
 */
export class CacheFactory extends EventEmitter implements CacheFactoryInterface {
  private static instance: CacheFactory | null = null;
  private cache: UnifiedCache | null = null;
  private configManager: CacheConfigManager | null = null;
  private monitor: CacheMonitor | null = null;
  private migrator: CacheMigrator | null = null;
  private isInitialized = false;
  private readonly options: Required<FactoryOptions>;

  private constructor(options: FactoryOptions = {}) {
    super();
    
    this.options = {
      configPath: options.configPath || join(process.cwd(), '.cache', 'config.json'),
      autoMigrate: options.autoMigrate ?? true,
      enableMonitoring: options.enableMonitoring ?? true,
      enableWarming: options.enableWarming ?? true,
      projectRoot: options.projectRoot || process.cwd(),
      environment: options.environment || (process.env.NODE_ENV as any) || 'development'
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: FactoryOptions): CacheFactory {
    if (!CacheFactory.instance) {
      CacheFactory.instance = new CacheFactory(options);
    }
    return CacheFactory.instance;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  static reset(): void {
    if (CacheFactory.instance) {
      CacheFactory.instance.shutdown().catch(() => {});
      CacheFactory.instance = null;
    }
  }

  /**
   * Create and configure the unified cache system
   */
  async create(config?: Partial<CacheConfig>): Promise<UnifiedCache> {
    if (this.cache && this.isInitialized) {
      return this.cache;
    }

    try {
      this.emit('factoryStarting');

      // Initialize configuration manager
      await this._initializeConfigManager(config);
      
      // Get final configuration
      const finalConfig = await this.configManager!.getConfig();
      
      // Create and configure monitoring first
      if (this.options.enableMonitoring) {
        await this._createMonitoring(finalConfig);
      }
      
      // Create cache engine
      const engine = new CacheEngine(finalConfig, this.monitor!, this.configManager!);
      
      // Create and register cache layers
      await this._createCacheLayers(engine, finalConfig);
      
      // Create and configure strategy manager
      await this._createStrategyManager(engine, finalConfig);
      
      // Initialize the cache engine
      await engine.initialize();
      
      // Perform migration if enabled
      if (this.options.autoMigrate) {
        await this._performMigration(engine);
      }
      
      // Warm cache if enabled
      if (this.options.enableWarming) {
        await this._warmCache(engine, finalConfig);
      }
      
      this.cache = engine;
      this.isInitialized = true;
      
      this.emit('factoryReady', { cache: this.cache });
      
      return this.cache;
    } catch (error) {
      this.emit('factoryError', { error });
      throw error;
    }
  }

  /**
   * Get the current cache instance
   */
  getCache(): UnifiedCache | null {
    return this.cache;
  }

  /**
   * Get configuration manager
   */
  getConfigManager(): CacheConfigManager | null {
    return this.configManager;
  }

  /**
   * Get monitor
   */
  getMonitor(): CacheMonitor | null {
    return this.monitor;
  }

  /**
   * Get migrator
   */
  getMigrator(): CacheMigrator | null {
    return this.migrator;
  }

  /**
   * Reconfigure the cache system
   */
  async reconfigure(config: Partial<CacheConfig>): Promise<void> {
    if (!this.configManager) {
      throw new Error('Cache factory not initialized');
    }

    await this.configManager.updateConfig(config);
    
    // Recreate cache with new configuration
    if (this.cache) {
      await this.cache.shutdown();
      this.cache = null;
      this.isInitialized = false;
    }
    
    await this.create();
  }

  /**
   * Shutdown the cache system
   */
  async shutdown(): Promise<void> {
    try {
      this.emit('factoryShutdown');
      
      if (this.cache) {
        await this.cache.shutdown();
        this.cache = null;
      }
      
      if (this.monitor) {
        await this.monitor.shutdown();
        this.monitor = null;
      }
      
      if (this.migrator) {
        await this.migrator.shutdown();
        this.migrator = null;
      }
      
      if (this.configManager) {
        await this.configManager.shutdown();
        this.configManager = null;
      }
      
      this.isInitialized = false;
      
      this.emit('factoryShutdownComplete');
    } catch (error) {
      this.emit('factoryShutdownError', { error });
      throw error;
    }
  }

  /**
   * Create unified cache instance (CacheFactoryInterface method)
   */
  async createCache(config?: any): Promise<UnifiedCache> {
    return this.create(config);
  }

  /**
   * Create namespaced cache instance (CacheFactoryInterface method)
   */
  createNamespacedCache<T = unknown>(namespace: CacheNamespace): NamespacedCache<T> {
    if (!this.cache) {
      throw new Error('Cache not initialized. Call create() first.');
    }
    return this.cache.createNamespacedCache<T>(namespace);
  }

  /**
   * Get default cache instance (CacheFactoryInterface method)
   */
  getDefaultCache(): UnifiedCache {
    if (!this.cache) {
      throw new Error('Cache not initialized. Call create() first.');
    }
    return this.cache;
  }

  /**
   * Create cache layer (CacheFactoryInterface method)
   */
  async createLayer(type: string, config: any): Promise<CacheLayerInterface> {
    switch (type) {
      case 'memory':
        const memoryLayer = new MemoryCacheLayer(config);
        await memoryLayer.initialize();
        return memoryLayer;
      case 'disk':
        const diskLayer = new DiskCacheLayer(config);
        await diskLayer.initialize();
        return diskLayer;
      default:
        throw new Error(`Unknown layer type: ${type}`);
    }
  }

  /**
   * Create cache strategy (CacheFactoryInterface method)
   */
  async createStrategy(config: any): Promise<CacheStrategyInterface> {
    const strategy = new CacheStrategyManager(config);
    await strategy.initialize();
    return strategy;
  }

  /**
   * Create cache monitor (CacheFactoryInterface method)
   */
  async createMonitor(config: any): Promise<CacheMonitorInterface> {
    const monitor = new CacheMonitor(config);
    await monitor.initialize();
    return monitor;
  }

  /**
   * Validate configuration (CacheFactoryInterface method)
   */
  async validateConfig(config: any): Promise<boolean> {
    try {
      // Basic validation - check required properties
      if (!config || typeof config !== 'object') {
        return false;
      }
      if (!config.layers || typeof config.layers !== 'object') {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get factory status
   */
  getStatus(): {
    initialized: boolean;
    hasCache: boolean;
    hasMonitor: boolean;
    hasMigrator: boolean;
    environment: string;
  } {
    return {
      initialized: this.isInitialized,
      hasCache: this.cache !== null,
      hasMonitor: this.monitor !== null,
      hasMigrator: this.migrator !== null,
      environment: this.options.environment
    };
  }

  /**
   * Validate cache system health
   */
  async validateHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      if (!this.isInitialized) {
        issues.push('Cache factory not initialized');
        recommendations.push('Call create() to initialize the cache system');
        return { healthy: false, issues, recommendations };
      }

      if (!this.cache) {
        issues.push('Cache instance not available');
        recommendations.push('Recreate cache instance');
      } else {
        // Check cache health
        const cacheHealth = await this.cache.health();
        if (!cacheHealth.healthy) {
          issues.push('Cache system unhealthy');
          issues.push(...cacheHealth.issues);
        }
      }

      if (this.monitor) {
        // Check monitoring health
        const monitorHealth = await this.monitor.getHealth();
        if (!monitorHealth.healthy) {
          issues.push('Monitoring system unhealthy');
          issues.push(...monitorHealth.issues);
        }
      }

      // Check configuration
      if (this.configManager) {
        try {
          await this.configManager.validateConfig();
        } catch (error) {
          issues.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          recommendations.push('Review and fix cache configuration');
        }
      }

      // Performance recommendations
      if (this.cache) {
        const stats = await this.cache.stats();
        
        if (stats.hitRatio < 0.7) {
          recommendations.push('Consider adjusting cache size or TTL settings to improve hit ratio');
        }
        
        if (stats.memoryUsage > 0.9) {
          recommendations.push('Memory usage is high, consider increasing memory limits or enabling disk cache');
        }
        
        if (stats.evictions > stats.sets * 0.1) {
          recommendations.push('High eviction rate detected, consider increasing cache size');
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      issues.push(`Health validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { healthy: false, issues, recommendations };
    }
  }

  // Private helper methods

  private async _initializeConfigManager(config?: Partial<CacheConfig>): Promise<void> {
    this.configManager = new CacheConfigManager({
      configPath: this.options.configPath,
      environment: this.options.environment
    });
    
    await this.configManager.initialize();
    
    if (config) {
      await this.configManager.updateConfig(config);
    }
  }

  private async _createCacheLayers(engine: CacheEngine, config: CacheConfig): Promise<void> {
    const layers: CacheLayerInterface[] = [];
    
    // Create memory layer
    if (config.layers.memory.enabled) {
      const memoryLayer = new MemoryCacheLayer(config.layers.memory);
      await memoryLayer.initialize();
      layers.push(memoryLayer);
    }
    
    // Create disk layer
    if (config.layers.disk.enabled) {
      const diskLayer = new DiskCacheLayer({
        ...config.layers.disk,
        basePath: join(this.options.projectRoot, config.layers.disk.basePath)
      });
      await diskLayer.initialize();
      layers.push(diskLayer);
    }
    
    // Register layers with engine
    for (const layer of layers) {
      await engine.registerLayer(layer);
    }
  }

  private async _createStrategyManager(engine: CacheEngine, config: CacheConfig): Promise<void> {
    const strategyManager = new CacheStrategyManager(config.strategies);
    await strategyManager.initialize();
    await engine.registerStrategy(strategyManager);
  }

  private async _createMonitoring(config: CacheConfig, engine?: CacheEngine): Promise<void> {
    this.monitor = new CacheMonitor(config.monitoring);
    await this.monitor.initialize();
    
    // Register cache layers with monitor if engine is provided
    if (engine) {
      const layers = (engine as any).layers || [];
      for (const layer of layers) {
        await this.monitor.registerLayer(layer);
      }
    }
  }

  private async _performMigration(engine: CacheEngine): Promise<void> {
    try {
      this.migrator = new CacheMigrator({
        batchSize: 50,
        maxConcurrency: 2,
        timeout: 30000,
        preserveMetadata: true,
        validateData: true,
        backupBeforeMigration: true,
        cleanupAfterMigration: false // Conservative for safety
      });
      
      await this.migrator.initialize();
      
      // Validate legacy caches first
      const validationResults = await migrationUtils.validateAllLegacyCaches();
      
      let hasValidData = false;
      for (const [adapterName, result] of Object.entries(validationResults)) {
        if (result.valid && result.totalKeys > 0) {
          hasValidData = true;
          this.emit('migrationValidation', {
            adapter: adapterName,
            valid: result.valid,
            keys: result.totalKeys
          });
        }
      }
      
      if (hasValidData) {
        this.emit('migrationStarting');
        
        // Perform migration
        const results = await migrationUtils.migrateAll(engine);
        
        for (const result of results) {
          this.emit('migrationCompleted', {
            planId: result.planId,
            status: result.status,
            migratedCount: result.migratedCount
          });
        }
      } else {
        this.emit('migrationSkipped', { reason: 'No valid legacy data found' });
      }
    } catch (error) {
      this.emit('migrationError', { error });
      // Don't fail factory creation due to migration errors
      console.warn('Cache migration failed:', error);
    }
  }

  private async _warmCache(engine: CacheEngine, config: CacheConfig): Promise<void> {
    if (!config.warming.enabled) {
      return;
    }
    
    try {
      this.emit('warmingStarting');
      
      const warmingPromises: Promise<void>[] = [];
      
      // Warm critical namespaces
      for (const namespace of config.warming.criticalNamespaces) {
        warmingPromises.push(
          engine.warm(namespace, {
            priority: 'high',
            maxItems: config.warming.maxItems,
            timeout: config.warming.timeout
          })
        );
      }
      
      // Warm preload data
      for (const [key, value] of Object.entries(config.warming.preloadData)) {
        warmingPromises.push(
          engine.set(key, value, {
            namespace: 'preload',
            ttl: 60 * 60 * 1000 // 1 hour
          })
        );
      }
      
      await Promise.allSettled(warmingPromises);
      
      this.emit('warmingCompleted');
    } catch (error) {
      this.emit('warmingError', { error });
      // Don't fail factory creation due to warming errors
      console.warn('Cache warming failed:', error);
    }
  }
}

/**
 * Convenience functions for common use cases
 */
export const cacheFactory = {
  /**
   * Create a cache instance with default configuration
   */
  async createDefault(options?: FactoryOptions): Promise<UnifiedCache> {
    const factory = CacheFactory.getInstance(options);
    return await factory.create();
  },

  /**
   * Create a cache instance for development
   */
  async createDevelopment(projectRoot?: string): Promise<UnifiedCache> {
    const factory = CacheFactory.getInstance({
      environment: 'development',
      projectRoot,
      autoMigrate: true,
      enableMonitoring: true,
      enableWarming: false // Skip warming in development
    });
    
    return await factory.create({
      layers: {
        memory: {
          enabled: true,
          maxSize: 50 * 1024 * 1024, // 50MB
          maxItems: 1000,
          ttl: 30 * 60 * 1000 // 30 minutes
        },
        disk: {
          enabled: false // Disable disk cache in development
        }
      },
      monitoring: {
        enabled: true,
        metricsInterval: 30000, // 30 seconds
        healthCheckInterval: 60000 // 1 minute
      }
    });
  },

  /**
   * Create a cache instance for production
   */
  async createProduction(projectRoot?: string): Promise<UnifiedCache> {
    const factory = CacheFactory.getInstance({
      environment: 'production',
      projectRoot,
      autoMigrate: true,
      enableMonitoring: true,
      enableWarming: true
    });
    
    return await factory.create({
      layers: {
        memory: {
          enabled: true,
          maxSize: 200 * 1024 * 1024, // 200MB
          maxItems: 10000,
          ttl: 60 * 60 * 1000 // 1 hour
        },
        disk: {
          enabled: true,
          maxSize: 1024 * 1024 * 1024, // 1GB
          maxItems: 50000,
          ttl: 24 * 60 * 60 * 1000 // 24 hours
        }
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        healthCheckInterval: 5 * 60 * 1000 // 5 minutes
      },
      warming: {
        enabled: true,
        criticalNamespaces: ['plugin', 'config'],
        maxItems: 100,
        timeout: 10000
      }
    });
  },

  /**
   * Create a cache instance for testing
   */
  async createTest(): Promise<UnifiedCache> {
    const factory = CacheFactory.getInstance({
      environment: 'test',
      autoMigrate: false,
      enableMonitoring: false,
      enableWarming: false
    });
    
    return await factory.create({
      layers: {
        memory: {
          enabled: true,
          maxSize: 10 * 1024 * 1024, // 10MB
          maxItems: 100,
          ttl: 5 * 60 * 1000 // 5 minutes
        },
        disk: {
          enabled: false // Disable disk cache in tests
        }
      },
      monitoring: {
        enabled: false
      }
    });
  },

  /**
   * Get the current factory instance
   */
  getInstance(): CacheFactory {
    return CacheFactory.getInstance();
  },

  /**
   * Reset factory (mainly for testing)
   */
  reset(): void {
    CacheFactory.reset();
  }
};

/**
 * Default export for convenience
 */
export default cacheFactory;