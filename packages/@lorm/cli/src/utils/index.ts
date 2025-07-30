export { packageManager, installDependencies } from "./package-manager";

export { resolveDrizzleKitBin, executeDrizzleKit } from "./drizzle-kit";

export {
  validateConfig,
  validateConfigOrExit,
  displayValidationResults,
} from "./config-validator";
export type {
  ValidationResult,
  ConfigValidationOptions,
} from "./config-validator";

export { ErrorRecovery } from "./error-recovery";

export {
  COMMAND_HELP,
  COMMAND_CATEGORIES,
  displayCommandHelp,
  displayGeneralHelp,
  displayCategoryHelp,
  displayQuickStart,
} from "./help-system";
export type {
  CommandExample,
  CommandHelp,
  CommandCategory,
} from "./help-system";

export { CommandCache } from "./cache";

export type { PerformanceMetric, PerformanceReport } from "./performance";
export { PerformanceMonitor, PerformanceTracker } from "./performance";

export type {
  PluginContext,
  PluginCommand,
  PluginHook,
  Plugin,
  PluginConfig,
} from "./plugin-system";
export { PluginManager } from "./plugin-system";

export {
  initializeCommand,
  handleCommandError,
  validateSchemaFile,
  setupLormDirectory,
} from "./setup";

export {
  initializeAdvancedCommand,
  handleAdvancedCommandError,
} from "./advanced-setup";

export {
  lazyLoaders,
  preloadModules,
  warmCache,
  getCacheStats,
} from "./lazy-loader";

export { FileUtils, fileExists } from "./file-utils";
export type {
  FileStats,
  ReadOptions,
  WriteOptions,
  DirectoryOptions,
} from "./file-utils";
export {
  CommandRegistry,
  createCommand,
  createDatabaseCommand,
  createDevelopmentCommand,
} from "./command-registry";

export { HealthChecker } from "./health-check.js";