/**
 * Configuration Types - Configuration management for the performance system
 */

import type { AlertSeverity, ThresholdOperator } from './alerts.js';
import type { MetricType } from './metrics.js';

/**
 * Performance system configuration
 */
export interface PerformanceConfig {
  /** Global performance system settings */
  global: GlobalConfig;
  /** Metrics configuration */
  metrics: MetricsConfig;
  /** Alerts configuration */
  alerts: AlertsConfig;
  /** Storage configuration */
  storage: StorageConfig;
  /** Export configuration */
  export: ExportConfig;
  /** Plugin configuration */
  plugins: PluginsConfig;
  /** Environment-specific overrides */
  environments: Record<string, Partial<PerformanceConfig>>;
}

/**
 * Global configuration
 */
export interface GlobalConfig {
  /** Whether performance monitoring is enabled */
  enabled: boolean;
  /** Environment name */
  environment: string;
  /** Service name */
  serviceName: string;
  /** Service version */
  serviceVersion?: string;
  /** Global tags applied to all metrics */
  tags: Record<string, string>;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Performance profiling settings */
  profiling: ProfilingConfig;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Whether to log to console */
  console: boolean;
  /** Whether to log to file */
  file: boolean;
  /** Log file path */
  filePath?: string;
  /** Log format */
  format: 'json' | 'text';
  /** Whether to include stack traces */
  includeStackTrace: boolean;
}

/**
 * Profiling configuration
 */
export interface ProfilingConfig {
  /** Whether profiling is enabled */
  enabled: boolean;
  /** CPU profiling settings */
  cpu: {
    enabled: boolean;
    sampleInterval: number;
  };
  /** Memory profiling settings */
  memory: {
    enabled: boolean;
    sampleInterval: number;
    trackAllocations: boolean;
  };
  /** Garbage collection monitoring */
  gc: {
    enabled: boolean;
    trackAll: boolean;
  };
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Default collection interval (ms) */
  defaultCollectionInterval: number;
  /** Default retention period (ms) */
  defaultRetentionPeriod: number;
  /** Maximum number of metrics to store */
  maxMetrics: number;
  /** Sampling configuration */
  sampling: SamplingConfig;
  /** Aggregation settings */
  aggregation: AggregationConfig;
  /** Metric-specific configurations */
  metricConfigs: Record<string, MetricConfig>;
}

/**
 * Sampling configuration
 */
export interface SamplingConfig {
  /** Default sampling rate (0-1) */
  defaultRate: number;
  /** Sampling strategy */
  strategy: 'random' | 'systematic' | 'adaptive';
  /** Adaptive sampling configuration */
  adaptive: {
    enabled: boolean;
    minRate: number;
    maxRate: number;
    errorThreshold: number;
    latencyThreshold: number;
    adjustmentInterval: number;
  };
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  /** Whether aggregation is enabled */
  enabled: boolean;
  /** Aggregation interval (ms) */
  interval: number;
  /** Aggregation functions to apply */
  functions: ('sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile')[];
  /** Percentiles to calculate */
  percentiles: number[];
  /** Window size for rolling aggregations */
  windowSize: number;
}

/**
 * Metric-specific configuration
 */
export interface MetricConfig {
  /** Whether metric is enabled */
  enabled: boolean;
  /** Collection interval override */
  collectionInterval?: number;
  /** Retention period override */
  retentionPeriod?: number;
  /** Sampling rate override */
  samplingRate?: number;
  /** Metric-specific tags */
  tags?: Record<string, string>;
  /** Aggregation settings */
  aggregation?: Partial<AggregationConfig>;
}

/**
 * Alerts configuration
 */
export interface AlertsConfig {
  /** Whether alerting is enabled */
  enabled: boolean;
  /** Default alert evaluation interval (ms) */
  defaultEvaluationInterval: number;
  /** Maximum number of alerts to store */
  maxAlerts: number;
  /** Alert retention period (ms) */
  retentionPeriod: number;
  /** Default thresholds */
  defaultThresholds: DefaultThreshold[];
  /** Notification settings */
  notifications: NotificationConfig;
  /** Escalation settings */
  escalation: EscalationConfig;
}

/**
 * Default threshold configuration
 */
export interface DefaultThreshold {
  /** Metric type this threshold applies to */
  metricType: MetricType;
  /** Component pattern (regex) */
  componentPattern?: string;
  /** Threshold operator */
  operator: ThresholdOperator;
  /** Threshold value */
  value: number | [number, number];
  /** Alert severity */
  severity: AlertSeverity;
  /** Evaluation window (ms) */
  evaluationWindow: number;
  /** Whether threshold is enabled by default */
  enabled: boolean;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  /** Whether notifications are enabled */
  enabled: boolean;
  /** Default notification channels */
  defaultChannels: string[];
  /** Rate limiting */
  rateLimit: {
    enabled: boolean;
    maxNotifications: number;
    windowMs: number;
  };
  /** Notification templates */
  templates: Record<string, NotificationTemplate>;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  /** Template subject */
  subject: string;
  /** Template body */
  body: string;
  /** Template format */
  format: 'text' | 'html' | 'markdown';
  /** Template variables */
  variables: string[];
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  /** Whether escalation is enabled */
  enabled: boolean;
  /** Default escalation policy */
  defaultPolicy: string;
  /** Escalation timeout (ms) */
  timeout: number;
  /** Maximum escalation levels */
  maxLevels: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage type */
  type: 'memory' | 'file' | 'database';
  /** Storage-specific configuration */
  config: MemoryStorageConfig | FileStorageConfig | DatabaseStorageConfig;
  /** Cleanup settings */
  cleanup: CleanupConfig;
  /** Compression settings */
  compression: CompressionConfig;
}

/**
 * Memory storage configuration
 */
export interface MemoryStorageConfig {
  /** Maximum memory usage (bytes) */
  maxMemory: number;
  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
}

/**
 * File storage configuration
 */
export interface FileStorageConfig {
  /** Storage directory */
  directory: string;
  /** File format */
  format: 'json' | 'binary' | 'csv';
  /** File rotation settings */
  rotation: {
    enabled: boolean;
    maxSize: number;
    maxFiles: number;
  };
}

/**
 * Database storage configuration
 */
export interface DatabaseStorageConfig {
  /** Database connection string */
  connectionString: string;
  /** Database type */
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';
  /** Connection pool settings */
  pool: {
    min: number;
    max: number;
    acquireTimeoutMs: number;
  };
  /** Table/collection names */
  tables: {
    metrics: string;
    alerts: string;
    components: string;
  };
}

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  /** Whether cleanup is enabled */
  enabled: boolean;
  /** Cleanup interval (ms) */
  interval: number;
  /** Cleanup batch size */
  batchSize: number;
  /** Cleanup timeout (ms) */
  timeout: number;
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  /** Whether compression is enabled */
  enabled: boolean;
  /** Compression algorithm */
  algorithm: 'gzip' | 'brotli' | 'lz4';
  /** Compression level */
  level: number;
  /** Minimum size for compression */
  threshold: number;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  /** Whether export is enabled */
  enabled: boolean;
  /** Default export format */
  defaultFormat: 'json' | 'csv' | 'prometheus' | 'influxdb';
  /** Export destinations */
  destinations: ExportDestination[];
  /** Export schedule */
  schedule: ScheduleConfig;
  /** Export filters */
  filters: ExportFilter[];
}

/**
 * Export destination
 */
export interface ExportDestination {
  /** Destination identifier */
  id: string;
  /** Destination name */
  name: string;
  /** Destination type */
  type: 'file' | 'http' | 'database' | 's3';
  /** Destination configuration */
  config: Record<string, unknown>;
  /** Whether destination is enabled */
  enabled: boolean;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  /** Whether scheduling is enabled */
  enabled: boolean;
  /** Export interval (ms) */
  interval: number;
  /** Cron expression */
  cron?: string;
  /** Time zone */
  timezone?: string;
}

/**
 * Export filter
 */
export interface ExportFilter {
  /** Filter name */
  name: string;
  /** Component filter */
  component?: string;
  /** Metric type filter */
  metricType?: MetricType;
  /** Tag filters */
  tags?: Record<string, string>;
  /** Time range filter */
  timeRange?: {
    start?: number;
    end?: number;
    duration?: number;
  };
}

/**
 * Plugins configuration
 */
export interface PluginsConfig {
  /** Whether plugins are enabled */
  enabled: boolean;
  /** Plugin directories */
  directories: string[];
  /** Auto-load plugins */
  autoLoad: boolean;
  /** Plugin-specific configurations */
  configs: Record<string, Record<string, unknown>>;
  /** Plugin load order */
  loadOrder: string[];
}

/**
 * Configuration profile
 */
export interface ConfigProfile {
  /** Profile name */
  name: string;
  /** Profile description */
  description?: string;
  /** Profile configuration */
  config: Partial<PerformanceConfig>;
  /** Profile tags */
  tags: string[];
  /** Whether profile is active */
  active: boolean;
}

/**
 * Configuration manager interface
 */
export interface ConfigManager {
  /** Load configuration */
  load(source?: string): Promise<PerformanceConfig>;
  /** Save configuration */
  save(config: PerformanceConfig, destination?: string): Promise<void>;
  /** Get current configuration */
  getConfig(): PerformanceConfig;
  /** Update configuration */
  updateConfig(updates: Partial<PerformanceConfig>): Promise<void>;
  /** Validate configuration */
  validate(config: PerformanceConfig): Promise<ConfigValidationResult>;
  /** Get configuration schema */
  getSchema(): Record<string, unknown>;
  /** Watch for configuration changes */
  watch(callback: (config: PerformanceConfig) => void): void;
  /** Stop watching for changes */
  unwatch(): void;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  valid: boolean;
  /** Validation errors */
  errors: ConfigValidationError[];
  /** Validation warnings */
  warnings: ConfigValidationWarning[];
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /** Error path */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Configuration validation warning
 */
export interface ConfigValidationWarning {
  /** Warning path */
  path: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
  /** Suggested improvement */
  suggestion?: string;
}