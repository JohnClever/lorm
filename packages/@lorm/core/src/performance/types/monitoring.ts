/**
 * Monitoring Types - Core monitoring interface definitions
 */

import type { Metric, MetricCollection, MetricQuery } from './metrics.js';
import type { Alert, AlertQuery } from './alerts.js';

/**
 * Component monitoring interface - implemented by components that want to be monitored
 */
export interface MonitorableComponent {
  /** Component identifier */
  readonly componentId: string;
  /** Component name */
  readonly componentName: string;
  /** Component version */
  readonly componentVersion?: string;
  /** Get current metrics from the component */
  getMetrics(): Promise<MetricCollection>;
  /** Get component health status */
  getHealthStatus(): Promise<ComponentHealth>;
  /** Component-specific configuration */
  getMonitoringConfig(): MonitoringConfig;
}

/**
 * Component health status
 */
export interface ComponentHealth {
  /** Overall health status */
  status: HealthStatus;
  /** Health score (0-100) */
  score: number;
  /** Health checks performed */
  checks: HealthCheck[];
  /** Last health check timestamp */
  lastChecked: number;
  /** Health metadata */
  metadata?: Record<string, unknown>;
  /** Additional health details */
  details?: Record<string, unknown>;
}

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Individual health check
 */
export interface HealthCheck {
  /** Check identifier */
  id: string;
  /** Check name */
  name: string;
  /** Check status */
  status: HealthStatus;
  /** Check message */
  message?: string;
  /** Check duration (ms) */
  duration: number;
  /** Check metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Monitoring configuration for a component
 */
export interface MonitoringConfig {
  /** Whether monitoring is enabled */
  enabled: boolean;
  /** Metrics collection interval (ms) */
  collectionInterval: number;
  /** Health check interval (ms) */
  healthCheckInterval: number;
  /** Metric retention period (ms) */
  retentionPeriod: number;
  /** Custom metric definitions */
  customMetrics?: CustomMetricDefinition[];
  /** Component-specific tags */
  tags: Record<string, string>;
  /** Sampling configuration */
  sampling?: SamplingConfig;
}

/**
 * Custom metric definition
 */
export interface CustomMetricDefinition {
  /** Metric identifier */
  id: string;
  /** Metric name */
  name: string;
  /** Metric description */
  description?: string;
  /** How to extract the metric value */
  extractor: string | ((component: MonitorableComponent) => Promise<number>);
  /** Metric tags */
  tags?: Record<string, string>;
}

/**
 * Sampling configuration
 */
export interface SamplingConfig {
  /** Sampling rate (0-1) */
  rate: number;
  /** Sampling strategy */
  strategy: 'random' | 'systematic' | 'adaptive';
  /** Adaptive sampling configuration */
  adaptive?: {
    minRate: number;
    maxRate: number;
    errorThreshold: number;
    latencyThreshold: number;
  };
}

/**
 * Performance monitor interface - main monitoring system
 */
export interface PerformanceMonitor {
  /** Register a component for monitoring */
  registerComponent(component: MonitorableComponent): Promise<void>;
  /** Unregister a component */
  unregisterComponent(componentId: string): Promise<void>;
  /** Get registered components */
  getRegisteredComponents(): Promise<MonitorableComponent[]>;
  /** Start monitoring */
  start(): Promise<void>;
  /** Stop monitoring */
  stop(): Promise<void>;
  /** Check if monitoring is running */
  isRunning(): boolean;
  /** Record a metric manually */
  recordMetric(metric: Metric): Promise<void>;
  /** Record multiple metrics */
  recordMetrics(metrics: Metric[]): Promise<void>;
  /** Query metrics */
  queryMetrics(query: MetricQuery): Promise<Metric[]>;
  /** Query alerts */
  queryAlerts(query: AlertQuery): Promise<Alert[]>;
  /** Get monitoring statistics */
  getStats(): Promise<MonitoringStats>;
  /** Update monitoring configuration */
  updateConfig(config: Partial<GlobalMonitoringConfig>): Promise<void>;
}

/**
 * Global monitoring configuration
 */
export interface GlobalMonitoringConfig {
  /** Whether monitoring is globally enabled */
  enabled: boolean;
  /** Default collection interval (ms) */
  defaultCollectionInterval: number;
  /** Default health check interval (ms) */
  defaultHealthCheckInterval: number;
  /** Default retention period (ms) */
  defaultRetentionPeriod: number;
  /** Maximum number of metrics to store */
  maxMetrics: number;
  /** Maximum number of alerts to store */
  maxAlerts: number;
  /** Cleanup interval (ms) */
  cleanupInterval: number;
  /** Global tags applied to all metrics */
  globalTags: Record<string, string>;
  /** Performance monitoring configuration */
  performance: {
    /** Enable performance profiling */
    enableProfiling: boolean;
    /** CPU usage monitoring */
    enableCpuMonitoring: boolean;
    /** Memory usage monitoring */
    enableMemoryMonitoring: boolean;
    /** Garbage collection monitoring */
    enableGcMonitoring: boolean;
  };
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  /** Number of registered components */
  registeredComponents: number;
  /** Total metrics collected */
  totalMetrics: number;
  /** Total alerts generated */
  totalAlerts: number;
  /** Active alerts count */
  activeAlerts: number;
  /** Monitoring uptime (ms) */
  uptime: number;
  /** Last collection timestamp */
  lastCollection: number;
  /** Collection performance */
  collectionPerformance: {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalCollections: number;
  };
  /** Storage statistics */
  storage: {
    metricsSize: number;
    alertsSize: number;
    totalSize: number;
  };
}

/**
 * Monitoring event types
 */
export enum MonitoringEventType {
  COMPONENT_REGISTERED = 'component:registered',
  COMPONENT_UNREGISTERED = 'component:unregistered',
  METRICS_COLLECTED = 'metrics:collected',
  ALERT_TRIGGERED = 'alert:triggered',
  ALERT_RESOLVED = 'alert:resolved',
  HEALTH_CHECK_COMPLETED = 'health:check:completed',
  MONITORING_STARTED = 'monitoring:started',
  MONITORING_STOPPED = 'monitoring:stopped',
  ERROR_OCCURRED = 'error:occurred'
}

/**
 * Monitoring event
 */
export interface MonitoringEvent {
  /** Event type */
  type: MonitoringEventType;
  /** Event timestamp */
  timestamp: number;
  /** Component that generated the event */
  componentId?: string;
  /** Event payload */
  payload: Record<string, unknown>;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Monitoring event listener
 */
export type MonitoringEventListener = (event: MonitoringEvent) => void | Promise<void>;

/**
 * Performance collector interface - collects metrics from components
 */
export interface PerformanceCollector {
  /** Collector identifier */
  readonly collectorId: string;
  /** Collector name */
  readonly collectorName: string;
  /** Components this collector can handle */
  readonly supportedComponents: string[];
  /** Collect metrics from a component */
  collect(component: MonitorableComponent): Promise<MetricCollection>;
  /** Validate if collector can handle component */
  canHandle(component: MonitorableComponent): boolean;
  /** Collector configuration */
  getConfig(): CollectorConfig;
  /** Update collector configuration */
  updateConfig(config: Partial<CollectorConfig>): void;
}

/**
 * Collector configuration
 */
export interface CollectorConfig {
  /** Whether collector is enabled */
  enabled: boolean;
  /** Collection interval (ms) */
  interval: number;
  /** Timeout for collection (ms) */
  timeout: number;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
  /** Collector-specific settings */
  settings: Record<string, unknown>;
}