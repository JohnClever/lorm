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
  IPluginLoader,
  IPluginRegistry,
  PluginValidationResult,
  PluginDependency
} from './types.js';

// Classes
export {
  BasePluginLoader,
  CLIPluginLoader
} from './loader.js';