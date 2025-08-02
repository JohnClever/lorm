/**
 * Plugin Types - Plugin system definitions for extensible performance monitoring
 */

import type { Metric, MetricCollection } from './metrics.js';
import type { Alert } from './alerts.js';
import type { MonitorableComponent, PerformanceCollector } from './monitoring.js';

/**
 * Plugin interface - base interface for all performance system plugins
 */
export interface PerformancePlugin {
  /** Plugin identifier */
  readonly id: string;
  /** Plugin name */
  readonly name: string;
  /** Plugin version */
  readonly version: string;
  /** Plugin description */
  readonly description?: string;
  /** Plugin author */
  readonly author?: string;
  /** Plugin dependencies */
  readonly dependencies?: string[];
  /** Initialize the plugin */
  initialize(context: PluginContext): Promise<void>;
  /** Cleanup the plugin */
  cleanup(): Promise<void>;
  /** Check if plugin is enabled */
  isEnabled(): boolean;
  /** Enable/disable the plugin */
  setEnabled(enabled: boolean): void;
  /** Get plugin configuration */
  getConfig(): PluginConfig;
  /** Update plugin configuration */
  updateConfig(config: Partial<PluginConfig>): void;
}

/**
 * Plugin context - provides access to the performance system
 */
export interface PluginContext {
  /** Register a metric collector */
  registerCollector(collector: PerformanceCollector): void;
  /** Unregister a metric collector */
  unregisterCollector(collectorId: string): void;
  /** Register a metric processor */
  registerMetricProcessor(processor: MetricProcessor): void;
  /** Register an alert handler */
  registerAlertHandler(handler: AlertHandler): void;
  /** Register an export handler */
  registerExportHandler(handler: ExportHandler): void;
  /** Get system configuration */
  getSystemConfig(): Record<string, unknown>;
  /** Emit a system event */
  emitEvent(event: string, data: unknown): void;
  /** Subscribe to system events */
  onEvent(event: string, handler: (data: unknown) => void): void;
  /** Get logger instance */
  getLogger(): PluginLogger;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Plugin-specific settings */
  settings: Record<string, unknown>;
  /** Plugin priority (higher = executed first) */
  priority: number;
  /** Plugin tags */
  tags: string[];
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Metric processor plugin - processes metrics before storage
 */
export interface MetricProcessor {
  /** Processor identifier */
  readonly id: string;
  /** Processor name */
  readonly name: string;
  /** Process a single metric */
  process(metric: Metric): Promise<Metric | null>;
  /** Process multiple metrics */
  processBatch(metrics: Metric[]): Promise<Metric[]>;
  /** Check if processor should handle this metric */
  shouldProcess(metric: Metric): boolean;
  /** Processor priority (higher = executed first) */
  readonly priority: number;
}

/**
 * Alert handler plugin - handles alert notifications
 */
export interface AlertHandler {
  /** Handler identifier */
  readonly id: string;
  /** Handler name */
  readonly name: string;
  /** Handle an alert */
  handle(alert: Alert): Promise<void>;
  /** Check if handler should handle this alert */
  shouldHandle(alert: Alert): boolean;
  /** Handler priority (higher = executed first) */
  readonly priority: number;
  /** Handler configuration */
  getConfig(): AlertHandlerConfig;
}

/**
 * Alert handler configuration
 */
export interface AlertHandlerConfig {
  /** Whether handler is enabled */
  enabled: boolean;
  /** Alert severities this handler processes */
  severities: string[];
  /** Components this handler monitors */
  components?: string[];
  /** Handler-specific settings */
  settings: Record<string, unknown>;
}

/**
 * Export handler plugin - exports metrics and alerts
 */
export interface ExportHandler {
  /** Handler identifier */
  readonly id: string;
  /** Handler name */
  readonly name: string;
  /** Export format */
  readonly format: string;
  /** Export metrics */
  exportMetrics(metrics: Metric[]): Promise<ExportResult>;
  /** Export alerts */
  exportAlerts(alerts: Alert[]): Promise<ExportResult>;
  /** Export metric collections */
  exportCollections(collections: MetricCollection[]): Promise<ExportResult>;
  /** Handler configuration */
  getConfig(): ExportHandlerConfig;
}

/**
 * Export handler configuration
 */
export interface ExportHandlerConfig {
  /** Whether handler is enabled */
  enabled: boolean;
  /** Export destination */
  destination: string;
  /** Export format options */
  formatOptions: Record<string, unknown>;
  /** Export schedule */
  schedule?: {
    interval: number;
    cron?: string;
  };
  /** Compression settings */
  compression?: {
    enabled: boolean;
    algorithm: string;
    level: number;
  };
}

/**
 * Export result
 */
export interface ExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Export destination */
  destination: string;
  /** Number of items exported */
  itemCount: number;
  /** Export size in bytes */
  size: number;
  /** Export duration in milliseconds */
  duration: number;
  /** Error message if export failed */
  error?: string;
  /** Export metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Plugin registry - manages plugin lifecycle
 */
export interface PluginRegistry {
  /** Register a plugin */
  register(plugin: PerformancePlugin): Promise<void>;
  /** Unregister a plugin */
  unregister(pluginId: string): Promise<void>;
  /** Get registered plugins */
  getPlugins(): PerformancePlugin[];
  /** Get plugin by ID */
  getPlugin(pluginId: string): PerformancePlugin | null;
  /** Enable a plugin */
  enablePlugin(pluginId: string): Promise<void>;
  /** Disable a plugin */
  disablePlugin(pluginId: string): Promise<void>;
  /** Initialize all plugins */
  initializeAll(): Promise<void>;
  /** Cleanup all plugins */
  cleanupAll(): Promise<void>;
  /** Get plugin dependencies */
  getDependencies(pluginId: string): string[];
  /** Validate plugin dependencies */
  validateDependencies(pluginId: string): boolean;
}

/**
 * Plugin manifest - describes a plugin
 */
export interface PluginManifest {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Plugin homepage */
  homepage?: string;
  /** Plugin repository */
  repository?: string;
  /** Plugin license */
  license?: string;
  /** Plugin keywords */
  keywords?: string[];
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
  /** Plugin peer dependencies */
  peerDependencies?: Record<string, string>;
  /** Plugin entry point */
  main: string;
  /** Plugin configuration schema */
  configSchema?: Record<string, unknown>;
  /** Plugin capabilities */
  capabilities: PluginCapability[];
}

/**
 * Plugin capability types
 */
export enum PluginCapability {
  METRIC_COLLECTION = 'metric_collection',
  METRIC_PROCESSING = 'metric_processing',
  ALERT_HANDLING = 'alert_handling',
  DATA_EXPORT = 'data_export',
  VISUALIZATION = 'visualization',
  INTEGRATION = 'integration'
}

/**
 * Plugin loader - loads plugins from various sources
 */
export interface PluginLoader {
  /** Load plugin from file */
  loadFromFile(filePath: string): Promise<PerformancePlugin>;
  /** Load plugin from package */
  loadFromPackage(packageName: string): Promise<PerformancePlugin>;
  /** Load plugin from URL */
  loadFromUrl(url: string): Promise<PerformancePlugin>;
  /** Validate plugin */
  validate(plugin: PerformancePlugin): Promise<boolean>;
  /** Get plugin manifest */
  getManifest(source: string): Promise<PluginManifest>;
}

/**
 * Plugin event types
 */
export enum PluginEventType {
  PLUGIN_REGISTERED = 'plugin:registered',
  PLUGIN_UNREGISTERED = 'plugin:unregistered',
  PLUGIN_ENABLED = 'plugin:enabled',
  PLUGIN_DISABLED = 'plugin:disabled',
  PLUGIN_INITIALIZED = 'plugin:initialized',
  PLUGIN_ERROR = 'plugin:error'
}

/**
 * Plugin event
 */
export interface PluginEvent {
  /** Event type */
  type: PluginEventType;
  /** Plugin ID */
  pluginId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event payload */
  payload?: Record<string, unknown>;
  /** Error information (for error events) */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}