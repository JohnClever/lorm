/**
 * Dependency injection container for the plugin system.
 * 
 * This module provides a lightweight DI container that manages service dependencies
 * and their lifecycle. It supports singleton and transient services, default
 * implementations, and service resolution with proper typing.
 * 
 * @example
 * ```typescript
 * const container = createDIContainer();
 * container.registerDefaults();
 * const telemetry = container.resolve('telemetry');
 * ```
 */

import type {
  PluginTelemetry,
  PluginSandbox,
  PerformanceProfiler,
  TelemetrySpan,
  TelemetryConfig,
  PluginHook,
  HookName,
  PluginName,
  PluginContext,
  HookComposer,
  PluginInitHook,
  PluginDestroyHook,
  PluginEnableHook,
  PluginDisableHook,
  CommandBeforeHook,
  CommandAfterHook,
  CommandErrorHook,
  ConfigChangeHook,
  ConfigValidateHook,
  StrictRecord,
  CommandResult,
  PluginError,
  ValidationResult,
} from "../types";

/**
 * Service interface for telemetry operations.
 * 
 * Provides methods for tracking events, errors, performance metrics,
 * and managing telemetry spans and configuration.
 */
export interface ITelemetryService {
  track(event: string, properties?: Record<string, unknown>): Promise<void>;
  trackError(error: Error, context?: Record<string, unknown>): Promise<void>;
  trackPerformance(metric: string, value: number, tags?: Record<string, string>): Promise<void>;
  createSpan(name: string): TelemetrySpan;
  flush(): Promise<void>;
  setUser(userId: string, properties?: Record<string, unknown>): void;
  getSessionId(): string;
  isEnabled(): boolean;
  configure(config: TelemetryConfig): void;
}

/**
 * Service interface for managing plugin dependencies.
 * 
 * Handles dependency resolution, validation, and caching for plugins.
 */
export interface IDependencyManagerService {
  /**
   * Resolves all dependencies for a given plugin.
   * @param pluginName - Name of the plugin to resolve dependencies for
   * @returns Promise resolving to resolved dependencies
   */
  resolveDependencies(pluginName: string): Promise<Record<string, unknown>>;
  
  /**
   * Validates that all specified dependencies are available and compatible.
   * @param dependencies - Map of dependency names to version requirements
   * @returns Promise resolving to true if all dependencies are valid
   */
  validateDependencies(dependencies: Record<string, string>): Promise<boolean>;
  
  /**
   * Clears the dependency resolution cache.
   */
  clearCache(): void;
  
  /**
   * Gets all currently resolved dependencies.
   * @returns Map of resolved dependencies
   */
  getResolvedDependencies(): Map<string, any>;
}

/**
 * Service interface for managing plugin sandboxes.
 * 
 * Provides isolated execution environments for plugins to ensure security and stability.
 */
export interface ISandboxService {
  /**
   * Creates a new sandbox for the specified plugin.
   * @param pluginName - Name of the plugin to create sandbox for
   * @returns Promise resolving to the created sandbox
   */
  createSandbox(pluginName: string): Promise<PluginSandbox>;
  
  /**
   * Destroys the sandbox for the specified plugin.
   * @param pluginName - Name of the plugin to destroy sandbox for
   */
  destroySandbox(pluginName: string): Promise<void>;
}

/**
 * Service interface for performance profiling of plugins.
 * 
 * Tracks performance metrics and provides profiling data for optimization.
 */
export interface IPerformanceProfilerService {
  /**
   * Starts a profiling session for the specified plugin.
   * @param pluginName - Name of the plugin to profile
   * @returns Session ID for the profiling session
   */
  startProfiling(pluginName: string): string;
  
  /**
   * Ends a profiling session and returns the results.
   * @param sessionId - ID of the profiling session to end
   * @returns Performance profiling results
   */
  endProfiling(sessionId: string): PerformanceProfiler;
}

/**
 * Service interface for hook event emission and handling.
 * 
 * Provides an event-driven system for plugin hooks with typed event handling.
 */
interface IHookEventEmitterService {
  /**
   * Registers a listener for the specified event.
   * @param event - Event name to listen for
   * @param listener - Function to call when event is emitted
   */
  on<T = unknown>(event: string, listener: (data: T) => void): void;
  
  /**
   * Removes a listener for the specified event.
   * @param event - Event name to remove listener from
   * @param listener - Function to remove
   */
  off(event: string, listener: Function): void;
  
  /**
   * Emits an event with optional data.
   * @param event - Event name to emit
   * @param data - Optional data to pass to listeners
   */
  emit<T = unknown>(event: string, data?: T): void;
  
  /**
   * Registers a one-time listener for the specified event.
   * @param event - Event name to listen for
   * @param listener - Function to call once when event is emitted
   */
  once<T = unknown>(event: string, listener: (data: T) => void): void;
  
  /**
   * Gets the number of listeners for the specified event.
   * @param event - Event name to count listeners for
   * @returns Number of registered listeners
   */
  listenerCount(event: string): number;
}

/**
 * Service interface for typed hook registry management.
 * 
 * Manages registration, execution, and lifecycle of typed plugin hooks.
 */
interface ITypedHookRegistryService {
  /**
   * Registers a hook in the registry.
   * @param hook - The hook to register
   */
  register<TArgs extends readonly unknown[], TReturn = unknown>(hook: PluginHook<TArgs, TReturn>): void;
  
  /**
   * Unregisters hooks by name and optionally by plugin.
   * @param name - Hook name to unregister
   * @param pluginName - Optional plugin name to filter by
   */
  unregister(name: HookName, pluginName?: PluginName): void;
  
  /**
   * Gets all hooks registered for the specified name.
   * @param name - Hook name to get hooks for
   * @returns Array of registered hooks
   */
  getHooks<TArgs extends readonly unknown[], TReturn = unknown>(name: HookName): readonly PluginHook<TArgs, TReturn>[];
  
  /**
   * Executes all hooks registered for the specified name.
   * @param name - Hook name to execute
   * @param args - Arguments to pass to the hooks
   * @returns Promise resolving to array of hook results
   */
  execute<TArgs extends readonly unknown[], TReturn = unknown>(name: HookName, ...args: TArgs): Promise<readonly TReturn[]>;
  
  /**
   * Clears all registered hooks.
   */
  clear(): void;
  
  /**
   * Gets all registered hooks grouped by name.
   * @returns Readonly record of all hooks
   */
  getAllHooks(): Readonly<Record<HookName, readonly PluginHook[]>>;
}

/**
 * Service interface for creating typed plugin hooks.
 * 
 * Provides factory methods for creating various types of plugin hooks
 * with proper typing and composition capabilities.
 */
interface IHookFactoryService {
  /**
   * Creates a generic hook with the specified name and handler.
   * @param name - Hook name
   * @param handler - Hook handler function
   * @returns Hook composer for building the hook
   */
  create<TArgs extends readonly unknown[], TReturn = unknown, TContext extends PluginContext = PluginContext>(name: HookName, handler: (...args: TArgs) => Promise<TReturn> | TReturn): HookComposer<PluginHook<TArgs, TReturn, TContext>>;
  
  /**
   * Creates a plugin initialization hook.
   * @param handler - Initialization handler
   * @returns Plugin init hook
   */
  init(handler: (context: PluginContext) => Promise<void> | void): PluginInitHook;
  
  /**
   * Creates a plugin destruction hook.
   * @param handler - Destruction handler
   * @returns Plugin destroy hook
   */
  destroy(handler: (context: PluginContext) => Promise<void> | void): PluginDestroyHook;
  
  /**
   * Creates a plugin enable hook.
   * @param handler - Enable handler
   * @returns Plugin enable hook
   */
  enable(handler: (context: PluginContext) => Promise<void> | void): PluginEnableHook;
  
  /**
   * Creates a plugin disable hook.
   * @param handler - Disable handler
   * @returns Plugin disable hook
   */
  disable(handler: (context: PluginContext) => Promise<void> | void): PluginDisableHook;
  
  /**
   * Creates a command before hook.
   * @param handler - Before command handler
   * @returns Command before hook
   */
  commandBefore(handler: (command: string, args: StrictRecord<string, unknown>, context: PluginContext) => Promise<void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown>; }> | void | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown>; }): CommandBeforeHook;
  
  /**
   * Creates a command after hook.
   * @param handler - After command handler
   * @returns Command after hook
   */
  commandAfter(handler: (command: string, args: StrictRecord<string, unknown>, result: CommandResult, context: PluginContext) => Promise<void> | void): CommandAfterHook;
  
  /**
   * Creates a command error hook.
   * @param handler - Error handler
   * @returns Command error hook
   */
  commandError(handler: (command: string, args: StrictRecord<string, unknown>, error: PluginError, context: PluginContext) => Promise<void | { handled?: boolean; }> | void | { handled?: boolean; }): CommandErrorHook;
  
  /**
   * Creates a config change hook.
   * @param handler - Config change handler
   * @returns Config change hook
   */
  configChange(handler: (oldConfig: StrictRecord<string, unknown>, newConfig: StrictRecord<string, unknown>, context: PluginContext) => Promise<void> | void): ConfigChangeHook;
  
  /**
   * Creates a config validation hook.
   * @param handler - Config validation handler
   * @returns Config validate hook
   */
  configValidate(handler: (config: StrictRecord<string, unknown>, context: PluginContext) => Promise<ValidationResult> | ValidationResult): ConfigValidateHook;
}

/**
 * Registry of all available services in the DI container.
 * 
 * Maps service keys to their corresponding service interfaces.
 */
type ServiceRegistry = {
  telemetry: ITelemetryService;
  dependencyManager: IDependencyManagerService;
  sandbox: ISandboxService;
  performanceProfiler: IPerformanceProfilerService;
  hookEventEmitter: IHookEventEmitterService;
  typedHookRegistry: ITypedHookRegistryService;
  hookFactory: IHookFactoryService;
};

/**
 * Union type of all available service keys.
 */
type ServiceKey = keyof ServiceRegistry;

// Default implementations
class DefaultTelemetryService implements ITelemetryService {
  async track(
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    console.log(`[Telemetry] Event: ${event}`, properties);
  }

  async trackError(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    console.error(`[Telemetry] Error: ${error.message}`, context);
  }

  async trackPerformance(
    metric: string,
    value: number,
    tags?: Record<string, string>
  ): Promise<void> {
    console.log(`[Telemetry] Performance: ${metric} = ${value}`, tags);
  }

  createSpan(name: string): TelemetrySpan {
    return {
      setTag: () => {},
      setError: () => {},
      finish: () => {},
      getDuration: () => 0,
    } as TelemetrySpan;
  }

  async flush(): Promise<void> {
    // No-op for default implementation
  }

  setUser(userId: string, properties?: Record<string, unknown>): void {
    console.log(`[Telemetry] User: ${userId}`, properties);
  }

  getSessionId(): string {
    return "default-session";
  }

  isEnabled(): boolean {
    return true;
  }

  configure(config: TelemetryConfig): void {
    console.log("[Telemetry] Configure:", config);
  }
}

class DefaultDependencyManagerService implements IDependencyManagerService {
  private resolvedDependencies = new Map<string, any>();
  private dependencyCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async resolveDependencies(
    pluginName: string
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};
    
    // Check cache first
    const cacheKey = `${pluginName}`;
    const cached = this.dependencyCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }
    
    try {
      // Simulate dependency resolution for the plugin
      const result = await this.resolveSinglePlugin(pluginName);
      resolved[pluginName] = result;
      
      // Cache the result
      this.dependencyCache.set(cacheKey, {
        result: resolved,
        timestamp: Date.now()
      });
      
      this.resolvedDependencies.set(pluginName, result);
    } catch (error) {
      throw new Error(`Failed to resolve dependencies for plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return resolved;
  }

  async validateDependencies(
    dependencies: Record<string, string>
  ): Promise<boolean> {
    try {
      for (const [name, version] of Object.entries(dependencies)) {
        const isValid = await this.validateSingleDependency(name, version);
        if (!isValid) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Dependency validation failed:', error);
      return false;
    }
  }

  private async resolveSinglePlugin(pluginName: string): Promise<any> {
    // Simplified implementation - in a real scenario, this would:
    // 1. Check if the plugin dependencies are already installed
    // 2. Verify version compatibility
    // 3. Install if necessary
    // 4. Return the resolved module/package info
    
    return {
      name: pluginName,
      version: 'latest',
      satisfied: true,
      resolvedAt: new Date().toISOString()
    };
  }

  private async validateSingleDependency(name: string, version: string): Promise<boolean> {
    // Simplified validation - would check:
    // 1. Package exists in registry
    // 2. Version is available
    // 3. Compatibility with current environment
    // 4. No security vulnerabilities
    
    try {
      // Simulate validation logic
      if (!name || name.trim() === '') {
        return false;
      }
      
      // Check for obviously invalid version patterns
      if (version && !/^[\d\.\-\w\^\~\*]+$/.test(version)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  clearCache(): void {
    this.dependencyCache.clear();
  }

  getResolvedDependencies(): Map<string, any> {
    return new Map(this.resolvedDependencies);
  }
}

class DefaultSandboxService implements ISandboxService {
  async createSandbox(pluginName: string): Promise<PluginSandbox> {
    return {
      execute: async <T>(code: string, context?: Record<string, unknown>) =>
        ({} as T),
      createContext: (permissions: readonly string[]) => ({
        id: `ctx-${Date.now()}`,
        permissions,
        globals: {},
        limits: {
          maxMemory: 100 * 1024 * 1024, // 100MB
          maxCpu: 80,
          maxExecutionTime: 30000,
          maxApiCalls: 1000,
          allowedModules: ["fs", "path"],
          blockedModules: ["child_process", "cluster"],
        },
        createdAt: new Date(),
      }),
      destroyContext: async (contextId: string) => {},
      getResourceUsage: () => ({
        memory: 0,
        cpu: 0,
        executionTime: 0,
        apiCalls: 0,
      }),
      setLimits: (limits) => {},
      getLimits: () => ({
        maxMemory: 100 * 1024 * 1024,
        maxCpu: 80,
        maxExecutionTime: 30000,
        maxApiCalls: 1000,
        allowedModules: ["fs", "path"],
        blockedModules: ["child_process", "cluster"],
      }),
      isSecure: () => true,
    };
  }

  async destroySandbox(pluginName: string): Promise<void> {
    // Implementation for destroying sandbox
  }
}

class DefaultPerformanceProfilerService implements IPerformanceProfilerService {
  private sessions = new Map<
    string,
    { startTime: number; markers: Array<{ name: string; timestamp: number }> }
  >();
  private results: Array<{
    sessionId: string;
    name: string;
    duration: number;
    markers: unknown[];
    metadata: Record<string, unknown>;
  }> = [];

  startProfiling(pluginName: string): string {
    const sessionId = `${pluginName}-${Date.now()}`;
    this.sessions.set(sessionId, { startTime: Date.now(), markers: [] });
    return sessionId;
  }

  endProfiling(sessionId: string): PerformanceProfiler {
    const session = this.sessions.get(sessionId);
    const startTime = session?.startTime || Date.now();
    const duration = Date.now() - startTime;
    this.sessions.delete(sessionId);

    return {
      start: (name: string) => ({
        id: `session-${Date.now()}`,
        name,
        startTime: Date.now(),
        markers: [],
        addMarker: (
          markerName: string,
          metadata?: Record<string, unknown>
        ) => {},
      }),
      stop: (sessionId: string) => ({
        sessionId,
        name: "default",
        duration,
        markers: [],
        metadata: {},
      }),
      getResults: () => this.results,
      clear: () => {
        this.results = [];
      },
      export: (format: "json" | "csv") => (format === "json" ? "[]" : ""),
      mark: (name: string) => {},
      measure: (name: string, startMark?: string, endMark?: string) => duration,
    } as PerformanceProfiler;
  }
}

class DefaultHookEventEmitterService implements IHookEventEmitterService {
  private listeners = new Map<string, Function[]>();

  on<T = unknown>(event: string, listener: (data: T) => void): void {
    const handlers = this.listeners.get(event) || [];
    handlers.push(listener);
    this.listeners.set(event, handlers);
  }

  off(event: string, listener: Function): void {
    const handlers = this.listeners.get(event) || [];
    const index = handlers.indexOf(listener);
    if (index > -1) {
      handlers.splice(index, 1);
      this.listeners.set(event, handlers);
    }
  }

  emit<T = unknown>(event: string, data?: T): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }

  once<T = unknown>(event: string, listener: (data: T) => void): void {
    const onceWrapper = (data: T) => {
      listener(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  listenerCount(event: string): number {
    return (this.listeners.get(event) || []).length;
  }
}

class DefaultTypedHookRegistryService implements ITypedHookRegistryService {
  private registry = new Map<HookName, PluginHook[]>();

  register<TArgs extends readonly unknown[], TReturn = unknown>(
    hook: PluginHook<TArgs, TReturn>
  ): void {
    const handlers = this.registry.get(hook.name) || [];
    handlers.push(hook as PluginHook);
    this.registry.set(hook.name, handlers);
  }

  unregister(name: HookName, pluginName?: PluginName): void {
    const handlers = this.registry.get(name) || [];
    if (pluginName) {
      const filtered = handlers.filter(
        (hook) => hook.pluginName !== pluginName
      );
      this.registry.set(name, filtered);
    } else {
      this.registry.delete(name);
    }
  }

  getHooks<TArgs extends readonly unknown[], TReturn = unknown>(
    name: HookName
  ): readonly PluginHook<TArgs, TReturn>[] {
    return (this.registry.get(name) || []) as PluginHook<TArgs, TReturn>[];
  }

  async execute<TArgs extends readonly unknown[], TReturn = unknown>(
    name: HookName,
    ...args: TArgs
  ): Promise<readonly TReturn[]> {
    const hooks = this.getHooks<TArgs, TReturn>(name);
    const results: TReturn[] = [];
    for (const hook of hooks) {
      try {
        const result = await hook.handler(...args);
        results.push(result);
      } catch (error) {
        console.error(`Hook execution failed for ${name}:`, error);
      }
    }
    return results;
  }

  /**
   * Clears all services and re-registers defaults.
   */
  clear(): void {
    this.registry.clear();
  }

  getAllHooks(): Readonly<Record<HookName, readonly PluginHook[]>> {
    const result: Record<string, readonly PluginHook[]> = {};
    for (const [name, hooks] of this.registry.entries()) {
      result[name] = hooks;
    }
    return result;
  }
}

class DefaultHookFactoryService implements IHookFactoryService {
  create<
    TArgs extends readonly unknown[],
    TReturn = unknown,
    TContext extends PluginContext = PluginContext
  >(
    name: HookName,
    handler: (...args: TArgs) => Promise<TReturn> | TReturn
  ): HookComposer<PluginHook<TArgs, TReturn, TContext>> {
    const initialHook: PluginHook<TArgs, TReturn, TContext> = {
      name,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
    return this.createComposer<PluginHook<TArgs, TReturn, TContext>>(
      initialHook
    );
  }

  private createComposer<T extends PluginHook<any, any, any>>(
    initialHook: T
  ): HookComposer<T> {
    let currentHook = { ...initialHook };

    const composer: HookComposer<T> = {
      pipe: <U>(next: U): HookComposer<T & U> => {
        // Create a new composer with the combined type
        const combinedHook = { ...currentHook, ...next } as T & U;
        return this.createComposer(combinedHook) as HookComposer<T & U>;
      },
      middleware: (...middleware: any[]) => {
        currentHook = { ...currentHook, middleware } as T;
        return composer;
      },
      condition: (condition: any) => {
        currentHook = {
          ...currentHook,
          conditions: [...(currentHook.conditions || []), condition],
        } as T;
        return composer;
      },
      timeout: (ms: number) => {
        currentHook = { ...currentHook, timeout: ms } as T;
        return composer;
      },
      retries: (count: number) => {
        currentHook = { ...currentHook, retries: count } as T;
        return composer;
      },
      fallback: (handler: any) => {
        currentHook = { ...currentHook, fallback: handler } as T;
        return composer;
      },
      build: () => currentHook,
    };

    return composer;
  }

  init(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginInitHook {
    return {
      name: "plugin:init" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  destroy(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginDestroyHook {
    return {
      name: "plugin:destroy" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  enable(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginEnableHook {
    return {
      name: "plugin:enable" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  disable(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginDisableHook {
    return {
      name: "plugin:disable" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  commandBefore(
    handler: (
      command: string,
      args: StrictRecord<string, unknown>,
      context: PluginContext
    ) =>
      | Promise<void | {
          cancel?: boolean;
          modifyArgs?: StrictRecord<string, unknown>;
        }>
      | void
      | { cancel?: boolean; modifyArgs?: StrictRecord<string, unknown> }
  ): CommandBeforeHook {
    return {
      name: "command:before" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  commandAfter(
    handler: (
      command: string,
      args: StrictRecord<string, unknown>,
      result: CommandResult,
      context: PluginContext
    ) => Promise<void> | void
  ): CommandAfterHook {
    return {
      name: "command:after" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  commandError(
    handler: (
      command: string,
      args: StrictRecord<string, unknown>,
      error: PluginError,
      context: PluginContext
    ) => Promise<void | { handled?: boolean }> | void | { handled?: boolean }
  ): CommandErrorHook {
    return {
      name: "command:error" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  configChange(
    handler: (
      oldConfig: StrictRecord<string, unknown>,
      newConfig: StrictRecord<string, unknown>,
      context: PluginContext
    ) => Promise<void> | void
  ): ConfigChangeHook {
    return {
      name: "config:change" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }

  configValidate(
    handler: (
      config: StrictRecord<string, unknown>,
      context: PluginContext
    ) => Promise<ValidationResult> | ValidationResult
  ): ConfigValidateHook {
    return {
      name: "config:validate" as any,
      handler,
      pluginName: "default" as PluginName,
      priority: 0,
    };
  }
}

/**
 * Dependency injection container that manages service registration and resolution.
 * 
 * Supports both singleton and transient service lifetimes, with automatic
 * dependency resolution and type-safe service access.
 */
export class DIContainer {
  private services = new Map<ServiceKey, unknown>();
  private singletons = new Set<ServiceKey>();

  /**
   * Creates a new DI container instance and registers default services.
   */
  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers all default service implementations.
   */
  public registerDefaults(): void {
    this.register("telemetry", () => new DefaultTelemetryService(), true);
    this.register(
      "dependencyManager",
      () => new DefaultDependencyManagerService(),
      true
    );
    this.register("sandbox", () => new DefaultSandboxService(), true);
    this.register(
      "performanceProfiler",
      () => new DefaultPerformanceProfilerService(),
      true
    );
    this.register(
      "hookEventEmitter",
      () => new DefaultHookEventEmitterService(),
      true
    );
    this.register(
      "typedHookRegistry",
      () => new DefaultTypedHookRegistryService(),
      true
    );
    this.register("hookFactory", () => new DefaultHookFactoryService(), true);
  }

  /**
   * Registers a service with the container.
   * @param key - Service key to register
   * @param factory - Factory function that creates the service instance
   * @param singleton - Whether the service should be a singleton (default: true)
   */
  register<K extends ServiceKey>(
    key: K,
    factory: () => ServiceRegistry[K],
    singleton: boolean = true
  ): void {
    this.services.set(key, factory);
    if (singleton) {
      this.singletons.add(key);
    }
  }

  /**
   * Resolves a service from the container.
   * @param key - Service key to resolve
   * @returns The resolved service instance
   * @throws Error if the service is not registered
   */
  resolve<K extends ServiceKey>(key: K): ServiceRegistry[K] {
    const factory = this.services.get(key) as
      | (() => ServiceRegistry[K])
      | undefined;
    if (!factory) {
      throw new Error(`Service '${key}' not registered`);
    }

    if (this.singletons.has(key)) {
      // Check if singleton instance already exists
      const existingInstance = this.services.get(
        `${key}_instance` as ServiceKey
      );
      if (existingInstance) {
        return existingInstance as ServiceRegistry[K];
      }

      // Create and cache singleton instance
      const instance = factory();
      this.services.set(`${key}_instance` as ServiceKey, instance);
      return instance;
    }

    return factory();
  }

  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.registerDefaults();
  }
}

// Global container instance
let globalContainer: DIContainer | undefined;

/**
 * Creates a new DI container instance.
 * @returns New DI container with default services registered
 */
export function createDIContainer(): DIContainer {
  return new DIContainer();
}

/**
 * Gets the global DI container instance, creating it if it doesn't exist.
 * @returns The global DI container instance
 */
export function getGlobalDIContainer(): DIContainer {
  if (!globalContainer) {
    globalContainer = new DIContainer();
  }
  return globalContainer;
}

/**
 * Sets the global DI container instance.
 * @param container - The container to set as global
 */
export function setGlobalDIContainer(container: DIContainer): void {
  globalContainer = container;
}
