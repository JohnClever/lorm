/**
 * Performance System - Main entry point for the LORM performance monitoring framework
 */

// Core types - selective exports to avoid conflicts
export type {
  // Base types
  PerformanceAdapter,
  Metric,
  Alert,
  PerformanceEvent,
  ComponentHealth,
  AdapterType,
  MetricType,
  AlertSeverity,
  PerformanceEventType,
  
  // Config types
  PerformanceConfig,
  MetricsConfig,
  AlertsConfig,
  StorageConfig,
  
  // Adapter config types
  CacheAdapterConfig,
  DatabaseAdapterConfig,
  HttpAdapterConfig,
  ComputeAdapterConfig
} from './types/index.js';

// Core system
export * from './core/index.js';

// Adapters
export * from './adapters/index.js';

// Configuration
export * from './config.js';

// Additional utilities
export * from './utils.js';

// Main performance system exports for convenience
export {
  // Core system
  DefaultPerformanceSystem,
  DefaultPerformanceSystemFactory,
  DefaultPerformanceSystemBuilder,
  
  // Services
  DefaultMetricService,
  DefaultAlertService,
  DefaultEventService,
  DefaultStorageService,
  
  // Storage implementations
  InMemoryMetricStorage,
  InMemoryAlertStorage,
  InMemoryEventStore,
  InMemoryMetricStorageAdapter,
  InMemoryEventStorageAdapter,
  
  // Event processing
  DefaultEventPipeline
} from './core/index.js';

export {
  // Adapter system
  AdapterRegistry,
  DefaultAdapterManager,
  AdapterFactoryRegistry,
  
  // Adapter implementations
  CachePerformanceAdapter,
  DatabasePerformanceAdapter,
  HttpPerformanceAdapter,
  SystemPerformanceAdapter,
  
  // Adapter factories
  CacheAdapterFactory,
  DatabaseAdapterFactory,
  HttpAdapterFactory,
  SystemAdapterFactory,
  
  // Middleware
  MiddlewareAdapterWrapper,
  LoggingMiddleware,
  MetricsEnrichmentMiddleware,
  RateLimitingMiddleware,
  CachingMiddleware,
  ErrorHandlingMiddleware,
  
  // Utilities
  AdapterBuilder,
  AdapterUtils,
  AdapterAutoDetection,
  SystemMonitor
} from './adapters/index.js';

// Quick start factory functions
export {
  createPerformanceSystem,
  createDefaultPerformanceSystem,
  createMinimalPerformanceSystem,
  createProductionPerformanceSystem
} from './factory.js';

// Configuration helpers
export {
  PerformanceConfigBuilder,
  createDefaultConfig,
  createProductionConfig,
  createDevelopmentConfig,
  validateConfig
} from './config.js';

// Integration helpers - commented out until integrations.js is implemented
// export {
//   integrateWithExpress,
//   integrateWithFastify,
//   integrateWithKoa,
//   integrateWithCache,
//   integrateWithDatabase,
//   createGlobalPerformanceSystem
// } from './integrations.js';

// Version information
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

// Default instances for convenience
let _defaultSystem: any = null;
let _defaultAdapterManager: any = null;

/**
 * Get or create the default performance system instance
 */
export async function getDefaultPerformanceSystem(): Promise<any> {
  if (!_defaultSystem) {
    const { createDefaultPerformanceSystem } = await import('./factory.js');
    _defaultSystem = await createDefaultPerformanceSystem();
  }
  return _defaultSystem;
}

/**
 * Get or create the default adapter manager instance
 */
export async function getDefaultAdapterManager(): Promise<any> {
  if (!_defaultAdapterManager) {
    const { getDefaultAdapterManager } = await import('./adapters/index.js');
    _defaultAdapterManager = getDefaultAdapterManager();
  }
  return _defaultAdapterManager;
}

/**
 * Reset default instances (useful for testing)
 */
export function resetDefaults(): void {
  _defaultSystem = null;
  _defaultAdapterManager = null;
}

/**
 * Performance system status
 */
export interface PerformanceSystemInfo {
  version: string;
  buildDate: string;
  isInitialized: boolean;
  isRunning: boolean;
  adaptersCount: number;
  servicesCount: number;
}

/**
 * Get performance system information
 */
export async function getSystemInfo(): Promise<PerformanceSystemInfo> {
  const system = await getDefaultPerformanceSystem();
  const adapterManager = await getDefaultAdapterManager();
  
  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    isInitialized: system.isInitialized(),
    isRunning: system.isRunning(),
    adaptersCount: adapterManager.getStats().totalAdapters,
    servicesCount: 4 // metric, alert, event, storage
  };
}

/**
 * Quick start function for basic performance monitoring
 */
export async function startPerformanceMonitoring(config?: any): Promise<any> {
  const system = await getDefaultPerformanceSystem();
  
  if (config) {
    await system.initialize(config);
  }
  
  if (!system.isRunning()) {
    await system.start();
  }
  
  return system;
}

/**
 * Stop performance monitoring
 */
export async function stopPerformanceMonitoring(): Promise<void> {
  if (_defaultSystem && _defaultSystem.isRunning()) {
    await _defaultSystem.stop();
  }
  
  if (_defaultAdapterManager && _defaultAdapterManager.isStarted()) {
    await _defaultAdapterManager.stop();
  }
}

/**
 * Cleanup all performance monitoring resources
 */
export async function cleanupPerformanceSystem(): Promise<void> {
  await stopPerformanceMonitoring();
  
  if (_defaultSystem) {
    await _defaultSystem.dispose();
  }
  
  if (_defaultAdapterManager) {
    await _defaultAdapterManager.dispose();
  }
  
  resetDefaults();
}

// Error types
export class PerformanceSystemError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PerformanceSystemError';
  }
}

export class AdapterError extends PerformanceSystemError {
  constructor(message: string, public adapterId?: string) {
    super(message, 'ADAPTER_ERROR');
    this.name = 'AdapterError';
  }
}

export class ConfigurationError extends PerformanceSystemError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

// Types are already exported above - no need to duplicate