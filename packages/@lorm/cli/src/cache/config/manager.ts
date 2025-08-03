/**
 * Cache Configuration Manager
 * 
 * This module manages cache configuration, validation, and dynamic updates
 * for the unified cache system.
 */

import type {
  CacheConfigManagerInterface,
  CacheConfig,
  CacheLayerConfig,
  CacheWarmingConfig,
  CacheNamespace,
  CacheLayer,
  EvictionStrategy,
  CompressionAlgorithm,
  MemoryLayerConfig,
  DiskLayerConfig
} from '../core/types.js';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { z, ZodError } from 'zod';

/**
 * Configuration file structure
 */
interface ConfigFile {
  version: string;
  cache: CacheConfig;
  lastModified: string;
  checksum?: string;
}

/**
 * Configuration validation schemas
 */
const StrategyConfigSchema = z.object({
  eviction: z.object({
    algorithm: z.enum(['lru', 'lfu', 'fifo', 'random']),
    memoryPressureThreshold: z.number().min(0).max(1),
    diskPressureThreshold: z.number().min(0).max(1)
  }),
  routing: z.object({
    defaultStrategy: z.enum(['memory', 'disk']),
    rules: z.array(z.object({
      condition: z.record(z.string(), z.unknown()),
      target: z.enum(['memory', 'disk']),
      priority: z.number()
    }))
  })
});

const CacheLayerConfigSchema = z.object({
  enabled: z.boolean(),
  maxSize: z.number().positive(),
  maxEntries: z.number().positive(),
  defaultTtl: z.number().positive(),
  evictionStrategy: z.enum(['lru', 'lfu', 'fifo', 'random']),
  compressionThreshold: z.number().nonnegative(),
  compressionAlgorithm: z.enum(['gzip', 'deflate', 'none']),
  cleanupInterval: z.number().positive(),
  customOptions: z.record(z.string(), z.unknown()).optional()
});

const CacheWarmingConfigSchema = z.object({
  enabled: z.boolean(),
  strategies: z.array(z.string()),
  schedule: z.string().optional(),
  priority: z.number().min(1).max(10),
  maxConcurrency: z.number().positive(),
  timeout: z.number().positive()
});

const CacheConfigSchema = z.object({
  enabled: z.boolean(),
  layers: z.object({
    memory: CacheLayerConfigSchema,
    disk: CacheLayerConfigSchema
  }),
  strategies: StrategyConfigSchema,
  monitoring: z.object({
    enabled: z.boolean(),
    metricsInterval: z.number().positive(),
    healthCheckInterval: z.number().positive(),
    alertThresholds: z.record(z.string(), z.number())
  }),
  warming: CacheWarmingConfigSchema,
  namespaces: z.record(z.string(), z.object({
    enabled: z.boolean(),
    defaultTtl: z.number().positive().optional(),
    maxSize: z.number().positive().optional(),
    priority: z.number().min(1).max(10).optional()
  })).optional()
});

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  layers: {
    memory: {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 10000,
      ttl: 60 * 60 * 1000, // 1 hour
      evictionPolicy: 'lru',
      compressionThreshold: 1024 // 1KB
    },
    disk: {
      enabled: true,
      basePath: './cache',
      maxSize: 500 * 1024 * 1024, // 500MB
      maxItems: 50000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      compression: 'gzip',
      atomicWrites: true
    }
  },
  strategies: {
    eviction: {
      algorithm: 'lru',
      memoryPressureThreshold: 0.8,
      diskPressureThreshold: 0.9
    },
    routing: {
      defaultStrategy: 'memory',
      rules: [
        {
          condition: { namespace: 'config' },
          target: 'memory',
          priority: 100
        },
        {
          condition: { sizeThreshold: 1024 * 1024 }, // 1MB
          target: 'disk',
          priority: 80
        },
        {
          condition: { ttl: 60 * 1000 }, // 1 minute
          target: 'memory',
          priority: 70
        }
      ]
    }
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30 * 1000, // 30 seconds
    healthCheckInterval: 60 * 1000, // 1 minute
    alertThresholds: {
      memoryUsage: 0.8,
      diskUsage: 0.8,
      hitRatio: 0.5,
      errorRate: 0.05
    }
  },
  warming: {
    enabled: false,
    criticalNamespaces: ['config'] as CacheNamespace[],
    maxItems: 1000,
    timeout: 30 * 1000, // 30 seconds
    preloadData: {}
  }
};

/**
 * Cache configuration manager implementation
 */
export class CacheConfigManager extends EventEmitter implements CacheConfigManagerInterface {
  private config: CacheConfig;
  private configPath?: string;
  private watchTimer?: NodeJS.Timeout;
  private lastModified?: Date;
  private isInitialized = false;

  constructor(configPath?: string) {
    super();
    this.config = this._deepClone(DEFAULT_CONFIG);
    this.configPath = configPath;
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Load configuration from file if path provided
    if (this.configPath) {
      await this._loadConfigFromFile();
      
      // Start watching for changes
      this._startConfigWatch();
    }

    this.isInitialized = true;
    this.emit('initialized', { config: this.config });
  }

  /**
   * Shutdown the configuration manager
   */
  async shutdown(): Promise<void> {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = undefined;
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<CacheConfig> {
    return this._deepClone(this.config);
  }

  /**
   * Get layer configuration
   */
  getLayerConfig(layer: 'memory' | 'disk'): MemoryLayerConfig | DiskLayerConfig {
    return this._deepClone(this.config.layers[layer]);
  }



  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<CacheConfig>): Promise<void> {
    try {
      // Validate updates
      const newConfig = this._mergeConfig(this.config, updates);
      this._validateConfig(newConfig);

      // Apply updates
      const oldConfig = this._deepClone(this.config);
      this.config = newConfig;

      // Save to file if path provided
      if (this.configPath) {
        await this._saveConfigToFile();
      }

      this.emit('configUpdated', {
        oldConfig,
        newConfig: this.config,
        changes: this._getConfigChanges(oldConfig, this.config)
      });
    } catch (error) {
      this.emit('error', { operation: 'updateConfig', error });
      throw error;
    }
  }

  /**
   * Update layer configuration
   */
  async updateLayerConfig(layer: 'memory' | 'disk', updates: Partial<MemoryLayerConfig | DiskLayerConfig>): Promise<void> {
    const layerUpdates = {
      layers: {
        ...this.config.layers,
        [layer]: {
          ...this.config.layers[layer],
          ...updates
        }
      }
    };

    await this.updateConfig(layerUpdates);
  }



  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    await this.updateConfig(DEFAULT_CONFIG);
  }

  /**
   * Validate configuration
   */
  async validateConfig(config?: Partial<CacheConfig>): Promise<{ valid: boolean; errors: string[] }> {
    try {
      this._validateConfig(config ? this._mergeConfig(this.config, config) : this.config);
      return { valid: true, errors: [] };
    } catch (error) {
      const errors = error instanceof ZodError 
        ? error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        : [error instanceof Error ? error.message : 'Unknown validation error'];
      
      return { valid: false, errors };
    }
  }

  /**
   * Validate configuration (sync version)
   */
  validateConfigSync(config?: CacheConfig): { valid: boolean; errors: string[] } {
    try {
      this._validateConfig(config || this.config);
      return { valid: true, errors: [] };
    } catch (error) {
      const errors = error instanceof ZodError 
        ? error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        : [error instanceof Error ? error.message : 'Unknown validation error'];
      
      return { valid: false, errors };
    }
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): z.ZodSchema {
    return CacheConfigSchema;
  }

  /**
   * Export configuration
   */
  async exportConfig(): Promise<string> {
    const configFile: ConfigFile = {
      version: '1.0.0',
      cache: this.config,
      lastModified: new Date().toISOString(),
      checksum: this._calculateChecksum(this.config)
    };
    return JSON.stringify(configFile, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configData: string): Promise<void> {
    try {
      const configFile: ConfigFile = JSON.parse(configData);
      
      // Validate version compatibility
      if (!this._isVersionCompatible(configFile.version)) {
        throw new Error(`Incompatible configuration version: ${configFile.version}`);
      }

      // Validate checksum if provided
      if (configFile.checksum) {
        const calculatedChecksum = this._calculateChecksum(configFile.cache);
        if (calculatedChecksum !== configFile.checksum) {
          throw new Error('Configuration checksum mismatch');
        }
      }

      // Apply configuration
      await this.updateConfig(configFile.cache);

      this.emit('configImported', { version: configFile.version });
    } catch (error) {
      this.emit('error', { operation: 'importConfig', error });
      throw error;
    }
  }

  /**
   * Get configuration differences
   */
  getConfigDiff(other: CacheConfig): Record<string, { old: unknown; new: unknown }> {
    return this._getConfigChanges(this.config, other);
  }

  /**
   * Check if configuration has changed
   */
  hasConfigChanged(): boolean {
    if (!this.configPath || !this.lastModified) {
      return false;
    }

    try {
      const stats = require('fs').statSync(this.configPath);
      return stats.mtime > this.lastModified;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private async _loadConfigFromFile(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath!, 'utf8');
      const configFile: ConfigFile = JSON.parse(configData);
      
      // Validate and merge with defaults
      this._validateConfig(configFile.cache);
      this.config = this._mergeConfig(DEFAULT_CONFIG, configFile.cache);
      
      // Update last modified time
      const stats = await fs.stat(this.configPath!);
      this.lastModified = stats.mtime;
      
      this.emit('configLoaded', { path: this.configPath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, create with defaults
        await this._saveConfigToFile();
      } else {
        this.emit('error', { operation: 'loadConfig', error });
        throw error;
      }
    }
  }

  private async _saveConfigToFile(): Promise<void> {
    if (!this.configPath) {
      return;
    }

    try {
      const configData = await this.exportConfig();
      
      // Ensure directory exists
      await fs.mkdir(require('path').dirname(this.configPath), { recursive: true });
      
      // Write file atomically
      const tempPath = `${this.configPath}.tmp`;
      await fs.writeFile(tempPath, configData, 'utf8');
      await fs.rename(tempPath, this.configPath);
      
      // Update last modified time
      const stats = await fs.stat(this.configPath);
      this.lastModified = stats.mtime;
      
      this.emit('configSaved', { path: this.configPath });
    } catch (error) {
      this.emit('error', { operation: 'saveConfig', error });
      throw error;
    }
  }

  private _startConfigWatch(): void {
    if (!this.configPath) {
      return;
    }

    this.watchTimer = setInterval(async () => {
      try {
        if (this.hasConfigChanged()) {
          await this._loadConfigFromFile();
          this.emit('configReloaded', { path: this.configPath });
        }
      } catch (error) {
        this.emit('error', { operation: 'watchConfig', error });
      }
    }, 5000); // Check every 5 seconds
  }

  private _validateConfig(config: CacheConfig): void {
    try {
      CacheConfigSchema.parse(config);
      
      // Additional business logic validation
      this._validateBusinessRules(config);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(`Configuration validation failed: ${error.issues.map((e: any) => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  private _validateBusinessRules(config: CacheConfig): void {
    // Memory layer should have smaller limits than disk layer
    if (config.layers.memory.maxSize > config.layers.disk.maxSize) {
      throw new Error('Memory layer maxSize should not exceed disk layer maxSize');
    }

    if (config.layers.memory.maxItems > config.layers.disk.maxItems) {
      throw new Error('Memory layer maxItems should not exceed disk layer maxItems');
    }

    // TTL validation
    if (config.layers.memory.ttl > config.layers.disk.ttl) {
      throw new Error('Memory layer ttl should not exceed disk layer ttl');
    }

    // Strategy rules validation
    const priorities = config.strategies.routing.rules.map(rule => rule.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      throw new Error('Strategy rules must have unique priorities');
    }

    // Monitoring intervals validation
    if (config.monitoring.metricsInterval < 1000) {
      throw new Error('Metrics interval must be at least 1 second');
    }

    if (config.monitoring.healthCheckInterval < 5000) {
      throw new Error('Health check interval must be at least 5 seconds');
    }
  }

  private _mergeConfig(base: CacheConfig, updates: Partial<CacheConfig>): CacheConfig {
    return {
      layers: {
        memory: { ...base.layers.memory, ...updates.layers?.memory },
        disk: { ...base.layers.disk, ...updates.layers?.disk }
      },
      strategies: {
        eviction: {
          algorithm: updates.strategies?.eviction?.algorithm ?? base.strategies.eviction.algorithm,
          memoryPressureThreshold: updates.strategies?.eviction?.memoryPressureThreshold ?? base.strategies.eviction.memoryPressureThreshold,
          diskPressureThreshold: updates.strategies?.eviction?.diskPressureThreshold ?? base.strategies.eviction.diskPressureThreshold
        },
        routing: {
          defaultStrategy: updates.strategies?.routing?.defaultStrategy ?? base.strategies.routing.defaultStrategy,
          rules: updates.strategies?.routing?.rules ?? base.strategies.routing.rules
        }
      },
      monitoring: {
        enabled: updates.monitoring?.enabled ?? base.monitoring.enabled,
        metricsInterval: updates.monitoring?.metricsInterval ?? base.monitoring.metricsInterval,
        healthCheckInterval: updates.monitoring?.healthCheckInterval ?? base.monitoring.healthCheckInterval,
        alertThresholds: { ...base.monitoring.alertThresholds, ...updates.monitoring?.alertThresholds }
      },
      warming: {
        enabled: updates.warming?.enabled ?? base.warming.enabled,
        criticalNamespaces: updates.warming?.criticalNamespaces ?? base.warming.criticalNamespaces,
        maxItems: updates.warming?.maxItems ?? base.warming.maxItems,
        timeout: updates.warming?.timeout ?? base.warming.timeout,
        preloadData: { ...base.warming.preloadData, ...updates.warming?.preloadData }
      }
    };
  }

  private _getConfigChanges(
    oldConfig: CacheConfig,
    newConfig: CacheConfig
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    
    this._compareObjects(oldConfig, newConfig, '', changes);
    
    return changes;
  }

  private _compareObjects(
    oldObj: any,
    newObj: any,
    path: string,
    changes: Record<string, { old: unknown; new: unknown }>
  ): void {
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];
      
      if (typeof oldValue === 'object' && typeof newValue === 'object' && 
          oldValue !== null && newValue !== null && 
          !Array.isArray(oldValue) && !Array.isArray(newValue)) {
        this._compareObjects(oldValue, newValue, currentPath, changes);
      } else if (oldValue !== newValue) {
        changes[currentPath] = { old: oldValue, new: newValue };
      }
    }
  }

  private _deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  private _calculateChecksum(config: CacheConfig): string {
    const crypto = require('crypto');
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  private _isVersionCompatible(version: string): boolean {
    // Simple version compatibility check
    const [major] = version.split('.');
    return major === '1';
  }

  /**
   * Subscribe to configuration changes (CacheConfigManagerInterface method)
   */
  onConfigChange(listener: (config: any) => void): void {
    this.on('configUpdated', (data: { config: CacheConfig }) => {
      listener(data.config);
    });
    this.on('configReloaded', () => {
      listener(this.config);
    });
  }

  /**
   * Unsubscribe from configuration changes (CacheConfigManagerInterface method)
   */
  offConfigChange(listener: (config: any) => void): void {
    this.off('configUpdated', listener);
    this.off('configReloaded', listener);
  }
}

/**
 * Default configuration manager instance
 */
export const defaultConfigManager = new CacheConfigManager();

/**
 * Configuration utilities
 */
export const configUtils = {
  /**
   * Create configuration manager with file path
   */
  createManager(configPath: string): CacheConfigManager {
    return new CacheConfigManager(configPath);
  },

  /**
   * Get default configuration
   */
  getDefaultConfig(): CacheConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

  /**
   * Validate configuration object
   */
  validateConfig(config: unknown): { valid: boolean; errors: string[] } {
    try {
      CacheConfigSchema.parse(config);
      return { valid: true, errors: [] };
    } catch (error) {
      const errors = error instanceof ZodError 
        ? error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        : ['Invalid configuration format'];
      
      return { valid: false, errors };
    }
  }
};