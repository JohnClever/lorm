/**
 * Plugin System Infrastructure
 * Core plugin loading and management functionality for LORM
 */

// Types
export type {
  PluginType,
  PluginLicense,
  PluginMetadata,
  PluginCommand,
  PluginCommandOption,
  PluginHookType,
  PluginHook,
  IPlugin,
  PluginLoadConfig,
  PluginLoadResult,
  PluginRegistryEntry,
  PluginHookContext,
  TypedCacheInstance,
  TypedSandboxInstance,
  TypedCommandSystemInstance,
  TypedPerformanceMonitorInstance,
  PluginLoaderContext,
  MarketplacePlugin,
  PluginInstallOptions,
  PluginInstallResult,
  PluginUninstallOptions,
  PluginSearchOptions,
  PluginSearchResult,
  PluginListOptions,
  PluginInfo,
  PluginConfig,
  IPluginLoader,
  IPluginRegistry,
  PluginValidationResult,
  PluginDependency,
  PluginSource,
  PluginErrorContext,
  PluginPerformanceReport,
  PluginOperationContext
} from './types.js';

// Classes
export { PluginError } from './types.js';

// Classes
export {
  BasePluginLoader,
  CLIPluginLoader
} from './loader.js';

export { PluginManager } from './manager';
export { PluginContextFactory } from './context-factory';
export { PluginInstaller } from './installer';
export { PluginRegistry } from './registry';
export { PluginErrorHandler } from './error-handler';
export { PluginPerformanceTracker } from './performance-tracker';