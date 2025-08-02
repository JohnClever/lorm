/**
 * Adapter Types - Adapter system definitions for the performance monitoring framework
 */

import type { Metric, MetricCollection } from './metrics.js';
import type { Alert } from './alerts.js';
import type { BasePerformanceEvent, PerformanceEventType } from './events.js';
import type { MonitorableComponent, ComponentHealth } from './monitoring.js';

/**
 * Adapter types
 */
export enum AdapterType {
  CACHE = 'cache',
  DATABASE = 'database',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  QUEUE = 'queue',
  STORAGE = 'storage',
  COMPUTE = 'compute',
  NETWORK = 'network',
  CUSTOM = 'custom'
}

/**
 * Adapter status
 */
export enum AdapterStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  DISPOSED = 'disposed'
}

/**
 * Base adapter configuration
 */
export interface BaseAdapterConfig {
  /** Adapter ID */
  id: string;
  /** Adapter name */
  name: string;
  /** Adapter type */
  type: AdapterType;
  /** Whether adapter is enabled */
  enabled: boolean;
  /** Collection interval in milliseconds */
  collectionInterval?: number;
  /** Metrics to collect */
  metrics?: string[];
  /** Custom configuration */
  config?: Record<string, unknown>;
  /** Tags for categorization */
  tags?: Record<string, string>;
}

/**
 * Performance adapter interface
 */
export interface PerformanceAdapter {
  /** Adapter configuration */
  readonly config: BaseAdapterConfig;
  /** Adapter status */
  readonly status: AdapterStatus;
  /** Adapter type */
  readonly type: AdapterType;
  
  /** Get adapter ID */
  getId(): string;
  /** Get adapter type */
  getType(): AdapterType;
  /** Check if adapter is running */
  isRunning(): boolean;
  
  /** Initialize the adapter */
  initialize(): Promise<void>;
  /** Start collecting metrics */
  start(): Promise<void>;
  /** Stop collecting metrics */
  stop(): Promise<void>;
  /** Dispose the adapter */
  dispose(): Promise<void>;
  
  /** Collect current metrics */
  collectMetrics(): Promise<MetricCollection>;
  /** Get component health */
  getHealth(): Promise<ComponentHealth>;
  /** Get adapter statistics */
  getStats(): Promise<AdapterStats>;
  
  /** Register event listener */
  on(event: string, listener: (data: unknown) => void): void;
  /** Unregister event listener */
  off(event: string, listener: (data: unknown) => void): void;
  /** Emit event */
  emit(event: string, data: unknown): void;
}

/**
 * Adapter statistics
 */
export interface AdapterStats {
  /** Adapter ID */
  adapterId: string;
  /** Total metrics collected */
  totalMetrics: number;
  /** Collection count */
  collectionCount: number;
  /** Last collection timestamp */
  lastCollection: number;
  /** Average collection time */
  averageCollectionTime: number;
  /** Error count */
  errorCount: number;
  /** Uptime in milliseconds */
  uptime: number;
  /** Memory usage */
  memoryUsage: {
    used: number;
    allocated: number;
    peak: number;
  };
  /** Adapter-specific statistics */
  [key: string]: any;
}

/**
 * Cache adapter configuration
 */
export interface CacheAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.CACHE;
  config: {
    /** Cache instance identifier */
    cacheId?: string;
    /** Cache type (memory, redis, etc.) */
    cacheType?: string;
    /** Track hit/miss ratios */
    trackHitRatio?: boolean;
    /** Track response times */
    trackResponseTime?: boolean;
    /** Track memory usage */
    trackMemoryUsage?: boolean;
    /** Track eviction rates */
    trackEvictions?: boolean;
    /** Track error rates */
    trackErrors?: boolean;
    /** Custom metric collectors */
    customCollectors?: string[];
  };
}

/**
 * Database adapter configuration
 */
export interface DatabaseAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.DATABASE;
  /** Database instance */
  dbInstance?: any;
  /** Database type */
  databaseType?: string;
  /** Slow query threshold in milliseconds */
  slowQueryThreshold?: number;
  /** Monitoring interval in milliseconds */
  monitoringInterval?: number;
  /** Maximum connections */
  maxConnections?: number;
  config: {
    /** Database connection string or config */
    connection?: string | Record<string, unknown>;
    /** Database type */
    dbType?: string;
    /** Track query performance */
    trackQueries?: boolean;
    /** Track connection pool */
    trackConnectionPool?: boolean;
    /** Track transaction performance */
    trackTransactions?: boolean;
    /** Slow query threshold */
    slowQueryThreshold?: number;
  };
}

/**
 * HTTP adapter configuration
 */
export interface HttpAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.HTTP;
  /** Monitoring interval in milliseconds */
  monitoringInterval?: number;
  /** Maximum concurrent requests */
  maxConcurrentRequests?: number;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  config: {
    /** Base URL for monitoring */
    baseUrl?: string;
    /** Endpoints to monitor */
    endpoints?: string[];
    /** Track request/response times */
    trackResponseTime?: boolean;
    /** Track status codes */
    trackStatusCodes?: boolean;
    /** Track request sizes */
    trackRequestSize?: boolean;
    /** Track response sizes */
    trackResponseSize?: boolean;
    /** Request timeout */
    timeout?: number;
  };
}

/**
 * WebSocket adapter configuration
 */
export interface WebSocketAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.WEBSOCKET;
  config: {
    /** WebSocket URL */
    url?: string;
    /** Track connection status */
    trackConnections?: boolean;
    /** Track message rates */
    trackMessageRates?: boolean;
    /** Track message sizes */
    trackMessageSizes?: boolean;
    /** Track latency */
    trackLatency?: boolean;
  };
}

/**
 * Queue adapter configuration
 */
export interface QueueAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.QUEUE;
  config: {
    /** Queue name or identifier */
    queueName?: string;
    /** Queue type (redis, rabbitmq, etc.) */
    queueType?: string;
    /** Track queue depth */
    trackDepth?: boolean;
    /** Track processing rates */
    trackProcessingRate?: boolean;
    /** Track processing times */
    trackProcessingTime?: boolean;
    /** Track error rates */
    trackErrorRate?: boolean;
  };
}

/**
 * Storage adapter configuration
 */
export interface StorageAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.STORAGE;
  config: {
    /** Storage path or identifier */
    storagePath?: string;
    /** Storage type (file, s3, etc.) */
    storageType?: string;
    /** Track read/write operations */
    trackOperations?: boolean;
    /** Track storage usage */
    trackUsage?: boolean;
    /** Track I/O performance */
    trackIOPerformance?: boolean;
  };
}

/**
 * Compute adapter configuration
 */
export interface ComputeAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.COMPUTE;
  config: {
    /** Process ID or identifier */
    processId?: string;
    /** Track CPU usage */
    trackCPU?: boolean;
    /** Track memory usage */
    trackMemory?: boolean;
    /** Track thread count */
    trackThreads?: boolean;
    /** Track garbage collection */
    trackGC?: boolean;
  };
}

/**
 * Network adapter configuration
 */
export interface NetworkAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.NETWORK;
  config: {
    /** Network interface */
    interface?: string;
    /** Track bandwidth usage */
    trackBandwidth?: boolean;
    /** Track packet rates */
    trackPackets?: boolean;
    /** Track connection counts */
    trackConnections?: boolean;
    /** Track latency */
    trackLatency?: boolean;
  };
}

/**
 * Custom adapter configuration
 */
export interface CustomAdapterConfig extends BaseAdapterConfig {
  type: AdapterType.CUSTOM;
  config: Record<string, unknown>;
}

/**
 * Union type for all adapter configurations
 */
export type AdapterConfig = 
  | CacheAdapterConfig
  | DatabaseAdapterConfig
  | HttpAdapterConfig
  | WebSocketAdapterConfig
  | QueueAdapterConfig
  | StorageAdapterConfig
  | ComputeAdapterConfig
  | NetworkAdapterConfig
  | CustomAdapterConfig;

/**
 * Adapter factory interface
 */
export interface AdapterFactory {
  /** Create an adapter */
  createAdapter(config: AdapterConfig): Promise<PerformanceAdapter>;
  /** Get supported adapter types */
  getSupportedTypes(): AdapterType[];
  /** Validate adapter configuration */
  validateConfig(config: AdapterConfig): Promise<boolean>;
  /** Get default configuration for adapter type */
  getDefaultConfig(type: AdapterType): Partial<AdapterConfig>;
}

/**
 * Adapter registry interface
 */
export interface AdapterRegistry {
  /** Register an adapter */
  register(adapter: PerformanceAdapter): Promise<void>;
  /** Unregister an adapter */
  unregister(adapterId: string): Promise<boolean>;
  /** Get adapter by ID */
  getAdapter(adapterId: string): PerformanceAdapter | null;
  /** Get all adapters */
  getAdapters(): PerformanceAdapter[];
  /** Get adapters by type */
  getAdaptersByType(type: AdapterType): PerformanceAdapter[];
  /** Get adapter statistics */
  getAdapterStats(adapterId: string): Promise<AdapterStats | null>;
  /** Get all adapter statistics */
  getAllAdapterStats(): Promise<Record<string, AdapterStats>>;
}

/**
 * Adapter manager interface
 */
export interface AdapterManager {
  /** Initialize all adapters */
  initialize(): Promise<void>;
  /** Start all adapters */
  startAll(): Promise<void>;
  /** Stop all adapters */
  stopAll(): Promise<void>;
  /** Dispose all adapters */
  dispose(): Promise<void>;
  
  /** Add adapter configuration */
  addAdapter(config: AdapterConfig): Promise<void>;
  /** Remove adapter */
  removeAdapter(adapterId: string): Promise<boolean>;
  /** Update adapter configuration */
  updateAdapter(adapterId: string, config: Partial<AdapterConfig>): Promise<boolean>;
  
  /** Collect metrics from all adapters */
  collectAllMetrics(): Promise<Record<string, MetricCollection>>;
  /** Get health from all adapters */
  getAllHealth(): Promise<Record<string, ComponentHealth>>;
  
  /** Get manager statistics */
  getStats(): Promise<AdapterManagerStats>;
}

/**
 * Adapter manager statistics
 */
export interface AdapterManagerStats {
  /** Total adapters */
  totalAdapters: number;
  /** Active adapters */
  activeAdapters: number;
  /** Adapters by type */
  adaptersByType: Record<AdapterType, number>;
  /** Adapters by status */
  adaptersByStatus: Record<AdapterStatus, number>;
  /** Total metrics collected */
  totalMetrics: number;
  /** Collection errors */
  collectionErrors: number;
  /** Manager uptime */
  uptime: number;
}

/**
 * Adapter event types
 */
export enum AdapterEventType {
  ADAPTER_REGISTERED = 'adapter:registered',
  ADAPTER_UNREGISTERED = 'adapter:unregistered',
  ADAPTER_STARTED = 'adapter:started',
  ADAPTER_STOPPED = 'adapter:stopped',
  ADAPTER_ERROR = 'adapter:error',
  METRICS_COLLECTED = 'adapter:metrics:collected',
  METRICS_FLUSHED = 'adapter:metrics:flushed',
  HEALTH_UPDATED = 'adapter:health:updated',
  CONFIG_UPDATED = 'adapter:config:updated'
}

/**
 * Adapter event
 */
export interface AdapterEvent extends BasePerformanceEvent {
  type: PerformanceEventType.ADAPTER_REGISTERED | PerformanceEventType.ADAPTER_UNREGISTERED | PerformanceEventType.ADAPTER_STARTED | PerformanceEventType.ADAPTER_STOPPED | PerformanceEventType.ADAPTER_ERROR | PerformanceEventType.METRICS_COLLECTED_ADAPTER | PerformanceEventType.METRICS_FLUSHED | PerformanceEventType.HEALTH_UPDATED | PerformanceEventType.CONFIG_UPDATED_ADAPTER;
  payload: {
    adapterId: string;
    adapterType: AdapterType;
    metrics?: MetricCollection;
    health?: ComponentHealth;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
}

/**
 * Adapter middleware interface
 */
export interface AdapterMiddleware {
  /** Middleware name */
  readonly name: string;
  /** Process metrics before collection */
  beforeCollect?(adapter: PerformanceAdapter): Promise<void>;
  /** Process metrics after collection */
  afterCollect?(adapter: PerformanceAdapter, metrics: MetricCollection): Promise<MetricCollection>;
  /** Handle adapter errors */
  onError?(adapter: PerformanceAdapter, error: Error): Promise<void>;
}

/**
 * Adapter with middleware support
 */
export interface MiddlewareAdapter extends PerformanceAdapter {
  /** Add middleware */
  addMiddleware(middleware: AdapterMiddleware): void;
  /** Remove middleware */
  removeMiddleware(name: string): boolean;
  /** Get middleware */
  getMiddleware(): AdapterMiddleware[];
}