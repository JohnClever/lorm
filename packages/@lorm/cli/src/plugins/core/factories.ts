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

import {
  PluginDependencyManager,
  PluginSandbox,
  PluginTelemetry,
  PerformanceProfiler,
  PluginDependency,
  DependencyResolutionResult,
  DependencyCheckResult,
  DependencyGraph,
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
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private installedDependencies: Map<string, string> = new Map();
  private conflicts: DependencyConflict[] = [];

  constructor(private service: IDependencyManagerService) {}

  async resolve(dependencies: readonly PluginDependency[]): Promise<DependencyResolutionResult> {
    const resolved: PluginDependency[] = [];
    const missing: PluginDependency[] = [];
    const conflicts: DependencyConflict[] = [];
    const installOrder: string[] = [];

    // Build dependency graph and detect cycles
    const graph = this.buildDependencyGraph(dependencies);
    const cycles = this.detectCycles(graph);
    
    if (cycles.length > 0) {
       cycles.forEach(cycle => {
         conflicts.push({
           plugin: cycle[0] || 'unknown',
           dependency: cycle[cycle.length - 1] || 'unknown',
           requiredVersion: 'unknown',
           installedVersion: 'unknown',
           severity: 'error' as const
         });
       });
     }

    // Resolve dependencies in topological order
    const sortedDeps = this.topologicalSort(dependencies);
    
    for (const dep of sortedDeps) {
      const checkResult = await this.check(dep);
      
      if (checkResult.satisfied) {
        resolved.push(dep);
        installOrder.push(dep.name);
        this.installedDependencies.set(dep.name, dep.version || 'latest');
      } else {
        missing.push(dep);
      }

      // Check for version conflicts
       const existingVersion = this.installedDependencies.get(dep.name);
       if (existingVersion && existingVersion !== dep.version) {
         conflicts.push({
           plugin: dep.name,
           dependency: dep.name,
           requiredVersion: dep.version || 'latest',
           installedVersion: existingVersion,
           severity: 'error' as const
         });
       }
    }

    this.conflicts = conflicts;
    
    return {
      resolved,
      missing,
      conflicts,
      installOrder
    };
  }

  async check(dependency: PluginDependency): Promise<DependencyCheckResult> {
    try {
      const isValid = await this.service.validateDependencies({ 
        [dependency.name]: dependency.version || '*' 
      });
      
      const installedVersion = this.installedDependencies.get(dependency.name);
      
      return {
        satisfied: isValid && this.isVersionCompatible(dependency.version, installedVersion),
        version: installedVersion || dependency.version,
        reason: !isValid ? 'Dependency validation failed' : 
                !this.isVersionCompatible(dependency.version, installedVersion) ? 'Version incompatible' : undefined
      };
    } catch (error) {
      return {
        satisfied: false,
        reason: `Check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async install(dependency: PluginDependency): Promise<void> {
    try {
      // Resolve transitive dependencies first
      const transitiveDeps = await this.getTransitiveDependencies(dependency);
      
      // Install in dependency order
      for (const dep of transitiveDeps) {
        if (!this.installedDependencies.has(dep.name)) {
          await this.installSingleDependency(dep);
          this.installedDependencies.set(dep.name, dep.version || 'latest');
        }
      }
      
      // Install the main dependency
      await this.installSingleDependency(dependency);
      this.installedDependencies.set(dependency.name, dependency.version || 'latest');
      
      // Update dependency graph
      this.updateDependencyGraph(dependency, transitiveDeps);
    } catch (error) {
      throw new Error(`Failed to install dependency ${dependency.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uninstall(dependency: PluginDependency): Promise<void> {
    try {
      // Check if other dependencies rely on this one
      const dependents = this.getDependents(dependency.name);
      
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall ${dependency.name}: required by ${dependents.join(', ')}`);
      }
      
      await this.uninstallSingleDependency(dependency);
      this.installedDependencies.delete(dependency.name);
      this.removeDependencyFromGraph(dependency.name);
    } catch (error) {
      throw new Error(`Failed to uninstall dependency ${dependency.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getDependencyGraph(): DependencyGraph {
    const nodes = Array.from(this.dependencyGraph.keys()).map(name => ({
       name,
       version: this.installedDependencies.get(name) || 'unknown',
       type: 'plugin' as const
     }));
    
    const edges = [];
     for (const [from, deps] of this.dependencyGraph.entries()) {
       for (const to of deps) {
         edges.push({ from, to, type: 'requires' as const });
       }
     }
    
    const cycles = this.detectCycles(this.dependencyGraph);
    
    return { nodes, edges, cycles };
  }

  async validateCompatibility(plugin: Plugin): Promise<CompatibilityResult> {
     const issues: CompatibilityIssue[] = [];
     const recommendations: string[] = [];
     
     try {
       // Check plugin dependencies
       if (plugin.dependencies) {
         for (const [name, version] of Object.entries(plugin.dependencies)) {
           const dependency: PluginDependency = { name, version, optional: false };
           const checkResult = await this.check(dependency);
           
           if (!checkResult.satisfied) {
             issues.push({
               type: 'dependency',
               severity: 'error',
               message: `Dependency ${name}@${version} is not satisfied: ${checkResult.reason || 'Unknown reason'}`,
               component: name
             });
             recommendations.push(`Install ${name}@${version}`);
           }
         }
       }
       
       // Check peer dependencies
       if (plugin.peerDependencies) {
         for (const [name, version] of Object.entries(plugin.peerDependencies)) {
           const dependency: PluginDependency = { name, version, optional: true };
           const checkResult = await this.check(dependency);
           
           if (!checkResult.satisfied) {
             issues.push({
               type: 'dependency',
               severity: 'warning',
               message: `Peer dependency ${name}@${version} is not satisfied`,
               component: name
             });
             recommendations.push(`Consider installing peer dependency ${name}@${version}`);
           }
         }
       }
       
       // Check engine compatibility
       if (plugin.engines) {
         const nodeVersion = process.version;
         if (plugin.engines.node && !this.isVersionCompatible(plugin.engines.node, nodeVersion)) {
           issues.push({
             type: 'platform',
             severity: 'error',
             message: `Node.js version ${nodeVersion} is not compatible with required ${plugin.engines.node}`,
             component: 'node'
           });
         }
       }
       
       return {
         compatible: issues.length === 0,
         issues,
         recommendations
       };
     } catch (error) {
       return {
         compatible: false,
         issues: [{
           type: 'api',
           severity: 'error',
           message: `Compatibility check failed: ${error instanceof Error ? error.message : String(error)}`,
           component: 'compatibility-checker'
         }],
         recommendations: ['Review plugin requirements and dependencies']
       };
     }
   }

  getConflicts(): readonly DependencyConflict[] {
    return this.conflicts;
  }

  // Private helper methods
  private buildDependencyGraph(dependencies: readonly PluginDependency[]): Map<string, Set<string>> {
     const graph = new Map<string, Set<string>>();
     
     for (const dep of dependencies) {
       if (!graph.has(dep.name)) {
         graph.set(dep.name, new Set());
       }
       
       // Note: PluginDependency doesn't have a dependencies property
       // This would need to be resolved from actual package metadata
     }
     
     return graph;
   }

  private detectCycles(graph: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node));
        return;
      }
      
      if (visited.has(node)) return;
      
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path, node]);
      }
      
      recursionStack.delete(node);
    };
    
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    
    return cycles;
  }

  private topologicalSort(dependencies: readonly PluginDependency[]): PluginDependency[] {
    const graph = this.buildDependencyGraph(dependencies);
    const inDegree = new Map<string, number>();
    const result: PluginDependency[] = [];
    const queue: string[] = [];
    
    // Initialize in-degree count
    for (const dep of dependencies) {
      inDegree.set(dep.name, 0);
    }
    
    for (const [node, neighbors] of graph.entries()) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }
    
    // Find nodes with no incoming edges
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }
    
    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!;
      const dep = dependencies.find(d => d.name === current);
      if (dep) {
        result.push(dep);
      }
      
      const neighbors = graph.get(current) || new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }

  private isVersionCompatible(required?: string, installed?: string): boolean {
    if (!required || !installed) return true;
    
    // Simplified version comparison - in practice, use semver library
    const cleanRequired = required.replace(/[^\d\.]/g, '');
    const cleanInstalled = installed.replace(/[^\d\.]/g, '');
    
    return cleanRequired === cleanInstalled || cleanInstalled >= cleanRequired;
  }

  private async getTransitiveDependencies(dependency: PluginDependency): Promise<PluginDependency[]> {
     // Simplified - would need to parse package.json or use package manager APIs
     // PluginDependency doesn't have a dependencies property, so return empty array
     return [];
   }

  private async installSingleDependency(dependency: PluginDependency): Promise<void> {
    // Delegate to package manager or installer service
    console.log(`Installing dependency: ${dependency.name}@${dependency.version || 'latest'}`);
  }

  private async uninstallSingleDependency(dependency: PluginDependency): Promise<void> {
    // Delegate to package manager or installer service
    console.log(`Uninstalling dependency: ${dependency.name}`);
  }

  private updateDependencyGraph(dependency: PluginDependency, transitiveDeps: PluginDependency[]): void {
    if (!this.dependencyGraph.has(dependency.name)) {
      this.dependencyGraph.set(dependency.name, new Set());
    }
    
    for (const transitive of transitiveDeps) {
      this.dependencyGraph.get(dependency.name)?.add(transitive.name);
    }
  }

  private removeDependencyFromGraph(name: string): void {
    this.dependencyGraph.delete(name);
    
    // Remove from other dependencies
    for (const deps of this.dependencyGraph.values()) {
      deps.delete(name);
    }
  }

  private getDependents(name: string): string[] {
    const dependents: string[] = [];
    
    for (const [dependent, deps] of this.dependencyGraph.entries()) {
      if (deps.has(name)) {
        dependents.push(dependent);
      }
    }
    
    return dependents;
  }
}

class SandboxAdapter implements PluginSandbox {
  constructor(private service: ISandboxService) {}

  async execute<T = unknown>(code: string, context?: Record<string, unknown>): Promise<T> {
    // Implementation would delegate to sandbox service
    throw new Error('Not implemented');
  }

  createContext(permissions: readonly string[]): SandboxContext {
    return {
      id: `ctx-${Date.now()}`,
      permissions,
      globals: {},
      limits: {
        maxMemory: 100 * 1024 * 1024, // 100MB
        maxCpu: 80,
        maxExecutionTime: 30000,
        maxApiCalls: 1000,
        allowedModules: ['fs', 'path'],
        blockedModules: ['child_process', 'cluster']
      },
      createdAt: new Date()
    };
  }

  async destroyContext(contextId: string): Promise<void> {
    // Implementation would destroy context
  }

  getResourceUsage(): SandboxResourceUsage {
    return {
      memory: 0,
      cpu: 0,
      executionTime: 0,
      apiCalls: 0
    };
  }

  setLimits(limits: SandboxLimits): void {
    // Implementation would set limits
  }

  getLimits(): SandboxLimits {
    return {
      maxMemory: 100 * 1024 * 1024,
      maxCpu: 80,
      maxExecutionTime: 30000,
      maxApiCalls: 1000,
      allowedModules: ['fs', 'path'],
      blockedModules: ['child_process', 'cluster']
    };
  }

  isSecure(): boolean {
    return true;
  }
}

class PerformanceProfilerAdapter implements PerformanceProfiler {
  constructor(private service: IPerformanceProfilerService) {}

  start(name: string): PerformanceSession {
    const sessionId = this.service.startProfiling(name);
    return {
      id: sessionId,
      name,
      startTime: Date.now(),
      markers: [],
      addMarker: (markerName: string, metadata?: Record<string, unknown>) => {
        // Implementation would add marker to session
      }
    };
  }

  stop(sessionId: string): PerformanceResult {
    this.service.endProfiling(sessionId);
    return {
      sessionId,
      name: '',
      duration: 0,
      markers: [],
      metadata: {}
    };
  }

  getResults(): readonly PerformanceResult[] {
    return [];
  }

  clear(): void {
    // Implementation would clear results
  }

  export(format: 'json' | 'csv'): string {
    return format === 'json' ? '[]' : '';
  }

  mark(name: string): void {
    // Implementation would create performance mark
  }

  measure(name: string, startMark?: string, endMark?: string): number {
    return 0;
  }
}

class TelemetryAdapter implements PluginTelemetry {
  constructor(private service: ITelemetryService) {}

  async track(event: string, properties?: Record<string, unknown>): Promise<void> {
    return this.service.track(event, properties);
  }

  async trackError(error: Error, context?: Record<string, unknown>): Promise<void> {
    return this.service.trackError(error, context);
  }

  async trackPerformance(metric: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.service.trackPerformance(metric, value, tags);
  }

  createSpan(name: string): TelemetrySpan {
    return this.service.createSpan(name);
  }

  async flush(): Promise<void> {
    return this.service.flush();
  }

  setUser(userId: string, properties?: Record<string, unknown>): void {
    return this.service.setUser(userId, properties);
  }

  getSessionId(): string {
    return this.service.getSessionId();
  }

  isEnabled(): boolean {
    return this.service.isEnabled();
  }

  configure(config: TelemetryConfig): void {
    return this.service.configure(config);
  }
}

// Abstract factory interfaces
export interface IPluginContextFactory {
  createContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<PluginContext<TConfig>>;
  createUtils<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<unknown>;
  createPerformanceUtils<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<unknown>;
}

export interface IPluginLifecycleManagerFactory {
  create(config: LifecycleConfig): IPluginLifecycleManager;
}

export interface IHookSystemManagerFactory {
  create(config: HookSystemConfig, container: DIContainer): IHookSystemManager;
}

export interface IPluginValidationServiceFactory {
  create(config: ValidationConfig): IPluginValidationService;
}

export interface IPluginCommandManagerFactory {
  create(): IPluginCommandManager;
}

export interface IPluginInstallerFactory {
  create(config: PluginManagerConfig): IPluginInstaller;
}

export interface IPluginRegistryManagerFactory {
  create(config: PluginManagerConfig): IPluginRegistryManager;
}

// Service interfaces (to be implemented by actual services)
export interface IPluginLifecycleManager {
  transition(pluginName: PluginName, newState: PluginState): Promise<void>;
  getState(pluginName: PluginName): PluginState | undefined;
  getHistory(pluginName: PluginName): Array<{ state: PluginState; timestamp: number }>;
  onStateChange(pluginName: PluginName, callback: (state: PluginState) => void): () => void;
}

export interface IHookSystemManager {
  registerHooks(pluginName: PluginName, hooks: PluginHook[]): Promise<void>;
  unregisterHooks(pluginName: PluginName): Promise<void>;
  executeHook<T = unknown>(hookName: string, context: unknown, ...args: unknown[]): Promise<T>;
  getPluginHooks(pluginName: PluginName): PluginHook[];
}

export interface IPluginValidationService {
  validatePlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<ValidationResult>;
  validateConfig<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(config: TConfig, schema?: unknown): Promise<ValidationResult>;
  validateSecurity<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<ValidationResult>;
}

export interface IPluginCommandManager {
  registerCommand(pluginName: PluginName, command: PluginCommand): void;
  unregisterCommand(pluginName: PluginName, commandName: string): void;
  unregisterAllCommands(pluginName: PluginName): void;
  getCommand(commandName: string): PluginCommand | undefined;
  getAllCommands(): PluginCommand[];
  getPluginCommands(pluginName: PluginName): PluginCommand[];
}

export interface IPluginInstaller {
  install(source: string, options?: unknown): Promise<PluginInfo>;
  uninstall(pluginName: PluginName): Promise<void>;
  update(pluginName: PluginName): Promise<PluginInfo>;
  list(): Promise<PluginInfo[]>;
}

export interface IPluginRegistryManager {
  search(query: string): Promise<PluginInfo[]>;
  getPluginInfo(pluginName: PluginName): Promise<PluginInfo | undefined>;
  updateLocalRegistry(): Promise<void>;
  getInstalledPlugins(): Promise<PluginInfo[]>;
}

// Factory implementations
export class PluginContextFactoryImpl implements IPluginContextFactory {
  constructor(
    private container: DIContainer,
    private config: PluginSystemConfig
  ) {}

  async createContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<PluginContext<TConfig>> {
    // Import the actual PluginContextFactory
    const { PluginContextFactory } = await import('./context-factory');
    
    // Get dependencies from container and use adapter classes
    const lifecycleManagers = new Map();
    const dependencyManagerService = this.container.resolve('dependencyManager') as IDependencyManagerService;
    const sandboxService = this.container.resolve('sandbox') as ISandboxService;
    const telemetryService = this.container.resolve('telemetry') as ITelemetryService;
    const performanceProfilerService = this.container.resolve('performanceProfiler') as IPerformanceProfilerService;
    
    const dependencyManager = new DependencyManagerAdapter(dependencyManagerService);
    const sandbox = new SandboxAdapter(sandboxService);
    const telemetry = new TelemetryAdapter(telemetryService);
    const performanceProfiler = new PerformanceProfilerAdapter(performanceProfilerService);
    
    const factory = new PluginContextFactory(
      lifecycleManagers,
      dependencyManager,
      sandbox,
      telemetry,
      performanceProfiler
    );
    return factory.createContext(plugin);
  }

  async createUtils<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<unknown> {
    const { PluginContextFactory } = await import('./context-factory');
    
    // Get dependencies from container and use adapter classes
    const lifecycleManagers = new Map();
    const dependencyManagerService = this.container.resolve('dependencyManager') as IDependencyManagerService;
    const sandboxService = this.container.resolve('sandbox') as ISandboxService;
    const telemetryService = this.container.resolve('telemetry') as ITelemetryService;
    const performanceProfilerService = this.container.resolve('performanceProfiler') as IPerformanceProfilerService;
    
    const dependencyManager = new DependencyManagerAdapter(dependencyManagerService);
    const sandbox = new SandboxAdapter(sandboxService);
    const telemetry = new TelemetryAdapter(telemetryService);
    const performanceProfiler = new PerformanceProfilerAdapter(performanceProfilerService);
    
    const factory = new PluginContextFactory(
      lifecycleManagers,
      dependencyManager,
      sandbox,
      telemetry,
      performanceProfiler
    );
    return (factory as any).createUtils(plugin);
  }

  async createPerformanceUtils<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): Promise<unknown> {
    const { PluginContextFactory } = await import('./context-factory');
    
    // Get dependencies from container and use adapter classes
    const lifecycleManagers = new Map();
    const dependencyManagerService = this.container.resolve('dependencyManager') as IDependencyManagerService;
    const sandboxService = this.container.resolve('sandbox') as ISandboxService;
    const telemetryService = this.container.resolve('telemetry') as ITelemetryService;
    const performanceProfilerService = this.container.resolve('performanceProfiler') as IPerformanceProfilerService;
    
    const dependencyManager = new DependencyManagerAdapter(dependencyManagerService);
    const sandbox = new SandboxAdapter(sandboxService);
    const telemetry = new TelemetryAdapter(telemetryService);
    const performanceProfiler = new PerformanceProfilerAdapter(performanceProfilerService);
    
    const factory = new PluginContextFactory(
      lifecycleManagers,
      dependencyManager,
      sandbox,
      telemetry,
      performanceProfiler
    );
    return (factory as any).createPerformanceUtils(plugin);
  }
}

export class PluginLifecycleManagerFactoryImpl implements IPluginLifecycleManagerFactory {
  create(config: LifecycleConfig): IPluginLifecycleManager {
    const { PluginLifecycleManager } = require('./lifecycle-manager');
    return new PluginLifecycleManager();
  }
}

export class HookSystemManagerFactoryImpl implements IHookSystemManagerFactory {
  create(config: HookSystemConfig, container: DIContainer): IHookSystemManager {
    const telemetry = container.resolve('telemetry');
    const hookEventEmitter = container.resolve('hookEventEmitter');
    const typedHookRegistry = container.resolve('typedHookRegistry');
    const hookFactory = container.resolve('hookFactory');

    const { HookSystemManager } = require('./hook-system-manager');
    return new HookSystemManager(
      telemetry,
      hookEventEmitter,
      typedHookRegistry,
      hookFactory
    );
  }
}

export class PluginValidationServiceFactoryImpl implements IPluginValidationServiceFactory {
  create(config: ValidationConfig): IPluginValidationService {
    const { PluginValidationService } = require('./validation-service');
    return new PluginValidationService();
  }
}

export class PluginCommandManagerFactoryImpl implements IPluginCommandManagerFactory {
  create(): IPluginCommandManager {
    const { PluginCommandManager } = require('./command-manager');
    return new PluginCommandManager();
  }
}

export class PluginInstallerFactoryImpl implements IPluginInstallerFactory {
  create(config: PluginManagerConfig): IPluginInstaller {
    const { PluginInstaller } = require('../utils/installer');
    return new PluginInstaller();
  }
}

export class PluginRegistryManagerFactoryImpl implements IPluginRegistryManagerFactory {
  create(config: PluginManagerConfig): IPluginRegistryManager {
    const { PluginRegistryManager } = require('../utils/registry');
    return new PluginRegistryManager();
  }
}

// Factory registry
export class PluginFactoryRegistry {
  private factories = new Map<string, unknown>();

  constructor(private container: DIContainer, private config: PluginSystemConfig) {
    this.registerDefaultFactories();
  }

  private registerDefaultFactories(): void {
    this.register('contextFactory', new PluginContextFactoryImpl(this.container, this.config));
    this.register('lifecycleManagerFactory', new PluginLifecycleManagerFactoryImpl());
    this.register('hookSystemManagerFactory', new HookSystemManagerFactoryImpl());
    this.register('validationServiceFactory', new PluginValidationServiceFactoryImpl());
    this.register('commandManagerFactory', new PluginCommandManagerFactoryImpl());
    this.register('installerFactory', new PluginInstallerFactoryImpl());
    this.register('registryManagerFactory', new PluginRegistryManagerFactoryImpl());
  }

  register<T>(name: string, factory: T): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): T {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Factory '${name}' not found`);
    }
    // Type assertion is safe here since factories are registered with correct types
    return factory as T;
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }

  clear(): void {
    this.factories.clear();
    this.registerDefaultFactories();
  }
}

// Composite factory for creating complete plugin system
export class PluginSystemFactory {
  constructor(
    private container: DIContainer,
    private config: PluginSystemConfig,
    private factoryRegistry: PluginFactoryRegistry
  ) {}

  createContextFactory(): IPluginContextFactory {
    return this.factoryRegistry.get<IPluginContextFactory>('contextFactory');
  }

  createLifecycleManager(): IPluginLifecycleManager {
    const factory = this.factoryRegistry.get<IPluginLifecycleManagerFactory>('lifecycleManagerFactory');
    return factory.create(this.config.lifecycle);
  }

  createHookSystemManager(): IHookSystemManager {
    const factory = this.factoryRegistry.get<IHookSystemManagerFactory>('hookSystemManagerFactory');
    return factory.create(this.config.hookSystem, this.container);
  }

  createValidationService(): IPluginValidationService {
    const factory = this.factoryRegistry.get<IPluginValidationServiceFactory>('validationServiceFactory');
    return factory.create(this.config.validation);
  }

  createCommandManager(): IPluginCommandManager {
    const factory = this.factoryRegistry.get<IPluginCommandManagerFactory>('commandManagerFactory');
    return factory.create();
  }

  createInstaller(): IPluginInstaller {
    const factory = this.factoryRegistry.get<IPluginInstallerFactory>('installerFactory');
    return factory.create(this.config.manager);
  }

  createRegistryManager(): IPluginRegistryManager {
    const factory = this.factoryRegistry.get<IPluginRegistryManagerFactory>('registryManagerFactory');
    return factory.create(this.config.manager);
  }

  // Create all components at once
  createAllComponents(): {
    contextFactory: IPluginContextFactory;
    lifecycleManager: IPluginLifecycleManager;
    hookSystemManager: IHookSystemManager;
    validationService: IPluginValidationService;
    commandManager: IPluginCommandManager;
    installer: IPluginInstaller;
    registryManager: IPluginRegistryManager;
  } {
    return {
      contextFactory: this.createContextFactory(),
      lifecycleManager: this.createLifecycleManager(),
      hookSystemManager: this.createHookSystemManager(),
      validationService: this.createValidationService(),
      commandManager: this.createCommandManager(),
      installer: this.createInstaller(),
      registryManager: this.createRegistryManager()
    };
  }
}

// Builder pattern for creating plugin system
export class PluginSystemBuilder {
  private container?: DIContainer;
  private config?: PluginSystemConfig;
  private factoryRegistry?: PluginFactoryRegistry;

  withContainer(container: DIContainer): this {
    this.container = container;
    return this;
  }

  withConfig(config: PluginSystemConfig): this {
    this.config = config;
    return this;
  }

  withFactoryRegistry(registry: PluginFactoryRegistry): this {
    this.factoryRegistry = registry;
    return this;
  }

  build(): PluginSystemFactory {
    if (!this.container) {
      throw new Error('DIContainer is required');
    }
    if (!this.config) {
      throw new Error('PluginSystemConfig is required');
    }

    const factoryRegistry = this.factoryRegistry || new PluginFactoryRegistry(this.container, this.config);
    return new PluginSystemFactory(this.container, this.config, factoryRegistry);
  }
}

// Convenience function
export function createPluginSystemFactory(
  container: DIContainer,
  config: PluginSystemConfig
): PluginSystemFactory {
  return new PluginSystemBuilder()
    .withContainer(container)
    .withConfig(config)
    .build();
}