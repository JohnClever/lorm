// Core Plugin System Types for LORM Framework
// This file contains the core types that are framework-agnostic

// Branded Types for Type Safety
export type PluginName = string & { readonly __brand: 'PluginName' };
export type PluginVersion = string & { readonly __brand: 'PluginVersion' };
export type CommandName = string & { readonly __brand: 'CommandName' };
export type HookName = string & { readonly __brand: 'HookName' };
export type PermissionName = string & { readonly __brand: 'PermissionName' };
export type ConfigKey = string & { readonly __brand: 'ConfigKey' };
export type PluginId = string & { readonly __brand: 'PluginId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type CacheKey = string & { readonly __brand: 'CacheKey' };
export type FilePath = string & { readonly __brand: 'FilePath' };
export type Url = string & { readonly __brand: 'Url' };
export type Hash = string & { readonly __brand: 'Hash' };
export type Timestamp = number & { readonly __brand: 'Timestamp' };

// Branded Type Creators and Validators
export const PluginName = {
  create: (name: string): PluginName => {
    if (!PluginName.validate(name)) {
      throw new Error(`Invalid plugin name: ${name}`);
    }
    return name as PluginName;
  },
  validate: (name: string): name is PluginName => {
    return /^[a-z0-9-_]+$/.test(name) && name.length >= 2 && name.length <= 50;
  }
};

export const PluginVersion = {
  create: (version: string): PluginVersion => {
    if (!PluginVersion.validate(version)) {
      throw new Error(`Invalid plugin version: ${version}`);
    }
    return version as PluginVersion;
  },
  validate: (version: string): version is PluginVersion => {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/.test(version);
  },
  compare: (a: PluginVersion, b: PluginVersion): number => {
    const parseVersion = (v: string) => v.split('.').map(Number);
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);
    
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }
};

export const CommandName = {
  create: (name: string): CommandName => {
    if (!CommandName.validate(name)) {
      throw new Error(`Invalid command name: ${name}`);
    }
    return name as CommandName;
  },
  validate: (name: string): name is CommandName => {
    return /^[a-z0-9-:]+$/.test(name) && name.length >= 1 && name.length <= 50;
  }
};

export const HookName = {
  create: (name: string): HookName => {
    if (!HookName.validate(name)) {
      throw new Error(`Invalid hook name: ${name}`);
    }
    return name as HookName;
  },
  validate: (name: string): name is HookName => {
    return /^[a-z0-9-:]+$/.test(name) && name.length >= 1 && name.length <= 50;
  }
};

export const FilePath = {
  create: (path: string): FilePath => {
    if (!FilePath.validate(path)) {
      throw new Error(`Invalid file path: ${path}`);
    }
    return path as FilePath;
  },
  validate: (path: string): path is FilePath => {
    return typeof path === 'string' && path.length > 0;
  }
};

// Utility Types
export type StrictRecord<K extends string | number | symbol, V> = {
  readonly [P in K]: V;
};

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type StrictPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Core Plugin Interface
export interface Plugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>> {
  readonly name: PluginName;
  readonly version: PluginVersion;
  readonly description: string;
  readonly author: string;
  readonly license: PluginLicense;
  readonly homepage?: string;
  readonly repository?: string;
  readonly keywords?: readonly string[];
  readonly engines?: {
    readonly node?: string;
    readonly lorm?: string;
  };
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly commands?: readonly PluginCommand[];
  readonly hooks?: readonly PluginHook[];
  readonly config?: {
    readonly schema?: TConfig;
    readonly default?: Partial<TConfig>;
  };
  readonly marketplace?: PluginMarketplace;
  readonly isPremium?: boolean;
  readonly init?: (context: PluginContext<TConfig>) => Promise<void> | void;
  readonly initialize?: (context: PluginContext<TConfig>) => void | Promise<void>;
  readonly cleanup?: () => Promise<void> | void;
  readonly configSchema?: ConfigSchema<TConfig>;
  readonly defaultConfig?: Readonly<Partial<TConfig>>;
  readonly permissions?: readonly PluginPermission[];
  readonly minCliVersion?: string;
  readonly maxCliVersion?: string;
  readonly pluginDependencies?: readonly PluginDependency[];
  readonly lifecycle?: PluginLifecycle<TConfig>;
  readonly metadata?: PluginMetadata;
  readonly state?: PluginState;
}

// Plugin Permission System
export interface PluginPermission {
  readonly name: string;
  readonly description: string;
  readonly required?: boolean;
  readonly dangerous?: boolean;
}

// Plugin Dependencies
export interface PluginDependency {
  readonly name: string;
  readonly version?: string;
  readonly optional?: boolean;
  readonly reason?: string;
}

// Plugin Lifecycle
export interface PluginLifecycle<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  readonly onInstall?: (context: PluginContext<TConfig>) => Promise<void> | void;
  readonly onUninstall?: (context: PluginContext<TConfig>) => Promise<void> | void;
  readonly onActivate?: (context: PluginContext<TConfig>) => Promise<void> | void;
  readonly onDeactivate?: (context: PluginContext<TConfig>) => Promise<void> | void;
  readonly onUpdate?: (context: PluginContext<TConfig>, oldVersion: string) => Promise<void> | void;
  readonly onConfigChange?: (context: PluginContext<TConfig>, oldConfig: TConfig, newConfig: TConfig) => Promise<void> | void;
  cleanup?(): Promise<void> | void;
}

// Plugin Metadata
export interface PluginMetadata {
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly icon?: string;
  readonly screenshots?: readonly string[];
  readonly documentation?: string;
  readonly changelog?: string;
  readonly support?: string;
  readonly funding?: readonly PluginFunding[];
}

export interface PluginFunding {
  readonly type: 'github' | 'opencollective' | 'patreon' | 'ko-fi' | 'tidelift' | 'custom';
  readonly url: string;
}

// Plugin Schema
export interface PluginSchema {
  name: RegExp;
  version: RegExp;
  requiredFields: readonly (keyof Plugin)[];
  optionalFields: readonly (keyof Plugin)[];
}

// Plugin Info
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: PluginLicense;
  installed: boolean;
  enabled: boolean;
  size: number;
  installDate?: Date;
  updateDate?: Date;
  installedAt?: Date;
  dependencies: string[];
  commands: string[] | PluginCommand[];
  hooks: string[] | PluginHook[];
  keywords?: string[];
  isPremium?: boolean;
  marketplace?: {
    category?: string;
  };
  path?: string;
  installPath?: string;
  source?: 'local' | 'git' | 'npm' | 'marketplace';
  gitUrl?: string;
  gitBranch?: string;
  npmPackage?: string;
  peerDependencies?: string[];
  engines?: Record<string, string>;
}

// Plugin Commands
export interface PluginCommand<
  TArgs extends StrictRecord<string, unknown> = StrictRecord<string, unknown>,
  TOptions extends StrictRecord<string, unknown> = StrictRecord<string, unknown>,
  TContext extends PluginContext = PluginContext
> {
  name: CommandName;
  description: string;
  options?: readonly TypedCommandOption<keyof TOptions>[];
  handler: (args: TArgs, options: TOptions, context: TContext) => Promise<CommandResult> | CommandResult;
  aliases?: readonly string[];
  pluginName?: string;
  examples?: readonly CommandExample[];
  category?: string;
  hidden?: boolean;
  deprecated?: boolean;
  since?: string;
  permissions?: readonly string[];
  rateLimit?: {
    readonly requests: number;
    readonly window: number; // in milliseconds
  };
}

export interface CommandResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly message?: string;
  readonly warnings?: readonly string[];
  readonly errors?: readonly PluginError[];
}

export interface CommandExample {
  readonly description: string;
  readonly command: string;
  readonly output?: string;
}

// Validation
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors?: readonly ValidationError[];
  readonly warnings?: readonly string[];
  readonly data?: unknown;
}

export interface ValidationError {
  readonly field?: string;
  readonly message: string;
  readonly code?: string;
  readonly value?: unknown;
}

// Command Options
export interface PluginCommandOption<T = unknown> {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: T;
  choices?: T extends string | number ? T[] : never;
  flags?: string[];
  validator?: (value: T) => boolean | string;
}

export interface StringCommandOption extends PluginCommandOption<string> {
  type: 'string';
  default?: string;
  choices?: string[];
}

export interface NumberCommandOption extends PluginCommandOption<number> {
  type: 'number';
  default?: number;
  choices?: number[];
  min?: number;
  max?: number;
}

export interface BooleanCommandOption extends PluginCommandOption<boolean> {
  type: 'boolean';
  default?: boolean;
}

export interface ArrayCommandOption extends PluginCommandOption<string[]> {
  type: 'array';
  default?: string[];
  separator?: string;
}

export type TypedCommandOption<K extends string | number | symbol> = 
  | (StringCommandOption & { name: K })
  | (NumberCommandOption & { name: K })
  | (BooleanCommandOption & { name: K })
  | (ArrayCommandOption & { name: K });

// Plugin Hooks
export interface PluginHook<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
  TContext extends PluginContext = PluginContext
> {
  name: HookName;
  handler: (context: TContext, ...args: TArgs) => Promise<TReturn> | TReturn;
  priority?: number;
  once?: boolean;
  pluginName?: string;
  description?: string;
  async?: boolean;
  timeout?: number;
  retries?: number;
  conditions?: readonly HookCondition[];
  enabled?: boolean;
}

export interface HookCondition {
  readonly check: (context: PluginContext, ...args: readonly unknown[]) => boolean | Promise<boolean>;
  readonly description?: string;
}

// Plugin Context - Core abstraction without runtime-specific dependencies
export interface PluginContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>> {
  readonly plugin: PluginInfo;
  readonly config: PluginConfig<TConfig>;
  readonly logger: PluginLogger;
  readonly utils: PluginUtils;
  readonly cache: PluginCache;
  readonly fileSystem: PluginFileSystem;
  readonly security: PluginSecurity;
  readonly performance: PluginPerformance;
  readonly events: PluginEventEmitter;
  readonly state: PluginState;
  readonly lifecycle: PluginLifecycleManager<TConfig>;
  readonly dependencies: PluginDependencyManager;
  readonly sandbox: PluginSandbox;
  readonly telemetry: PluginTelemetry;
  readonly cwd?: string;
  readonly fs?: PluginFileSystem;
  readonly path?: PluginPath;
  readonly crypto?: PluginCrypto;
  readonly http?: PluginHttp;
  readonly chalk?: PluginChalk;
  getConfig: <K extends keyof TConfig>(key: K) => TConfig[K] | undefined;
  setConfig: <K extends keyof TConfig>(key: K, value: TConfig[K]) => Promise<void>;
}

// Runtime Adapter Interface - Abstraction for different runtime environments
export interface PluginRuntimeAdapter {
  // Command registration and execution
  registerCommand(command: PluginCommand): void;
  unregisterCommand(name: CommandName): void;
  executeCommand(name: CommandName, args: unknown[], options: Record<string, unknown>): Promise<CommandResult>;
  
  // Hook registration and execution
  registerHook(hook: PluginHook): void;
  unregisterHook(name: HookName, pluginName: PluginName): void;
  
  // Lifecycle management
  cleanup?(): Promise<void>;
  lifecycle?: PluginLifecycleManager<any>;
  
  // State management
  state?: PluginState;
  
  // Dependencies
  dependencies?: PluginDependencyManager;
  
  // Logging
  createLogger(pluginName: string): PluginLogger;
  logger?: PluginLogger;
  
  // File system operations
  getPluginsDirectory(): string;
  getPluginCacheDirectory(): string;
  getPluginConfigDirectory(): string;
  
  // Configuration management
  loadConfig<T>(path: string): Promise<T>;
  saveConfig<T>(path: string, config: T): Promise<void>;
  
  // Environment-specific utilities
  getEnvironmentInfo(): {
    platform: string;
    version: string;
    runtime: 'cli' | 'server' | 'web' | 'desktop';
  };
  
  // Environment modules access
  environment: {
    cwd: string;
    fs: any;
    path: PluginPath;
    crypto: PluginCrypto;
    http: PluginHttp;
    chalk: PluginChalk;
  };
  
  // Direct access to modules
  cli?: PluginCLI;
  path?: PluginPath;
  utils?: PluginUtils;
  telemetry?: PluginTelemetry;
  sandbox?: PluginSandbox;
  
  // Event handling
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

// Configuration System
export interface PluginConfig<T extends StrictRecord<string, unknown> = StrictRecord<string, unknown>> {
  readonly get: <K extends keyof T>(key: K) => T[K] | undefined;
  readonly set: <K extends keyof T>(key: K, value: T[K]) => Promise<void>;
  readonly has: (key: keyof T) => boolean;
  readonly delete: (key: keyof T) => Promise<void>;
  readonly getAll: () => Readonly<T>;
  readonly validate: (config: Partial<T>) => ValidationResult;
  readonly watch: <K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void) => () => void;
  readonly unwatch: <K extends keyof T>(key: K) => void;
  readonly reset: () => Promise<void>;
  readonly backup: () => Promise<string>;
  readonly restore: (backupId: string) => Promise<void>;
  readonly schema?: ConfigSchema<T>;
  readonly defaults: Readonly<Partial<T>>;
  readonly version: string;
  readonly lastModified: Date;
}

export interface ConfigSchema<T extends StrictRecord<string, unknown>> {
  readonly properties: {
    readonly [K in keyof T]: ConfigPropertySchema<T[K]>;
  };
  readonly required?: readonly (keyof T)[];
  readonly additionalProperties?: boolean;
}

export interface ConfigPropertySchema<T> {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description?: string;
  readonly default?: T;
  readonly enum?: readonly T[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly pattern?: string;
  readonly items?: ConfigPropertySchema<unknown>;
  readonly properties?: Record<string, ConfigPropertySchema<unknown>>;
  readonly required?: readonly string[];
}

// Plugin Services Interfaces
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  child(metadata: Record<string, unknown>): PluginLogger;
}

export interface PluginCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

export interface PluginFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  rmdir(path: string, recursive?: boolean): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ size: number; isFile: boolean; isDirectory: boolean; mtime: Date }>;
}

export interface PluginSecurity {
  readonly checkPermission: (permission: string) => boolean;
  readonly requestPermission: (permission: string, reason?: string) => Promise<boolean>;
  readonly revokePermission: (permission: string) => Promise<void>;
  readonly listPermissions: () => readonly PluginPermission[];
  readonly sanitizeInput: (input: string, options?: SanitizeOptions) => string;
  readonly validatePath: (path: string, allowedPaths?: readonly string[]) => boolean;
  readonly encryptData: (data: string, algorithm?: EncryptionAlgorithm) => Promise<string>;
  readonly decryptData: (encryptedData: string, algorithm?: EncryptionAlgorithm) => Promise<string>;
  readonly hashData: (data: string, algorithm?: HashAlgorithm) => Promise<string>;
  readonly verifySignature: (data: string, signature: string, publicKey: string) => Promise<boolean>;
  readonly createSecureToken: (payload: Record<string, unknown>, expiresIn?: number) => Promise<string>;
  readonly verifySecureToken: (token: string) => Promise<Record<string, unknown> | null>;
  readonly auditLog: (action: string, details?: Record<string, unknown>) => Promise<void>;
  readonly getSecurityReport: () => Promise<SecurityReport>;
}

export interface PluginPerformance {
  mark(name: string): void;
  measure(name: string, startMark?: string, endMark?: string): number;
  getMetrics(): PerformanceMetrics;
  startTimer(name: string): () => number;
  profile<T>(name: string, fn: () => T): T;
  profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export interface PluginEventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
  listenerCount(event: string): number;
  removeAllListeners(event?: string): void;
}

export interface PluginState {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
  size: number;
}

export interface PluginLifecycleManager<TConfig extends StrictRecord<string, unknown>> {
  getCurrentState(): PluginLifecycleState;
  getState(): PluginLifecycleState;
  transition(newState: PluginLifecycleState): Promise<void>;
  onStateChange(callback: (oldState: PluginLifecycleState, newState: PluginLifecycleState) => void): () => void;
  executeLifecycleHook(hook: keyof PluginLifecycle<TConfig>, ...args: unknown[]): Promise<void>;
}





export interface PluginUtils {
  executeHook(name: HookName, ...args: unknown[]): Promise<unknown[]>;
  validateConfig<T extends StrictRecord<string, unknown>>(config: T, schema?: ConfigSchema<T>): ValidationResult;
  createCommand(command: Omit<PluginCommand, 'pluginName'>): PluginCommand;
  createHook(hook: Omit<PluginHook, 'pluginName'>): PluginHook;
}

export interface PluginEvents {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): boolean;
  once(event: string, listener: (...args: unknown[]) => void): void;
  removeAllListeners(event?: string): void;
}

export interface PluginDependencies {
  get(name: string): unknown;
  has(name: string): boolean;
  require(name: string): unknown;
  resolve(name: string): string;
  isAvailable(name: string): boolean;
}

export interface PluginCLI {
  command(name: string): unknown;
  option(flags: string, description?: string, defaultValue?: unknown): unknown;
  argument(name: string, description?: string, defaultValue?: unknown): unknown;
  action(fn: (...args: unknown[]) => void): unknown;
  parse(argv?: string[]): unknown;
  help(): string;
}

// Additional utility interfaces
export interface PluginPath {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  isAbsolute(path: string): boolean;
  relative(from: string, to: string): string;
  normalize(path: string): string;
}

export interface PluginCrypto {
  randomBytes(size: number): Buffer;
  createHash(algorithm: string): any;
  createHmac(algorithm: string, key: string): any;
  pbkdf2(password: string, salt: string, iterations: number, keylen: number, digest: string): Promise<Buffer>;
}

export interface PluginHttp {
  get(url: string, options?: RequestOptions): Promise<HttpResponse>;
  post(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse>;
  put(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse>;
  delete(url: string, options?: RequestOptions): Promise<HttpResponse>;
}

export interface PluginChalk {
  red(text: string): string;
  green(text: string): string;
  blue(text: string): string;
  yellow(text: string): string;
  cyan(text: string): string;
  magenta(text: string): string;
  white(text: string): string;
  gray(text: string): string;
  bold(text: string): string;
  italic(text: string): string;
  underline(text: string): string;
}

// Supporting types
export enum PluginLifecycleState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  ACTIVATING = 'activating',
  ACTIVE = 'active',
  DEACTIVATING = 'deactivating',
  DEACTIVATED = 'deactivated',
  UNLOADING = 'unloading',
  ERROR = 'error',
  SUSPENDED = 'suspended'
}

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
export type HashAlgorithm = 'sha256' | 'sha512' | 'blake2b' | 'argon2';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripTags?: boolean;
  escapeHtml?: boolean;
}

export interface SecurityReport {
  permissions: PluginPermission[];
  violations: SecurityViolation[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityViolation {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  marks: Record<string, number>;
  measures: Record<string, number>;
  memory: {
    used: number;
    total: number;
    peak: number;
  };
  cpu: {
    usage: number;
    time: number;
  };
}





export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}

// Plugin Marketplace
export interface PluginMarketplace {
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly featured?: boolean;
  readonly downloads?: number;
  readonly rating?: number;
  readonly reviews?: readonly PluginReview[];
  readonly publishedAt?: Date;
  readonly updatedAt?: Date;
}

export interface PluginReview {
  readonly id: string;
  readonly author: string;
  readonly rating: number;
  readonly comment: string;
  readonly createdAt: Date;
  readonly verified?: boolean;
}

export interface MarketplacePlugin extends PluginInfo {
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly featured?: boolean;
  readonly downloads: number;
  readonly rating: number;
  readonly reviews: readonly PluginReview[];
  readonly publishedAt: Date;
  readonly updatedAt: Date;
  readonly verified?: boolean;
  readonly publisher?: {
    readonly name: string;
    readonly verified: boolean;
    readonly url?: string;
  };
}

// Plugin Settings and Configuration
export interface PluginSettings {
  enabled: boolean;
  autoUpdate: boolean;
  config: Record<string, unknown>;
  permissions: string[];
  lastUsed?: Date;
  installSource?: 'marketplace' | 'git' | 'local' | 'npm';
  marketplace?: {
    registryUrl?: string;
    apiKey?: string;
  };
}

export interface PluginSystemConfig {
  enabled: boolean;
  autoUpdate: boolean;
  allowRemotePlugins: boolean;
  trustedSources: string[];
  maxPlugins: number;
  cacheTimeout: number;
  registryUrl: string;
  marketplace?: {
    enabled: boolean;
    registryUrl?: string;
    apiKey?: string;
  };
}

export interface PluginRegistry {
  version?: string;
  plugins: Record<string, PluginInfo>;
  settings?: Record<string, PluginSettings>;
  marketplace?: MarketplacePlugin[];
  lastUpdated: Date;
}

// Plugin Operations
export interface PluginInstallOptions {
  version?: string;
  force?: boolean;
  dev?: boolean;
  global?: boolean;
  registry?: string;
  timeout?: number;
  branch?: string;
  upgrade?: boolean;
  useYarn?: boolean;
  skipDependencies?: boolean;
}

export interface PluginSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  license?: string;
  featured?: boolean;
  premium?: boolean;
  enabled?: boolean;
  source?: 'local' | 'git' | 'npm' | 'marketplace';
  limit?: number;
  offset?: number;
  sort?: 'name' | 'downloads' | 'rating' | 'updated' | 'created' | 'publishedAt' | 'updatedAt' | 'author' | 'installedAt' | 'version';
  sortBy?: 'name' | 'downloads' | 'rating' | 'updated' | 'created' | 'publishedAt' | 'updatedAt' | 'author' | 'installedAt' | 'version';
  order?: 'asc' | 'desc';
}

// Plugin Operation Results
export interface PluginOperationResult {
  success: boolean;
  error?: PluginError;
  warnings?: string[];
}

export interface PluginInstallResult extends PluginOperationResult {
  plugin?: PluginInfo;
  message?: string;
  duration?: number;
}

export interface PluginUninstallResult extends PluginOperationResult {
  plugin?: string;
  message?: string;
}

export interface PluginUpdateResult extends PluginOperationResult {
  plugin?: PluginInfo;
  message?: string;
  previousVersion?: string;
  newVersion?: string;
}

export interface PluginEnableResult extends PluginOperationResult {
  plugin?: string;
  message?: string;
}

export interface PluginDisableResult extends PluginOperationResult {
  plugin?: string;
  message?: string;
}

export interface PluginSearchResult {
  success: boolean;
  plugins: MarketplacePlugin[];
  total: number;
  offset: number;
  limit: number;
  page?: number;
  hasMore?: boolean;
  error?: PluginError;
}

export interface PluginListResult {
  success: boolean;
  plugins: PluginInfo[];
  total: number;
  offset: number;
  limit: number;
  error?: PluginError;
}

// Plugin Errors
export enum PluginErrorCode {
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  NOT_FOUND = 'PLUGIN_NOT_FOUND',
  ALREADY_INSTALLED = 'PLUGIN_ALREADY_INSTALLED',
  ALREADY_EXISTS = 'PLUGIN_ALREADY_EXISTS',
  NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED',
  INVALID_VERSION = 'PLUGIN_INVALID_VERSION',
  INVALID_PATH = 'PLUGIN_INVALID_PATH',
  INVALID_NAME = 'PLUGIN_INVALID_NAME',
  INVALID_CONFIG = 'PLUGIN_INVALID_CONFIG',
  INVALID_DEPENDENCIES = 'PLUGIN_INVALID_DEPENDENCIES',
  INVALID_ENGINES = 'PLUGIN_INVALID_ENGINES',
  INVALID_COMMANDS = 'PLUGIN_INVALID_COMMANDS',
  DEPENDENCY_ERROR = 'PLUGIN_DEPENDENCY_ERROR',
  INSTALL_FAILED = 'PLUGIN_INSTALL_FAILED',
  INSTALLATION_FAILED = 'PLUGIN_INSTALLATION_FAILED',
  UNINSTALL_FAILED = 'PLUGIN_UNINSTALL_FAILED',
  UNINSTALLATION_FAILED = 'PLUGIN_UNINSTALLATION_FAILED',
  UPDATE_FAILED = 'PLUGIN_UPDATE_FAILED',
  ENABLE_FAILED = 'PLUGIN_ENABLE_FAILED',
  DISABLE_FAILED = 'PLUGIN_DISABLE_FAILED',
  INVALID_PLUGIN = 'PLUGIN_INVALID_PLUGIN',
  NETWORK_ERROR = 'PLUGIN_NETWORK_ERROR',
  PERMISSION_ERROR = 'PLUGIN_PERMISSION_ERROR',
  TIMEOUT_ERROR = 'PLUGIN_TIMEOUT_ERROR',
  REGISTRY_ERROR = 'PLUGIN_REGISTRY_ERROR',
  LICENSE_ERROR = 'PLUGIN_LICENSE_ERROR',
  COMPATIBILITY_ERROR = 'PLUGIN_COMPATIBILITY_ERROR',
  VALIDATION_ERROR = 'PLUGIN_VALIDATION_ERROR',
  VALIDATION_FAILED = 'PLUGIN_VALIDATION_FAILED',
  LOAD_FAILED = 'PLUGIN_LOAD_FAILED',
  UNLOAD_FAILED = 'PLUGIN_UNLOAD_FAILED',
  RELOAD_FAILED = 'PLUGIN_RELOAD_FAILED',
  INITIALIZATION_FAILED = 'PLUGIN_INITIALIZATION_FAILED',
  ACTIVATION_FAILED = 'PLUGIN_ACTIVATION_FAILED',
  DEACTIVATION_FAILED = 'PLUGIN_DEACTIVATION_FAILED',
  REGISTRATION_FAILED = 'PLUGIN_REGISTRATION_FAILED',
  UNREGISTRATION_FAILED = 'PLUGIN_UNREGISTRATION_FAILED',
  MAIN_NOT_FOUND = 'PLUGIN_MAIN_NOT_FOUND',
  INVALID_REGISTRY = 'PLUGIN_INVALID_REGISTRY',
  INVALID_STRUCTURE = 'PLUGIN_INVALID_STRUCTURE',
  REGISTRY_INIT_FAILED = 'PLUGIN_REGISTRY_INIT_FAILED',
  REGISTRY_NOT_INITIALIZED = 'PLUGIN_REGISTRY_NOT_INITIALIZED',
  FILESYSTEM_ERROR = 'PLUGIN_FILESYSTEM_ERROR',
  BACKUP_FAILED = 'PLUGIN_BACKUP_FAILED',
  RESTORE_FAILED = 'PLUGIN_RESTORE_FAILED',
  FILE_NOT_FOUND = 'PLUGIN_FILE_NOT_FOUND',
  INVALID_JSON = 'PLUGIN_INVALID_JSON',
  PLUGIN_MANAGER_INIT_FAILED = 'PLUGIN_MANAGER_INIT_FAILED',
  PLUGIN_REMOTE_DISABLED = 'PLUGIN_REMOTE_DISABLED',
  PLUGIN_NO_INSTALL_SOURCE = 'PLUGIN_NO_INSTALL_SOURCE',
  PLUGIN_DISABLED = 'PLUGIN_DISABLED',
  PLUGIN_HOOK_EXECUTION_FAILED = 'PLUGIN_HOOK_EXECUTION_FAILED'
}

export interface PluginError extends Error {
  code: PluginErrorCode;
  plugin?: string;
  version?: string;
  details?: PluginErrorDetails;
}

export interface PluginErrorDetails {
  originalError?: Error;
  stack?: string;
  context?: Record<string, unknown>;
  suggestions?: string[];
  recoverable?: boolean;
  hookName?: string;
  pluginName?: string;
}

// Plugin License
export type LicenseType = 
  | 'MIT' 
  | 'Apache-2.0' 
  | 'GPL-3.0' 
  | 'BSD-3-Clause' 
  | 'ISC' 
  | 'LGPL-2.1' 
  | 'MPL-2.0' 
  | 'CDDL-1.0' 
  | 'EPL-2.0' 
  | 'Custom' 
  | 'Proprietary';

export interface PluginLicense {
  type: LicenseType;
  url?: string;
  text?: string;
  requiresKey?: boolean;
}

// Plugin Manager Interface
export interface IPluginManager {
  initialize(): Promise<void>;
  install(nameOrPath: PluginName | FilePath, options?: PluginInstallOptions): Promise<PluginInstallResult>;
  uninstall(name: PluginName): Promise<PluginUninstallResult>;
  update(name: PluginName): Promise<PluginUpdateResult>;
  enable(name: PluginName): Promise<void>;
  disable(name: PluginName): Promise<void>;
  list(): Promise<readonly PluginInfo[]>;
  search(query: string): Promise<PluginSearchResult>;
  getPlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(name: PluginName): Plugin<TConfig> | undefined;
  isInstalled(name: PluginName): boolean;
  isEnabled(name: PluginName): boolean;
  registerCommand(command: PluginCommand): void;
  unregisterCommand(name: CommandName): void;
  registerHook(hook: PluginHook): void;
  unregisterHook(name: HookName, pluginName: PluginName): void;
  validatePlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: unknown): plugin is Plugin<TConfig>;
  createPluginContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): PluginContext<TConfig>;
}

// Type Guards
export interface PluginTypeGuards {
  isValidPluginName(value: unknown): value is PluginName;
  isValidPluginVersion(value: unknown): value is PluginVersion;
  isValidCommandName(value: unknown): value is CommandName;
  isValidHookName(value: unknown): value is HookName;
  isValidFilePath(value: unknown): value is FilePath;
}

// Typed Plugin Interfaces
export interface TypedPluginError extends PluginError {
  readonly plugin?: PluginName;
  readonly version?: PluginVersion;
  readonly command?: CommandName;
  readonly hook?: HookName;
}

export interface TypedPluginRegistry {
  readonly version?: PluginVersion;
  readonly plugins: StrictRecord<PluginName, PluginInfo>;
  readonly settings?: StrictRecord<PluginName, PluginSettings>;
  readonly marketplace?: readonly MarketplacePlugin[];
  readonly lastUpdated: Timestamp;
}

export interface TypedPluginInfo extends Omit<PluginInfo, 'name' | 'version' | 'commands' | 'hooks'> {
  readonly name: PluginName;
  readonly version: PluginVersion;
  readonly commands: readonly CommandName[];
  readonly hooks: readonly HookName[];
  readonly path?: FilePath;
  readonly installPath?: FilePath;
}

export interface TypedConfigManager<T extends StrictRecord<string, unknown>> {
  readonly get: <K extends keyof T>(key: K) => Promise<T[K] | undefined>;
  readonly set: <K extends keyof T>(key: K, value: T[K]) => Promise<void>;
  readonly has: (key: keyof T) => Promise<boolean>;
  readonly delete: (key: keyof T) => Promise<void>;
  readonly getAll: () => Promise<Readonly<T>>;
  readonly validate: (config: Partial<T>) => Promise<ValidationResult>;
  readonly watch: <K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void) => () => void;
  readonly schema: ConfigSchema<T>;
}

// Type Inference Utilities
export type InferPluginConfig<T> = T extends Plugin<infer C> ? C : never;
export type InferCommandArgs<T> = T extends PluginCommand<infer A, any, any> ? A : never;
export type InferCommandOptions<T> = T extends PluginCommand<any, infer O, any> ? O : never;
export type InferHookArgs<T> = T extends PluginHook<infer A, any, any> ? A : never;
export type InferHookReturn<T> = T extends PluginHook<any, infer R, any> ? R : never;

// Plugin Type Constraints
export type PluginWithCommands<T extends Plugin> = T extends { commands: NonEmptyArray<PluginCommand> } ? T : never;
export type PluginWithHooks<T extends Plugin> = T extends { hooks: NonEmptyArray<PluginHook> } ? T : never;
export type PluginWithConfig<T extends Plugin> = T extends Plugin<infer C> ? C extends StrictRecord<string, unknown> ? T : never : never;

// Plugin State Management
export interface TypedPluginState {
  readonly name: PluginName;
  readonly version: PluginVersion;
  readonly state: PluginLifecycleState;
  readonly lastStateChange: Timestamp;
  readonly error?: TypedPluginError;
}

// Hook System Interfaces
export interface TypedHookRegistry {
  register(hook: PluginHook, pluginName: PluginName): void;
  unregister(hookName: HookName, pluginName: PluginName): void;
  unregisterAll(pluginName: PluginName): void;
  execute<TArgs extends readonly unknown[] = readonly unknown[], TReturn = unknown>(
    hookName: HookName,
    context: PluginContext,
    ...args: TArgs
  ): Promise<TReturn[]>;
  executeTyped<TArgs extends readonly unknown[] = readonly unknown[], TReturn = unknown>(
    hookName: HookName,
    context: PluginContext,
    ...args: TArgs
  ): Promise<TReturn[]>;
  getHooks(hookName?: HookName): readonly PluginHook[];
  getPluginHooks(pluginName: PluginName): readonly PluginHook[];
  getHooksByType(hookName: HookName): readonly PluginHook[];
  hasHook(hookName: HookName): boolean;
  hasPluginHook(hookName: HookName, pluginName: PluginName): boolean;
  getHookCount(): number;
  getPluginHookCount(pluginName: PluginName): number;
  getHookNames(): readonly HookName[];
  clear(): void;
}



// Hook execution utility types
export type HookArgs<T> = T extends PluginHook<infer A, any, any> ? A : never;
export type HookReturn<T> = T extends PluginHook<any, infer R, any> ? R : never;
export type HookContext<T> = T extends PluginHook<any, any, infer C> ? C : never;

export interface HookExecutionOptions {
  readonly timeout?: number;
  readonly parallel?: boolean;
  readonly stopOnError?: boolean;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
}

export interface HookExecutionResult<TReturn = unknown> {
  readonly success: boolean;
  readonly results: readonly TReturn[];
  readonly errors: readonly PluginError[];
  readonly duration: number;
  readonly executedHooks: readonly HookName[];
  readonly skippedHooks: readonly HookName[];
}

// Enhanced Lifecycle Management Interfaces
export interface LifecycleTransition {
  /** The state the plugin transitioned from */
  from: PluginLifecycleState;
  /** The state the plugin transitioned to */
  to: PluginLifecycleState;
  /** When the transition occurred */
  timestamp: Date;
  /** How long the transition took in milliseconds */
  duration?: number;
  /** Any error that occurred during transition */
  error?: Error;
}

export interface PluginLifecycleData {
  /** Current lifecycle state */
  state: PluginLifecycleState;
  /** History of state transitions */
  history: LifecycleTransition[];
  /** State change callbacks */
  callbacks: Map<string, ((from: PluginLifecycleState, to: PluginLifecycleState) => void)[]>;
  /** Plugin dependencies */
  dependencies: PluginDependency[];
  /** Plugins that depend on this one */
  dependents: string[];
  /** Current retry count for failed transitions */
  retryCount: number;
  /** Maximum number of retries allowed */
  maxRetries: number;
  /** Last error encountered */
  lastError?: Error;
}



// Hook Composer and Factory Types
export interface HookComposer<T extends PluginHook[] = PluginHook[]> {
  readonly compose: (...hooks: T) => ComposedHook<T>;
  readonly parallel: (...hooks: T) => ComposedHook<T>;
  readonly sequence: (...hooks: T) => ComposedHook<T>;
  readonly conditional: <U extends PluginHook>(condition: HookCondition, hook: U) => ConditionalHook<U>;
}

export interface ComposedHook<T extends PluginHook[]> extends PluginHook {
  readonly hooks: T;
  readonly strategy: 'parallel' | 'sequence';
}

export interface ConditionalHook<T extends PluginHook> extends PluginHook {
  readonly hook: T;
  readonly condition: HookCondition;
}

export interface HookFactory {
  readonly createInitHook: (handler: PluginHookInit['handler']) => PluginHookInit;
  readonly createDestroyHook: (handler: PluginHookDestroy['handler']) => PluginHookDestroy;
  readonly createEnableHook: (handler: PluginHookEnable['handler']) => PluginHookEnable;
  readonly createDisableHook: (handler: PluginHookDisable['handler']) => PluginHookDisable;
  readonly createCommandBeforeHook: (handler: PluginHookCommandBefore['handler']) => PluginHookCommandBefore;
  readonly createCommandAfterHook: (handler: PluginHookCommandAfter['handler']) => PluginHookCommandAfter;
  readonly createCommandErrorHook: (handler: PluginHookCommandError['handler']) => PluginHookCommandError;
  readonly createConfigChangeHook: (handler: PluginHookConfigChange['handler']) => PluginHookConfigChange;
  readonly createConfigValidateHook: (handler: PluginHookConfigValidate['handler']) => PluginHookConfigValidate;
}

export interface HookExecutionContext {
  readonly plugin: PluginName;
  readonly hook: HookName;
  readonly startTime: number;
  readonly metadata?: Record<string, unknown>;
}

export interface HookMetrics {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageExecutionTime: number;
  readonly lastExecutionTime?: number;
  readonly lastError?: PluginError;
}

export interface HookEvents {
  readonly 'hook:before': (context: HookExecutionContext) => void;
  readonly 'hook:after': (context: HookExecutionContext, result: HookExecutionResult) => void;
  readonly 'hook:error': (context: HookExecutionContext, error: PluginError) => void;
}

export interface HookEventEmitter {
  readonly on: <K extends keyof HookEvents>(event: K, listener: HookEvents[K]) => void;
  readonly off: <K extends keyof HookEvents>(event: K, listener: HookEvents[K]) => void;
  readonly emit: <K extends keyof HookEvents>(event: K, ...args: Parameters<HookEvents[K]>) => void;
}

// Comprehensive PluginTelemetry interface
export interface PluginTelemetry {
  // Legacy methods for compatibility
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  group(groupId: string, traits?: Record<string, unknown>): void;
  page(name: string, properties?: Record<string, unknown>): void;
  increment(metric: string, value?: number, tags?: Record<string, unknown>): void;
  gauge(metric: string, value: number, tags?: Record<string, unknown>): void;
  timing(metric: string, duration: number, tags?: Record<string, unknown>): void;
  // New methods
  readonly createSpan: (name: string, metadata?: Record<string, unknown>) => TelemetrySpan;
  readonly recordMetric: (name: string, value: number, tags?: Record<string, string>) => void;
  readonly recordEvent: (name: string, data?: Record<string, unknown>) => void;
  readonly flush: () => Promise<void>;
  readonly configure: (config: TelemetryConfig) => void;
}

// Export alias for PluginLifecycleTransition
export type PluginLifecycleTransition = LifecycleTransition;

// Specific Hook Types
export interface PluginHookInit extends PluginHook<[], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext) => Promise<void> | void;
}

export interface PluginHookDestroy extends PluginHook<[], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext) => Promise<void> | void;
}

export interface PluginHookEnable extends PluginHook<[], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext) => Promise<void> | void;
}

export interface PluginHookDisable extends PluginHook<[], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext) => Promise<void> | void;
}

export interface PluginHookCommandBefore extends PluginHook<[CommandBeforeArgs], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext, args: CommandBeforeArgs) => Promise<void> | void;
}

export interface PluginHookCommandAfter extends PluginHook<[CommandAfterArgs], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext, args: CommandAfterArgs) => Promise<void> | void;
}

export interface PluginHookCommandError extends PluginHook<[CommandErrorArgs], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext, args: CommandErrorArgs) => Promise<void> | void;
}

export interface PluginHookConfigChange extends PluginHook<[ConfigChangeArgs], void> {
  readonly name: HookName;
  readonly handler: (context: PluginContext, args: ConfigChangeArgs) => Promise<void> | void;
}

export interface PluginHookConfigValidate extends PluginHook<[ConfigValidateArgs], ValidationResult> {
  readonly name: HookName;
  readonly handler: (context: PluginContext, args: ConfigValidateArgs) => Promise<ValidationResult> | ValidationResult;
}

export interface CommandBeforeArgs {
  readonly command: CommandName;
  readonly args: Record<string, unknown>;
  readonly options: Record<string, unknown>;
}

export interface CommandAfterArgs {
  readonly command: CommandName;
  readonly args: Record<string, unknown>;
  readonly options: Record<string, unknown>;
  readonly result: CommandResult;
}

export interface CommandErrorArgs {
  readonly command: CommandName;
  readonly args: Record<string, unknown>;
  readonly options: Record<string, unknown>;
  readonly error: PluginError;
}

export interface ConfigChangeArgs {
  readonly oldConfig: Record<string, unknown>;
  readonly newConfig: Record<string, unknown>;
  readonly changes: Record<string, { old: unknown; new: unknown }>;
}

export interface ConfigValidateArgs {
  readonly config: Record<string, unknown>;
  readonly schema?: ConfigSchema<Record<string, unknown>>;
}

// Performance Monitoring Types
export interface PerformanceProfiler {
  readonly start: (name: string) => PerformanceSession;
  readonly stop: (sessionId: string) => PerformanceResult;
  readonly getResults: () => readonly PerformanceResult[];
  readonly clear: () => void;
  readonly export: (format: 'json' | 'csv') => string;
  readonly mark: (name: string) => void;
  readonly measure: (name: string, startMark?: string, endMark?: string) => number;
}

export interface PerformanceSession {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly markers: readonly PerformanceMarker[];
  readonly addMarker: (name: string, metadata?: Record<string, unknown>) => void;
}

export interface PerformanceResult {
  readonly sessionId: string;
  readonly name: string;
  readonly duration: number;
  readonly markers: readonly PerformanceMarker[];
  readonly metadata: Record<string, unknown>;
}

export interface PerformanceMarker {
  readonly name: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

// Sandbox Environment
export interface PluginSandbox {
  readonly execute: <T>(code: string, context?: Record<string, unknown>) => Promise<T>;
  readonly createContext: (permissions: readonly string[]) => SandboxContext;
  readonly destroyContext: (contextId: string) => Promise<void>;
  readonly getResourceUsage: () => SandboxResourceUsage;
  readonly setLimits: (limits: SandboxLimits) => void;
  readonly getLimits: () => SandboxLimits;
  readonly isSecure: () => boolean;
}

export interface SandboxContext {
  readonly id: string;
  readonly permissions: readonly string[];
  readonly globals: Record<string, unknown>;
  readonly limits: SandboxLimits;
  readonly createdAt: Date;
}

export interface SandboxResourceUsage {
  readonly memory: number;
  readonly cpu: number;
  readonly executionTime: number;
  readonly apiCalls: number;
}

export interface SandboxLimits {
  readonly maxMemory: number;
  readonly maxCpu: number;
  readonly maxExecutionTime: number;
  readonly maxApiCalls: number;
  readonly allowedModules: readonly string[];
  readonly blockedModules: readonly string[];
}

// Telemetry and Analytics
export interface TelemetrySpan {
  readonly setTag: (key: string, value: string | number | boolean) => void;
  readonly setError: (error: Error) => void;
  readonly finish: () => void;
  readonly getDuration: () => number;
}

export interface TelemetryConfig {
  readonly enabled: boolean;
  readonly endpoint?: string;
  readonly apiKey?: string;
  readonly sampleRate: number;
  readonly batchSize: number;
  readonly flushInterval: number;
}

// Dependency Management Types
export interface PluginDependencyManager {
  readonly resolve: (dependencies: readonly PluginDependency[]) => Promise<DependencyResolutionResult>;
  readonly check: (dependency: PluginDependency) => Promise<DependencyCheckResult>;
  readonly install: (dependency: PluginDependency) => Promise<void>;
  readonly uninstall: (dependency: PluginDependency) => Promise<void>;
  readonly getDependencyGraph: () => DependencyGraph;
  readonly validateCompatibility: (plugin: Plugin) => Promise<CompatibilityResult>;
  readonly getConflicts: () => readonly DependencyConflict[];
}

export interface DependencyResolutionResult {
  readonly resolved: readonly PluginDependency[];
  readonly missing: readonly PluginDependency[];
  readonly conflicts: readonly DependencyConflict[];
  readonly installOrder: readonly string[];
}

export interface DependencyCheckResult {
  readonly satisfied: boolean;
  readonly version?: string;
  readonly reason?: string;
}

export interface DependencyGraph {
  readonly nodes: readonly DependencyNode[];
  readonly edges: readonly DependencyEdge[];
  readonly cycles: readonly string[][];
}

export interface DependencyNode {
  readonly name: string;
  readonly version: string;
  readonly type: 'plugin' | 'system' | 'external';
}

export interface DependencyEdge {
  readonly from: string;
  readonly to: string;
  readonly type: 'requires' | 'optional' | 'conflicts';
}

export interface DependencyConflict {
  readonly plugin: string;
  readonly dependency: string;
  readonly requiredVersion: string;
  readonly installedVersion: string;
  readonly severity: 'error' | 'warning';
}

export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly issues: readonly CompatibilityIssue[];
  readonly recommendations: readonly string[];
}

export interface CompatibilityIssue {
  readonly type: 'version' | 'dependency' | 'api' | 'platform';
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly component: string;
}