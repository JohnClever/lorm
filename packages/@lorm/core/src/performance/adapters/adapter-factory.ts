/**
 * Adapter Factory - Provides standardized creation methods for performance adapters
 */

import type {
  AdapterFactory,
  PerformanceAdapter,
  BaseAdapterConfig,
  AdapterConfig,
  CacheAdapterConfig,
  DatabaseAdapterConfig,
  HttpAdapterConfig,
  ComputeAdapterConfig
} from '../types/index.js';
import { AdapterType } from '../types/index.js';

/**
 * Base adapter factory implementation
 */
export abstract class BaseAdapterFactory implements AdapterFactory {
  abstract create(config: BaseAdapterConfig): Promise<PerformanceAdapter>;
  
  // Implement AdapterFactory interface
  async createAdapter(config: AdapterConfig): Promise<PerformanceAdapter> {
    return this.create(config as BaseAdapterConfig);
  }
  
  abstract getSupportedTypes(): AdapterType[];
  
  async validateConfig(config: AdapterConfig): Promise<boolean> {
    try {
      this.validateConfigSync(config as BaseAdapterConfig);
      return true;
    } catch {
      return false;
    }
  }
  
  abstract getDefaultConfig(type: AdapterType): Partial<AdapterConfig>;
  
  protected validateConfigSync(config: BaseAdapterConfig): void {
    if (config && typeof config !== 'object') {
      throw new Error('Adapter config must be an object');
    }
  }
}

/**
 * Cache adapter factory
 */
export class CacheAdapterFactory extends BaseAdapterFactory {
  async create(config: BaseAdapterConfig): Promise<PerformanceAdapter> {
    const fullConfig: CacheAdapterConfig = {
      ...config,
      id: config.id || 'cache-adapter',
      name: config.name || 'Cache Adapter',
      type: AdapterType.CACHE,
      enabled: config.enabled !== false,
      config: {
        trackHitRatio: true,
        trackResponseTime: true,
        ...(config.config || {})
      }
    } as CacheAdapterConfig;
    
    this.validateConfigSync(fullConfig);
    
    const { CachePerformanceAdapter } = await import('./cache-adapter.js');
    return new CachePerformanceAdapter(fullConfig);
  }
  
  getSupportedTypes(): AdapterType[] {
    return [AdapterType.CACHE];
  }
  
  getDefaultConfig(type: AdapterType): Partial<AdapterConfig> {
    if (type !== AdapterType.CACHE) {
      throw new Error(`Unsupported adapter type: ${type}`);
    }
    
    return {
        id: 'cache-adapter',
        name: 'Cache Adapter',
        type: AdapterType.CACHE,
        enabled: true,
        config: {
          trackHitRatio: true,
          trackResponseTime: true,
          cacheType: 'memory',
          maxSize: 1000,
          ttl: 300000
        }
      } as CacheAdapterConfig;
  }
  
  protected validateConfigSync(config: CacheAdapterConfig): void {
    super.validateConfigSync(config);
    
    if (config.config?.cacheId && typeof config.config.cacheId !== 'string') {
      throw new Error('Cache ID must be a string');
    }
    
    if (config.config?.cacheType && typeof config.config.cacheType !== 'string') {
      throw new Error('Cache type must be a string');
    }
  }
}

/**
 * Database adapter factory
 */
export class DatabaseAdapterFactory extends BaseAdapterFactory {
  async create(config: BaseAdapterConfig): Promise<PerformanceAdapter> {
    const fullConfig: DatabaseAdapterConfig = {
      ...config,
      id: config.id || 'database-adapter',
      name: config.name || 'Database Adapter',
      type: AdapterType.DATABASE,
      enabled: config.enabled !== false,
      config: {
        trackQueries: true,
        trackConnectionPool: true,
        slowQueryThreshold: 1000,
        ...(config.config || {})
      }
    } as DatabaseAdapterConfig;
    
    this.validateConfigSync(fullConfig);
    
    const { DatabasePerformanceAdapter } = await import('./database-adapter.js');
    return new DatabasePerformanceAdapter(fullConfig);
  }
  
  getSupportedTypes(): AdapterType[] {
    return [AdapterType.DATABASE];
  }
  
  getDefaultConfig(type: AdapterType): Partial<AdapterConfig> {
    if (type !== AdapterType.DATABASE) {
      throw new Error(`Unsupported adapter type: ${type}`);
    }
    
    return {
        id: 'database-adapter',
        name: 'Database Adapter',
        type: AdapterType.DATABASE,
        enabled: true,
        config: {
          trackQueries: true,
          trackConnectionPool: true,
          slowQueryThreshold: 1000,
          dbType: 'generic'
        }
      } as DatabaseAdapterConfig;
  }
  
  protected validateConfigSync(config: DatabaseAdapterConfig): void {
    super.validateConfigSync(config);
    
    if (config.config?.connection && typeof config.config.connection !== 'string' && typeof config.config.connection !== 'object') {
      throw new Error('Connection must be a string or object');
    }
    
    if (config.config?.slowQueryThreshold && (typeof config.config.slowQueryThreshold !== 'number' || config.config.slowQueryThreshold < 0)) {
      throw new Error('Slow query threshold must be a non-negative number');
    }
  }
}

/**
 * HTTP adapter factory
 */
export class HttpAdapterFactory extends BaseAdapterFactory {
  async create(config: BaseAdapterConfig): Promise<PerformanceAdapter> {
    const fullConfig: HttpAdapterConfig = {
      ...config,
      id: config.id || 'http-adapter',
      name: config.name || 'HTTP Adapter',
      type: AdapterType.HTTP,
      enabled: config.enabled !== false,
      config: {
        trackResponseTime: true,
        trackStatusCodes: true,
        timeout: 5000,
        ...(config.config || {})
      }
    } as HttpAdapterConfig;
    
    this.validateConfigSync(fullConfig);
    
    const { HttpPerformanceAdapter } = await import('./http-adapter.js');
    return new HttpPerformanceAdapter(fullConfig);
  }
  
  getSupportedTypes(): AdapterType[] {
    return [AdapterType.HTTP];
  }
  
  getDefaultConfig(type: AdapterType): Partial<AdapterConfig> {
    if (type !== AdapterType.HTTP) {
      throw new Error(`Unsupported adapter type: ${type}`);
    }
    
    return {
        id: 'http-adapter',
        name: 'HTTP Adapter',
        type: AdapterType.HTTP,
        enabled: true,
        config: {
          trackResponseTime: true,
          trackStatusCodes: true,
          timeout: 5000,
          baseUrl: 'http://localhost'
        }
      } as HttpAdapterConfig;
  }
  
  protected validateConfigSync(config: HttpAdapterConfig): void {
    super.validateConfigSync(config);
    
    if (config.config?.baseUrl && typeof config.config.baseUrl !== 'string') {
      throw new Error('Base URL must be a string');
    }
    
    if (config.config?.timeout && (typeof config.config.timeout !== 'number' || config.config.timeout < 0)) {
      throw new Error('Timeout must be a non-negative number');
    }
  }
}

/**
 * System adapter factory
 */
export class SystemAdapterFactory extends BaseAdapterFactory {
  async create(config: BaseAdapterConfig): Promise<PerformanceAdapter> {
    const fullConfig: ComputeAdapterConfig = {
      ...config,
      id: config.id || 'system-adapter',
      name: config.name || 'System Adapter',
      type: AdapterType.COMPUTE,
      enabled: config.enabled !== false,
      config: {
        trackCPU: true,
        trackMemory: true,
        trackThreads: false,
        trackGC: false,
        ...(config.config || {})
      }
    } as ComputeAdapterConfig;
    
    this.validateConfigSync(fullConfig);
    
    const { SystemPerformanceAdapter } = await import('./system-adapter.js');
    return new SystemPerformanceAdapter(fullConfig);
  }
  
  getSupportedTypes(): AdapterType[] {
    return [AdapterType.COMPUTE];
  }
  
  getDefaultConfig(type: AdapterType): Partial<AdapterConfig> {
    if (type !== AdapterType.COMPUTE) {
      throw new Error(`Unsupported adapter type: ${type}`);
    }
    
    return {
        id: 'system-adapter',
        name: 'System Adapter',
        type: AdapterType.COMPUTE,
        enabled: true,
        collectionInterval: 5000,
        config: {
          trackCPU: true,
          trackMemory: true,
          trackDisk: true,
          trackNetwork: true
        }
      } as ComputeAdapterConfig;
  }
  
  protected validateConfigSync(config: ComputeAdapterConfig): void {
    super.validateConfigSync(config);
    
    if (config.collectionInterval && (typeof config.collectionInterval !== 'number' || config.collectionInterval < 1000)) {
      throw new Error('Collection interval must be at least 1000ms');
    }
    if (!config.config) {
      throw new Error('System adapter requires config object');
    }
  }
}

/**
 * Factory registry for managing adapter factories
 */
export class AdapterFactoryRegistry {
  private _factories: Map<string, AdapterFactory> = new Map();
  
  constructor() {
    this.registerBuiltInFactories();
  }
  
  register(type: string, factory: AdapterFactory): void {
    this._factories.set(type.toUpperCase(), factory);
  }
  
  get(type: string): AdapterFactory | undefined {
    return this._factories.get(type.toUpperCase());
  }
  
  has(type: string): boolean {
    return this._factories.has(type.toUpperCase());
  }
  
  getTypes(): string[] {
    return Array.from(this._factories.keys());
  }
  
  async create(type: string, config: Partial<BaseAdapterConfig> = {}): Promise<PerformanceAdapter> {
    const defaultConfig: BaseAdapterConfig = {
      id: `${type.toLowerCase()}-adapter`,
      name: `${type} Adapter`,
      type: type as AdapterType,
      enabled: true,
      ...config
    };
    const factory = this.get(type);
    if (!factory) {
      throw new Error(`No factory registered for adapter type '${type}'`);
    }
    
    return factory.createAdapter(defaultConfig as AdapterConfig);
  }
  
  private registerBuiltInFactories(): void {
    this.register('CACHE', new CacheAdapterFactory());
    this.register('DATABASE', new DatabaseAdapterFactory());
    this.register('HTTP', new HttpAdapterFactory());
    this.register('SYSTEM', new SystemAdapterFactory());
  }
}

/**
 * Adapter builder for fluent adapter creation
 */
export class AdapterBuilder {
  private _type?: string;
  private _config: Partial<BaseAdapterConfig> = {};
  private _tags: string[] = [];
  private _id?: string;
  private _factory?: AdapterFactory;
  
  static create(): AdapterBuilder {
    return new AdapterBuilder();
  }
  
  type(type: string): AdapterBuilder {
    this._type = type;
    return this;
  }
  
  id(id: string): AdapterBuilder {
    this._id = id;
    return this;
  }
  
  config(config: Partial<BaseAdapterConfig>): AdapterBuilder {
    this._config = { ...this._config, ...config };
    return this;
  }
  
  tag(...tags: string[]): AdapterBuilder {
    this._tags.push(...tags);
    return this;
  }
  
  factory(factory: AdapterFactory): AdapterBuilder {
    this._factory = factory;
    return this;
  }
  
  // Cache-specific configuration
  cache(config: Partial<CacheAdapterConfig>): AdapterBuilder {
    this._type = 'CACHE';
    return this.config(config as BaseAdapterConfig);
  }
  
  // Database-specific configuration
  database(config: Partial<DatabaseAdapterConfig>): AdapterBuilder {
    this._type = 'DATABASE';
    return this.config(config as BaseAdapterConfig);
  }
  
  // HTTP-specific configuration
  http(config: Partial<HttpAdapterConfig>): AdapterBuilder {
    this._type = 'HTTP';
    return this.config(config as BaseAdapterConfig);
  }
  
  // System-specific configuration
  system(config: Partial<ComputeAdapterConfig>): AdapterBuilder {
    this._type = 'SYSTEM';
    return this.config(config as BaseAdapterConfig);
  }
  
  async build(): Promise<PerformanceAdapter> {
    if (!this._type) {
      throw new Error('Adapter type is required');
    }

    let factory = this._factory;
    
    if (!factory) {
      const registry = getDefaultFactoryRegistry();
      factory = registry.get(this._type);
      
      if (!factory) {
        throw new Error(`No factory available for adapter type '${this._type}'`);
      }
    }

    const fullConfig: BaseAdapterConfig = {
      id: this._id || `${this._type.toLowerCase()}-adapter`,
      name: `${this._type} Adapter`,
      type: this._type as AdapterType,
      enabled: true,
      ...this._config
    };

    return factory.createAdapter(fullConfig as AdapterConfig);
  }
  
  async buildAndRegister(registry: any): Promise<PerformanceAdapter> {
    if (!this._id) {
      throw new Error('Adapter ID is required for registration');
    }
    
    const adapter = await this.build();
    await registry.register(this._id, adapter, this._tags);
    return adapter;
  }
}

/**
 * Utility functions for creating adapters
 */
export class AdapterUtils {
  static async createCache(config: Partial<BaseAdapterConfig> = {}): Promise<PerformanceAdapter> {
    const factory = new CacheAdapterFactory();
    const fullConfig: BaseAdapterConfig = {
      id: 'cache-adapter',
      name: 'Cache Adapter',
      type: AdapterType.CACHE,
      enabled: true,
      ...config
    };
    return factory.createAdapter(fullConfig as AdapterConfig);
  }
  
  static async createDatabase(config: Partial<BaseAdapterConfig> = {}): Promise<PerformanceAdapter> {
    const factory = new DatabaseAdapterFactory();
    const fullConfig: BaseAdapterConfig = {
      id: 'database-adapter',
      name: 'Database Adapter',
      type: AdapterType.DATABASE,
      enabled: true,
      ...config
    };
    return factory.createAdapter(fullConfig as AdapterConfig);
  }
  
  static async createHttp(config: Partial<BaseAdapterConfig> = {}): Promise<PerformanceAdapter> {
    const factory = new HttpAdapterFactory();
    const fullConfig: BaseAdapterConfig = {
      id: 'http-adapter',
      name: 'HTTP Adapter',
      type: AdapterType.HTTP,
      enabled: true,
      ...config
    };
    return factory.createAdapter(fullConfig as AdapterConfig);
  }
  
  static async createSystem(config: Partial<BaseAdapterConfig> = {}): Promise<PerformanceAdapter> {
    const factory = new SystemAdapterFactory();
    const fullConfig: BaseAdapterConfig = {
      id: 'system-adapter',
      name: 'System Adapter',
      type: AdapterType.COMPUTE,
      enabled: true,
      ...config
    };
    return factory.createAdapter(fullConfig as AdapterConfig);
  }
  
  static async createFromConfig(type: string, config: Partial<BaseAdapterConfig> = {}): Promise<PerformanceAdapter> {
    const registry = getDefaultFactoryRegistry();
    return registry.create(type, config);
  }
  
  static builder(): AdapterBuilder {
    return AdapterBuilder.create();
  }
}

/**
 * Auto-detection utilities
 */
export class AdapterAutoDetection {
  static detectCacheType(instance: any): string | null {
    if (!instance || typeof instance !== 'object') {
      return null;
    }
    
    // Redis detection
    if (instance.constructor?.name === 'Redis' || instance.constructor?.name === 'RedisClient') {
      return 'redis';
    }
    
    // Memcached detection
    if (instance.constructor?.name === 'Client' && instance.get && instance.set && instance.del) {
      return 'memcached';
    }
    
    // Node-cache detection
    if (instance.constructor?.name === 'NodeCache') {
      return 'node-cache';
    }
    
    // Generic cache interface
    if (instance.get && instance.set && (instance.del || instance.delete)) {
      return 'generic';
    }
    
    return null;
  }
  
  static detectDatabaseType(instance: any): string | null {
    if (!instance || typeof instance !== 'object') {
      return null;
    }
    
    // Sequelize detection
    if (instance.constructor?.name === 'Sequelize') {
      return 'sequelize';
    }
    
    // Mongoose detection
    if (instance.constructor?.name === 'Mongoose') {
      return 'mongoose';
    }
    
    // TypeORM detection
    if (instance.constructor?.name === 'DataSource' && instance.query) {
      return 'typeorm';
    }
    
    // Prisma detection
    if (instance.constructor?.name === 'PrismaClient') {
      return 'prisma';
    }
    
    // Generic database interface
    if (instance.query || instance.execute) {
      return 'generic';
    }
    
    return null;
  }
  
  static async createAdapterForInstance(instance: any, type?: string): Promise<PerformanceAdapter | null> {
    if (!type) {
      // Try to detect cache type first
      const cacheType = this.detectCacheType(instance);
      if (cacheType) {
        type = cacheType;
        const factory = new CacheAdapterFactory();
        const config = factory.getDefaultConfig(AdapterType.CACHE) as BaseAdapterConfig;
        config.config = { ...config.config, cacheType: type };
        return factory.createAdapter(config as AdapterConfig);
      }
      
      // Try to detect database type
      const dbType = this.detectDatabaseType(instance);
      if (dbType) {
        type = dbType;
        const factory = new DatabaseAdapterFactory();
        const config = factory.getDefaultConfig(AdapterType.DATABASE) as BaseAdapterConfig;
        config.config = { ...config.config, dbType: type };
        return factory.createAdapter(config as AdapterConfig);
      }
      
      return null;
    }
    
    // Create adapter based on provided type
    switch (type.toLowerCase()) {
      case 'cache': {
        const factory = new CacheAdapterFactory();
        return factory.createAdapter(factory.getDefaultConfig(AdapterType.CACHE) as AdapterConfig);
      }
      case 'database': {
        const factory = new DatabaseAdapterFactory();
        return factory.createAdapter(factory.getDefaultConfig(AdapterType.DATABASE) as AdapterConfig);
      }
      default:
        return null;
    }
  }
}

// Singleton factory registry
let defaultFactoryRegistry: AdapterFactoryRegistry | undefined;

export function getDefaultFactoryRegistry(): AdapterFactoryRegistry {
  if (!defaultFactoryRegistry) {
    defaultFactoryRegistry = new AdapterFactoryRegistry();
  }
  return defaultFactoryRegistry;
}

// Convenience exports
export const createAdapter = AdapterUtils.createFromConfig;
export const adapterBuilder = AdapterUtils.builder;
export const autoDetectAdapter = AdapterAutoDetection.createAdapterForInstance;

// Factory instances for direct use
export const cacheFactory = new CacheAdapterFactory();
export const databaseFactory = new DatabaseAdapterFactory();
export const httpFactory = new HttpAdapterFactory();
export const systemFactory = new SystemAdapterFactory();