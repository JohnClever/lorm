// =============================================================================
// COMMAND OPTIONS INTERFACES
// =============================================================================

export interface BaseCommandOptions {
  _?: string[];
  help?: boolean;
  version?: boolean;
}

export interface CommonCommandOptions extends BaseCommandOptions {
  force?: boolean;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export interface FixableCommandOptions extends CommonCommandOptions {
  fix?: boolean;
}

export interface DryRunCommandOptions extends CommonCommandOptions {
  "dry-run"?: boolean;
}

export interface ExportableCommandOptions extends CommonCommandOptions {
  export?: string;
}

export interface ClearableCommandOptions extends CommonCommandOptions {
  clear?: boolean;
}

export interface HelpCommandOptions extends BaseCommandOptions {
  command?: string;
  _?: string[];
}

export interface InitCommandOptions extends CommonCommandOptions {
  "skip-install"?: boolean;
}

export interface CheckCommandOptions extends FixableCommandOptions {}

export interface HealthCommandOptions extends CommonCommandOptions {
  system?: boolean;
}

export interface PerformanceCommandOptions
  extends ExportableCommandOptions,
    ClearableCommandOptions {}

export interface CacheStatsCommandOptions extends BaseCommandOptions {}

export interface SecurityLogsCommandOptions extends BaseCommandOptions {
  lines?: number;
  level?: 'info' | 'warn' | 'error' | 'critical';
  follow?: boolean;
  json?: boolean;
  search?: string;
}

export interface SecurityAuditCommandOptions extends BaseCommandOptions {
  verbose?: boolean;
  json?: boolean;
  fix?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Database Command Options
export interface DbCommandOptions extends BaseCommandOptions {
  force?: boolean;
  name?: string;
  to?: string;
  introspect?: boolean;
  dryRun?: boolean;
  port?: number;
  host?: string;
  confirm?: boolean;
}

export interface DbPushCommandOptions extends CommonCommandOptions {}
export interface DbGenerateCommandOptions extends CommonCommandOptions {
  name?: string;
}
export interface DbMigrateCommandOptions extends CommonCommandOptions {
  to?: string;
}
export interface DbPullCommandOptions extends CommonCommandOptions {
  introspect?: boolean;
}
export interface DbUpCommandOptions extends DryRunCommandOptions {}
export interface DbStudioCommandOptions extends CommonCommandOptions {
  port?: number;
  host?: string;
}
export interface DbDropCommandOptions extends CommonCommandOptions {
  force?: boolean;
  confirm?: boolean;
}

// Development Command Options
export interface DevCommandOptions extends BaseCommandOptions {
  port?: number;
}


// Utility Command Options
export interface UtilityCommandOptions extends BaseCommandOptions {
  type?: string;
  output?: string;
}

// Security Command Options
export interface SecurityCommandOptions extends BaseCommandOptions {
  audit?: boolean;
  fix?: boolean;
  report?: string;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

export interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export interface ErrorSuggestion {
  message: string;
  action?: string;
  command?: string;
}

export interface RecoveryOptions {
  showSuggestions?: boolean;
  exitOnError?: boolean;
  logLevel?: "error" | "warn" | "info";
}

export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  DATABASE = 'database',
  CONFIGURATION = 'configuration',

  SECURITY = 'security',
  PERFORMANCE = 'performance',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  command?: string;
  args?: string[];
  workingDirectory?: string;
  configPath?: string;
  stackTrace?: string;
  timestamp: string;
  sessionId?: string;
  userAgent?: string;
  environment?: Record<string, string | number | boolean>;
}

export interface RecoveryAction {
  description: string;
  command?: string;
  automatic?: boolean;
  priority: number;
}

export interface LormError {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  context: ErrorContext;
  recoveryActions: RecoveryAction[];
  originalError?: Error;
  helpUrl?: string;
}

export interface ErrorHandlerConfig {
  logPath: string;
  enableStackTrace: boolean;
  enableRecovery: boolean;
  maxLogSize: number;
  reportingEnabled: boolean;
  reportingUrl?: string;
}

// File System Error Types
export enum FileSystemErrorCode {
  FILE_NOT_FOUND = 'ENOENT',
  PERMISSION_DENIED = 'EACCES',
  FILE_EXISTS = 'EEXIST',
  DIRECTORY_NOT_EMPTY = 'ENOTEMPTY',
  INVALID_PATH = 'EINVAL',
  DISK_FULL = 'ENOSPC',
  TOO_MANY_OPEN_FILES = 'EMFILE',
  OPERATION_NOT_PERMITTED = 'EPERM',
  UNKNOWN = 'UNKNOWN'
}

export interface FileSystemError extends Error {
  code: FileSystemErrorCode;
  path?: string;
  syscall?: string;
  errno?: number;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

// ValidationResult and ConfigValidationOptions are now imported from @lorm/core
// Remove duplicated validation types - use imports from @lorm/core instead

// =============================================================================
// SECURITY TYPES
// =============================================================================

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface DatabaseUrlInfo {
  protocol: string;
  hostname: string;
  port: string | null;
  database: string;
  isLocal: boolean;
  isSecure: boolean;
}

// Cache types are now imported from @lorm/core
// Remove duplicated cache types - use imports from @lorm/core instead

// =============================================================================
// FILE SYSTEM TYPES
// =============================================================================

export interface FileStats {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

export interface ReadOptions {
  encoding?: BufferEncoding;
  flag?: string;
}

export interface WriteOptions {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
  createDir?: boolean;
}

export interface DirectoryOptions {
  recursive?: boolean;
  mode?: number;
}

// =============================================================================
// LANGUAGE HANDLER TYPES
// =============================================================================

export interface LanguageInfo {
  name: string;
  extensions: string[];
  configFile: string;
  schemaFile: string;
  routerFile: string;
}

export interface FilePathConfig {
  config: string;
  schema: string;
  router: string;
  types?: string;
}

// =============================================================================
// PERFORMANCE MONITORING TYPES
// =============================================================================

export interface IPerformanceTracker {
  end(success?: boolean, errorType?: string): Promise<void>;
}

export interface PerformanceMetric {
  timestamp: string;
  command: string;
  args: string[];
  duration: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  sessionId: string;
  success: boolean;
  errorType?: string;
  options?: Record<string, string | number | boolean>;
  cacheStats?: {
    hits: number;
    misses: number;
    size: number;
  };
  moduleLoadTimes?: Record<string, number>;
  errorCount?: number;
}

export interface LegacyPerformanceMetric {
  command: string;
  duration: number;
  timestamp: string;
  memoryUsage: NodeJS.MemoryUsage;
  options?: Record<string, string | number | boolean>;
  cacheStats?: {
    hits: number;
    misses: number;
    size: number;
  };
  moduleLoadTimes?: Record<string, number>;
  errorCount?: number;
  success: boolean;
  args: string[];
  cpuUsage: NodeJS.CpuUsage;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceStats {
  totalCommands: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  slowestCommand: PerformanceMetric | null;
  fastestCommand: PerformanceMetric | null;
  memoryTrend: {
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  commandFrequency: Record<string, number>;
  errorRate: number;
}

export interface PerformanceReport {
  totalCommands: number;
  averageDuration: number;
  slowestCommand: PerformanceMetric | null;
  fastestCommand: PerformanceMetric | null;
  memoryTrends: {
    averageHeapUsed: number;
    peakHeapUsed: number;
  };
}

export interface PerformanceConfig {
  enabled: boolean;
  logPath: string;
  maxLogSize: number;
  retentionDays: number;
  slowCommandThreshold: number;
  memoryWarningThreshold: number;
}

// =============================================================================
// CONFIGURATION SCHEMA TYPES
// =============================================================================

export interface LormConfig {
  database: DatabaseConfig;
  security?: SecurityConfig;
  performance?: PerformanceConfig;
  development?: DevelopmentConfig;
  migrations?: ConfigMigration[];
}

export interface DatabaseConfig {
  url?: string;
  provider: 'postgresql' | 'mysql' | 'sqlite' | 'turso';
  ssl?: boolean;
  pool?: {
    min?: number;
    max?: number;
    idle?: number;
  };
  migrations?: {
    directory?: string;
    tableName?: string;
  };
}


export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
  };
  authentication: {
    required: boolean;
    methods: string[];
  };
  authorization: {
    roles: string[];
    permissions: Record<string, string[]>;
  };
  auditLogPath: string;
  encryptionKey?: string;
  commandSandbox: boolean;
  enableAuditLog: boolean;
  allowedCommands?: string[];
  sessionTimeout: number;
}

export interface DevelopmentConfig {
  hotReload?: boolean;
  debugMode?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  devServer?: {
    port?: number;
    host?: string;
  };
}

export interface ConfigMigration {
  version: string;
  description: string;
  up: (config: Record<string, unknown>) => Record<string, unknown>;
  down: (config: Record<string, unknown>) => Record<string, unknown>;
}

// =============================================================================
// COMMAND REGISTRY TYPES
// =============================================================================

export interface CommandFactoryConfig<T extends BaseCommandOptions> {
  name: string;
  description: string;
  category: string;
  action: (options: T, ...args: string[]) => Promise<void>;
  options?: Array<{ flag: string; description: string }>;
  examples?: string[];
  aliases?: string[];
  requiresConfig?: boolean;
  requiresSchema?: boolean;
}

export interface CommandGroup<T extends BaseCommandOptions> {
  prefix: string;
  category:
    | "core"
    | "database"
    | "development"
    | "utility"

    | "security";
  defaultOptions?: Partial<CommandFactoryConfig<T>>;
  commands: Array<Omit<CommandFactoryConfig<T>, "category">>;
}

export interface CommandConfig<
  T extends BaseCommandOptions = BaseCommandOptions
> {
  name: string;
  description: string;
  aliases?: string[];
  options?: Array<{
    flag: string;
    description: string;
    defaultValue?: string | number | boolean;
  }>;
  requiresConfig?: boolean;
  requiresSchema?: boolean;
  action: (options: T, ...args: string[]) => Promise<void>;
  examples?: string[];
  category?:
    | "core"
    | "database"
    | "development"
    | "utility"

    | "security";
}
export interface ValidationConfig {
  requireConfig?: boolean;
  requireSchema?: boolean;
}

// =============================================================================
// PLUGIN TYPES
// =============================================================================

export interface PluginGroup<T extends BaseCommandOptions> {
  prefix: string;
  category:
    | "core"
    | "database"
    | "development"
    | "utility"
    | "security";
  defaultOptions?: Partial<CommandFactoryConfig<T>>;
  plugins: Array<Omit<CommandFactoryConfig<T>, "category">>;
}

export interface PluginCommandConfig<T extends BaseCommandOptions> {
  name: string;
  description: string;
  aliases?: string[];
  options?: Array<{
    flag: string;
    description: string;
    defaultValue?: string | number | boolean;
  }>;
  requiresConfig?: boolean;
  requiresSchema?: boolean;
  action: (options: T, ...args: string[]) => Promise<void>;
  examples?: string[];
  category?:
    | "core"
    | "database"
    | "development"
    | "utility"
    | "security";
}

export interface PluginFactoryConfig<T extends BaseCommandOptions> {
  name: string;
  description: string;
  category: string;
  action: (options: T, ...args: string[]) => Promise<void>;
  options?: Array<{ flag: string; description: string }>;
  examples?: string[];
  aliases?: string[];
  requiresConfig?: boolean;
  requiresSchema?: boolean;
}

export interface PluginValidationConfig {
  requireConfig?: boolean;
  requireSchema?: boolean;
  allowedCategories?: string[];
  maxPlugins?: number;
}

export interface PluginContext {
  pluginName: string;
  category: string;
  options: Record<string, unknown>;
  args: string[];
  workingDirectory: string;
  timestamp: number;
}

export interface PluginExecutionResult {
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// LAZY LOADER TYPES
// =============================================================================

export interface LazyModule<T = unknown> {
  load(): Promise<T>;
  isLoaded(): boolean;
  unload(): void;
}

export interface LazyLoaderOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

export type LazyLoaderKey = string | symbol;

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

export interface HealthCheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: Record<string, string | number | boolean | null | string[]>;
}
export interface SystemInfo {
  node: string;
  npm: string;
  os: string;
  arch: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
}


export interface CliCommand {
  option: (flags: string, description: string, options?: { default?: unknown }) => CliCommand;
  alias: (alias: string) => CliCommand;
  action: (callback: (...args: unknown[]) => void | Promise<void>) => CliCommand;
  example: (example: string) => CliCommand;
}

export interface CliInstance {
  command: (name: string, description: string) => CliCommand;
  option: (flags: string, description: string, defaultValue?: unknown) => CliInstance;
  action: (callback: (...args: unknown[]) => void | Promise<void>) => CliInstance;
}

// Plugin interfaces have been moved to @lorm/core package

// All plugin-related interfaces have been moved to src/plugins/types/index.ts



// Plugin utility functions have been moved to src/plugins/utils/validation.ts

// All remaining plugin interfaces have been moved to src/plugins/types/index.ts

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export interface LormRouter {
  get: (path: string, handler: (req: unknown, res: unknown) => void | Promise<void>) => void;
  post: (path: string, handler: (req: unknown, res: unknown) => void | Promise<void>) => void;
  put: (path: string, handler: (req: unknown, res: unknown) => void | Promise<void>) => void;
  delete: (path: string, handler: (req: unknown, res: unknown) => void | Promise<void>) => void;
  patch: (path: string, handler: (req: unknown, res: unknown) => void | Promise<void>) => void;
  use: (middleware: (req: unknown, res: unknown, next: () => void) => void | Promise<void>) => void;
}

export type ExtractRouterMethods<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? K : never;
}[keyof T];

export type TypedLormRouter<T extends Record<string, unknown>> = {
  [K in ExtractRouterMethods<T>]: T[K];
};

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

// =============================================================================
// SECURITY MANAGER TYPES
// =============================================================================

export interface AuditLogEntry {
  timestamp: string;
  command: string;
  args: string[];
  user: string;
  workingDirectory: string;
  success: boolean;
  duration: number;
  errorMessage?: string;
  sessionId: string;
}
export interface SecurityContext {
  sessionId: string;
  user: string;
  workingDirectory: string;
  allowedCommands?: string[];
  sandboxEnabled?: boolean;
}