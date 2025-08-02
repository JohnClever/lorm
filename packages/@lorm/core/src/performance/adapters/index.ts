/**
 * Performance Adapters - Entry point for all performance system adapters
 */

// Base adapter
export * from './base-adapter.js';

// Specific adapters
export * from './cache-adapter.js';
export * from './database-adapter.js';
export * from './http-adapter.js';
export * from './system-adapter.js';

// Adapter management
export * from './adapter-registry.js';
export * from './adapter-factory.js';

// Middleware
export * from './middleware.js';

// Re-export key classes for convenience
export {
  EnhancedBaseAdapter
} from './base-adapter.js';

export {
  CachePerformanceAdapter,
  createCacheAdapter
} from './cache-adapter.js';

export {
  DatabasePerformanceAdapter,
  createDatabaseAdapter
} from './database-adapter.js';

export {
  HttpPerformanceAdapter,
  createHttpAdapter,
  createMonitoredFetch,
  setupAxiosMonitoring
} from './http-adapter.js';

export {
  SystemPerformanceAdapter,
  createSystemAdapter,
  SystemMonitor
} from './system-adapter.js';

export {
  AdapterRegistry,
  DefaultAdapterManager,
  createAdapterRegistry,
  createAdapterManager,
  getDefaultAdapterRegistry,
  getDefaultAdapterManager
} from './adapter-registry.js';

export {
  BaseAdapterFactory,
  CacheAdapterFactory,
  DatabaseAdapterFactory,
  HttpAdapterFactory,
  SystemAdapterFactory,
  AdapterFactoryRegistry,
  AdapterBuilder,
  AdapterUtils,
  AdapterAutoDetection,
  getDefaultFactoryRegistry,
  createAdapter,
  adapterBuilder,
  autoDetectAdapter,
  cacheFactory,
  databaseFactory,
  httpFactory,
  systemFactory
} from './adapter-factory.js';

export {
  BaseMiddleware,
  LoggingMiddleware,
  MetricsEnrichmentMiddleware,
  RateLimitingMiddleware,
  CachingMiddleware,
  ErrorHandlingMiddleware,
  MiddlewareAdapterWrapper,
  MiddlewarePresets,
  createMiddlewareAdapter,
  withMiddleware,
  loggingMiddleware,
  metricsEnrichmentMiddleware,
  rateLimitingMiddleware,
  cachingMiddleware,
  errorHandlingMiddleware
} from './middleware.js';