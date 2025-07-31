/**
 * LORM CLI Plugin System
 * Main entry point for the plugin architecture
 */

// Core exports
export { PluginManager, createPluginManager, getPluginManager } from './core/manager';

// Command exports
export {
  registerPluginCommands,
  getPluginCommands,
  createPluginCommand
} from './commands';

// Type exports
export type {
  Plugin,
  PluginInfo,
  PluginCommand,
  PluginHook,
  PluginContext,
  PluginLogger,
  PluginCLI,
  PluginUtils,
  PluginFileSystem,
  PluginPath,
  PluginCrypto,
  PluginHttp,
  PluginChalk,
  PluginCache,
  PluginMarketplace,
  MarketplacePlugin,
  PluginReview,
  PluginSettings,
  PluginSystemConfig,
  PluginRegistry,
  PluginInstallOptions,
  PluginSearchOptions,
  PluginOperationResult,
  PluginInstallResult,
  PluginUninstallResult,
  PluginUpdateResult,
  PluginSearchResult,
  PluginListResult,
  PluginEnableResult,
  PluginDisableResult,
  PluginErrorCode,
  PluginError,
  PluginErrorDetails,
  PluginLicense,
  LicenseType,
  PluginCommandOption,
  IPluginManager
} from './types';

// Utility exports
export {
  isPlugin,
  validatePluginName,
  validatePluginVersion,
  isPluginCommand,
  validatePluginLicense,
  validatePluginDependencies,
  validatePluginEngines,
  createPluginError,
  isPluginError,
  validatePluginConfig,
  validatePlugin,
  sanitizePluginName,
  satisfiesVersion
} from './utils/validation';

export {
  PluginInstaller,
  createPluginInstaller
} from './utils/installer';

export {
  PluginRegistryManager,
  createPluginRegistry,
  getPluginRegistry
} from './utils/registry';

export {
  getPluginsDirectory,
  getPluginCacheDirectory,
  getPluginConfigDirectory,
  ensureDirectoryExists,
  copyDirectory,
  readJsonFile,
  writeJsonFile,
  pathExists,
  getFileStats,
  listDirectories,
  removeDirectory,
  createTempDirectory,
  cleanupTempDirectories,
  getPluginDirectory,
  getPluginPackageJsonPath,
  getPluginMainPath,
  ensurePluginDirectories,
  getDirectorySize,
  formatFileSize,
  isDirectoryEmpty,
  backupDirectory,
  restoreFromBackup
} from './utils/filesystem';

// Export all plugin-related types and utilities
export * from './types';
export * from './types/simple';
export * from './core';
export * from './core/performance';
export * from './utils';
export * from './utils/testing';
export * from './schemas';
export * from './commands';

// Re-export key simplified interfaces for easier access
export type { SimplePlugin, SimplePluginCommand, SimplePluginHook } from './types/simple';
export { SimplePluginBuilder, createSimplePlugin } from './types/simple';

// Re-export performance utilities
export type { PerformanceMetrics, PerformanceConfig } from './core/performance';
export { PerformanceManager, OptimizedPluginLoader, PerformanceMonitor } from './core/performance';

// Re-export testing utilities
export type { PluginTestConfig, PluginTestResult } from './utils/testing';
export { MockPluginManager, PluginTestSuite, PluginTestUtils } from './utils/testing';

// Note: Using named exports only - no default export needed