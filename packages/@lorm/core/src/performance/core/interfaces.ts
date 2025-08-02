/**
 * Core Interfaces - Core interfaces for the performance monitoring framework
 */

import type {
  Metric,
  MetricCollection,
  MetricQuery,
  MetricStorage,
  AggregatedMetric,
  Alert,
  AlertRule,
  AlertManager,
  BasePerformanceEvent,
  PerformanceEvent,
  EventStore,
  EventFilter,
  PerformanceEventEmitter,
  MonitorableComponent,
  ComponentHealth,
  PerformanceMonitor,
  PerformanceCollector,
  PerformanceAdapter,
  AdapterManager,
  PerformanceConfig,
  ConfigManager
} from '../types/index.js';

/**
 * Core performance system interface
 */
export interface PerformanceSystem {
  /** System configuration */
  readonly config: PerformanceConfig;
  /** System status */
  readonly status: SystemStatus;
  /** System version */
  readonly version: string;
  
  /** Initialize the performance system */
  initialize(): Promise<void>;
  /** Start the performance system */
  start(): Promise<void>;
  /** Stop the performance system */
  stop(): Promise<void>;
  /** Shutdown the performance system */
  shutdown(): Promise<void>;
  
  /** Get metric service */
  getMetricService(): MetricService;
  /** Get alert service */
  getAlertService(): AlertService;
  /** Get event service */
  getEventService(): EventService;
  /** Get storage service */
  getStorageService(): StorageService;
  /** Get adapter manager */
  getAdapterManager(): AdapterManager;
  /** Get config manager */
  getConfigManager(): ConfigManager;
  
  /** Register a component for monitoring */
  registerComponent(component: MonitorableComponent): Promise<void>;
  /** Unregister a component */
  unregisterComponent(componentId: string): Promise<boolean>;
  /** Get registered components */
  getComponents(): MonitorableComponent[];
  
  /** Get system health */
  getHealth(): Promise<SystemHealth>;
  /** Get system statistics */
  getStats(): Promise<SystemStats>;
}

/**
 * System status enumeration
 */
export enum SystemStatus {
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * System health interface
 */
export interface SystemHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Health score (0-100) */
  score: number;
  /** Component health details */
  components: Record<string, ComponentHealth>;
  /** Service health details */
  services: Record<string, ServiceHealth>;
  /** System uptime */
  uptime: number;
  /** Last health check timestamp */
  lastCheck: number;
}

/**
 * Service health interface
 */
export interface ServiceHealth {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Health score (0-100) */
  score: number;
  /** Service-specific metrics */
  metrics: Record<string, number>;
  /** Last health check */
  lastCheck: number;
  /** Error information */
  error?: {
    message: string;
    code?: string;
    timestamp: number;
  };
}

/**
 * System statistics interface
 */
export interface SystemStats {
  /** System uptime */
  uptime: number;
  /** Total components registered */
  totalComponents: number;
  /** Active components */
  activeComponents: number;
  /** Total metrics collected */
  totalMetrics: number;
  /** Metrics per second */
  metricsPerSecond: number;
  /** Total alerts triggered */
  totalAlerts: number;
  /** Active alerts */
  activeAlerts: number;
  /** Total events emitted */
  totalEvents: number;
  /** Events per second */
  eventsPerSecond: number;
  /** Memory usage */
  memoryUsage: {
    used: number;
    allocated: number;
    peak: number;
  };
  /** Storage statistics */
  storage: {
    totalSize: number;
    metricsCount: number;
    eventsCount: number;
    alertsCount: number;
  };
}

/**
 * Metric service interface
 */
export interface MetricService {
  /** Record a metric */
  record(metric: Metric): Promise<void>;
  /** Record multiple metrics */
  recordBatch(metrics: Metric[]): Promise<void>;
  /** Query metrics */
  query(query: MetricQuery): Promise<Metric[]>;
  /** Get metric by ID */
  getById(metricId: string): Promise<Metric | null>;
  /** Get latest metrics for component */
  getLatest(componentId: string, limit?: number): Promise<Metric[]>;
  /** Aggregate metrics */
  aggregate(query: MetricQuery): Promise<AggregatedMetric[]>;
  /** Get metric statistics */
  getStats(): Promise<MetricServiceStats>;
  /** Clean up old metrics */
  cleanup(olderThan: number): Promise<number>;
}

/**
 * Metric service statistics
 */
export interface MetricServiceStats {
  /** Total metrics recorded */
  totalMetrics: number;
  /** Metrics by type */
  metricsByType: Record<string, number>;
  /** Metrics by component */
  metricsByComponent: Record<string, number>;
  /** Average recording time */
  averageRecordingTime: number;
  /** Storage size */
  storageSize: number;
  /** Query count */
  queryCount: number;
  /** Average query time */
  averageQueryTime: number;
}

/**
 * Alert service interface
 */
export interface AlertService extends AlertManager {
  /** Get alert statistics */
  getStats(): Promise<AlertServiceStats>;
  /** Export alerts */
  export(format: string, filter?: AlertQuery): Promise<string>;
  /** Import alerts */
  import(data: string, format: string): Promise<number>;
}

/**
 * Alert service statistics
 */
export interface AlertServiceStats {
  /** Total alerts */
  totalAlerts: number;
  /** Active alerts */
  activeAlerts: number;
  /** Alerts by severity */
  alertsBySeverity: Record<string, number>;
  /** Alerts by status */
  alertsByStatus: Record<string, number>;
  /** Alert rules count */
  alertRulesCount: number;
  /** Average resolution time */
  averageResolutionTime: number;
  /** Notification channels */
  notificationChannels: number;
}

/**
 * Alert query interface
 */
export interface AlertQuery {
  /** Alert IDs */
  ids?: string[];
  /** Alert severities */
  severities?: string[];
  /** Alert statuses */
  statuses?: string[];
  /** Component IDs */
  componentIds?: string[];
  /** Time range */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Event service interface
 */
export interface EventService {
  /** Get event store */
  getStore(): EventStore;
  /** Query events */
  query(filter: EventFilter, limit?: number): Promise<PerformanceEvent[]>;
  /** Get event statistics */
  getStats(): Promise<EventServiceStats>;
  /** Export events */
  export(format: string, filter?: EventFilter): Promise<string>;
  /** Import events */
  import(data: string, format: string): Promise<number>;
  
  /** Emit an event */
  emit<T extends PerformanceEvent>(event: T): void;
  /** Subscribe to events */
  subscribe(filter: EventFilter, listener: (event: PerformanceEvent) => void | Promise<void>): { id: string };
  /** Unsubscribe from events */
  unsubscribe(subscriptionId: string): boolean;
}

/**
 * Event service statistics
 */
export interface EventServiceStats {
  /** Total events */
  totalEvents: number;
  /** Events by type */
  eventsByType: Record<string, number>;
  /** Events by source */
  eventsBySource: Record<string, number>;
  /** Active subscriptions */
  activeSubscriptions: number;
  /** Average processing time */
  averageProcessingTime: number;
  /** Storage size */
  storageSize: number;
}

/**
 * Storage service interface
 */
export interface StorageService {
  /** Get metric storage */
  getMetricStorage(): MetricStorage;
  /** Get event store */
  getEventStore(): EventStore;
  /** Get alert storage */
  getAlertStorage(): AlertStorage;
  
  /** Initialize storage */
  initialize(): Promise<void>;
  /** Cleanup old data */
  cleanup(olderThan: number): Promise<CleanupResult>;
  /** Get storage statistics */
  getStats(): Promise<StorageServiceStats>;
  /** Backup data */
  backup(destination: string): Promise<BackupResult>;
  /** Restore data */
  restore(source: string): Promise<RestoreResult>;
}

/**
 * Alert storage interface
 */
export interface AlertStorage {
  /** Store an alert */
  store(alert: Alert): Promise<void>;
  /** Store multiple alerts */
  storeBatch(alerts: Alert[]): Promise<void>;
  /** Get alert by ID */
  getById(alertId: string): Promise<Alert | null>;
  /** Query alerts */
  query(query: AlertQuery): Promise<Alert[]>;
  /** Update alert */
  update(alertId: string, updates: Partial<Alert>): Promise<boolean>;
  /** Delete alert */
  delete(alertId: string): Promise<boolean>;
  /** Get statistics */
  getStats(): Promise<AlertStorageStats>;
}

/**
 * Alert storage statistics
 */
export interface AlertStorageStats {
  /** Total alerts */
  totalAlerts: number;
  /** Storage size */
  storageSize: number;
  /** Alerts by status */
  alertsByStatus: Record<string, number>;
  /** Oldest alert timestamp */
  oldestAlert: number;
  /** Newest alert timestamp */
  newestAlert: number;
}

/**
 * Storage service statistics
 */
export interface StorageServiceStats {
  /** Total storage size */
  totalSize: number;
  /** Metric storage stats */
  metrics: {
    count: number;
    size: number;
  };
  /** Event storage stats */
  events: {
    count: number;
    size: number;
  };
  /** Alert storage stats */
  alerts: {
    count: number;
    size: number;
  };
  /** Storage health */
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    freeSpace: number;
    totalSpace: number;
  };
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  /** Items cleaned up */
  itemsRemoved: number;
  /** Space freed in bytes */
  spaceFreed: number;
  /** Cleanup duration */
  duration: number;
  /** Cleanup errors */
  errors: string[];
}

/**
 * Backup result
 */
export interface BackupResult {
  /** Backup file path */
  filePath: string;
  /** Backup size in bytes */
  size: number;
  /** Items backed up */
  itemCount: number;
  /** Backup duration */
  duration: number;
  /** Backup checksum */
  checksum: string;
}

/**
 * Restore result
 */
export interface RestoreResult {
  /** Items restored */
  itemsRestored: number;
  /** Restore duration */
  duration: number;
  /** Restore errors */
  errors: string[];
  /** Data integrity check */
  integrityCheck: boolean;
}

/**
 * Performance system factory
 */
export interface PerformanceSystemFactory {
  /** Create a performance system */
  create(config: PerformanceConfig): Promise<PerformanceSystem>;
  /** Get default configuration */
  getDefaultConfig(): PerformanceConfig;
  /** Validate configuration */
  validateConfig(config: PerformanceConfig): Promise<boolean>;
}

/**
 * Performance system builder
 */
export interface PerformanceSystemBuilder {
  /** Set configuration */
  withConfig(config: PerformanceConfig): PerformanceSystemBuilder;
  /** Add metric service */
  withMetricService(service: MetricService): PerformanceSystemBuilder;
  /** Add alert service */
  withAlertService(service: AlertService): PerformanceSystemBuilder;
  /** Add event service */
  withEventService(service: EventService): PerformanceSystemBuilder;
  /** Add storage service */
  withStorageService(service: StorageService): PerformanceSystemBuilder;
  /** Add adapter manager */
  withAdapterManager(manager: AdapterManager): PerformanceSystemBuilder;
  /** Build the system */
  build(): Promise<PerformanceSystem>;
}