/**
 * Performance Types - Universal type definitions for the performance monitoring framework
 */

// Core metric types
export * from './metrics.js';
export type { MetricStorage } from './metrics.js';

// Alert system types
export * from './alerts.js';

// Monitoring system types (excluding conflicting exports)
export { HealthStatus } from './monitoring.js';
export type {
  MonitorableComponent,
  ComponentHealth,
  HealthCheck,
  MonitoringConfig,
  CustomMetricDefinition,
  PerformanceMonitor,
  GlobalMonitoringConfig,
  MonitoringStats,
  PerformanceCollector,
  CollectorConfig,
  SamplingConfig as MonitoringSamplingConfig
} from './monitoring.js';

// Plugin system types (excluding conflicting exports)
export { PluginEventType, PluginCapability } from './plugins.js';
export type {
  PerformancePlugin,
  PluginContext,
  PluginConfig,
  PluginLogger,
  MetricProcessor,
  AlertHandler,
  AlertHandlerConfig,
  ExportHandler,
  ExportHandlerConfig,
  ExportResult,
  PluginRegistry,
  PluginManifest,
  PluginLoader
} from './plugins.js';

// Configuration types (excluding conflicting exports)
export type {
  PerformanceConfig,
  GlobalConfig,
  LoggingConfig,
  ProfilingConfig,
  MetricsConfig,
  AggregationConfig,
  MetricConfig,
  AlertsConfig,
  DefaultThreshold,
  StorageConfig,
  ExportConfig,
  PluginsConfig,
  ConfigProfile,
  ConfigManager,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ExportDestination,
  ScheduleConfig,
  ExportFilter,
  CleanupConfig,
  CompressionConfig
} from './config.js';

// Event system types (excluding conflicting exports)
export { PerformanceEventType } from './events.js';
export type {
  BasePerformanceEvent,
  PerformanceEvent,
  EventStore,
  EventFilter,
  PerformanceEventEmitter,
  MetricEvent,
  AlertEvent,
  ComponentEvent,
  SystemEvent,
  ExportEvent,
  ConfigEvent,
  PluginEvent as PerformancePluginEvent
} from './events.js';

// Adapter system types
export type { AdapterConfig } from './adapters.js';
export * from './adapters.js';