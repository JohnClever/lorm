export { packageManager, installDependencies, getCommandPrefix } from "./package-manager";
export { resolveDrizzleKitBin, executeDrizzleKit } from "./drizzle-kit";
export {
  LormConfigSchema,
  DevelopmentEnvConfigSchema,
  ProductionEnvConfigSchema,
  ConfigMigrationSchema,
  ConfigValidator,
} from "./config-schema";
export type {
  LormConfig,
  DatabaseConfig,
  SecurityConfig,
  PerformanceConfig,
  DevelopmentConfig,
  ConfigMigration,
} from "./config-schema";
export {
  validateConfig,
  validateConfigOrExit,
  displayValidationResults,
} from "./config-validator";
export type {
  ValidationResult,
  ConfigValidationOptions,
} from "./config-validator";
export { CommandCache } from "./cache";
export type {
  PerformanceMetric,
  PerformanceReport,
} from "./performance-monitor";
export {
  PerformanceMonitor,
  PerformanceTracker,
  LegacyPerformanceMonitor,
} from "./performance-monitor";
// Plugin-related exports have been moved to src/plugins/index.ts
export {
  initializeCommand,
  handleCommandError,
  validateSchemaFile,
  setupLormDirectory,
  createInitialProject,
  detectTypeScript,
  ensureLormDirectory,
  createSchemaFile,
  createDrizzleConfig,
  initializeAdvancedCommand,
  handleAdvancedCommandError,
  validateSchemaFileOptional,
} from "./setup";
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
export { HealthChecker } from "./health-check";
export { SecurityValidator, SecurityAuditLogger } from "./security";
