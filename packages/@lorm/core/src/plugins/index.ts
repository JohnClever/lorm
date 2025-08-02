// Plugin System for LORM Framework
// Main entry point for the plugin architecture

// Core Plugin Types
export * from './types';

// Core Plugin Manager
export { PluginManager } from './core/manager';

// Plugin Utilities
export { PluginValidator } from './utils/validation';
export { PluginInstaller } from './utils/installation';
export { PluginRegistryManager } from './utils/registry';
export { PluginFilesystemManager } from './utils/filesystem';

// Plugin Lifecycle
export { PluginLifecycleManagerImpl as PluginLifecycleManager } from './core/lifecycle-manager';

// Plugin Context
export { PluginContextFactory } from './core/context-factory';

// Performance Optimization
export {
  PerformanceManager,
  OptimizedPluginLoader,
  PerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceConfig,
  DEFAULT_PERFORMANCE_CONFIG
} from './core/performance';

// Enhanced Validation Service
export {
  PluginValidationService,
  type ValidationMetrics,
  type PluginTelemetry,
  type TelemetryTracker
} from './core/validation-service';

// Simple Plugin Interface
export {
  SimplePluginBuilder,
  convertSimplePlugin,
  isSimplePlugin,
  createSimplePlugin,
  type SimplePlugin,
  type SimplePluginCommand,
  type SimpleCommandOption,
  type SimplePluginHook
} from './types/simple';

// Re-export commonly used types for convenience
export type {
  Plugin,
  PluginName,
  PluginVersion,
  PluginContext,
  PluginRuntimeAdapter,
  PluginOperationResult,
  PluginError,
  PluginErrorCode
} from './types';