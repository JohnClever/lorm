/**
 * Performance Core - Entry point for core performance system
 */

// Core interfaces
export * from './interfaces.js';

// Base implementations
export * from './base-monitor.js';
export * from './base-collector.js';
export * from './base-adapter.js';

// Core services
export * from './metric-service.js';
export * from './alert-service.js';
export * from './event-service.js';
export * from './storage-service.js';

// Main performance system
export * from './performance-system.js';

// Re-export key classes for convenience
export {
  DefaultPerformanceSystem,
  DefaultPerformanceSystemFactory,
  DefaultPerformanceSystemBuilder
} from './performance-system.js';

export {
  DefaultMetricService,
  InMemoryMetricStorage
} from './metric-service.js';

export {
  DefaultAlertService,
  InMemoryAlertStorage
} from './alert-service.js';

export {
  DefaultEventService,
  InMemoryEventStore,
  DefaultEventPipeline
} from './event-service.js';

export {
  DefaultStorageService,
  InMemoryMetricStorageAdapter,
  InMemoryEventStorageAdapter
} from './storage-service.js';