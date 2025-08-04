import type { PluginContext, RestrictedCLIContext, PluginPermissions, SandboxResult } from '../security/index.js';
import type { PerformanceMetrics, PerformanceSummary } from '../performance/index.js';

/**
 * Plugin types supported by LORM
 */
export type PluginType = 'builtin' | 'npm' | 'local' | 'marketplace' | 'third-party';

/**
 * Plugin license types
 */
export type PluginLicense = 'free' | 'premium' | 'freemium' | 'open-source';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: PluginLicense;
  type: PluginType;
  homepage?: string;
  repository?: string;
  keywords: string[];
  engines: {
    node: string;
    lorm: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Plugin command definition
 */
export interface PluginCommand {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  options?: PluginCommandOption[];
  aliases?: string[];
  category?: string;
  handler: (args: Record<string, string | number | boolean | string[]>, context: RestrictedCLIContext) => Promise<void>;
}

/**
 * Plugin command option
 */
export interface PluginCommandOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  choices?: string[];
  alias?: string;
}

/**
 * Plugin hook types
 */
export type PluginHookType = 
  | 'before:command'
  | 'after:command'
  | 'before:plugin:load'
  | 'after:plugin:load'
  | 'cli:init'
  | 'cli:exit';

/**
 * Plugin hook definition
 */
export interface PluginHook {
  type: PluginHookType;
  handler: (context: PluginHookContext) => Promise<void> | void;
  priority?: number; // Lower numbers run first
}

/**
 * Main plugin interface
 */
export interface IPlugin {
  metadata: PluginMetadata;
  commands?: PluginCommand[];
  hooks?: PluginHook[];
  
  // Lifecycle methods
  initialize?(context: PluginContext): Promise<void> | void;
  activate?(context: PluginContext): Promise<void> | void;
  deactivate?(context: PluginContext): Promise<void> | void;
  cleanup?(): Promise<void> | void;
}

/**
 * Plugin loading configuration
 */
export interface PluginLoadConfig {
  id: string;
  source: string; // npm package name, file path, or marketplace ID
  version?: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  permissions?: Partial<PluginPermissions>;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: IPlugin;
  error?: Error;
  loadTime: number;
  source: string;
  type: PluginType;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  plugin: IPlugin;
  context: PluginContext;
  loadResult: PluginLoadResult;
  active: boolean;
  loadTime: number;
}

/**
 * Plugin hook context with typed system references
 */
export interface PluginHookContext {
  command?: {
    name: string;
    args: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  plugin?: {
    id: string;
    name: string;
    version: string;
  };
  project?: {
    root: string;
    type: 'mobile' | 'library' | 'unknown';
    packageJson?: Record<string, unknown>;
    framework?: string;
    language?: string;
  };
  timestamp: number;
}

/**
 * Typed system interfaces for plugin context
 */
export interface TypedCacheInstance {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface TypedSandboxInstance {
  execute<T>(context: PluginContext, operation: () => Promise<T>): Promise<SandboxResult<T>>;
  validatePermissions(context: PluginContext, operation: string, target: string): boolean;
}

export interface TypedCommandSystemInstance {
  register(command: any): void; // Generic command definition
  getCommand(name: string): any | undefined;
  getAllCommands(): any[];
}

export interface TypedPerformanceMonitorInstance {
  start(operationName: string, metadata?: Record<string, unknown>): void;
  end(operationName: string): void;
  recordError(error: Error): void;
  recordWarning(message: string): void;
  getMetrics(): PerformanceMetrics;
  generateSummary(): PerformanceSummary;
  reset(): void;
}

/**
 * Plugin loader context with properly typed system instances
 */
export interface PluginLoaderContext {
  projectContext: {
    root: string;
    type: 'mobile' | 'library' | 'unknown';
    packageJson?: Record<string, unknown>;
    framework?: string;
    language?: string;
  };
  config: {
    plugins?: {
      builtin?: string[];
      npm?: Record<string, string>;
      local?: string[];
      marketplace?: Record<string, {
        version: string;
        license: 'free' | 'premium' | 'freemium';
        apiKey?: string;
      }>;
    };
    cache?: {
      enabled?: boolean;
      strategy?: 'memory' | 'disk' | 'hybrid';
      ttl?: number;
      maxSize?: number;
    };
    performance?: {
      monitoring?: boolean;
      profiling?: boolean;
    };
    security?: {
      sandboxing?: boolean;
      allowedPaths?: string[];
      allowedNetworkHosts?: string[];
    };
  };
  cache: TypedCacheInstance;
  sandbox: TypedSandboxInstance;
  commandSystem: TypedCommandSystemInstance;
  performanceMonitor: TypedPerformanceMonitorInstance;
}

/**
 * Plugin marketplace entry
 */
export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  license: PluginLicense;
  price?: number;
  currency?: string;
  downloads: number;
  rating: number;
  tags: string[];
  screenshots?: string[];
  documentation?: string;
  changelog?: string;
  compatibility: {
    node: string;
    lorm: string;
    platforms: string[];
  };
  verification: {
    verified: boolean;
    signature?: string;
    publisher?: string;
  };
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  force?: boolean;
  skipDependencies?: boolean;
  registry?: string;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Plugin loader interface
 */
export interface IPluginLoader {
  loadPlugin(config: PluginLoadConfig): Promise<PluginLoadResult>;
  loadBuiltinPlugins(): Promise<PluginLoadResult[]>;
  loadNpmPlugins(): Promise<PluginLoadResult[]>;
  loadLocalPlugins(): Promise<PluginLoadResult[]>;
  loadMarketplacePlugins(): Promise<PluginLoadResult[]>;
  loadAllPlugins(): Promise<void>;
}

/**
 * Plugin registry interface
 */
export interface IPluginRegistry {
  register(plugin: IPlugin, context: PluginContext, loadResult: PluginLoadResult): void;
  unregister(pluginId: string): boolean;
  get(pluginId: string): PluginRegistryEntry | undefined;
  getAll(): PluginRegistryEntry[];
  getByType(type: PluginType): PluginRegistryEntry[];
  isRegistered(pluginId: string): boolean;
  activate(pluginId: string): Promise<boolean>;
  deactivate(pluginId: string): Promise<boolean>;
  clear(): void;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Plugin dependency resolution
 */
export interface PluginDependency {
  name: string;
  version: string;
  type: 'npm' | 'plugin';
  optional: boolean;
}

/**
 * Enhanced plugin installation options
 */
export interface PluginInstallOptions {
  name: string;
  source: 'marketplace' | 'npm' | 'local' | 'git';
  version?: string;
  force?: boolean;
  skipDependencies?: boolean;
  registry?: string;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Plugin installation result
 */
export interface PluginInstallResult {
  success: boolean;
  plugin?: IPlugin;
  error?: Error;
  installTime: number;
  dependencies?: string[];
}

/**
 * Plugin uninstall options
 */
export interface PluginUninstallOptions {
  force?: boolean;
  removeConfig?: boolean;
  removeDependencies?: boolean;
}

/**
 * Plugin search result
 */
export interface PluginSearchResult {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  downloads?: number;
  rating?: number;
  verified: boolean;
  source: 'marketplace' | 'npm';
}

/**
 * Plugin search options
 */
export interface PluginSearchOptions {
  source?: 'marketplace' | 'npm' | 'all';
  category?: string;
  verified?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Plugin information
 */
export interface PluginInfo {
  metadata: PluginMetadata;
  status: 'installed' | 'available' | 'outdated';
  installedVersion?: string;
  latestVersion: string;
  dependencies: PluginDependency[];
  permissions: PluginPermissions;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  autoUpdate: boolean;
  permissions: Partial<PluginPermissions>;
  settings: Record<string, unknown>;
}

/**
 * Plugin list options
 */
export interface PluginListOptions {
  verbose?: boolean;
  enabled?: boolean;
  disabled?: boolean;
  type?: PluginType;
}

/**
 * Plugin source information
 */
export interface PluginSource {
  type: 'npm' | 'local' | 'git' | 'marketplace';
  location: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Plugin error context
 */
export interface PluginErrorContext {
  pluginId: string;
  operation: string;
  performanceMonitor?: TypedPerformanceMonitorInstance;
  securityManager?: any; // Will be typed when security manager is available
}

/**
 * Plugin error class
 */
export class PluginError extends Error {
  public readonly pluginId: string;
  public readonly operation: string;
  public readonly originalError?: Error;

  constructor(message: string, context: {
    pluginId: string;
    operation: string;
    originalError?: Error;
  }) {
    super(message);
    this.name = 'PluginError';
    this.pluginId = context.pluginId;
    this.operation = context.operation;
    this.originalError = context.originalError;
  }
}

/**
 * Plugin performance report
 */
export interface PluginPerformanceReport {
  pluginMetrics: Record<string, PerformanceMetrics>;
  recommendations: string[];
}

/**
 * Plugin context for individual plugin operations
 */
export interface PluginOperationContext {
  pluginId: string;
  pluginName: string;
  version: string;
  permissions: PluginPermissions;
  workingDirectory: string;
  tempDirectory: string;
  configDirectory: string;
  cacheDirectory: string;
}