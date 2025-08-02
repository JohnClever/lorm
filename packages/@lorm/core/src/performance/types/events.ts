/**
 * Event Types - Event system definitions for the performance monitoring framework
 */

import type { Metric, MetricCollection } from './metrics.js';
import type { Alert } from './alerts.js';
import type { MonitorableComponent } from './monitoring.js';

/**
 * Performance event types
 */
export enum PerformanceEventType {
  // System events
  SYSTEM_STARTED = 'system:started',
  SYSTEM_STOPPED = 'system:stopped',
  SYSTEM_ERROR = 'system:error',
  
  // Component events
  COMPONENT_REGISTERED = 'component:registered',
  COMPONENT_UNREGISTERED = 'component:unregistered',
  COMPONENT_HEALTH_CHANGED = 'component:health:changed',
  
  // Metric events
  METRIC_RECORDED = 'metric:recorded',
  METRICS_COLLECTED = 'metrics:collected',
  METRIC_THRESHOLD_EXCEEDED = 'metric:threshold:exceeded',
  
  // Alert events
  ALERT_TRIGGERED = 'alert:triggered',
  ALERT_RESOLVED = 'alert:resolved',
  ALERT_ACKNOWLEDGED = 'alert:acknowledged',
  ALERT_SUPPRESSED = 'alert:suppressed',
  
  // Collection events
  COLLECTION_STARTED = 'collection:started',
  COLLECTION_COMPLETED = 'collection:completed',
  COLLECTION_FAILED = 'collection:failed',
  
  // Storage events
  STORAGE_WRITE = 'storage:write',
  STORAGE_READ = 'storage:read',
  STORAGE_CLEANUP = 'storage:cleanup',
  STORAGE_ERROR = 'storage:error',
  
  // Export events
  EXPORT_STARTED = 'export:started',
  EXPORT_COMPLETED = 'export:completed',
  EXPORT_FAILED = 'export:failed',
  
  // Configuration events
  CONFIG_UPDATED = 'config:updated',
  CONFIG_RELOADED = 'config:reloaded',
  CONFIG_VALIDATION_FAILED = 'config:validation:failed',
  
  // Plugin events
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_UNLOADED = 'plugin:unloaded',
  PLUGIN_ERROR = 'plugin:error',
  
  // Adapter events
  ADAPTER_REGISTERED = 'adapter:registered',
  ADAPTER_UNREGISTERED = 'adapter:unregistered',
  ADAPTER_STARTED = 'adapter:started',
  ADAPTER_STOPPED = 'adapter:stopped',
  ADAPTER_ERROR = 'adapter:error',
  METRICS_COLLECTED_ADAPTER = 'adapter:metrics:collected',
  METRICS_FLUSHED = 'adapter:metrics:flushed',
  HEALTH_UPDATED = 'adapter:health:updated',
  CONFIG_UPDATED_ADAPTER = 'adapter:config:updated'
}

/**
 * Base performance event
 */
export interface BasePerformanceEvent {
  /** Event type */
  type: PerformanceEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event source component */
  source?: string;
  /** Event correlation ID */
  correlationId?: string;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * System event
 */
export interface SystemEvent extends BasePerformanceEvent {
  type: PerformanceEventType.SYSTEM_STARTED | PerformanceEventType.SYSTEM_STOPPED | PerformanceEventType.SYSTEM_ERROR;
  payload: {
    version?: string;
    config?: Record<string, unknown>;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
}

/**
 * Component event
 */
export interface ComponentEvent extends BasePerformanceEvent {
  type: PerformanceEventType.COMPONENT_REGISTERED | PerformanceEventType.COMPONENT_UNREGISTERED | PerformanceEventType.COMPONENT_HEALTH_CHANGED;
  payload: {
    component: MonitorableComponent;
    previousHealth?: {
      status: string;
      score: number;
    };
    currentHealth?: {
      status: string;
      score: number;
    };
  };
}

/**
 * Metric event
 */
export interface MetricEvent extends BasePerformanceEvent {
  type: PerformanceEventType.METRIC_RECORDED | PerformanceEventType.METRICS_COLLECTED | PerformanceEventType.METRIC_THRESHOLD_EXCEEDED;
  payload: {
    metric?: Metric;
    metrics?: Metric[];
    collection?: MetricCollection;
    threshold?: {
      id: string;
      value: number;
      operator: string;
    };
  };
}

/**
 * Alert event
 */
export interface AlertEvent extends BasePerformanceEvent {
  type: PerformanceEventType.ALERT_TRIGGERED | PerformanceEventType.ALERT_RESOLVED | PerformanceEventType.ALERT_ACKNOWLEDGED | PerformanceEventType.ALERT_SUPPRESSED;
  payload: {
    alert: Alert;
    acknowledgedBy?: string;
    suppressedUntil?: number;
    reason?: string;
  };
}

/**
 * Collection event
 */
export interface CollectionEvent extends BasePerformanceEvent {
  type: PerformanceEventType.COLLECTION_STARTED | PerformanceEventType.COLLECTION_COMPLETED | PerformanceEventType.COLLECTION_FAILED;
  payload: {
    componentId: string;
    collectorId: string;
    duration?: number;
    metricsCount?: number;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
}

/**
 * Storage event
 */
export interface StorageEvent extends BasePerformanceEvent {
  type: PerformanceEventType.STORAGE_WRITE | PerformanceEventType.STORAGE_READ | PerformanceEventType.STORAGE_CLEANUP | PerformanceEventType.STORAGE_ERROR;
  payload: {
    operation: string;
    itemCount?: number;
    duration?: number;
    size?: number;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
}

/**
 * Export event
 */
export interface ExportEvent extends BasePerformanceEvent {
  type: PerformanceEventType.EXPORT_STARTED | PerformanceEventType.EXPORT_COMPLETED | PerformanceEventType.EXPORT_FAILED;
  payload: {
    exportId: string;
    format: string;
    destination: string;
    itemCount?: number;
    size?: number;
    duration?: number;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
}

/**
 * Configuration event
 */
export interface ConfigEvent extends BasePerformanceEvent {
  type: PerformanceEventType.CONFIG_UPDATED | PerformanceEventType.CONFIG_RELOADED | PerformanceEventType.CONFIG_VALIDATION_FAILED;
  payload: {
    previousConfig?: Record<string, unknown>;
    newConfig?: Record<string, unknown>;
    changes?: Array<{
      path: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
    validationErrors?: Array<{
      path: string;
      message: string;
      code: string;
    }>;
  };
}

/**
 * Plugin event
 */
export interface PluginEvent extends BasePerformanceEvent {
  type: PerformanceEventType.PLUGIN_LOADED | PerformanceEventType.PLUGIN_UNLOADED | PerformanceEventType.PLUGIN_ERROR;
  payload: {
    pluginId: string;
    pluginName: string;
    pluginVersion?: string;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
}

/**
 * Union type for all performance events
 */
export type PerformanceEvent = 
  | SystemEvent
  | ComponentEvent
  | MetricEvent
  | AlertEvent
  | CollectionEvent
  | StorageEvent
  | ExportEvent
  | ConfigEvent
  | PluginEvent;

/**
 * Event listener function
 */
export type EventListener<T extends PerformanceEvent = PerformanceEvent> = (event: T) => void | Promise<void>;

/**
 * Event filter
 */
export interface EventFilter {
  /** Event types to include */
  types?: PerformanceEventType[];
  /** Source components to include */
  sources?: string[];
  /** Correlation IDs to include */
  correlationIds?: string[];
  /** Time range filter */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Metadata filters */
  metadata?: Record<string, unknown>;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  /** Subscription ID */
  id: string;
  /** Event filter */
  filter: EventFilter;
  /** Event listener */
  listener: EventListener;
  /** Subscription metadata */
  metadata?: Record<string, unknown>;
  /** When subscription was created */
  createdAt: number;
  /** Whether subscription is active */
  active: boolean;
}

/**
 * Event emitter interface
 */
export interface PerformanceEventEmitter {
  /** Emit an event */
  emit<T extends PerformanceEvent>(event: T): void;
  /** Subscribe to events */
  subscribe(filter: EventFilter, listener: EventListener): EventSubscription;
  /** Unsubscribe from events */
  unsubscribe(subscriptionId: string): boolean;
  /** Get active subscriptions */
  getSubscriptions(): EventSubscription[];
  /** Clear all subscriptions */
  clearSubscriptions(): void;
  /** Get event statistics */
  getStats(): EventEmitterStats;
}

/**
 * Event emitter statistics
 */
export interface EventEmitterStats {
  /** Total events emitted */
  totalEvents: number;
  /** Events emitted by type */
  eventsByType: Record<PerformanceEventType, number>;
  /** Active subscriptions count */
  activeSubscriptions: number;
  /** Total subscriptions created */
  totalSubscriptions: number;
  /** Average event processing time */
  averageProcessingTime: number;
  /** Last event timestamp */
  lastEventTimestamp: number;
}

/**
 * Event store interface
 */
export interface EventStore {
  /** Store an event */
  store(event: PerformanceEvent): Promise<void>;
  /** Store multiple events */
  storeBatch(events: PerformanceEvent[]): Promise<void>;
  /** Query events */
  query(filter: EventFilter, limit?: number): Promise<PerformanceEvent[]>;
  /** Get event by ID */
  getById(eventId: string): Promise<PerformanceEvent | null>;
  /** Delete events */
  delete(filter: EventFilter): Promise<number>;
  /** Get event statistics */
  getStats(): Promise<EventStoreStats>;
  /** Clean up old events */
  cleanup(olderThan: number): Promise<number>;
}

/**
 * Event store statistics
 */
export interface EventStoreStats {
  /** Total events stored */
  totalEvents: number;
  /** Events by type */
  eventsByType: Record<PerformanceEventType, number>;
  /** Storage size in bytes */
  storageSize: number;
  /** Oldest event timestamp */
  oldestEvent: number;
  /** Newest event timestamp */
  newestEvent: number;
}

/**
 * Event processor interface
 */
export interface EventProcessor {
  /** Processor ID */
  readonly id: string;
  /** Processor name */
  readonly name: string;
  /** Process an event */
  process(event: PerformanceEvent): Promise<PerformanceEvent | null>;
  /** Check if processor should handle this event */
  shouldProcess(event: PerformanceEvent): boolean;
  /** Processor priority */
  readonly priority: number;
}

/**
 * Event pipeline - processes events through multiple processors
 */
export interface EventPipeline {
  /** Add a processor to the pipeline */
  addProcessor(processor: EventProcessor): void;
  /** Remove a processor from the pipeline */
  removeProcessor(processorId: string): boolean;
  /** Process an event through the pipeline */
  process(event: PerformanceEvent): Promise<PerformanceEvent | null>;
  /** Get pipeline processors */
  getProcessors(): EventProcessor[];
  /** Get pipeline statistics */
  getStats(): EventPipelineStats;
}

/**
 * Event pipeline statistics
 */
export interface EventPipelineStats {
  /** Total events processed */
  totalEvents: number;
  /** Events processed by processor */
  eventsByProcessor: Record<string, number>;
  /** Average processing time per processor */
  averageTimeByProcessor: Record<string, number>;
  /** Pipeline errors */
  errors: number;
  /** Pipeline uptime */
  uptime: number;
}