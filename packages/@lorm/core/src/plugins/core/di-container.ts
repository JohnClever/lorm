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
  PerformanceMarker,
  TelemetrySpan,
  TelemetryConfig,
  PluginHook,
  HookName,
  PluginName,
  PluginContext,
  HookComposer,
  ComposedHook,
  ConditionalHook,
  HookCondition,
  PluginHookInit,
  PluginHookDestroy,
  PluginHookEnable,
  PluginHookDisable,
  PluginHookCommandBefore,
  PluginHookCommandAfter,
  PluginHookCommandError,
  PluginHookConfigChange,
  PluginHookConfigValidate,
  CommandBeforeArgs,
  CommandAfterArgs,
  CommandErrorArgs,
  ConfigChangeArgs,
  ConfigValidateArgs,
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
  create<TArgs extends readonly unknown[], TReturn = unknown, TContext extends PluginContext = PluginContext>(name: HookName, handler: (...args: TArgs) => Promise<TReturn> | TReturn): PluginHook<TArgs, TReturn, TContext>;
  createComposer<TArgs extends readonly unknown[], TReturn = unknown, TContext extends PluginContext = PluginContext>(initialHook: PluginHook<TArgs, TReturn, TContext>): HookComposer<PluginHook[]>;
  
  /**
   * Creates a plugin initialization hook.
   * @param handler - Initialization handler
   * @returns Plugin init hook
   */
  init(handler: (context: PluginContext) => Promise<void> | void): PluginHookInit;
  
  /**
   * Creates a plugin destruction hook.
   * @param handler - Destruction handler
   * @returns Plugin destroy hook
   */
  destroy(handler: (context: PluginContext) => Promise<void> | void): PluginHookDestroy;
  
  /**
   * Creates a plugin enable hook.
   * @param handler - Enable handler
   * @returns Plugin enable hook
   */
  enable(handler: (context: PluginContext) => Promise<void> | void): PluginHookEnable;
  
  /**
   * Creates a plugin disable hook.
   * @param handler - Disable handler
   * @returns Plugin disable hook
   */
  disable(handler: (context: PluginContext) => Promise<void> | void): PluginHookDisable;
  
  /**
   * Creates a command before hook.
   * @param handler - Command before handler
   * @returns Command before hook
   */
  commandBefore(handler: (context: PluginContext, args: CommandBeforeArgs) => Promise<void> | void): PluginHookCommandBefore;
  
  /**
   * Creates a command after hook.
   * @param handler - Command after handler
   * @returns Command after hook
   */
  commandAfter(handler: (context: PluginContext, args: CommandAfterArgs) => Promise<void> | void): PluginHookCommandAfter;
  
  /**
   * Creates a command error hook.
   * @param handler - Command error handler
   * @returns Command error hook
   */
  commandError(handler: (context: PluginContext, args: CommandErrorArgs) => Promise<void> | void): PluginHookCommandError;
  
  /**
   * Creates a config change hook.
   * @param handler - Config change handler
   * @returns Config change hook
   */
  configChange(handler: (context: PluginContext, args: ConfigChangeArgs) => Promise<void> | void): PluginHookConfigChange;
  
  /**
   * Creates a config validate hook.
   * @param handler - Config validate handler
   * @returns Config validate hook
   */
  configValidate(handler: (context: PluginContext, args: ConfigValidateArgs) => Promise<ValidationResult> | ValidationResult): PluginHookConfigValidate;
}

/**
 * Registry of all available services in the DI container.
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
 * Type for service keys in the registry.
 */
type ServiceKey = keyof ServiceRegistry;

class DefaultTelemetryService implements ITelemetryService {
  async track(
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    // Default implementation - no-op
  }

  async trackError(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    // Default implementation - no-op
  }

  async trackPerformance(
    metric: string,
    value: number,
    tags?: Record<string, string>
  ): Promise<void> {
    // Default implementation - no-op
  }

  createSpan(name: string): TelemetrySpan {
    return {
      setTag: (key: string, value: string | number | boolean) => {},
      setError: (error: Error) => {},
      finish: () => {},
      getDuration: () => 0,
    };
  }

  async flush(): Promise<void> {
    // Default implementation - no-op
  }

  setUser(userId: string, properties?: Record<string, unknown>): void {
    // Default implementation - no-op
  }

  getSessionId(): string {
    return "default-session";
  }

  isEnabled(): boolean {
    return false;
  }

  configure(config: TelemetryConfig): void {
    // Default implementation - no-op
  }
}

class DefaultDependencyManagerService implements IDependencyManagerService {
  private resolvedDependencies = new Map<string, any>();
  private dependencyCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async resolveDependencies(
    pluginName: string
  ): Promise<Record<string, unknown>> {
    const cacheKey = `resolve-${pluginName}`;
    const cached = this.dependencyCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      const result = await this.resolveSinglePlugin(pluginName);
      this.dependencyCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to resolve dependencies for ${pluginName}: ${error}`);
    }
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
    } catch {
      return false;
    }
  }

  private async resolveSinglePlugin(pluginName: string): Promise<any> {
    // Check if already resolved
    if (this.resolvedDependencies.has(pluginName)) {
      return this.resolvedDependencies.get(pluginName);
    }

    // Default implementation - return empty object
    const resolved = {};
    this.resolvedDependencies.set(pluginName, resolved);
    return resolved;
  }

  private async validateSingleDependency(name: string, version: string): Promise<boolean> {
    try {
      // Default implementation - always valid
      // In a real implementation, this would check:
      // - Package availability
      // - Version compatibility
      // - Security constraints
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
    // Default implementation - basic sandbox
    return {
      execute: async <T>(code: string, context?: Record<string, unknown>) => {
        // Basic execution - in production this would use vm or similar
        try {
          return eval(code) as T;
        } catch (error) {
          throw new Error(`Sandbox execution failed: ${error}`);
        }
      },
      createContext: (permissions: readonly string[]) => ({
        id: Math.random().toString(36).substr(2, 9),
        permissions,
        globals: {},
        limits: {
          maxMemory: 100 * 1024 * 1024,
          maxCpu: 80,
          maxExecutionTime: 30000,
          maxApiCalls: 1000,
          allowedModules: [],
          blockedModules: [],
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
        allowedModules: [],
        blockedModules: [],
      }),
      isSecure: () => true,
    };
  }

  async destroySandbox(pluginName: string): Promise<void> {
    // Default implementation - no-op
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
    markers: PerformanceMarker[];
    metadata: Record<string, unknown>;
  }> = [];

  startProfiling(pluginName: string): string {
    const sessionId = `${pluginName}-${Date.now()}-${Math.random()}`;
    this.sessions.set(sessionId, { startTime: Date.now(), markers: [] });
    return sessionId;
  }

  endProfiling(sessionId: string): PerformanceProfiler {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`No profiling session found for ID: ${sessionId}`);
    }

    const endTime = Date.now();
    const duration = endTime - session.startTime;

    const result = {
      sessionId,
      name: sessionId.split('-')[0],
      duration,
      markers: session.markers,
      metadata: {},
    };

    this.results.push(result);
    this.sessions.delete(sessionId);

    return {
      start: (name: string) => ({
        id: `${name}-${Date.now()}`,
        name,
        startTime: Date.now(),
        markers: [],
        addMarker: (markerName: string, metadata?: Record<string, unknown>) => {},
      }),
      stop: (sessionId: string) => ({
        sessionId,
        name: sessionId.split('-')[0],
        duration: 0,
        markers: [],
        metadata: {},
      }),
      getResults: () => this.results,
      clear: () => { this.results = []; },
      export: (format: 'json' | 'csv') => format === 'json' ? JSON.stringify(this.results) : '',
      mark: (name: string) => {},
      measure: (name: string, startMark?: string, endMark?: string) => 0,

    };
  }
}

class DefaultHookEventEmitterService implements IHookEventEmitterService {
  private listeners = new Map<string, Function[]>();

  on<T = unknown>(event: string, listener: (data: T) => void): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.push(listener);
    this.listeners.set(event, eventListeners);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit<T = unknown>(event: string, data?: T): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach((listener) => listener(data));
  }

  once<T = unknown>(event: string, listener: (data: T) => void): void {
    const onceListener = (data: T) => {
      listener(data);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }
}

class DefaultTypedHookRegistryService implements ITypedHookRegistryService {
  private registry = new Map<HookName, PluginHook[]>();

  register<TArgs extends readonly unknown[], TReturn = unknown>(
    hook: PluginHook<TArgs, TReturn>
  ): void {
    const hooks = this.registry.get(hook.name) || [];
    hooks.push(hook as PluginHook);
    this.registry.set(hook.name, hooks);
  }

  unregister(name: HookName, pluginName?: PluginName): void {
    const hooks = this.registry.get(name) || [];
    const filteredHooks = pluginName
      ? hooks.filter((hook) => hook.pluginName !== pluginName)
      : [];
    
    if (filteredHooks.length === 0) {
      this.registry.delete(name);
    } else {
      this.registry.set(name, filteredHooks);
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
        const result = await (hook.handler as any)(...args);
        results.push(result);
      } catch (error) {
        console.error(`Hook execution failed for ${name}:`, error);
      }
    }
    
    return results;
  }

  clear(): void {
    this.registry.clear();
  }

  getAllHooks(): Readonly<Record<HookName, readonly PluginHook[]>> {
    const result: Record<string, readonly PluginHook[]> = {};
    for (const [name, hooks] of this.registry) {
      result[name] = [...hooks];
    }
    return result as Readonly<Record<HookName, readonly PluginHook[]>>;
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
  ): PluginHook<TArgs, TReturn, TContext> {
    const hook: PluginHook<TArgs, TReturn, TContext> = {
      name,
      handler: handler as any,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
    return hook;
  }

  createComposer<TArgs extends readonly unknown[], TReturn = unknown, TContext extends PluginContext = PluginContext>(
    initialHook: PluginHook<TArgs, TReturn, TContext>
  ): HookComposer<PluginHook[]> {
    return {
      compose: (...hooks: PluginHook[]) => ({
        name: hooks[0]?.name || 'composed',
        handler: hooks[0]?.handler || (() => {}),
        hooks,
        strategy: 'parallel'
      } as ComposedHook<PluginHook[]>),
      parallel: (...hooks: PluginHook[]) => ({
        name: hooks[0]?.name || 'parallel',
        handler: hooks[0]?.handler || (() => {}),
        hooks,
        strategy: 'parallel'
      } as ComposedHook<PluginHook[]>),
      sequence: (...hooks: PluginHook[]) => ({
        name: hooks[0]?.name || 'sequence',
        handler: hooks[0]?.handler || (() => {}),
        hooks,
        strategy: 'sequence'
      } as ComposedHook<PluginHook[]>),
      conditional: <U extends PluginHook>(condition: HookCondition, hook: U) => ({
        ...hook,
        hook,
        condition
      } as ConditionalHook<U>)
    } as HookComposer<PluginHook[]>;
  }

  init(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginHookInit {
    return {
      name: "plugin:init" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  destroy(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginHookDestroy {
    return {
      name: "plugin:destroy" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  enable(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginHookEnable {
    return {
      name: "plugin:enable" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  disable(
    handler: (context: PluginContext) => Promise<void> | void
  ): PluginHookDisable {
    return {
      name: "plugin:disable" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  commandBefore(
    handler: (context: PluginContext, args: CommandBeforeArgs) => Promise<void> | void
  ): PluginHookCommandBefore {
    return {
      name: "command:before" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  commandAfter(
    handler: (context: PluginContext, args: CommandAfterArgs) => Promise<void> | void
  ): PluginHookCommandAfter {
    return {
      name: "command:after" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  commandError(
    handler: (context: PluginContext, args: CommandErrorArgs) => Promise<void> | void
  ): PluginHookCommandError {
    return {
      name: "command:error" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  configChange(
    handler: (context: PluginContext, args: ConfigChangeArgs) => Promise<void> | void
  ): PluginHookConfigChange {
    return {
      name: "config:change" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }

  configValidate(
    handler: (context: PluginContext, args: ConfigValidateArgs) => Promise<ValidationResult> | ValidationResult
  ): PluginHookConfigValidate {
    return {
      name: "config:validate" as HookName,
      handler,
      pluginName: "unknown" as PluginName,
      priority: 0,
      enabled: true,
    };
  }
}

/**
 * Dependency injection container for managing plugin services.
 * 
 * Provides service registration, resolution, and lifecycle management
 * with support for singleton and transient services.
 */
export class DIContainer {
  private services = new Map<ServiceKey, unknown>();
  private singletons = new Set<ServiceKey>();

  /**
   * Creates a new DI container instance.
   */
  constructor() {
    // Container is ready for service registration
  }

  /**
   * Registers default implementations for all core services.
   */
  public registerDefaults(): void {
    this.register("telemetry", () => new DefaultTelemetryService());
    this.register(
      "dependencyManager",
      () => new DefaultDependencyManagerService()
    );
    this.register("sandbox", () => new DefaultSandboxService());
    this.register(
      "performanceProfiler",
      () => new DefaultPerformanceProfilerService()
    );
    this.register(
      "hookEventEmitter",
      () => new DefaultHookEventEmitterService()
    );
    this.register(
      "typedHookRegistry",
      () => new DefaultTypedHookRegistryService()
    );
    this.register("hookFactory", () => new DefaultHookFactoryService());
  }

  /**
   * Registers a service in the container.
   * @param key - Service key
   * @param factory - Factory function to create the service
   * @param singleton - Whether the service should be a singleton
   */
  register<K extends ServiceKey>(
    key: K,
    factory: () => ServiceRegistry[K],
    singleton: boolean = true
  ): void {
    this.services.set(key, factory);
    if (singleton) {
      this.singletons.add(key);
    } else {
      this.singletons.delete(key);
    }
  }

  /**
   * Resolves a service from the container.
   * @param key - Service key to resolve
   * @returns The resolved service instance
   */
  resolve<K extends ServiceKey>(key: K): ServiceRegistry[K] {
    const factory = this.services.get(key) as (() => ServiceRegistry[K]) | undefined;
    
    if (!factory) {
      throw new Error(`Service '${key}' not registered`);
    }

    if (this.singletons.has(key)) {
      // For singletons, cache the instance
      const cacheKey = `singleton:${key}`;
      let instance = this.services.get(cacheKey as ServiceKey) as ServiceRegistry[K];
      
      if (!instance) {
        instance = factory();
        this.services.set(cacheKey as ServiceKey, instance);
      }
      
      return instance;
    } else {
      // For transient services, always create new instance
      return factory();
    }
  }

  /**
   * Clears all registered services and cached instances.
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}

/**
 * Global container instance for shared access.
 */
let globalContainer: DIContainer | undefined;

/**
 * Creates a new DI container with default services registered.
 * @returns New DI container instance
 */
export function createDIContainer(): DIContainer {
  return new DIContainer();
}

/**
 * Gets the global DI container instance, creating it if necessary.
 * @returns Global DI container instance
 */
export function getGlobalDIContainer(): DIContainer {
  if (!globalContainer) {
    globalContainer = createDIContainer();
    globalContainer.registerDefaults();
  }
  return globalContainer;
}

/**
 * Sets the global DI container instance.
 * @param container - Container instance to set as global
 */
export function setGlobalDIContainer(container: DIContainer): void {
  globalContainer = container;
}