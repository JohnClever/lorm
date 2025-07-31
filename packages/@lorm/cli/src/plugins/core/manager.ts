/**
 * Core plugin management functionality with service-based architecture.
 * 
 * This class provides the main interface for managing plugins in the LORM CLI system,
 * including installation, uninstallation, enabling/disabling, and lifecycle management.
 * It uses dependency injection and a service-oriented architecture for better
 * separation of concerns and testability.
 * 
 * @example
 * ```typescript
 * const manager = createPluginManager();
 * await manager.initialize();
 * await manager.install('my-plugin');
 * await manager.enable('my-plugin');
 * ```
 */

import type {
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginCommand,
  PluginHook,
  PluginPermission,
  PluginDependency,
  PluginInstallOptions,
  PluginSearchOptions,
  PluginSearchResult,
  ValidationResult,
  PluginSystemConfig,
  PluginLifecycle,
  PluginUpdateResult,
  PluginListResult,
  PluginEnableResult,
  PluginDisableResult,
  PluginOperationResult,
  PluginRegistry,
  PluginSecurity,
  PerformanceMetrics
} from '../types/index.js';
import type { SimplePlugin } from '../types/simple.js';
import { convertSimplePlugin } from '../types/simple.js';
import { PerformanceManager, OptimizedPluginLoader, type PerformanceConfig } from './performance.js';

import {
  PluginInfo,
  PluginName,
  FilePath,
  PluginInstallResult,
  PluginUninstallResult,
  CommandName,
  HookName,
  IPluginManager,
  StrictRecord,
  PluginContext,
  PluginLifecycleState,
  PluginError,
  PluginErrorCode,
  DependencyResolutionResult
} from '../types/index.js';

import { PluginContextFactory } from './context-factory.js';
import { HookSystemManager } from './hook-system-manager.js';
import { PluginLifecycleManager } from './lifecycle-manager.js';
import { PluginValidationService } from './validation-service.js';
import { PluginCommandManager } from './command-manager.js';
import { PluginInstaller } from '../utils/installer.js';
import { PluginRegistryManager } from '../utils/registry.js';
import { getPluginsDirectory } from '../utils/filesystem.js';
import { isPlugin } from '../utils/validation.js';
import { DIContainer } from './di-container.js';
import { PluginConfigManager, createPluginConfigManager } from './config-manager.js';
import { PluginSystemFactory, PluginFactoryRegistry } from './factories.js';

export class PluginManager implements IPluginManager {
  private readonly container: DIContainer;
  private readonly configManager: PluginConfigManager;
  private readonly systemFactory: PluginSystemFactory;
  private readonly contextFactory: PluginContextFactory;
  private readonly hookSystemManager: HookSystemManager;
  private readonly lifecycleManager: PluginLifecycleManager;
  private readonly validationService: PluginValidationService;
  private readonly commandManager: PluginCommandManager;
  private readonly installer: PluginInstaller;
  private readonly registryManager: PluginRegistryManager;
  private readonly dependencyManager: any;
  private readonly performanceManager: PerformanceManager;
  private readonly optimizedLoader: OptimizedPluginLoader;
  private readonly pluginCache = new Map<string, Plugin>();
  private readonly simplePluginCache = new Map<string, Plugin>();
  private readonly enabledPlugins = new Set<string>();
  private initialized = false;

  /**
   * Creates a new PluginManager instance.
   * 
   * @param container - Optional dependency injection container. If not provided, a new container with default services will be created.
   * @param configManager - Optional configuration manager. If not provided, a default configuration manager will be created.
   */
  constructor(container?: DIContainer, configManager?: PluginConfigManager) {
    this.container = container || new DIContainer();
    if (!container) {
      this.container.registerDefaults();
    }
    
    this.configManager = configManager || createPluginConfigManager();
    
    const defaultConfig = this.configManager.getConfig();
    const factoryRegistry = new PluginFactoryRegistry(this.container, defaultConfig);
    this.systemFactory = new PluginSystemFactory(this.container, defaultConfig, factoryRegistry);
    
    const telemetry = this.container.resolve('telemetry');
    
    this.lifecycleManager = new PluginLifecycleManager(telemetry);
    this.validationService = new PluginValidationService(telemetry);
    this.commandManager = new PluginCommandManager(telemetry);
    
    const hookEventEmitter = this.container.resolve('hookEventEmitter');
    const typedHookRegistry = this.container.resolve('typedHookRegistry');
    const hookFactory = this.container.resolve('hookFactory');
    
    this.hookSystemManager = new HookSystemManager(
      hookEventEmitter as any,
      typedHookRegistry as any,
      hookFactory as any
    );
    
    const lifecycleManagers = new Map();
    const dependencyManager = this.container.resolve('dependencyManager');
    const sandbox = this.container.resolve('sandbox');
    const performanceProfiler = this.container.resolve('performanceProfiler');
    
    this.contextFactory = new PluginContextFactory(
      lifecycleManagers,
      dependencyManager as any,
      sandbox as any,
      telemetry,
      performanceProfiler as any
    );
    
    this.installer = new PluginInstaller();
    this.registryManager = new PluginRegistryManager();
    this.dependencyManager = dependencyManager;
    
    // Initialize performance optimizations
    this.performanceManager = new PerformanceManager({
      lazyLoading: defaultConfig.performance?.optimization?.caching ?? true,
      cacheSize: 50,
      memoryThreshold: defaultConfig.performance?.limits?.maxMemoryUsage ?? 100,
      preloadCritical: false,
      criticalPlugins: [],
      monitoring: defaultConfig.performance?.monitoring?.enabled ?? true,
      cleanupInterval: 300000
    });
    
    this.optimizedLoader = new OptimizedPluginLoader({
      lazyLoading: defaultConfig.performance?.optimization?.caching ?? true,
      cacheSize: 50,
      memoryThreshold: defaultConfig.performance?.limits?.maxMemoryUsage ?? 100,
      preloadCritical: false,
      criticalPlugins: [],
      monitoring: defaultConfig.performance?.monitoring?.enabled ?? true,
      cleanupInterval: 300000
    });
  }

  /**
   * Initializes the plugin manager and all its services.
   * 
   * This method must be called before using any other plugin manager functionality.
   * It initializes the registry manager and other core services.
   * 
   * @throws {PluginError} If initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.registryManager.initialize();

      this.initialized = true;
    } catch (error) {
      const pluginError: PluginError = {
        name: 'PluginManagerInitializationError',
        message: `Failed to initialize plugin manager: ${error instanceof Error ? error.message : String(error)}`,
        code: PluginErrorCode.PLUGIN_MANAGER_INIT_FAILED,
        details: {
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      };
      throw pluginError;
    }
  }

  /**
   * Installs a plugin by name or file path.
   * 
   * This method resolves dependencies, checks for conflicts, and installs
   * the plugin and its dependencies in the correct order.
   * 
   * @param nameOrPath - The plugin name or file path to install
   * @param options - Optional installation configuration
   * @returns Promise resolving to installation result
   */
  async install(nameOrPath: PluginName | FilePath, options: PluginInstallOptions = {}): Promise<PluginInstallResult> {
    this.ensureInitialized();
    
    try {
      const dependencies = await this.resolveDependencies(nameOrPath as string);
      
      const conflicts = await this.dependencyManager.getConflicts();
      if (conflicts.length > 0) {
        throw new Error(`Dependency conflicts detected: ${conflicts.map((c: any) => c.description).join(', ')}`);
      }
      
      for (const dep of dependencies.installOrder) {
        if (!this.isInstalled(dep as PluginName)) {
          await this.installSinglePlugin(dep, options);
        }
      }
      
      const result = await this.installSinglePlugin(nameOrPath as string, options);
      
      return result;
    } catch (error) {
      const pluginError: PluginError = {
        name: 'PluginInstallationError',
        message: `Failed to install plugin: ${error instanceof Error ? error.message : String(error)}`,
        code: PluginErrorCode.INSTALL_FAILED,
        details: {
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      };
      return {
        success: false,
        error: pluginError
      };
    }
  }

  /**
   * Installs a single plugin without dependency resolution.
   * 
   * @param nameOrPath - The plugin name or file path
   * @param options - Installation options
   * @returns Promise resolving to installation result
   * @private
   */
  private async installSinglePlugin(nameOrPath: string, options: PluginInstallOptions = {}): Promise<PluginInstallResult> {
    const result = await this.installer.installFromPath(nameOrPath, options);
    
    if (result.plugin) {
      this.pluginCache.set(result.plugin.name, result.plugin as unknown as Plugin);
      
      const plugin = result.plugin as unknown as Plugin;
      const dependencies = Array.isArray(plugin.dependencies) ? plugin.dependencies : [];
      
      this.lifecycleManager.initializePlugin(
        result.plugin.name as PluginName, 
        PluginLifecycleState.UNLOADED,
        dependencies,
        3
      );
      
      const validationResult = await this.validationService.validatePluginWithRecovery(plugin);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map(e => e.message).join(', ') || 'Unknown validation error';
        throw new Error(`Plugin validation failed: ${errorMessages}`);
      }
      
      const context = this.contextFactory.createContext(plugin);
      await this.lifecycleManager.transition(result.plugin.name as string, PluginLifecycleState.LOADED, context);
    }
    
    return result;
  }

  private async resolveDependencies(pluginName: string): Promise<DependencyResolutionResult> {
    // Get plugin info to extract dependencies
    const pluginInfo = await this.getPluginInfo(pluginName);
    const dependencies = pluginInfo?.dependencies || [];
    
    // Resolve dependencies using dependency manager
    return await this.dependencyManager.resolve(dependencies);
  }

  private async getPluginInfo(nameOrPath: string): Promise<any> {
    // This would typically read plugin manifest or query registry
    // For now, return empty dependencies
    return { dependencies: [] };
  }

  /**
   * Uninstalls a plugin by name.
   * 
   * This method checks for dependents, transitions the plugin through proper
   * lifecycle states, and cleans up all associated resources.
   * 
   * @param name - The name of the plugin to uninstall
   * @returns Promise resolving to uninstallation result
   */
  async uninstall(name: PluginName): Promise<PluginUninstallResult> {
    this.ensureInitialized();
    
    try {
      const plugin = this.getPlugin(name);
      if (!plugin) {
        return {
          success: false,
          error: {
            name: 'PluginNotFoundError',
            message: `Plugin '${name}' not found`,
            code: PluginErrorCode.PLUGIN_NOT_FOUND
          }
        };
      }
      
      const dependents = this.lifecycleManager.getDependents(name as string);
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall plugin '${name}' because it has dependents: ${dependents.join(', ')}`);
      }
      
      const context = this.contextFactory.createContext(plugin);
      await this.lifecycleManager.transition(name as string, PluginLifecycleState.UNLOADING, context);
      
      await this.installer.uninstall(name as string);
      
      this.pluginCache.delete(name as string);
      this.enabledPlugins.delete(name as string);
      this.lifecycleManager.cleanup(name as string);
      
      return {
        success: true,
        plugin: name as string,
        message: `Plugin '${name}' uninstalled successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'PluginUninstallationError',
          message: `Failed to uninstall plugin: ${error instanceof Error ? error.message : String(error)}`,
          code: PluginErrorCode.UNINSTALL_FAILED,
          details: {
            originalError: error instanceof Error ? error : new Error(String(error))
          }
        }
      };
    }
  }

  async update(name: PluginName): Promise<PluginUpdateResult> {
    this.ensureInitialized();
    
    try {
      const result = await this.installer.update(name as string);
      return {
        success: true,
        plugin: result.plugin,
        message: result.message,
        previousVersion: result.previousVersion,
        newVersion: result.newVersion
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'PluginUpdateError',
          message: `Failed to update plugin: ${error instanceof Error ? error.message : String(error)}`,
          code: PluginErrorCode.UPDATE_FAILED,
          details: {
            originalError: error instanceof Error ? error : new Error(String(error))
          }
        }
      };
    }
  }

  /**
   * Enables a plugin by name.
   * 
   * This method validates prerequisites, transitions the plugin through proper
   * lifecycle states, and marks it as enabled for use.
   * 
   * @param name - The name of the plugin to enable
   * @throws {Error} If the plugin is not found or dependencies are not satisfied
   */
  async enable(name: PluginName): Promise<void> {
    this.ensureInitialized();
    
    const plugin = this.getPlugin(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }
    
    if (!this.lifecycleManager.areDependenciesSatisfied(name as string)) {
      const dependencies = this.lifecycleManager.getDependencies(name as string);
      throw new Error(`Cannot enable plugin '${name}' because dependencies are not satisfied: ${dependencies.join(', ')}`);
    }
    
    const context = this.contextFactory.createContext(plugin);
    await this.lifecycleManager.transition(name as string, PluginLifecycleState.ACTIVE, context);
    await this.registryManager.enablePlugin(name as string);
    this.enabledPlugins.add(name as string);
  }

  /**
   * Disables a plugin by name.
   * 
   * This method checks for active dependents, transitions the plugin through proper
   * lifecycle states, and removes it from the enabled plugins set.
   * 
   * @param name - The name of the plugin to disable
   * @throws {Error} If the plugin is not found or has active dependents
   */
  async disable(name: PluginName): Promise<void> {
    this.ensureInitialized();
    
    const plugin = this.getPlugin(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }
    
    const dependents = this.lifecycleManager.getDependents(name as string);
    const activeDependents = dependents.filter(dep => this.enabledPlugins.has(dep));
    if (activeDependents.length > 0) {
      throw new Error(`Cannot disable plugin '${name}' because it has active dependents: ${activeDependents.join(', ')}`);
    }
    
    const context = this.contextFactory.createContext(plugin);
    await this.lifecycleManager.transition(name as string, PluginLifecycleState.DEACTIVATED, context);
    await this.registryManager.disablePlugin(name as string);
    this.enabledPlugins.delete(name as string);
  }

  async list(): Promise<readonly PluginInfo[]> {
    this.ensureInitialized();
    const result = await this.registryManager.listPlugins();
    return result.plugins;
  }

  async search(query: string): Promise<PluginSearchResult> {
    this.ensureInitialized();
    
    try {
      const result = await this.registryManager.searchMarketplace({ query });
      const plugins = result.plugins || [];
      return {
        success: true,
        plugins,
        total: plugins.length,
        offset: 0,
        limit: plugins.length
      };
    } catch (error) {
      return {
        success: false,
        plugins: [],
        total: 0,
        offset: 0,
        limit: 0,
        error: {
          name: 'PluginSearchError',
          message: `Failed to search plugins: ${error instanceof Error ? error.message : String(error)}`,
          code: PluginErrorCode.REGISTRY_ERROR,
          details: {
            originalError: error instanceof Error ? error : new Error(String(error))
          }
        }
      };
    }
  }

  getPlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(name: PluginName): Plugin<TConfig> | undefined {
    this.ensureInitialized();
    return this.pluginCache.get(name as string) as Plugin<TConfig> | undefined;
  }

  isInstalled(name: PluginName): boolean {
    this.ensureInitialized();
    return this.pluginCache.has(name as string);
  }

  isEnabled(name: PluginName): boolean {
    this.ensureInitialized();
    return this.enabledPlugins.has(name as string);
  }

  registerCommand(command: PluginCommand): void {
    this.ensureInitialized();
    // Note: The command manager doesn't have a registerCommand method that takes just a command
    // This would need to be implemented or the interface changed
  }

  unregisterCommand(name: CommandName): void {
    this.ensureInitialized();
    // Note: The command manager doesn't have an unregisterCommand method that takes just a name
    // This would need to be implemented or the interface changed
  }

  registerHook(hook: PluginHook): void {
    this.ensureInitialized();
    // Note: The hook system manager doesn't have a registerHook method that takes just a hook
    // This would need to be implemented or the interface changed
  }

  unregisterHook(name: HookName, pluginName: PluginName): void {
    this.ensureInitialized();
    // Note: The hook system manager doesn't have an unregisterHook method with this signature
    // This would need to be implemented or the interface changed
  }

  validatePlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: unknown): plugin is Plugin<TConfig> {
    // Use comprehensive validation logic from validation utils
    return isPlugin(plugin);
  }

  createPluginContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(plugin: Plugin<TConfig>): PluginContext<TConfig> {
    this.ensureInitialized();
    return this.contextFactory.createContext(plugin);
  }

  // Batch operations
  async batchInstall(plugins: string[], options: PluginInstallOptions = {}): Promise<PluginInstallResult[]> {
    this.ensureInitialized();
    
    const results: PluginInstallResult[] = [];
    
    try {
      // Resolve all dependencies and get installation order
      const allDependencies = new Set<string>();
      for (const plugin of plugins) {
        const deps = await this.resolveDependencies(plugin);
        deps.installOrder.forEach(dep => allDependencies.add(dep));
      }
      
      // Install in dependency order
      const installOrder = Array.from(allDependencies);
      for (const plugin of installOrder) {
        if (!this.isInstalled(plugin as PluginName)) {
          const result = await this.installSinglePlugin(plugin, options);
          results.push(result);
        }
      }
      
      return results;
    } catch (error) {
      // If batch install fails, try to rollback successful installations
      for (const result of results) {
        if (result.success && result.plugin) {
          try {
            await this.uninstall(result.plugin.name as PluginName);
          } catch {
            // Ignore rollback errors
          }
        }
      }
      throw error;
    }
  }
  
  async batchEnable(plugins: string[]): Promise<void> {
    this.ensureInitialized();
    
    // Sort plugins by dependency order
    const sortedPlugins = this.lifecycleManager.sortByDependencyOrder(plugins);
    
    // Enable in dependency order
    for (const plugin of sortedPlugins) {
      if (this.isInstalled(plugin as PluginName) && !this.isEnabled(plugin as PluginName)) {
        await this.enable(plugin as PluginName);
      }
    }
  }
  
  async batchDisable(plugins: string[]): Promise<void> {
    this.ensureInitialized();
    
    // Sort plugins in reverse dependency order for disabling
    const sortedPlugins = this.lifecycleManager.sortByDependencyOrder(plugins).reverse();
    
    // Disable in reverse dependency order
    for (const plugin of sortedPlugins) {
      if (this.isEnabled(plugin as PluginName)) {
        await this.disable(plugin as PluginName);
      }
    }
  }
  
  // Lifecycle management methods
  async retryFailedTransitions(): Promise<void> {
    this.ensureInitialized();
    
    const stats = this.lifecycleManager.getLifecycleStats();
    const failedPlugins = Object.entries(stats)
      .filter(([, stat]) => stat.errorCount > 0)
      .map(([name]) => name);
    
    for (const pluginName of failedPlugins) {
      try {
        const plugin = this.getPlugin(pluginName as PluginName);
        if (plugin) {
          const context = this.contextFactory.createContext(plugin);
          await this.lifecycleManager.retryTransition(pluginName, PluginLifecycleState.ACTIVE, context);
        }
      } catch (error) {
        console.warn(`Failed to retry transition for plugin ${pluginName}:`, error);
      }
    }
  }
  
  getLifecycleStats() {
    this.ensureInitialized();
    return this.lifecycleManager.getLifecycleStats();
  }
  
  getDependencyGraph() {
    this.ensureInitialized();
    return this.dependencyManager.getDependencyGraph();
  }
  
  async validateAllDependencies(): Promise<boolean> {
    this.ensureInitialized();
    
    const installedPlugins = Array.from(this.pluginCache.keys());
    const allDependencies: any[] = [];
    
    // Collect all dependencies
    for (const pluginName of installedPlugins) {
      const plugin = this.pluginCache.get(pluginName);
      if (plugin && Array.isArray(plugin.dependencies)) {
        allDependencies.push(...plugin.dependencies);
      }
    }
    
    // Validate using dependency manager
    const result = await this.dependencyManager.validateCompatibility(allDependencies);
    return result.compatible;
  }

  // Simple plugin support methods
  private isSimplePlugin(plugin: unknown): plugin is SimplePlugin {
    return typeof plugin === 'object' && plugin !== null && 'name' in plugin && !('metadata' in plugin);
  }

  async loadSimplePlugin(pluginName: string): Promise<Plugin> {
    try {
      // Check cache first
      const cached = this.simplePluginCache.get(pluginName);
      if (cached) {
        return cached;
      }

      // Use optimized loader
      const plugin = await this.optimizedLoader.loadPlugin(pluginName);
      
      // Convert if it's a simple plugin
      if (this.isSimplePlugin(plugin)) {
        const convertedPlugin = convertSimplePlugin(plugin as SimplePlugin);
        this.simplePluginCache.set(pluginName, convertedPlugin);
        return convertedPlugin;
      }
      
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load simple plugin ${pluginName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async registerSimplePlugin(simplePlugin: SimplePlugin): Promise<void> {
    const fullPlugin = convertSimplePlugin(simplePlugin);
    
    // Validate the converted plugin
    const validationResult = await this.validationService.validatePluginWithRecovery(fullPlugin);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors?.map(e => e.message).join(', ') || 'Unknown validation error';
      throw new Error(`Simple plugin validation failed: ${errorMessages}`);
    }
    
    // Cache the simple plugin
    this.simplePluginCache.set(fullPlugin.name, fullPlugin);
    this.pluginCache.set(fullPlugin.name, fullPlugin);
    
    // Initialize lifecycle
    const dependencies = Array.isArray(fullPlugin.dependencies) ? fullPlugin.dependencies : [];
    this.lifecycleManager.initializePlugin(
      fullPlugin.name as PluginName,
      PluginLifecycleState.UNLOADED,
      dependencies,
      3
    );
    
    const context = this.contextFactory.createContext(fullPlugin);
    await this.lifecycleManager.transition(fullPlugin.name, PluginLifecycleState.LOADED, context);
  }

  // Performance optimization methods
  async preloadCriticalPlugins(): Promise<void> {
    const config = this.configManager.getConfig();
    const criticalPlugins: string[] = [];
    
    for (const pluginName of criticalPlugins) {
      try {
        if (this.isInstalled(pluginName as PluginName) && !this.pluginCache.has(pluginName)) {
          await this.optimizedLoader.loadPlugin(pluginName);
        }
      } catch (error) {
        console.warn(`Failed to preload critical plugin ${pluginName}:`, error);
      }
    }
  }

  getPerformanceMetrics(): any {
    return this.performanceManager.getMetrics();
  }

  async optimizeMemoryUsage(): Promise<void> {
    this.performanceManager.clearCache();
    
    // Clear unused simple plugin cache entries
    for (const [name, plugin] of this.simplePluginCache.entries()) {
      if (!this.enabledPlugins.has(name)) {
        this.simplePluginCache.delete(name);
      }
    }
  }

  // Utility methods
  /**
   * Ensures the plugin manager has been initialized.
   * 
   * @throws {Error} If the plugin manager has not been initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PluginManager must be initialized before use');
    }
  }

  // Hook execution methods
  async executeHook<TArgs extends readonly unknown[], TReturn = unknown>(
    hookName: HookName,
    ...args: TArgs
  ): Promise<readonly TReturn[]> {
    this.ensureInitialized();
    return this.hookSystemManager.executeHook(hookName as string, {}, {});
  }

  // Command execution methods
  async executeCommand<TArgs extends StrictRecord<string, unknown>, TOptions extends StrictRecord<string, unknown>>(
    commandName: CommandName,
    args: TArgs,
    options: TOptions
  ): Promise<unknown> {
    this.ensureInitialized();
    const result = await this.commandManager.executeCommand(commandName as string, [], options as Record<string, unknown>);
    return result.result;
  }
}

// Factory functions
let globalPluginManager: PluginManager | undefined;

export function createPluginManager(): PluginManager {
  return new PluginManager();
}

export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager();
  }
  return globalPluginManager;
}