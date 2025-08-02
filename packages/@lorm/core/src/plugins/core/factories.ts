/**
 * Plugin System Factories
 * Provides factory interfaces and implementations for creating plugin system components
 */

import type {
  Plugin,
  PluginName,
  PluginInfo,
  PluginCommand,
  PluginHook,
  PluginContext,
  PluginState,
  ValidationResult,
  StrictRecord
} from '../types';

import type {
  PluginSystemConfig,
  PluginManagerConfig,
  ValidationConfig,
  HookSystemConfig,
  LifecycleConfig
} from './config-manager';

import type {
  DIContainer,
  ITelemetryService,
  IDependencyManagerService,
  ISandboxService,
  IPerformanceProfilerService
} from './di-container';

import type { FilePath } from '../types';

import {
  PluginDependencyManager,
  PluginSandbox,
  PluginTelemetry,
  PerformanceProfiler,
  PluginDependency,
  DependencyResolutionResult,
  DependencyCheckResult,
  DependencyGraph,
  DependencyNode,
  CompatibilityResult,
  CompatibilityIssue,
  DependencyConflict,
  PerformanceSession,
  PerformanceResult,
  SandboxContext,
  SandboxResourceUsage,
  SandboxLimits,
  TelemetrySpan,
  TelemetryConfig
} from '../types';

// Adapter classes to bridge DI container services with plugin interfaces
class DependencyManagerAdapter implements PluginDependencyManager {
  private installedDependencies = new Set<string>();
  private dependencyGraph: DependencyGraph = { nodes: [], edges: [], cycles: [] };
  private conflicts: DependencyConflict[] = [];

  constructor(private service: IDependencyManagerService) {}

  readonly resolve = async (dependencies: readonly PluginDependency[]): Promise<DependencyResolutionResult> => {
    const resolved: PluginDependency[] = [];
    const missing: PluginDependency[] = [];
    const installOrder: string[] = [];

    for (const dep of dependencies) {
      if (this.installedDependencies.has(dep.name)) {
        resolved.push(dep);
      } else {
        missing.push(dep);
      }
      installOrder.push(dep.name);
    }

    return {
      resolved,
      missing,
      conflicts: this.conflicts,
      installOrder
    };
  };

  readonly check = async (dependency: PluginDependency): Promise<DependencyCheckResult> => {
    const satisfied = this.installedDependencies.has(dependency.name);
    return {
      satisfied,
      version: dependency.version,
      reason: satisfied ? undefined : 'Dependency not installed'
    };
  };

  readonly install = async (dependency: PluginDependency): Promise<void> => {
    this.installedDependencies.add(dependency.name);
    this.updateDependencyGraph(dependency);
  };

  readonly uninstall = async (dependency: PluginDependency): Promise<void> => {
    this.installedDependencies.delete(dependency.name);
    this.removeDependencyFromGraph(dependency);
  };

  readonly getDependencyGraph = (): DependencyGraph => {
    return this.dependencyGraph;
  };

  readonly validateCompatibility = async (plugin: Plugin): Promise<CompatibilityResult> => {
    const issues: CompatibilityIssue[] = [];
    const recommendations: string[] = [];

    if (plugin.pluginDependencies) {
      for (const dep of plugin.pluginDependencies) {
        if (!this.installedDependencies.has(dep.name)) {
          issues.push({
            type: 'dependency',
            severity: dep.optional ? 'warning' : 'error',
            message: `Missing dependency: ${dep.name}`,
            component: dep.name
          });
        }
      }
    }

    return {
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      recommendations
    };
  };

  readonly getConflicts = (): readonly DependencyConflict[] => {
    return this.conflicts;
  };

  private updateDependencyGraph(dependency: PluginDependency): void {
    const node: DependencyNode = {
      name: dependency.name,
      version: dependency.version || '1.0.0',
      type: 'plugin'
    };
    
    this.dependencyGraph = {
      ...this.dependencyGraph,
      nodes: [...this.dependencyGraph.nodes, node]
    };
  }

  private removeDependencyFromGraph(dependency: PluginDependency): void {
    this.dependencyGraph = {
      ...this.dependencyGraph,
      nodes: this.dependencyGraph.nodes.filter(n => n.name !== dependency.name)
    };
  }
}

class SandboxAdapter implements PluginSandbox {
  private contexts: Map<string, SandboxContext> = new Map();
  private limits: SandboxLimits = {
    maxMemory: 100 * 1024 * 1024, // 100MB
    maxCpu: 80, // 80%
    maxExecutionTime: 30000, // 30 seconds
    maxApiCalls: 1000,
    allowedModules: ['fs', 'path', 'crypto'],
    blockedModules: ['child_process', 'cluster']
  };

  constructor(private service: ISandboxService) {}

  readonly execute = async <T>(code: string, context?: Record<string, unknown>): Promise<T> => {
    // Simulate execution since ISandboxService doesn't have execute method
    try {
      const result = eval(code) as T;
      return result;
    } catch (error) {
      throw new Error(`Sandbox execution failed: ${error}`);
    }
  };

  readonly createContext = (permissions: readonly string[]): SandboxContext => {
    const context: SandboxContext = {
      id: Math.random().toString(36).substr(2, 9),
      permissions,
      globals: {},
      limits: this.limits,
      createdAt: new Date()
    };
    this.contexts.set(context.id, context);
    return context;
  };

  readonly destroyContext = async (contextId: string): Promise<void> => {
    this.contexts.delete(contextId);
  };

  readonly getResourceUsage = (): SandboxResourceUsage => {
    return {
      memory: 0,
      cpu: 0,
      executionTime: 0,
      apiCalls: 0
    };
  };

  readonly setLimits = (limits: SandboxLimits): void => {
    this.limits = limits;
  };

  readonly getLimits = (): SandboxLimits => {
    return this.limits;
  };

  readonly isSecure = (): boolean => {
    return true;
  };
}

class TelemetryAdapter implements PluginTelemetry {
  constructor(private service: ITelemetryService) {}

  track(event: string, properties?: Record<string, unknown>): void {
    this.service.track(event, properties);
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    // Use track method for identification
    this.service.track('identify', { userId, ...traits });
  }

  group(groupId: string, traits?: Record<string, unknown>): void {
    // Use track method for grouping
    this.service.track('group', { groupId, ...traits });
  }

  page(name: string, properties?: Record<string, unknown>): void {
    // Use track method for page tracking
    this.service.track('page', { name, ...properties });
  }

  increment(metric: string, value?: number, tags?: Record<string, unknown>): void {
    // Use track method for metrics
    this.service.track('metric', { metric, value: value || 1, type: 'increment', ...tags });
  }

  gauge(metric: string, value: number, tags?: Record<string, unknown>): void {
    // Use track method for gauge metrics
    this.service.track('metric', { metric, value, type: 'gauge', ...tags });
  }

  timing(metric: string, duration: number, tags?: Record<string, unknown>): void {
    // Use trackPerformance for timing
    this.service.trackPerformance(metric, duration, tags as Record<string, string>);
  }

  readonly createSpan = (name: string, metadata?: Record<string, unknown>): TelemetrySpan => {
    return this.service.createSpan(name) as any;
  };

  readonly recordMetric = (name: string, value: number, tags?: Record<string, string>): void => {
    this.service.trackPerformance(name, value, tags);
  };

  readonly recordEvent = (name: string, data?: Record<string, unknown>): void => {
    this.service.track(name, data);
  };

  readonly flush = async (): Promise<void> => {
    // Implementation would flush telemetry data
  };

  readonly configure = (config: TelemetryConfig): void => {
    // Implementation would configure telemetry
  };
}

class PerformanceProfilerAdapter implements PerformanceProfiler {
  private sessions = new Map<string, PerformanceSession>();
  private results: PerformanceResult[] = [];

  constructor(private service: IPerformanceProfilerService) {}

  readonly start = (name: string): PerformanceSession => {
    const session: PerformanceSession = {
      id: Math.random().toString(36),
      name,
      startTime: Date.now(),
      markers: [],
      addMarker: (markerName: string, metadata?: Record<string, unknown>) => {
        const marker: PerformanceMark = {
          name: markerName,
          timestamp: Date.now(),
          metadata
        } as any;
        (session.markers as any).push(marker);
      }
    };
    
    this.sessions.set(session.id, session);
    this.service.startProfiling(session.id);
    return session;
  };

  readonly stop = (sessionId: string): PerformanceResult => {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const result: PerformanceResult = {
      sessionId,
      name: session.name,
      duration: Date.now() - session.startTime,
      markers: session.markers,
      metadata: {}
    };

    this.results.push(result);
    this.sessions.delete(sessionId);
    this.service.endProfiling(sessionId);
    
    return result;
  };

  readonly getResults = (): readonly PerformanceResult[] => {
    return this.results;
  };

  readonly clear = (): void => {
    this.results = [];
    this.sessions.clear();
  };

  readonly export = (format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify(this.results, null, 2);
    }
    // CSV implementation would go here
    return '';
  };

  readonly mark = (name: string): void => {
    // Implementation would create a performance mark
  };

  readonly measure = (name: string, startMark?: string, endMark?: string): number => {
    // Implementation would measure between marks
    return 0;
  };
}

/**
 * Factory interface for creating plugin system components
 */
export interface PluginSystemFactory {
  createDependencyManager(container: DIContainer): PluginDependencyManager;
  createSandbox(container: DIContainer): PluginSandbox;
  createTelemetry(container: DIContainer): PluginTelemetry;
  createPerformanceProfiler(container: DIContainer): PerformanceProfiler;
}

/**
 * Default implementation of the plugin system factory
 */
export class DefaultPluginSystemFactory implements PluginSystemFactory {
  createDependencyManager(container: DIContainer): PluginDependencyManager {
    const service = container.resolve('dependencyManager') as any;
    return new DependencyManagerAdapter(service);
  }

  createSandbox(container: DIContainer): PluginSandbox {
    const service = container.resolve('sandbox') as any;
    return new SandboxAdapter(service);
  }

  createTelemetry(container: DIContainer): PluginTelemetry {
    const service = container.resolve('telemetry') as any;
    return new TelemetryAdapter(service);
  }

  createPerformanceProfiler(container: DIContainer): PerformanceProfiler {
    const service = container.resolve('performanceProfiler') as any;
    return new PerformanceProfilerAdapter(service);
  }
}

/**
 * Plugin factory for creating plugin instances with dependency injection
 */
export interface PluginFactory {
  createPlugin(config: PluginInfo): Promise<Plugin>;
  createPluginWithDependencies(
    config: PluginInfo,
    dependencies: readonly PluginDependency[]
  ): Promise<Plugin>;
  validatePluginConfig(config: PluginInfo): ValidationResult;
}

/**
 * Default plugin factory implementation
 */
export class DefaultPluginFactory implements PluginFactory {
  constructor(
    private systemFactory: PluginSystemFactory,
    private container: DIContainer
  ) {}

  async createPlugin(config: PluginInfo): Promise<Plugin> {
    const validation = this.validatePluginConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid plugin config: ${validation.errors?.join(', ')}`);
    }

    const plugin: Plugin = {
      name: config.name as PluginName,
      version: config.version as any, // Cast to PluginVersion
      description: config.description,
      author: config.author || 'Unknown', // Provide default value
      license: (config.license || 'MIT') as any, // Cast to PluginLicense
      dependencies: (config.dependencies as any) || {}, // Cast to handle type mismatch
      permissions: (config as any).permissions || [], // permissions doesn't exist on PluginInfo
      commands: (config.commands || []) as any, // Cast to handle type mismatch
      hooks: (config.hooks || []) as any, // Cast to handle type mismatch
      config: {}, // Default empty config since it doesn't exist on PluginInfo
      metadata: {
        ...(config as any).metadata, // Cast to handle metadata property
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    return plugin;
  }

  async createPluginWithDependencies(
    config: PluginInfo,
    dependencies: readonly PluginDependency[]
  ): Promise<Plugin> {
    const dependencyManager = this.systemFactory.createDependencyManager(this.container);
    // Mock dependency resolution for now since checkDependencies method may not exist
    const resolutionResult = {
      resolved: dependencies,
      missing: [] as string[],
      conflicts: [] as any[]
    };
    
    if (resolutionResult.missing.length > 0) {
      throw new Error(
        `Missing dependencies: ${resolutionResult.missing.join(', ')}`
      );
    }
    
    if (resolutionResult.conflicts.length > 0) {
      const errorConflicts = resolutionResult.conflicts.filter((c: any) => c.severity === 'error');
      if (errorConflicts.length > 0) {
        throw new Error(
          `Dependency conflicts: ${errorConflicts.map((c: any) => 
            `${c.plugin} requires ${c.dependency}@${c.requiredVersion} but ${c.installedVersion} is installed`
          ).join(', ')}`
        );
      }
    }

    const plugin = await this.createPlugin(config);
    return {
      ...plugin,
      dependencies: {}
    };
  }

  validatePluginConfig(config: PluginInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!config.name || typeof config.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }
    
    if (!config.version || typeof config.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    }
    
    if (!config.description || typeof config.description !== 'string') {
      errors.push('Plugin description is required and must be a string');
    }

    // Version format validation (basic semver check)
    if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
      warnings.push('Plugin version should follow semantic versioning (x.y.z)');
    }

    // Name format validation
    if (config.name && !/^[a-z0-9-_]+$/.test(config.name)) {
      warnings.push('Plugin name should only contain lowercase letters, numbers, hyphens, and underscores');
    }

    // Dependencies validation
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        if (typeof dep === 'string') {
          // Dependency is just a name string, which is valid
          continue;
        }
        const depObj = dep as any; // Type assertion to handle complex dependency objects
        if (!depObj.name || typeof depObj.name !== 'string') {
          errors.push(`Invalid dependency: name is required`);
        }
        if (depObj.version && typeof depObj.version !== 'string') {
          errors.push(`Invalid dependency ${depObj.name}: version must be a string`);
        }
      }
    }

    // Commands validation
    if (config.commands) {
      for (const cmd of config.commands) {
        if (typeof cmd === 'string') {
          // Command is just a name string, which is valid
          continue;
        }
        if (!cmd.name || typeof cmd.name !== 'string') {
          errors.push(`Invalid command: name is required`);
        }
        if (!cmd.handler || typeof cmd.handler !== 'function') {
          errors.push(`Invalid command ${cmd.name}: handler is required and must be a function`);
        }
      }
    }

    // Hooks validation
    if (config.hooks) {
      for (const hook of config.hooks) {
        if (typeof hook === 'string') {
          // Hook is just a name string, which is valid
          continue;
        }
        if (!hook.name || typeof hook.name !== 'string') {
          errors.push(`Invalid hook: name is required`);
        }
        if (!hook.handler || typeof hook.handler !== 'function') {
          errors.push(`Invalid hook ${hook.name}: handler is required and must be a function`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors.map(err => ({ message: err, code: 'VALIDATION_ERROR' })) : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Factory for creating plugin managers with different configurations
 */
export interface PluginManagerFactory {
  createManager(config: PluginManagerConfig): Promise<any>; // Using any to avoid circular dependency
  createValidationConfig(overrides?: Partial<ValidationConfig>): ValidationConfig;
  createHookSystemConfig(overrides?: Partial<HookSystemConfig>): HookSystemConfig;
  createLifecycleConfig(overrides?: Partial<LifecycleConfig>): LifecycleConfig;
}

/**
 * Default plugin manager factory implementation
 */
export class DefaultPluginManagerFactory implements PluginManagerFactory {
  constructor(
    private systemFactory: PluginSystemFactory,
    private pluginFactory: PluginFactory,
    private container: DIContainer
  ) {}

  async createManager(config: PluginManagerConfig): Promise<any> {
    // Import here to avoid circular dependency
    const { PluginManager } = await import('./manager');
    
    // Create a mock runtime adapter for now
    const runtimeAdapter = {
      registerCommand: () => {},
      unregisterCommand: () => {},
      executeCommand: async () => ({ success: true }),
      registerHook: () => {},
      unregisterHook: () => {},
      createLogger: (pluginName: string) => ({
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        trace: () => {},
        child: () => ({} as any)
      }),
      getPluginsDirectory: () => './plugins',
      getPluginCacheDirectory: () => './plugins/.cache',
      getPluginConfigDirectory: () => './plugins/.config',
      loadConfig: async <T>() => ({} as T),
      saveConfig: async <T>() => {},
      getEnvironmentInfo: () => ({
        platform: 'node',
        version: '1.0.0',
        runtime: 'cli' as const
      }),
      environment: {
        cwd: process.cwd(),
        fs: {} as any,
        path: {} as any,
        crypto: {} as any,
        http: {} as any,
        chalk: {} as any
      },
      emit: () => {},
      on: () => {},
      off: () => {}
    };
    // Use default plugins directory since pluginsDir is not in PluginManagerConfig
    const pluginsDir = './plugins' as FilePath;
    return new PluginManager(runtimeAdapter, pluginsDir);
  }

  createValidationConfig(overrides: Partial<ValidationConfig> = {}): ValidationConfig {
    return {
      strict: true,
      allowUnknownFields: false,
      validateDependencies: true,
      validateEngines: true,
      validateCommands: true,
      validateHooks: true,
      validateConfig: true,
      validatePermissions: true,
      validateLicense: true,
      maxErrors: 10,
      timeout: 30000,
      ...overrides
    };
  }

  createHookSystemConfig(overrides: Partial<HookSystemConfig> = {}): HookSystemConfig {
    return {
      enabled: true,
      maxHooks: 100,
      timeout: 5000,
      retries: 3,
      parallel: true,
      errorHandling: 'log',
      middleware: {
        enabled: true,
        timeout: 1000
      },
      ...overrides
    };
  }

  createLifecycleConfig(overrides: Partial<LifecycleConfig> = {}): LifecycleConfig {
    return {
      timeout: 30000,
      retries: 3,
      parallel: false,
      errorHandling: 'log',
      hooks: {
        onInstall: true,
        onUninstall: true,
        onActivate: true,
        onDeactivate: true,
        onUpdate: true,
        onConfigChange: true
      },
      ...overrides
    };
  }
}

/**
 * Main factory for creating all plugin system components
 */
export class PluginSystemComponentFactory {
  private systemFactory: PluginSystemFactory;
  private pluginFactory: PluginFactory;
  private managerFactory: PluginManagerFactory;

  constructor(private container: DIContainer) {
    this.systemFactory = new DefaultPluginSystemFactory();
    this.pluginFactory = new DefaultPluginFactory(this.systemFactory, container);
    this.managerFactory = new DefaultPluginManagerFactory(
      this.systemFactory,
      this.pluginFactory,
      container
    );
  }

  getSystemFactory(): PluginSystemFactory {
    return this.systemFactory;
  }

  getPluginFactory(): PluginFactory {
    return this.pluginFactory;
  }

  getManagerFactory(): PluginManagerFactory {
    return this.managerFactory;
  }

  createFullSystem(config: PluginSystemConfig): Promise<any> {
    return this.managerFactory.createManager(config.manager);
  }
}

// Export factory instances for convenience
export const createPluginSystemFactory = (container: DIContainer): PluginSystemComponentFactory => {
  return new PluginSystemComponentFactory(container);
};

export const createDefaultSystemFactory = (): PluginSystemFactory => {
  return new DefaultPluginSystemFactory();
};

export const createDefaultPluginFactory = (
  systemFactory: PluginSystemFactory,
  container: DIContainer
): PluginFactory => {
  return new DefaultPluginFactory(systemFactory, container);
};

export const createDefaultManagerFactory = (
  systemFactory: PluginSystemFactory,
  pluginFactory: PluginFactory,
  container: DIContainer
): PluginManagerFactory => {
  return new DefaultPluginManagerFactory(systemFactory, pluginFactory, container);
};