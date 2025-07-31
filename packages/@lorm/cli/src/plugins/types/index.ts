/**
 * @fileoverview Plugin Type Definitions
 * 
 * Centralized type definitions for the LORM CLI plugin system.
 * Provides comprehensive type safety with branded types, interfaces,
 * and utility types for plugin development and management.
 * 
 * @example
 * ```typescript
 * // Create a typed plugin
 * const plugin: Plugin<MyConfig> = {
 *   name: PluginName.create('my-plugin'),
 *   version: PluginVersion.create('1.0.0'),
 *   description: 'My awesome plugin',
 *   author: 'Developer Name',
 *   license: { type: 'MIT' },
 *   init: async (context) => {
 *     // Plugin initialization logic
 *   }
 * };
 * 
 * // Use branded types for type safety
 * const pluginName = PluginName.create('valid-plugin-name');
 * const version = PluginVersion.create('1.2.3');
 * ```
 */

/**
 * Branded Types for Enhanced Type Safety
 * 
 * These branded types provide compile-time guarantees that values
 * have been validated and are safe to use in their respective contexts.
 */
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

/**
 * Branded Type Constructors
 * 
 * Factory functions and validators for creating and validating branded types.
 */
export const PluginName = {
  create: (name: string): PluginName => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Plugin name must be a non-empty string');
    }
    if (!/^[a-z0-9-_]+$/i.test(name)) {
      throw new Error('Plugin name must contain only alphanumeric characters, hyphens, and underscores');
    }
    return name as PluginName;
  },
  validate: (name: string): name is PluginName => {
    return typeof name === 'string' && name.trim().length > 0 && /^[a-z0-9-_]+$/i.test(name);
  }
};

/**
 * PluginVersion constructor and validator.
 * 
 * Provides methods to create, validate, and compare semantic versions.
 */
export const PluginVersion = {
  /**
   * Create a validated PluginVersion.
   * 
   * @param version - Raw string to convert to PluginVersion
   * @returns Validated PluginVersion following semantic versioning
   * @throws Error if version format is invalid
   */
  create: (version: string): PluginVersion => {
    if (!version || typeof version !== 'string') {
      throw new Error('Plugin version must be a string');
    }
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/.test(version)) {
      throw new Error('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }
    return version as PluginVersion;
  },
  /**
   * Validate if a string is a valid PluginVersion.
   * 
   * @param version - String to validate
   * @returns True if valid semantic version format
   */
  validate: (version: string): version is PluginVersion => {
    return typeof version === 'string' && /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/.test(version);
  },
  /**
   * Compare two PluginVersions.
   * 
   * @param a - First version to compare
   * @param b - Second version to compare
   * @returns Negative if a < b, positive if a > b, zero if equal
   */
  compare: (a: PluginVersion, b: PluginVersion): number => {
    const parseVersion = (v: string) => v.split('.').map(Number);
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);
    
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }
};

/**
 * CommandName constructor and validator.
 * 
 * Provides methods to create and validate command names.
 */
export const CommandName = {
  /**
   * Create a validated CommandName.
   * 
   * @param name - Raw string to convert to CommandName
   * @returns Validated CommandName
   * @throws Error if name format is invalid
   */
  create: (name: string): CommandName => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Command name must be a non-empty string');
    }
    if (!/^[a-z0-9-:]+$/i.test(name)) {
      throw new Error('Command name must contain only alphanumeric characters, hyphens, and colons');
    }
    return name as CommandName;
  },
  /**
   * Validate if a string is a valid CommandName.
   * 
   * @param name - String to validate
   * @returns True if valid command name format
   */
  validate: (name: string): name is CommandName => {
    return typeof name === 'string' && name.trim().length > 0 && /^[a-z0-9-:]+$/i.test(name);
  }
};

/**
 * HookName constructor and validator.
 * 
 * Provides methods to create and validate hook names.
 */
export const HookName = {
  /**
   * Create a validated HookName.
   * 
   * @param name - Raw string to convert to HookName
   * @returns Validated HookName
   * @throws Error if name format is invalid
   */
  create: (name: string): HookName => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Hook name must be a non-empty string');
    }
    if (!/^[a-z0-9-:]+$/i.test(name)) {
      throw new Error('Hook name must contain only alphanumeric characters, hyphens, and colons');
    }
    return name as HookName;
  },
  /**
   * Validate if a string is a valid HookName.
   * 
   * @param name - String to validate
   * @returns True if valid hook name format
   */
  validate: (name: string): name is HookName => {
    return typeof name === 'string' && name.trim().length > 0 && /^[a-z0-9-:]+$/i.test(name);
  }
};

/**
 * FilePath constructor and validator.
 * 
 * Provides methods to create and validate file paths.
 */
export const FilePath = {
  /**
   * Create a validated FilePath.
   * 
   * @param path - Raw string to convert to FilePath
   * @returns Validated FilePath
   * @throws Error if path is invalid
   */
  create: (path: string): FilePath => {
    if (!path || typeof path !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    return path as FilePath;
  },
  /**
   * Validate if a string is a valid FilePath.
   * 
   * @param path - String to validate
   * @returns True if valid file path format
   */
  validate: (path: string): path is FilePath => {
    return typeof path === 'string' && path.length > 0;
  }
};

// Strict Generic Constraints
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

/**
 * Enhanced Plugin interface with type safety.
 * 
 * Defines the complete structure and metadata for a plugin in the system.
 * 
 * @template TConfig - Configuration schema type for the plugin
 */
export interface Plugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>> {
  /** Unique identifier for the plugin */
  readonly name: PluginName;
  /** Semantic version of the plugin */
  readonly version: PluginVersion;
  /** Human-readable description */
  readonly description: string;
  /** Plugin author */
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
  
  // Enhanced plugin metadata
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

// Plugin Permissions
/**
 * Plugin permission interface.
 * 
 * Defines permissions required by a plugin to access system resources.
 */
export interface PluginPermission {
  /** Permission name */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Whether permission is required */
  readonly required?: boolean;
  /** Whether permission is potentially dangerous */
  readonly dangerous?: boolean;
}

// Plugin Dependencies
/**
 * Plugin dependency interface.
 * 
 * Defines dependencies required by a plugin.
 */
export interface PluginDependency {
  /** Dependency plugin name */
  readonly name: string;
  /** Version constraint (semver) */
  readonly version?: string;
  /** Whether dependency is optional */
  readonly optional?: boolean;
  /** Reason for the dependency */
  readonly reason?: string;
}

// Enhanced Plugin Lifecycle
/**
 * Plugin lifecycle interface.
 * 
 * Defines lifecycle hooks that can be executed during plugin state transitions.
 * 
 * @template TConfig - Configuration schema type for the plugin
 */
export interface PluginLifecycle<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  /** Called when plugin is installed */
  readonly onInstall?: (context: PluginContext<TConfig>) => Promise<void> | void;
  /** Called when plugin is uninstalled */
  readonly onUninstall?: (context: PluginContext<TConfig>) => Promise<void> | void;
  /** Called when plugin is activated */
  readonly onActivate?: (context: PluginContext<TConfig>) => Promise<void> | void;
  /** Called when plugin is deactivated */
  readonly onDeactivate?: (context: PluginContext<TConfig>) => Promise<void> | void;
  /** Called when plugin is updated */
  readonly onUpdate?: (context: PluginContext<TConfig>, oldVersion: string) => Promise<void> | void;
  /** Called when plugin configuration changes */
  readonly onConfigChange?: (context: PluginContext<TConfig>, oldConfig: TConfig, newConfig: TConfig) => Promise<void> | void;
}

// Plugin Metadata
/**
 * Plugin metadata interface.
 * 
 * Defines additional metadata and presentation information for a plugin.
 */
export interface PluginMetadata {
  /** Plugin category */
  readonly category?: string;
  /** Plugin tags for categorization */
  readonly tags?: readonly string[];
  /** Plugin icon URL or path */
  readonly icon?: string;
  /** Screenshot URLs */
  readonly screenshots?: readonly string[];
  /** Documentation URL */
  readonly documentation?: string;
  /** Changelog URL */
  readonly changelog?: string;
  /** Support URL or contact */
  readonly support?: string;
  /** Funding information */
  readonly funding?: readonly PluginFunding[];
}

/**
 * Plugin funding interface.
 * 
 * Defines funding sources for plugin development.
 */
export interface PluginFunding {
  /** Funding platform type */
  readonly type: 'github' | 'opencollective' | 'patreon' | 'ko-fi' | 'tidelift' | 'custom';
  /** Funding URL */
  readonly url: string;
}



// Plugin validation schema
export interface PluginSchema {
  name: RegExp;
  version: RegExp;
  requiredFields: readonly (keyof Plugin)[];
  optionalFields: readonly (keyof Plugin)[];
}

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

// Enhanced Plugin Command System with Type Safety
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

// Enhanced Command Result
export interface CommandResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly message?: string;
  readonly warnings?: readonly string[];
  readonly errors?: readonly PluginError[];
}

// Enhanced Command Examples
export interface CommandExample {
  readonly description: string;
  readonly command: string;
  readonly output?: string;
}

// Validation Result for configuration and other validations
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

// Typed command option helpers
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

// Enhanced Typed Command Options
export type TypedCommandOption<K extends string | number | symbol> = 
  | StringCommandOption & { name: K }
  | NumberCommandOption & { name: K }
  | BooleanCommandOption & { name: K }
  | ArrayCommandOption & { name: K };

// Advanced Plugin Hook System with Type Inference
export interface PluginHook<
  TArgs extends readonly unknown[] = readonly unknown[], 
  TReturn = unknown,
  TContext extends PluginContext = PluginContext
> {
  readonly name: HookName;
  readonly handler: (...args: TArgs) => Promise<TReturn> | TReturn;
  readonly priority?: number;
  readonly once?: boolean;
  readonly pluginName?: string;
  readonly description?: string;
  readonly version?: string;
  readonly dependencies?: readonly string[];
  readonly conditions?: readonly HookCondition<TArgs>[];
  readonly middleware?: readonly HookMiddleware<TArgs, TReturn, TContext>[];
  readonly timeout?: number;
  readonly retries?: number;
  readonly fallback?: (...args: TArgs) => Promise<TReturn> | TReturn;
  readonly schema?: HookSchema<TArgs, TReturn>;
}

// Advanced Hook Middleware System
export interface HookMiddleware<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
  TContext extends PluginContext = PluginContext
> {
  readonly name: string;
  readonly before?: (args: TArgs, context: TContext) => Promise<TArgs> | TArgs;
  readonly after?: (result: TReturn, args: TArgs, context: TContext) => Promise<TReturn> | TReturn;
  readonly error?: (error: Error, args: TArgs, context: TContext) => Promise<TReturn | void> | TReturn | void;
  readonly priority?: number;
}

// Hook Schema for Runtime Validation
export interface HookSchema<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown
> {
  readonly args?: readonly ArgSchema[];
  readonly returns?: ReturnSchema<TReturn>;
  readonly validate?: (args: TArgs) => ValidationResult;
}

export interface ArgSchema {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'any';
  readonly required?: boolean;
  readonly validator?: (value: unknown) => boolean;
  readonly description?: string;
}

export interface ReturnSchema<T = unknown> {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'void' | 'any';
  readonly validator?: (value: T) => boolean;
  readonly description?: string;
}

// Advanced Hook Registry with Type Inference
export interface TypedHookRegistry {
  register<T extends PluginHook>(hook: T): void;
  unregister(name: HookName, pluginName?: PluginName): void;
  execute<TArgs extends readonly unknown[], TReturn = unknown>(
    name: HookName,
    ...args: TArgs
  ): Promise<TReturn[]>;
  executeFirst<TArgs extends readonly unknown[], TReturn = unknown>(
    name: HookName,
    ...args: TArgs
  ): Promise<TReturn | undefined>;
  executeUntil<TArgs extends readonly unknown[], TReturn = unknown>(
    name: HookName,
    predicate: (result: TReturn) => boolean,
    ...args: TArgs
  ): Promise<TReturn | undefined>;
  getHooks(name: HookName): readonly PluginHook[];
  hasHook(name: HookName): boolean;
  clear(): void;
  
  // Typed execution methods for specific hooks
  executeTyped: {
    init(context: PluginContext): Promise<void[]>;
    destroy(context: PluginContext): Promise<void[]>;
    enable(context: PluginContext): Promise<void[]>;
    disable(context: PluginContext): Promise<void[]>;
    commandBefore(
      command: string,
      args: StrictRecord<string, unknown>,
      context: PluginContext
    ): Promise<Array<void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown> }>>;
    commandAfter(
      command: string,
      args: StrictRecord<string, unknown>,
      result: CommandResult,
      context: PluginContext
    ): Promise<void[]>;
    commandError(
      command: string,
      args: StrictRecord<string, unknown>,
      error: PluginError,
      context: PluginContext
    ): Promise<Array<void | { handled?: boolean }>>;
    configChange(
      oldConfig: StrictRecord<string, unknown>,
      newConfig: StrictRecord<string, unknown>,
      context: PluginContext
    ): Promise<void[]>;
    configValidate(
      config: StrictRecord<string, unknown>,
      context: PluginContext
    ): Promise<ValidationResult[]>;
  };
}

// Hook Composition Utilities
export interface HookComposer<T = PluginHook> {
  pipe<U>(next: U): HookComposer<T & U>;
  middleware(...middleware: HookMiddleware[]): HookComposer<T>;
  condition(condition: HookCondition<readonly unknown[]>): HookComposer<T>;
  timeout(ms: number): HookComposer<T>;
  retries(count: number): HookComposer<T>;
  fallback(handler: (...args: readonly unknown[]) => Promise<unknown> | unknown): HookComposer<T>;
  build(): T;
}

// Utility types for better type inference
export type ExtractHookByName<T extends HookName> = 
  T extends typeof PLUGIN_INIT_HOOK ? PluginInitHook :
  T extends typeof PLUGIN_DESTROY_HOOK ? PluginDestroyHook :
  T extends typeof PLUGIN_ENABLE_HOOK ? PluginEnableHook :
  T extends typeof PLUGIN_DISABLE_HOOK ? PluginDisableHook :
  T extends typeof COMMAND_BEFORE_HOOK ? CommandBeforeHook :
  T extends typeof COMMAND_AFTER_HOOK ? CommandAfterHook :
  T extends typeof COMMAND_ERROR_HOOK ? CommandErrorHook :
  T extends typeof CONFIG_CHANGE_HOOK ? ConfigChangeHook :
  T extends typeof CONFIG_VALIDATE_HOOK ? ConfigValidateHook :
  PluginHook;

export type HookArgsMap = {
  [K in HookName]: K extends typeof PLUGIN_INIT_HOOK ? readonly [PluginContext] :
    K extends typeof PLUGIN_DESTROY_HOOK ? readonly [PluginContext] :
    K extends typeof PLUGIN_ENABLE_HOOK ? readonly [PluginContext] :
    K extends typeof PLUGIN_DISABLE_HOOK ? readonly [PluginContext] :
    K extends typeof COMMAND_BEFORE_HOOK ? readonly [string, StrictRecord<string, unknown>, PluginContext] :
    K extends typeof COMMAND_AFTER_HOOK ? readonly [string, StrictRecord<string, unknown>, CommandResult, PluginContext] :
    K extends typeof COMMAND_ERROR_HOOK ? readonly [string, StrictRecord<string, unknown>, PluginError, PluginContext] :
    K extends typeof CONFIG_CHANGE_HOOK ? readonly [StrictRecord<string, unknown>, StrictRecord<string, unknown>, PluginContext] :
    K extends typeof CONFIG_VALIDATE_HOOK ? readonly [StrictRecord<string, unknown>, PluginContext] :
    readonly unknown[];
};

export type HookReturnMap = {
  [K in HookName]: K extends typeof PLUGIN_INIT_HOOK ? void :
    K extends typeof PLUGIN_DESTROY_HOOK ? void :
    K extends typeof PLUGIN_ENABLE_HOOK ? void :
    K extends typeof PLUGIN_DISABLE_HOOK ? void :
    K extends typeof COMMAND_BEFORE_HOOK ? void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown> } :
    K extends typeof COMMAND_AFTER_HOOK ? void :
    K extends typeof COMMAND_ERROR_HOOK ? void | { handled?: boolean } :
    K extends typeof CONFIG_CHANGE_HOOK ? void :
    K extends typeof CONFIG_VALIDATE_HOOK ? ValidationResult :
    unknown;
}

// Hook Factory with Type Inference
export interface HookFactory {
  create<
    TArgs extends readonly unknown[],
    TReturn = unknown,
    TContext extends PluginContext = PluginContext
  >(
    name: HookName,
    handler: (...args: TArgs) => Promise<TReturn> | TReturn
  ): HookComposer<PluginHook<TArgs, TReturn, TContext>>;
  
  // Specific typed hook creators with proper return types
  init(handler: (context: PluginContext) => Promise<void> | void): PluginInitHook;
  destroy(handler: (context: PluginContext) => Promise<void> | void): PluginDestroyHook;
  enable(handler: (context: PluginContext) => Promise<void> | void): PluginEnableHook;
  disable(handler: (context: PluginContext) => Promise<void> | void): PluginDisableHook;
  commandBefore(
    handler: (
      command: string,
      args: StrictRecord<string, unknown>,
      context: PluginContext
    ) => Promise<void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown> }> | void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown> }
  ): CommandBeforeHook;
  commandAfter(
    handler: (
      command: string,
      args: StrictRecord<string, unknown>,
      result: CommandResult,
      context: PluginContext
    ) => Promise<void> | void
  ): CommandAfterHook;
  commandError(
    handler: (
      command: string,
      args: StrictRecord<string, unknown>,
      error: PluginError,
      context: PluginContext
    ) => Promise<void | { handled?: boolean }> | void | { handled?: boolean }
  ): CommandErrorHook;
  configChange(
    handler: (
      oldConfig: StrictRecord<string, unknown>,
      newConfig: StrictRecord<string, unknown>,
      context: PluginContext
    ) => Promise<void> | void
  ): ConfigChangeHook;
  configValidate(
    handler: (
      config: StrictRecord<string, unknown>,
      context: PluginContext
    ) => Promise<ValidationResult> | ValidationResult
  ): ConfigValidateHook;
}

// Advanced Hook Execution Context
export interface HookExecutionContext<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown
> {
  readonly hookName: HookName;
  readonly pluginName?: PluginName;
  readonly args: TArgs;
  readonly startTime: number;
  readonly attempt: number;
  readonly maxRetries: number;
  readonly timeout?: number;
  abort(): void;
  retry(): Promise<TReturn>;
  skip(): void;
}

// Hook Performance Metrics
export interface HookMetrics {
  readonly hookName: HookName;
  readonly pluginName?: PluginName;
  readonly executionTime: number;
  readonly attempts: number;
  readonly success: boolean;
  readonly error?: Error;
  readonly timestamp: number;
}

// Hook Event System
export interface HookEvents {
  'hook:before': [HookExecutionContext];
  'hook:after': [HookExecutionContext, unknown];
  'hook:error': [HookExecutionContext, Error];
  'hook:timeout': [HookExecutionContext];
  'hook:retry': [HookExecutionContext, number];
  'hook:register': [PluginHook];
  'hook:unregister': [HookName, PluginName?];
}

export type HookEventListener<T extends keyof HookEvents> = (
  ...args: HookEvents[T]
) => void | Promise<void>;

export interface HookEventEmitter {
  on<T extends keyof HookEvents>(event: T, listener: HookEventListener<T>): void;
  off<T extends keyof HookEvents>(event: T, listener: HookEventListener<T>): void;
  emit<T extends keyof HookEvents>(event: T, ...args: HookEvents[T]): Promise<void>;
}

// Hook Condition for conditional execution
export interface HookCondition<TArgs extends readonly unknown[]> {
  readonly check: (...args: TArgs) => boolean | Promise<boolean>;
  readonly description?: string;
}

// Specific Hook Types with Strong Typing
// Predefined Hook Names as branded types
export const PLUGIN_INIT_HOOK = HookName.create('plugin:init');
export const PLUGIN_DESTROY_HOOK = HookName.create('plugin:destroy');
export const PLUGIN_ENABLE_HOOK = HookName.create('plugin:enable');
export const PLUGIN_DISABLE_HOOK = HookName.create('plugin:disable');
export const COMMAND_BEFORE_HOOK = HookName.create('command:before');
export const COMMAND_AFTER_HOOK = HookName.create('command:after');
export const COMMAND_ERROR_HOOK = HookName.create('command:error');
export const CONFIG_CHANGE_HOOK = HookName.create('config:change');
export const CONFIG_VALIDATE_HOOK = HookName.create('config:validate');

export interface PluginInitHook extends PluginHook<readonly [PluginContext], void> {
  readonly name: typeof PLUGIN_INIT_HOOK;
}

export interface PluginDestroyHook extends PluginHook<readonly [PluginContext], void> {
  readonly name: typeof PLUGIN_DESTROY_HOOK;
}

export interface PluginEnableHook extends PluginHook<readonly [PluginContext], void> {
  readonly name: typeof PLUGIN_ENABLE_HOOK;
}

export interface PluginDisableHook extends PluginHook<readonly [PluginContext], void> {
  readonly name: typeof PLUGIN_DISABLE_HOOK;
}

export interface CommandBeforeHook extends PluginHook<readonly [string, StrictRecord<string, unknown>, PluginContext], void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown> }> {
  readonly name: typeof COMMAND_BEFORE_HOOK;
}

export interface CommandAfterHook extends PluginHook<readonly [string, StrictRecord<string, unknown>, CommandResult, PluginContext], void> {
  readonly name: typeof COMMAND_AFTER_HOOK;
}

export interface CommandErrorHook extends PluginHook<readonly [string, StrictRecord<string, unknown>, PluginError, PluginContext], void | { handled?: boolean }> {
  readonly name: typeof COMMAND_ERROR_HOOK;
}

export interface ConfigChangeHook extends PluginHook<readonly [StrictRecord<string, unknown>, StrictRecord<string, unknown>, PluginContext], void> {
  readonly name: typeof CONFIG_CHANGE_HOOK;
}

export interface ConfigValidateHook extends PluginHook<readonly [StrictRecord<string, unknown>, PluginContext], ValidationResult> {
  readonly name: typeof CONFIG_VALIDATE_HOOK;
}

// Union type for all specific hooks
export type TypedPluginHook = 
  | PluginInitHook
  | PluginDestroyHook
  | PluginEnableHook
  | PluginDisableHook
  | CommandBeforeHook
  | CommandAfterHook
  | CommandErrorHook
  | ConfigChangeHook
  | ConfigValidateHook;

// Legacy hook interfaces for backward compatibility
export interface PluginLifecycleHook extends PluginHook<readonly [PluginContext], void> {
  name: HookName;
}

export interface PluginCommandHook extends PluginHook<readonly [string, StrictRecord<string, unknown>, PluginContext], void> {
  name: HookName;
}

export interface PluginConfigHook extends PluginHook<readonly [StrictRecord<string, unknown>], StrictRecord<string, unknown>> {
  name: HookName;
}

export interface PluginHookArgs {
  [key: string]: unknown;
}

// Enhanced Plugin Context with Type Safety and Lifecycle Management
export interface PluginContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>> {
  readonly plugin: PluginInfo;
  readonly config: PluginConfig<TConfig>;
  readonly logger: PluginLogger;
  readonly cli: PluginCLI;
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

// Enhanced Plugin Configuration with Schema Validation and Reactive Updates
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

// Configuration Schema for Type-Safe Validation
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

// Enhanced Plugin Security Context with Advanced Features
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

// Enhanced Plugin Performance Monitoring with Advanced Analytics
export interface PluginPerformance {
  readonly startTimer: (name: string, metadata?: Record<string, unknown>) => PerformanceTimer;
  readonly measure: <T>(name: string, fn: () => T | Promise<T>, options?: MeasureOptions) => Promise<T>;
  readonly getMetrics: (filter?: MetricsFilter) => PerformanceMetrics;
  readonly clearMetrics: (pattern?: string) => void;
  readonly createProfiler: (name: string) => PerformanceProfiler;
  readonly benchmark: <T>(name: string, fn: () => T | Promise<T>, iterations?: number) => Promise<BenchmarkResult>;
  readonly memoryUsage: () => MemoryUsage;
  readonly cpuUsage: () => CpuUsage;
  readonly setThreshold: (metric: string, threshold: number, callback: (value: number) => void) => void;
  readonly exportMetrics: (format?: 'json' | 'csv' | 'prometheus') => Promise<string>;
  readonly subscribe: (event: PerformanceEvent, callback: (data: unknown) => void) => () => void;
}

export interface PerformanceTimer {
  readonly stop: () => number;
  readonly elapsed: () => number;
  readonly lap: (label?: string) => number;
  readonly reset: () => void;
  readonly getStats: () => TimerStats;
}

export interface PerformanceMetrics {
  readonly timers: Record<string, TimerMetrics>;
  readonly memory: MemoryMetrics;
  readonly cpu: CpuMetrics;
  readonly network: NetworkMetrics;
  readonly uptime: number;
  readonly timestamp: Date;
  readonly pluginName: string;
  readonly version: string;
}

// Enhanced Type Definitions for Plugin Architecture

// Lifecycle Management
export interface PluginLifecycleManager<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  readonly getState: () => PluginLifecycleState;
  readonly transition: (to: PluginLifecycleState) => Promise<void>;
  readonly onStateChange: (callback: (from: PluginLifecycleState, to: PluginLifecycleState) => void) => () => void;
  readonly canTransition: (to: PluginLifecycleState) => boolean;
  readonly getHistory: () => readonly PluginLifecycleTransition[];
  readonly rollback: () => Promise<void>;
}

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

export interface PluginLifecycleTransition {
  readonly from: PluginLifecycleState;
  readonly to: PluginLifecycleState;
  readonly timestamp: Date;
  readonly duration: number;
  readonly error?: PluginError;
}

// Dependency Management
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

export interface BenchmarkResult {
  readonly name: string;
  readonly iterations: number;
  readonly totalTime: number;
  readonly averageTime: number;
  readonly minTime: number;
  readonly maxTime: number;
  readonly standardDeviation: number;
  readonly operationsPerSecond: number;
}

export interface MeasureOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface MetricsFilter {
  readonly name?: string;
  readonly type?: 'timer' | 'memory' | 'cpu' | 'network';
  readonly since?: Date;
  readonly until?: Date;
}

// Security Types
export interface SecurityReport {
  readonly timestamp: Date;
  readonly pluginName: string;
  readonly vulnerabilities: readonly SecurityVulnerability[];
  readonly permissions: readonly SecurityPermission[];
  readonly riskScore: number;
  readonly recommendations: readonly string[];
}

export interface SecurityVulnerability {
  readonly id: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly component: string;
  readonly cve?: string;
  readonly fixAvailable: boolean;
}

export interface SecurityPermission {
  readonly name: string;
  readonly granted: boolean;
  readonly required: boolean;
  readonly description: string;
  readonly riskLevel: 'low' | 'medium' | 'high';
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
export interface PluginTelemetry {
  readonly track: (event: string, properties?: Record<string, unknown>) => Promise<void>;
  readonly trackError: (error: Error, context?: Record<string, unknown>) => Promise<void>;
  readonly trackPerformance: (metric: string, value: number, tags?: Record<string, string>) => Promise<void>;
  readonly createSpan: (name: string) => TelemetrySpan;
  readonly flush: () => Promise<void>;
  readonly setUser: (userId: string, properties?: Record<string, unknown>) => void;
  readonly getSessionId: () => string;
  readonly isEnabled: () => boolean;
  readonly configure: (config: TelemetryConfig) => void;
}

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

// Security Types
export interface SanitizeOptions {
  readonly allowHtml?: boolean;
  readonly allowScripts?: boolean;
  readonly allowedTags?: readonly string[];
  readonly allowedAttributes?: readonly string[];
}

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
export type HashAlgorithm = 'sha256' | 'sha512' | 'blake2b' | 'argon2';

export interface SecurityAuditEntry {
  readonly timestamp: Date;
  readonly action: string;
  readonly user?: string;
  readonly details: Record<string, unknown>;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

// Performance Types
export interface MeasureOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly tags?: Record<string, string>;
}

export interface MetricsFilter {
  readonly pattern?: string;
  readonly tags?: Record<string, string>;
  readonly timeRange?: { start: Date; end: Date };
}



export interface ProfilerResult {
  readonly duration: number;
  readonly marks: readonly ProfilerMark[];
  readonly measures: readonly ProfilerMeasure[];
  readonly memoryUsage: MemoryUsage;
}

export interface ProfilerMark {
  readonly name: string;
  readonly timestamp: number;
}

export interface ProfilerMeasure {
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
}

export interface BenchmarkResult {
  readonly name: string;
  readonly iterations: number;
  readonly totalTime: number;
  readonly averageTime: number;
  readonly minTime: number;
  readonly maxTime: number;
  readonly standardDeviation: number;
  readonly operationsPerSecond: number;
}

export interface MemoryUsage {
  readonly used: number;
  readonly total: number;
  readonly free: number;
  readonly heap: { used: number; total: number };
  readonly external: number;
}

export interface CpuUsage {
  readonly user: number;
  readonly system: number;
  readonly idle: number;
  readonly total: number;
  readonly percentage: number;
}

export interface TimerStats {
  readonly count: number;
  readonly total: number;
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly laps: readonly { label?: string; time: number }[];
}

export interface TimerMetrics {
  readonly count: number;
  readonly total: number;
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly standardDeviation: number;
}

export interface MemoryMetrics {
  readonly used: number;
  readonly total: number;
  readonly free: number;
  readonly peak: number;
  readonly gc: { collections: number; time: number };
}

export interface CpuMetrics {
  readonly usage: number;
  readonly user: number;
  readonly system: number;
  readonly load: readonly [number, number, number];
}

export interface NetworkMetrics {
  readonly bytesIn: number;
  readonly bytesOut: number;
  readonly requestsIn: number;
  readonly requestsOut: number;
  readonly errors: number;
  readonly latency: { min: number; max: number; average: number };
}

export type PerformanceEvent = 'threshold-exceeded' | 'memory-warning' | 'cpu-warning' | 'slow-operation';

// Plugin Event System
export interface PluginEventEmitter {
  readonly on: <T = unknown>(event: string, listener: (data: T) => void) => void;
  readonly off: (event: string, listener: Function) => void;
  readonly emit: <T = unknown>(event: string, data?: T) => void;
  readonly once: <T = unknown>(event: string, listener: (data: T) => void) => void;
  readonly listenerCount: (event: string) => number;
}

// Plugin State Management
export interface PluginState {
  readonly get: <T = unknown>(key: string) => T | undefined;
  readonly set: <T = unknown>(key: string, value: T) => void;
  readonly has: (key: string) => boolean;
  readonly delete: (key: string) => boolean;
  readonly clear: () => void;
  readonly keys: () => readonly string[];
  readonly size: () => number;
}

export interface PluginLogger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

export interface PluginCLI {
  command: (name: string, description: string) => PluginCLICommand;
  option: (flags: string, description: string, defaultValue?: unknown) => PluginCLIInstance;
  version?: string;
  args?: string[];
  cwd?: string;
}

export interface PluginCLICommand {
  option: (flags: string, description: string, options?: { default?: unknown }) => PluginCLICommand;
  alias: (alias: string) => PluginCLICommand;
  action: (callback: (...args: unknown[]) => void | Promise<void>) => PluginCLICommand;
  example: (example: string) => PluginCLICommand;
}

export interface PluginCLIInstance {
  command: (name: string, description: string) => PluginCLICommand;
  option: (flags: string, description: string, defaultValue?: unknown) => PluginCLIInstance;
}

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  author?: string;
  license?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  repository?: {
    type: string;
    url: string;
  };
  [key: string]: unknown;
}

// Enhanced Plugin Utils with Type Safety
export interface PluginUtils {
  readonly executeHook: <
    THook extends TypedPluginHook = TypedPluginHook,
    TArgs extends THook extends PluginHook<infer A, any, any> ? A : readonly unknown[] = THook extends PluginHook<infer A, any, any> ? A : readonly unknown[],
    TReturn extends THook extends PluginHook<any, infer R, any> ? R : unknown = THook extends PluginHook<any, infer R, any> ? R : unknown
  >(
    hookName: THook['name'],
    ...args: TArgs
  ) => Promise<readonly TReturn[]>;
  
  readonly validateConfig: <T extends Record<string, unknown>>(
    config: unknown,
    schema: ConfigSchema<T>
  ) => ValidationResult;
  
  readonly createCommand: <
    TArgs extends Record<string, unknown>,
    TOptions extends Record<string, unknown>
  >(
    definition: Omit<PluginCommand<TArgs, TOptions>, 'pluginName'>
  ) => PluginCommand<TArgs, TOptions>;
  
  readonly createHook: <
    TArgs extends readonly unknown[],
    TReturn = unknown
  >(
    definition: Omit<PluginHook<TArgs, TReturn>, 'pluginName'>
  ) => PluginHook<TArgs, TReturn>;
  
  readonly debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ) => T;
  
  readonly throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ) => T;
  
  readonly retry: <T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ) => Promise<T>;
  
  readonly fs: PluginFileSystem;
  readonly path: PluginPath;
  readonly crypto: PluginCrypto;
  readonly http: PluginHttp;
  readonly chalk: PluginChalk;
  readonly cache: PluginCache;
}

// Retry Options for utility functions
export interface RetryOptions {
  readonly attempts?: number;
  readonly delay?: number;
  readonly backoff?: 'linear' | 'exponential';
  readonly maxDelay?: number;
  readonly shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface PluginFileSystem {
  readFile: (path: string, encoding?: BufferEncoding) => Promise<string>;
  writeFile: (path: string, content: string, encoding?: BufferEncoding) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string, options?: { recursive?: boolean; mode?: number }) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  stat: (path: string) => Promise<{ isFile(): boolean; isDirectory(): boolean; size: number; mtime: Date }>;
  unlink: (path: string) => Promise<void>;
  rmdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  copyFile: (src: string, dest: string) => Promise<void>;
  access: (path: string, mode?: number) => Promise<void>;
}

export interface PluginPath {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  dirname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
}

export interface PluginCrypto {
  createHash: (algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512') => {
    update: (data: string | Buffer) => {
      digest: (encoding: 'hex' | 'base64' | 'latin1') => string;
    };
  };
  randomBytes: (size: number) => Promise<Buffer>;
  randomUUID: () => string;
  createHmac: (algorithm: 'sha256' | 'sha512', key: string | Buffer) => {
    update: (data: string | Buffer) => {
      digest: (encoding: 'hex' | 'base64' | 'latin1') => string;
    };
  };
}

export interface PluginHttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface PluginHttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
}

export interface PluginHttp {
  get: <T = unknown>(url: string, options?: PluginHttpRequestOptions) => Promise<PluginHttpResponse<T>>;
  post: <T = unknown>(url: string, data?: unknown, options?: PluginHttpRequestOptions) => Promise<PluginHttpResponse<T>>;
  put: <T = unknown>(url: string, data?: unknown, options?: PluginHttpRequestOptions) => Promise<PluginHttpResponse<T>>;
  delete: <T = unknown>(url: string, options?: PluginHttpRequestOptions) => Promise<PluginHttpResponse<T>>;
  patch: <T = unknown>(url: string, data?: unknown, options?: PluginHttpRequestOptions) => Promise<PluginHttpResponse<T>>;
}

export interface PluginChalk {
  red: (text: string) => string;
  green: (text: string) => string;
  yellow: (text: string) => string;
  blue: (text: string) => string;
  gray: (text: string) => string;
  bold: (text: string) => string;
}

export interface PluginCache {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: <T = unknown>(key: string, value: T, ttl?: number) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  del: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
  keys: (pattern?: string) => Promise<string[]>;
  size: () => Promise<number>;
  ttl: (key: string) => Promise<number>;
}

// Plugin Marketplace
export interface PluginMarketplace {
  featured?: boolean;
  category?: string;
  tags?: string[];
  screenshots?: string[];
  demo?: string;
  author?: string;
  homepage?: string;
  pricing?: {
    type: 'free' | 'paid' | 'freemium';
    price?: number;
    currency?: string;
    billing?: 'monthly' | 'yearly' | 'one-time';
  };
}

export interface MarketplacePlugin {
  id?: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: PluginLicense;
  homepage?: string;
  repository?: {
    type: string;
    url: string;
  };
  keywords?: string[];
  downloads: number;
  rating: number;
  reviews: PluginReview[];
  tags?: string[];
  category?: string;
  featured?: boolean;
  premium?: boolean;
  price?: number;
  screenshots?: string[];
  readme?: string;
  changelog?: string;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt: Date;
  lastUpdated?: string;
  compatibility?: string[];
  documentation?: string;
  downloadUrl?: string;
}

export interface PluginReview {
  id?: string;
  rating: number;
  comment: string;
  author: string;
  date: Date;
}

// Plugin Configuration
export interface PluginSettings {
  enabled: boolean;
  config: Record<string, unknown>;
  version: string;
  autoUpdate: boolean;
  priority: number;
}

export interface PluginSystemConfig {
  pluginsDir: string;
  pluginsDirectory: string;
  maxPlugins: number;
  allowedSources: ('npm' | 'git' | 'local')[];
  autoUpdate: boolean;
  autoLoad: boolean;
  allowRemotePlugins: boolean;
  updateCheckInterval: number;
  sandboxMode: boolean;
  trustedPlugins: string[];
  enableHooks: boolean;
  plugins: string[];
  disabled: string[];
  settings: Record<string, PluginSettings>;
  requireAuth: boolean;
  authorizedUsers?: string[];
  premium?: {
    enabled: boolean;
    licenseKey?: string;
  };
  marketplace: {
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

// Plugin Results
export interface PluginOperationResult {
  success: boolean;
  error?: PluginError;
  warnings?: string[];
}

export interface PluginInstallResult extends PluginOperationResult {
  plugin?: PluginInfo;
  message?: string;
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
  LOAD_FAILED = 'PLUGIN_LOAD_FAILED',
  UNLOAD_FAILED = 'PLUGIN_UNLOAD_FAILED',
  RELOAD_FAILED = 'PLUGIN_RELOAD_FAILED',
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
// Enhanced Plugin Manager Interface with Branded Types
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

// Type-Safe Plugin Utilities
export interface PluginTypeGuards {
  isValidPluginName(value: unknown): value is PluginName;
  isValidPluginVersion(value: unknown): value is PluginVersion;
  isValidCommandName(value: unknown): value is CommandName;
  isValidHookName(value: unknown): value is HookName;
  isValidFilePath(value: unknown): value is FilePath;
}

// Enhanced Error Handling with Branded Types
export interface TypedPluginError extends PluginError {
  readonly plugin?: PluginName;
  readonly version?: PluginVersion;
  readonly command?: CommandName;
  readonly hook?: HookName;
}

// Type-Safe Plugin Registry
export interface TypedPluginRegistry {
  readonly version?: PluginVersion;
  readonly plugins: StrictRecord<PluginName, PluginInfo>;
  readonly settings?: StrictRecord<PluginName, PluginSettings>;
  readonly marketplace?: readonly MarketplacePlugin[];
  readonly lastUpdated: Timestamp;
}

// Enhanced Plugin Info with Branded Types
export interface TypedPluginInfo extends Omit<PluginInfo, 'name' | 'version' | 'commands' | 'hooks'> {
  readonly name: PluginName;
  readonly version: PluginVersion;
  readonly commands: readonly CommandName[];
  readonly hooks: readonly HookName[];
  readonly path?: FilePath;
  readonly installPath?: FilePath;
}

// Type-Safe Configuration Management
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

// Advanced Type Inference Helpers
export type InferPluginConfig<T> = T extends Plugin<infer C> ? C : never;
export type InferCommandArgs<T> = T extends PluginCommand<infer A, any, any> ? A : never;
export type InferCommandOptions<T> = T extends PluginCommand<any, infer O, any> ? O : never;
export type InferHookArgs<T> = T extends PluginHook<infer A, any, any> ? A : never;
export type InferHookReturn<T> = T extends PluginHook<any, infer R, any> ? R : never;

// Conditional Types for Plugin Features
export type PluginWithCommands<T extends Plugin> = T extends { commands: NonEmptyArray<PluginCommand> } ? T : never;
export type PluginWithHooks<T extends Plugin> = T extends { hooks: NonEmptyArray<PluginHook> } ? T : never;
export type PluginWithConfig<T extends Plugin> = T extends Plugin<infer C> ? C extends StrictRecord<string, unknown> ? T : never : never;

// Type-Safe Plugin Lifecycle States (using existing enum)

export interface TypedPluginState {
  readonly name: PluginName;
  readonly version: PluginVersion;
  readonly state: PluginLifecycleState;
  readonly lastStateChange: Timestamp;
  readonly error?: TypedPluginError;
}
