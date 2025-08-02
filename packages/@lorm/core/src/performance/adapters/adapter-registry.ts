/**
 * Adapter Registry - Manages registration and discovery of performance adapters
 */

import type {
  PerformanceAdapter,
  AdapterFactory,
  AdapterRegistry as IAdapterRegistry,
  AdapterManager,
  AdapterManagerStats,
  AdapterEvent,
  AdapterEventType,
  BaseAdapterConfig,
  ComponentHealth,
  Metric,
  AdapterStats
} from '../types/index.js';
import { HealthStatus } from '../types/monitoring.js';
import { PerformanceEventType } from '../types/events.js';
import { AdapterStatus, AdapterType } from '../types/adapters.js';
import { EventEmitter } from 'events';

/**
 * Registry for managing performance adapters
 */
export class AdapterRegistry extends EventEmitter implements IAdapterRegistry {
  private _adapters: Map<string, PerformanceAdapter> = new Map();
  private _factories: Map<AdapterType, AdapterFactory> = new Map();
  private _typeMapping: Map<string, AdapterType> = new Map();
  private _tags: Map<string, Set<string>> = new Map();
  private _isInitialized = false;

  constructor() {
    super();
    this.setupEventHandling();
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      // Register built-in adapter factories
      await this.registerBuiltInFactories();
      
      this._isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Adapter registration
  async register(adapter: PerformanceAdapter): Promise<void> {
    const id = adapter.getId();
    const tags: string[] = [];
    if (this._adapters.has(id)) {
      throw new Error(`Adapter with id '${id}' is already registered`);
    }

    try {
      // Store adapter
      this._adapters.set(id, adapter);
      
      // Store type mapping
      this._typeMapping.set(id, adapter.getType());
      
      // Store tags
      if (tags.length > 0) {
        this._tags.set(id, new Set(tags));
      }
      
      // Set up event forwarding
      this.setupAdapterEventForwarding(id, adapter);
      
      this.emit('adapter:registered', {
        type: PerformanceEventType.ADAPTER_REGISTERED,
        timestamp: Date.now(),
        payload: {
          adapterId: id,
          adapterType: adapter.getType()
        }
      } as AdapterEvent);
      
    } catch (error) {
      // Clean up on error
      this._adapters.delete(id);
      this._typeMapping.delete(id);
      this._tags.delete(id);
      throw error;
    }
  }

  async unregister(id: string): Promise<boolean> {
    const adapter = this._adapters.get(id);
    if (!adapter) {
      return false;
    }

    try {
      // Stop adapter if running
      if (adapter.isRunning()) {
        await adapter.stop();
      }
      
      // Clean up
      this._adapters.delete(id);
      this._typeMapping.delete(id);
      this._tags.delete(id);
      
      this.emit('adapter:unregistered', {
        type: PerformanceEventType.ADAPTER_UNREGISTERED,
        timestamp: Date.now(),
        payload: {
          adapterId: id,
          adapterType: adapter.getType()
        }
      } as AdapterEvent);
      
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  // Adapter retrieval
  get(id: string): PerformanceAdapter | undefined {
    return this._adapters.get(id);
  }

  getByType(type: AdapterType): PerformanceAdapter[] {
    const adapters: PerformanceAdapter[] = [];
    
    for (const [id, adapterType] of this._typeMapping) {
      if (adapterType === type) {
        const adapter = this._adapters.get(id);
        if (adapter) {
          adapters.push(adapter);
        }
      }
    }
    
    return adapters;
  }

  getByTag(tag: string): PerformanceAdapter[] {
    const adapters: PerformanceAdapter[] = [];
    
    for (const [id, tags] of this._tags) {
      if (tags.has(tag)) {
        const adapter = this._adapters.get(id);
        if (adapter) {
          adapters.push(adapter);
        }
      }
    }
    
    return adapters;
  }

  getAll(): PerformanceAdapter[] {
    return Array.from(this._adapters.values());
  }

  getAllIds(): string[] {
    return Array.from(this._adapters.keys());
  }

  // Factory management
  registerFactory(type: AdapterType, factory: AdapterFactory): void {
    this._factories.set(type, factory);
    
    this.emit('factory:registered', {
      type: PerformanceEventType.ADAPTER_REGISTERED,
      timestamp: Date.now(),
      payload: {
        adapterId: `factory-${type}`,
        adapterType: type
      }
    } as AdapterEvent);
  }

  getFactory(type: AdapterType): AdapterFactory | undefined {
    return this._factories.get(type);
  }

  // Adapter creation
  async create(type: AdapterType, id: string, config: Partial<BaseAdapterConfig> = {}, tags: string[] = []): Promise<PerformanceAdapter> {
    const factory = this._factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for adapter type '${type}'`);
    }

    try {
      const fullConfig: BaseAdapterConfig = {
        id: config.id || id,
        name: config.name || id,
        type: config.type || type,
        enabled: config.enabled ?? true,
        ...config
      };
      const adapter = await factory.createAdapter(fullConfig as any);
      await this.register(adapter);
      // Set tags separately
      if (tags.length > 0) {
        this._tags.set(adapter.getId(), new Set(tags));
      }
      return adapter;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Bulk operations
  async startAll(): Promise<void> {
    const errors: Error[] = [];
    
    for (const [id, adapter] of this._adapters) {
      try {
        if (!adapter.isRunning()) {
          await adapter.start();
        }
      } catch (error) {
        errors.push(new Error(`Failed to start adapter '${id}': ${(error as Error).message}`));
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to start ${errors.length} adapters: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  async stopAll(): Promise<void> {
    const errors: Error[] = [];
    
    for (const [id, adapter] of this._adapters) {
      try {
        if (adapter.isRunning()) {
          await adapter.stop();
        }
      } catch (error) {
        errors.push(new Error(`Failed to stop adapter '${id}': ${(error as Error).message}`));
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to stop ${errors.length} adapters: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  async disposeAll(): Promise<void> {
    const errors: Error[] = [];
    
    for (const [id, adapter] of this._adapters) {
      try {
        await adapter.dispose();
      } catch (error) {
        errors.push(new Error(`Failed to dispose adapter '${id}': ${(error as Error).message}`));
      }
    }
    
    // Clear all registrations
    this._adapters.clear();
    this._typeMapping.clear();
    this._tags.clear();
    
    if (errors.length > 0) {
      throw new Error(`Failed to dispose ${errors.length} adapters: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  // Query methods
  has(id: string): boolean {
    return this._adapters.has(id);
  }

  count(): number {
    return this._adapters.size;
  }

  countByType(type: AdapterType): number {
    return this.getByType(type).length;
  }

  countByTag(tag: string): number {
    return this.getByTag(tag).length;
  }

  getTypes(): AdapterType[] {
    return Array.from(new Set(this._typeMapping.values()));
  }

  getTags(): string[] {
    const allTags = new Set<string>();
    for (const tags of this._tags.values()) {
      for (const tag of tags) {
        allTags.add(tag);
      }
    }
    return Array.from(allTags);
  }

  // Required interface methods
  getAdapter(adapterId: string): PerformanceAdapter | null {
    return this.get(adapterId) || null;
  }

  getAdapters(): PerformanceAdapter[] {
    return this.getAll();
  }

  getAdaptersByType(type: AdapterType): PerformanceAdapter[] {
    return this.getByType(type);
  }

  async getAdapterStats(adapterId: string): Promise<AdapterStats | null> {
    const adapter = this.get(adapterId);
    if (!adapter) {
      return null;
    }
    return adapter.getStats();
  }

  async getAllAdapterStats(): Promise<Record<string, AdapterStats>> {
    const stats: Record<string, AdapterStats> = {};
    for (const [id, adapter] of this._adapters.entries()) {
      try {
        stats[id] = await adapter.getStats();
      } catch (error) {
        // Skip adapters that can't provide stats
      }
    }
    return stats;
  }

  // Health and stats
  async getHealth(): Promise<ComponentHealth> {
    const adapters = this.getAll();
    const healthChecks: Record<string, any> = {};
    
    let overallStatus: HealthStatus = HealthStatus.HEALTHY;
    
    for (const [id, adapter] of this._adapters) {
      try {
        const health = await adapter.getHealth();
        healthChecks[id] = health;
        
        if (health.status === HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.UNHEALTHY;
        } else if (health.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } catch (error) {
        healthChecks[id] = {
          status: HealthStatus.UNHEALTHY,
          error: (error as Error).message
        };
        overallStatus = HealthStatus.UNHEALTHY;
      }
    }
    
    return {
      status: overallStatus,
      score: overallStatus === HealthStatus.HEALTHY ? 100 : overallStatus === HealthStatus.DEGRADED ? 50 : 0,
      checks: [],
      lastChecked: Date.now(),
      details: {
        totalAdapters: this.count(),
        runningAdapters: adapters.filter(a => a.isRunning()).length,
        adapterHealth: healthChecks
      }
    };
  }

  getStats(): AdapterRegistryStats {
    const adapters = this.getAll();
    const runningCount = adapters.filter(a => a.isRunning()).length;
    const typeStats: Record<AdapterType, number> = {} as Record<AdapterType, number>;
    
    for (const type of this.getTypes()) {
      typeStats[type] = this.countByType(type);
    }
    
    return {
      totalAdapters: this.count(),
      runningAdapters: runningCount,
      stoppedAdapters: this.count() - runningCount,
      typeStats,
      availableTypes: this.getTypes(),
      availableTags: this.getTags(),
      factoryCount: this._factories.size
    };
  }

  // Private methods
  private async registerBuiltInFactories(): Promise<void> {
    try {
      // Import and register built-in adapter factories
      const { 
        CacheAdapterFactory,
        DatabaseAdapterFactory,
        HttpAdapterFactory,
        SystemAdapterFactory
      } = await import('./adapter-factory.js');
      
      this.registerFactory(AdapterType.CACHE, new CacheAdapterFactory());
      this.registerFactory(AdapterType.DATABASE, new DatabaseAdapterFactory());
      this.registerFactory(AdapterType.HTTP, new HttpAdapterFactory());
      this.registerFactory(AdapterType.CUSTOM, new SystemAdapterFactory());
      
    } catch (error) {
      console.warn('Some built-in adapter factories could not be registered:', error);
    }
  }

  private setupEventHandling(): void {
    this.on('error', (error) => {
      console.error('[AdapterRegistry] Error:', error);
    });
  }

  private setupAdapterEventForwarding(id: string, adapter: PerformanceAdapter): void {
    // Forward adapter events with additional context
    adapter.on('started', () => {
      this.emit('adapter:started', {
        type: PerformanceEventType.ADAPTER_STARTED,
        timestamp: Date.now(),
        payload: {
          adapterId: id,
          adapterType: adapter.getType()
        }
      } as AdapterEvent);
    });
    
    adapter.on('stopped', () => {
      this.emit('adapter:stopped', {
        type: PerformanceEventType.ADAPTER_STOPPED,
        timestamp: Date.now(),
        payload: {
          adapterId: id,
          adapterType: adapter.getType()
        }
      } as AdapterEvent);
    });
    
    adapter.on('error', (error) => {
      this.emit('adapter:error', {
        type: PerformanceEventType.ADAPTER_ERROR,
        timestamp: Date.now(),
        payload: {
          adapterId: id,
          adapterType: adapter.getType(),
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack
          }
        }
      } as AdapterEvent);
    });
    
    adapter.on('metric', (metric) => {
      this.emit('adapter:metric', {
        type: PerformanceEventType.METRICS_COLLECTED_ADAPTER,
        timestamp: Date.now(),
        payload: {
          adapterId: id,
          adapterType: adapter.getType(),
          metrics: metric
        }
      } as AdapterEvent);
    });
  }
}

/**
 * Default adapter manager implementation
 */
export class DefaultAdapterManager extends EventEmitter implements AdapterManager {
  private _registry: AdapterRegistry;
  private _isInitialized = false;
  private _isStarted = false;

  constructor(registry?: AdapterRegistry) {
    super();
    this._registry = registry || new AdapterRegistry();
    this.setupEventForwarding();
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      await this._registry.initialize();
      this._isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    if (this._isStarted) {
      return;
    }

    try {
      await this._registry.startAll();
      this._isStarted = true;
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this._isStarted) {
      return;
    }

    try {
      await this._registry.stopAll();
      this._isStarted = false;
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async dispose(): Promise<void> {
    try {
      if (this._isStarted) {
        await this.stop();
      }
      
      await this._registry.disposeAll();
      this._isInitialized = false;
      this.emit('disposed');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async startAll(): Promise<void> {
    return this._registry.startAll();
  }

  async stopAll(): Promise<void> {
    return this._registry.stopAll();
  }

  async addAdapter(config: any): Promise<void> {
    const fullConfig: BaseAdapterConfig = {
      id: config.id || `adapter-${Date.now()}`,
      name: config.name || config.id || `adapter-${Date.now()}`,
      type: config.type,
      enabled: config.enabled ?? true,
      ...config
    };
    await this._registry.create(config.type, fullConfig.id, fullConfig);
  }

  async removeAdapter(adapterId: string): Promise<boolean> {
    try {
      await this._registry.unregister(adapterId);
      return true;
    } catch {
      return false;
    }
  }

  async updateAdapter(adapterId: string, config: Partial<any>): Promise<boolean> {
    // For now, we'll remove and re-add the adapter
    try {
      const adapter = this._registry.get(adapterId);
      if (!adapter) return false;
      
      await this._registry.unregister(adapterId);
      const newConfig = { ...adapter.config, ...config };
      await this._registry.create(newConfig.type, adapterId, newConfig);
      return true;
    } catch {
      return false;
    }
  }

  async collectAllMetrics(): Promise<Record<string, any>> {
    const adapters = this._registry.getAll();
    const metrics: Record<string, any> = {};
    
    for (const adapter of adapters) {
      try {
        metrics[adapter.getId()] = await adapter.collectMetrics();
      } catch (error) {
        metrics[adapter.getId()] = { error: (error as Error).message };
      }
    }
    
    return metrics;
  }

  async getAllHealth(): Promise<Record<string, ComponentHealth>> {
    const adapters = this._registry.getAll();
    const health: Record<string, ComponentHealth> = {};
    
    for (const adapter of adapters) {
      try {
        health[adapter.getId()] = await adapter.getHealth();
      } catch (error) {
        health[adapter.getId()] = {
          status: HealthStatus.UNHEALTHY,
          score: 0,
          checks: [],
          lastChecked: Date.now(),
          details: { error: (error as Error).message }
        };
      }
    }
    
    return health;
  }

  // Delegate to registry
  getRegistry(): AdapterRegistry {
    return this._registry;
  }

  async registerAdapter(id: string, adapter: PerformanceAdapter, tags: string[] = []): Promise<void> {
    await this._registry.register(adapter);
    // Note: Tags functionality would need to be implemented via registry methods
  }

  async unregisterAdapter(id: string): Promise<void> {
    await this._registry.unregister(id);
  }

  getAdapter(id: string): PerformanceAdapter | undefined {
    return this._registry.get(id);
  }

  getAdaptersByType(type: AdapterType): PerformanceAdapter[] {
    return this._registry.getByType(type);
  }

  getAdaptersByTag(tag: string): PerformanceAdapter[] {
    return this._registry.getByTag(tag);
  }

  getAllAdapters(): PerformanceAdapter[] {
    return this._registry.getAll();
  }

  async createAdapter(type: AdapterType, id: string, config: Partial<BaseAdapterConfig> = {}, tags: string[] = []): Promise<PerformanceAdapter> {
    const fullConfig: BaseAdapterConfig = {
      id: config.id || id,
      name: config.name || id,
      type: config.type || type,
      enabled: config.enabled ?? true,
      ...config
    };
    return this._registry.create(type, id, fullConfig, tags);
  }

  async getHealth(): Promise<ComponentHealth> {
    return this._registry.getHealth();
  }

  async getStats(): Promise<AdapterManagerStats> {
    const registryStats = this._registry.getStats();
    
    return {
      totalAdapters: registryStats.totalAdapters,
      activeAdapters: registryStats.runningAdapters,
      adaptersByType: registryStats.typeStats,
      adaptersByStatus: {
         [AdapterStatus.INACTIVE]: registryStats.stoppedAdapters,
         [AdapterStatus.ACTIVE]: registryStats.runningAdapters,
         [AdapterStatus.ERROR]: 0,
         [AdapterStatus.DISPOSED]: 0,
         [AdapterStatus.INITIALIZING]: 0
       },
      totalMetrics: 0,
      collectionErrors: 0,
      uptime: Date.now()
    };
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  isStarted(): boolean {
    return this._isStarted;
  }

  // Private methods
  private setupEventForwarding(): void {
    // Forward all registry events
    this._registry.on('adapter:registered', (event) => this.emit('adapter:registered', event));
    this._registry.on('adapter:unregistered', (event) => this.emit('adapter:unregistered', event));
    this._registry.on('adapter:started', (event) => this.emit('adapter:started', event));
    this._registry.on('adapter:stopped', (event) => this.emit('adapter:stopped', event));
    this._registry.on('adapter:error', (event) => this.emit('adapter:error', event));
    this._registry.on('adapter:metric', (event) => this.emit('adapter:metric', event));
    this._registry.on('factory:registered', (event) => this.emit('factory:registered', event));
    this._registry.on('error', (error) => this.emit('error', error));
  }
}

// Interfaces
interface AdapterRegistryStats {
  totalAdapters: number;
  runningAdapters: number;
  stoppedAdapters: number;
  typeStats: Record<AdapterType, number>;
  availableTypes: AdapterType[];
  availableTags: string[];
  factoryCount: number;
}

// Helper functions
export function createAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry();
}

export function createAdapterManager(registry?: AdapterRegistry): DefaultAdapterManager {
  return new DefaultAdapterManager(registry);
}

// Singleton instance
let defaultRegistry: AdapterRegistry | undefined;

export function getDefaultAdapterRegistry(): AdapterRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new AdapterRegistry();
  }
  return defaultRegistry;
}

let defaultManager: DefaultAdapterManager | undefined;

export function getDefaultAdapterManager(): DefaultAdapterManager {
  if (!defaultManager) {
    defaultManager = new DefaultAdapterManager(getDefaultAdapterRegistry());
  }
  return defaultManager;
}