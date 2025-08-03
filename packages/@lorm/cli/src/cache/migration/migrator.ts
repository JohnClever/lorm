/**
 * Cache Migration System
 * 
 * This module provides utilities to migrate from legacy cache implementations
 * to the new unified cache system, ensuring data preservation and smooth transitions.
 */

import type {
  CacheMigrationInterface,
  CacheMigrationStatus,
  LegacyCacheAdapter,
  CacheEntry,
  CacheNamespace,
  UnifiedCache
} from '../core/types.js';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

/**
 * Migration configuration
 */
interface MigrationConfig {
  batchSize: number;
  maxConcurrency: number;
  timeout: number;
  preserveMetadata: boolean;
  validateData: boolean;
  backupBeforeMigration: boolean;
  cleanupAfterMigration: boolean;
}

/**
 * Migration plan
 */
interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  legacyAdapters: LegacyCacheAdapter[];
  targetNamespaces: CacheNamespace[];
  estimatedDuration: number;
  estimatedDataSize: number;
  dependencies: string[];
}

/**
 * Migration step
 */
interface MigrationStep {
  id: string;
  name: string;
  adapter: LegacyCacheAdapter;
  namespace: CacheNamespace;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: Error;
  migratedCount: number;
  totalCount: number;
}

/**
 * Migration result
 */
interface MigrationResult {
  planId: string;
  status: 'success' | 'partial' | 'failed';
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalMigrated: number;
  totalErrors: number;
  duration: number;
  errors: Array<{ step: string; error: Error }>;
}

/**
 * Legacy cache adapters for different cache implementations
 */
class CommandCacheAdapter implements LegacyCacheAdapter {
  readonly name = 'CommandCache';
  readonly version = '1.0.0';
  
  private cachePath: string;
  
  constructor(cachePath: string) {
    this.cachePath = cachePath;
  }
  
  async getKeys(): Promise<string[]> {
    try {
      // Read from file system cache
      const cacheDir = join(this.cachePath, '.cache');
      const files = await fs.readdir(cacheDir).catch(() => []);
      return files.filter(f => f.endsWith('.cache')).map(f => f.replace('.cache', ''));
    } catch {
      return [];
    }
  }
  
  async getData(key: string): Promise<CacheEntry | null> {
    try {
      const filePath = join(this.cachePath, '.cache', `${key}.cache`);
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      return {
        key,
        value: parsed.value,
        metadata: {
          createdAt: new Date(parsed.timestamp || Date.now()),
          lastAccessed: new Date(),
          accessCount: 1,
          size: JSON.stringify(parsed.value).length,
          ttl: parsed.ttl || 0,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
          namespace: 'custom'
        }
      };
    } catch {
      return null;
    }
  }
  
  async cleanup(): Promise<void> {
    // Optional: Remove legacy cache files after migration
    const cacheDir = join(this.cachePath, '.cache');
    try {
      await fs.rmdir(cacheDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

class ConfigValidationCacheAdapter implements LegacyCacheAdapter {
  readonly name = 'ConfigValidationCache';
  readonly version = '1.0.0';
  
  private configCache: Map<string, any>;
  
  constructor() {
    // Access the singleton instance if available
    this.configCache = new Map();
    try {
      // Try to access existing cache data
      const ConfigValidationCache = require('../../utils/config-cache.ts').ConfigValidationCache;
      if (ConfigValidationCache.getInstance) {
        const instance = ConfigValidationCache.getInstance();
        // Extract cache data if accessible
        this.configCache = instance.cache || new Map();
      }
    } catch {
      // Legacy cache not available
    }
  }
  
  async getKeys(): Promise<string[]> {
    return Array.from(this.configCache.keys());
  }
  
  async getData(key: string): Promise<CacheEntry | null> {
    const data = this.configCache.get(key);
    if (!data) {
      return null;
    }
    
    return {
      key,
      value: data.result,
      metadata: {
        createdAt: new Date(data.timestamp || Date.now()),
        lastAccessed: new Date(),
        accessCount: 1,
        size: JSON.stringify(data.result).length,
        ttl: 5 * 60 * 1000, // 5 minutes default
        namespace: 'config'
      }
    };
  }
  
  async cleanup(): Promise<void> {
    this.configCache.clear();
  }
}

class LazyLoaderCacheAdapter implements LegacyCacheAdapter {
  readonly name = 'LazyLoaderCache';
  readonly version = '1.0.0';
  
  private moduleCache: Map<string, any>;
  
  constructor() {
    this.moduleCache = new Map();
    try {
      // Try to access lazy loader cache
      const lazyLoader = require('../../utils/lazy-loader.ts');
      if (lazyLoader.lazyLoaders) {
        // Extract cached modules
        for (const [name, loader] of Object.entries(lazyLoader.lazyLoaders)) {
          if ((loader as any).cached) {
            this.moduleCache.set(name, (loader as any).cached);
          }
        }
      }
    } catch {
      // Legacy cache not available
    }
  }
  
  async getKeys(): Promise<string[]> {
    return Array.from(this.moduleCache.keys());
  }
  
  async getData(key: string): Promise<CacheEntry | null> {
    const data = this.moduleCache.get(key);
    if (!data) {
      return null;
    }
    
    return {
      key,
      value: data,
      metadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        size: 1024, // Estimate for modules
        ttl: 60 * 60 * 1000, // 1 hour
        namespace: 'plugin'
      }
    };
  }
  
  async cleanup(): Promise<void> {
    this.moduleCache.clear();
  }
}

class PluginCacheAdapter implements LegacyCacheAdapter {
  readonly name = 'PluginCache';
  readonly version = '1.0.0';
  
  private pluginCache: Map<string, any>;
  
  constructor() {
    this.pluginCache = new Map();
    try {
      // Try to access plugin manager cache
      const pluginManager = require('../../plugins/core/manager.ts');
      if (pluginManager.pluginCache) {
        this.pluginCache = pluginManager.pluginCache;
      }
    } catch {
      // Legacy cache not available
    }
  }
  
  async getKeys(): Promise<string[]> {
    return Array.from(this.pluginCache.keys());
  }
  
  async getData(key: string): Promise<CacheEntry | null> {
    const data = this.pluginCache.get(key);
    if (!data) {
      return null;
    }
    
    return {
      key,
      value: data,
      metadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        size: JSON.stringify(data).length,
        ttl: 30 * 60 * 1000, // 30 minutes
        namespace: 'plugin'
      }
    };
  }
  
  async cleanup(): Promise<void> {
    this.pluginCache.clear();
  }
}

/**
 * Cache migration implementation
 */
export class CacheMigrator extends EventEmitter implements CacheMigrationInterface {
  private readonly config: MigrationConfig;
  private readonly plans = new Map<string, MigrationPlan>();
  private readonly results = new Map<string, MigrationResult>();
  private isInitialized = false;

  constructor(config: Partial<MigrationConfig> = {}) {
    super();
    
    this.config = {
      batchSize: 100,
      maxConcurrency: 3,
      timeout: 30 * 1000, // 30 seconds
      preserveMetadata: true,
      validateData: true,
      backupBeforeMigration: true,
      cleanupAfterMigration: false, // Conservative default
      ...config
    };
  }

  /**
   * Initialize the migration system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Create default migration plans
    await this._createDefaultPlans();

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the migration system
   */
  async shutdown(): Promise<void> {
    this.plans.clear();
    this.results.clear();
    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Create a migration plan
   */
  async createPlan(
    name: string,
    description: string,
    adapters: LegacyCacheAdapter[],
    targetNamespaces: CacheNamespace[]
  ): Promise<string> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Estimate migration metrics
    let estimatedDataSize = 0;
    let estimatedDuration = 0;
    
    for (const adapter of adapters) {
      try {
        const keys = await adapter.getKeys();
        estimatedDataSize += keys.length * 1024; // Rough estimate
        estimatedDuration += keys.length * 10; // 10ms per item estimate
      } catch {
        // Ignore estimation errors
      }
    }
    
    const plan: MigrationPlan = {
      id: planId,
      name,
      description,
      legacyAdapters: adapters,
      targetNamespaces,
      estimatedDuration,
      estimatedDataSize,
      dependencies: []
    };
    
    this.plans.set(planId, plan);
    this.emit('planCreated', { planId, plan });
    
    return planId;
  }

  /**
   * Execute a migration plan
   */
  async executePlan(planId: string, targetCache: UnifiedCache): Promise<CacheMigrationStatus> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Migration plan not found: ${planId}`);
    }

    const startTime = Date.now();
    const steps: MigrationStep[] = [];
    const errors: Array<{ step: string; error: Error }> = [];
    
    let totalMigrated = 0;
    let completedSteps = 0;
    let failedSteps = 0;

    try {
      this.emit('migrationStarted', { planId, plan });

      // Create migration steps
      for (let i = 0; i < plan.legacyAdapters.length; i++) {
        const adapter = plan.legacyAdapters[i];
        const namespace = plan.targetNamespaces[i] || 'custom';
        
        const step: MigrationStep = {
          id: `${planId}_step_${i}`,
          name: `Migrate ${adapter.name}`,
          adapter,
          namespace,
          status: 'pending',
          progress: 0,
          migratedCount: 0,
          totalCount: 0
        };
        
        steps.push(step);
      }

      // Execute steps with concurrency control
      const semaphore = new Semaphore(this.config.maxConcurrency);
      const stepPromises = steps.map(step => 
        semaphore.acquire().then(async (release) => {
          try {
            await this._executeStep(step, targetCache);
            completedSteps++;
            totalMigrated += step.migratedCount;
          } catch (error) {
            failedSteps++;
            step.status = 'failed';
            step.error = error as Error;
            errors.push({ step: step.name, error: error as Error });
          } finally {
            release();
          }
        })
      );

      await Promise.all(stepPromises);

      // Determine overall status
      const status: 'success' | 'partial' | 'failed' = 
        failedSteps === 0 ? 'success' :
        completedSteps > 0 ? 'partial' : 'failed';

      const result: MigrationResult = {
        planId,
        status,
        totalSteps: steps.length,
        completedSteps,
        failedSteps,
        totalMigrated,
        totalErrors: errors.length,
        duration: Date.now() - startTime,
        errors
      };

      this.results.set(planId, result);
      this.emit('migrationCompleted', { planId, result });

      return {
        planId,
        status,
        progress: completedSteps / steps.length,
        currentStep: steps.length,
        totalSteps: steps.length,
        migratedCount: totalMigrated,
        errors: errors.map(e => e.error.message),
        startTime: new Date(startTime),
        estimatedCompletion: new Date()
      };
    } catch (error) {
      const result: MigrationResult = {
        planId,
        status: 'failed',
        totalSteps: steps.length,
        completedSteps,
        failedSteps: steps.length - completedSteps,
        totalMigrated,
        totalErrors: 1,
        duration: Date.now() - startTime,
        errors: [{ step: 'execution', error: error as Error }]
      };

      this.results.set(planId, result);
      this.emit('migrationFailed', { planId, error });
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(planId: string): Promise<CacheMigrationStatus | null> {
    const result = this.results.get(planId);
    if (!result) {
      return null;
    }

    return {
      planId,
      status: result.status,
      progress: result.completedSteps / result.totalSteps,
      currentStep: result.completedSteps,
      totalSteps: result.totalSteps,
      migratedCount: result.totalMigrated,
      errors: result.errors.map(e => e.error.message),
      startTime: new Date(Date.now() - result.duration),
      estimatedCompletion: new Date()
    };
  }

  /**
   * Get all migration plans
   */
  getPlans(): MigrationPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get migration results
   */
  getResults(): MigrationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Validate legacy cache data
   */
  async validateLegacyData(adapter: LegacyCacheAdapter): Promise<{
    valid: boolean;
    totalKeys: number;
    validKeys: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalKeys = 0;
    let validKeys = 0;

    try {
      const keys = await adapter.getKeys();
      totalKeys = keys.length;

      for (const key of keys) {
        try {
          const data = await adapter.getData(key);
          if (data && this._validateCacheEntry(data)) {
            validKeys++;
          } else {
            errors.push(`Invalid data for key: ${key}`);
          }
        } catch (error) {
          errors.push(`Error reading key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Error accessing adapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      totalKeys,
      validKeys,
      errors
    };
  }

  /**
   * Create backup of legacy cache data
   */
  async createBackup(adapter: LegacyCacheAdapter, backupPath: string): Promise<void> {
    try {
      const keys = await adapter.getKeys();
      const backup: Record<string, any> = {};

      for (const key of keys) {
        try {
          const data = await adapter.getData(key);
          if (data) {
            backup[key] = data;
          }
        } catch (error) {
          this.emit('warning', {
            message: `Failed to backup key: ${key}`,
            context: { adapter: adapter.name, error }
          });
        }
      }

      const backupData = {
        adapter: adapter.name,
        version: adapter.version,
        timestamp: new Date().toISOString(),
        data: backup
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      this.emit('backupCreated', { adapter: adapter.name, path: backupPath, keys: keys.length });
    } catch (error) {
      this.emit('error', { operation: 'createBackup', adapter: adapter.name, error });
      throw error;
    }
  }

  // Private helper methods

  private async _createDefaultPlans(): Promise<void> {
    const projectRoot = process.cwd();
    
    // Plan 1: Migrate CommandCache
    await this.createPlan(
      'Command Cache Migration',
      'Migrate legacy CommandCache file-based cache to unified system',
      [new CommandCacheAdapter(projectRoot)],
      ['custom']
    );

    // Plan 2: Migrate ConfigValidationCache
    await this.createPlan(
      'Config Validation Cache Migration',
      'Migrate legacy ConfigValidationCache to unified system',
      [new ConfigValidationCacheAdapter()],
      ['config']
    );

    // Plan 3: Migrate LazyLoader cache
    await this.createPlan(
      'Lazy Loader Cache Migration',
      'Migrate legacy LazyLoader module cache to unified system',
      [new LazyLoaderCacheAdapter()],
      ['plugin']
    );

    // Plan 4: Migrate Plugin cache
    await this.createPlan(
      'Plugin Cache Migration',
      'Migrate legacy plugin manager cache to unified system',
      [new PluginCacheAdapter()],
      ['plugin']
    );

    // Plan 5: Complete migration (all adapters)
    await this.createPlan(
      'Complete Cache Migration',
      'Migrate all legacy cache implementations to unified system',
      [
        new CommandCacheAdapter(projectRoot),
        new ConfigValidationCacheAdapter(),
        new LazyLoaderCacheAdapter(),
        new PluginCacheAdapter()
      ],
      ['custom', 'config', 'plugin', 'plugin']
    );
  }

  private async _executeStep(step: MigrationStep, targetCache: UnifiedCache): Promise<void> {
    step.status = 'running';
    step.startTime = new Date();
    
    this.emit('stepStarted', { step });

    try {
      // Get all keys from legacy adapter
      const keys = await step.adapter.getKeys();
      step.totalCount = keys.length;
      
      if (keys.length === 0) {
        step.status = 'completed';
        step.progress = 1;
        step.endTime = new Date();
        this.emit('stepCompleted', { step });
        return;
      }

      // Create backup if configured
      if (this.config.backupBeforeMigration) {
        const backupPath = join(process.cwd(), '.cache-backup', `${step.adapter.name}_${Date.now()}.json`);
        await this.createBackup(step.adapter, backupPath);
      }

      // Migrate data in batches
      for (let i = 0; i < keys.length; i += this.config.batchSize) {
        const batch = keys.slice(i, i + this.config.batchSize);
        
        await Promise.all(batch.map(async (key) => {
          try {
            const data = await step.adapter.getData(key);
            if (data) {
              // Validate data if configured
              if (this.config.validateData && !this._validateCacheEntry(data)) {
                throw new Error(`Invalid cache entry for key: ${key}`);
              }

              // Migrate to target cache
              await targetCache.set(key, data.value, {
                namespace: step.namespace,
                ttl: data.metadata.ttl,
                metadata: this.config.preserveMetadata ? data.metadata.metadata : undefined
              });

              step.migratedCount++;
            }
          } catch (error) {
            this.emit('warning', {
              message: `Failed to migrate key: ${key}`,
              context: { step: step.name, error }
            });
          }
        }));

        // Update progress
        step.progress = Math.min(step.migratedCount / step.totalCount, 1);
        this.emit('stepProgress', { step });
      }

      // Cleanup legacy cache if configured
      if (this.config.cleanupAfterMigration) {
        await step.adapter.cleanup();
      }

      step.status = 'completed';
      step.progress = 1;
      step.endTime = new Date();
      
      this.emit('stepCompleted', { step });
    } catch (error) {
      step.status = 'failed';
      step.error = error as Error;
      step.endTime = new Date();
      
      this.emit('stepFailed', { step, error });
      throw error;
    }
  }

  private _validateCacheEntry(entry: CacheEntry): boolean {
    return (
      typeof entry.key === 'string' &&
      entry.value !== undefined &&
      entry.metadata &&
      entry.metadata.createdAt instanceof Date &&
      typeof entry.metadata.size === 'number'
    );
  }
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }
}

/**
 * Migration utilities
 */
export const migrationUtils = {
  /**
   * Create migrator with default configuration
   */
  createMigrator(config?: Partial<MigrationConfig>): CacheMigrator {
    return new CacheMigrator(config);
  },

  /**
   * Quick migration for all legacy caches
   */
  async migrateAll(targetCache: UnifiedCache): Promise<CacheMigrationStatus[]> {
    const migrator = new CacheMigrator();
    await migrator.initialize();
    
    const plans = migrator.getPlans();
    const completePlan = plans.find(p => p.name === 'Complete Cache Migration');
    
    if (!completePlan) {
      throw new Error('Complete migration plan not found');
    }
    
    const status = await migrator.executePlan(completePlan.id, targetCache);
    await migrator.shutdown();
    
    return [status];
  },

  /**
   * Validate all legacy caches
   */
  async validateAllLegacyCaches(): Promise<Record<string, any>> {
    const migrator = new CacheMigrator();
    const projectRoot = process.cwd();
    
    const adapters = [
      new CommandCacheAdapter(projectRoot),
      new ConfigValidationCacheAdapter(),
      new LazyLoaderCacheAdapter(),
      new PluginCacheAdapter()
    ];
    
    const results: Record<string, any> = {};
    
    for (const adapter of adapters) {
      try {
        results[adapter.name] = await migrator.validateLegacyData(adapter);
      } catch (error) {
        results[adapter.name] = {
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return results;
  }
};