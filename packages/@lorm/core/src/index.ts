export { defineConfig, loadConfig } from "./config.js";
export { defineRouter, createService, setDatabase } from "./router.js";
export { loadRouter, loadSchema } from "./load.js";
export { startServer } from "./server.js";
export { fileExists } from "./file-exists.js";
export type { configSchema } from "./types";
export type { lormConfig, lormDatabase, lormContext } from "./types";
export type { lormDatabase as Database } from "./types";

// Plugin System
export {
  PluginManager,
  PluginValidator,
  PluginInstaller,
  PluginRegistryManager,
  PluginFilesystemManager,
  PluginLifecycleManager,
  PluginLifecycleState,
  PluginContextFactory,
  PerformanceManager,
  OptimizedPluginLoader,
  PerformanceMonitor,
  PluginValidationService,
  SimplePluginBuilder,
  convertSimplePlugin,
  isSimplePlugin,
  createSimplePlugin,
  DEFAULT_PERFORMANCE_CONFIG
} from "./plugins";

export type {
  Plugin,
  PluginName,
  PluginVersion,
  PluginContext,
  PluginRuntimeAdapter,
  PluginOperationResult,
  PluginError,
  PluginErrorCode,
  PluginLifecycle,
  PerformanceMetrics,
  PerformanceConfig,
  ValidationMetrics,
  PluginTelemetry,
  TelemetryTracker,
  SimplePlugin,
  SimplePluginCommand,
  SimpleCommandOption,
  SimplePluginHook
} from "./plugins";

// Cache System
export {
  BaseCache,
  ConfigCache,
  CacheManager,
  cacheManager,
  clearCache,
  getCacheStats,
  getCacheStatsWithFileSystem,
  warmupCache,
  cleanupExpiredEntries,
  invalidateConfigCache,
  getCacheHealth,
  generateCacheKey,
  generateFileCacheKey,
  generateDirectoryCacheKey,
  serializeForCache,
  deserializeFromCache,
  validateCacheEntry,
  isCacheEntryExpired,
  calculateCacheEntrySize,
  formatCacheSize,
  formatCacheDuration,
  createConfigCacheKey,
  getFileHashesSync,
  hasFileChanges,
  debounceCache,
  withRetry,
  defaultCache,
  configCache
} from "./cache";

export type {
  CacheOptions,
  CacheEntry,
  CacheStats,
  ConfigCacheEntry,
  ValidationResult,
  ConfigValidationOptions,
  CacheEventData,
  CacheEventListener,
  ICacheManager,
  ICache,
  IConfigCache
} from "./cache";
