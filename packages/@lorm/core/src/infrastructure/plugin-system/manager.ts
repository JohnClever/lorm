import { randomUUID } from 'crypto';
import type {
  IPlugin,
  PluginInstallOptions,
  PluginInstallResult,
  PluginUninstallOptions,
  PluginSearchResult,
  PluginSearchOptions,
  PluginInfo,
  PluginConfig,
  PluginListOptions,
  PluginValidationResult,
  PluginLoaderContext,
  IPluginLoader,
  IPluginRegistry,
  PluginType,
  PluginError,
  PluginErrorContext
} from './types.js';
import type { PluginPermissions } from '../security/index.js';
import { CLIPluginLoader } from './loader.js';
import { PluginContextFactory } from './context-factory.js';
import { PluginInstaller } from './installer.js';
import { PluginRegistry } from './registry.js';
import { PluginErrorHandler } from './error-handler.js';
import { PluginPerformanceTracker } from './performance-tracker.js';

/**
 * Centralized Plugin Manager with singleton pattern
 * Provides unified interface for all plugin operations
 */
export class PluginManager {
  private static instance: PluginManager;
  private loader: CLIPluginLoader;
  private registry: IPluginRegistry;
  private contextFactory: PluginContextFactory;
  private installer: PluginInstaller;
  private performanceTracker: PluginPerformanceTracker;
  private errorHandler: PluginErrorHandler;
  private initialized = false;
  private projectPath?: string;
  private loaderContext?: PluginLoaderContext;

  private constructor() {
    // Private constructor for singleton pattern
    this.registry = new PluginRegistry();
    this.contextFactory = new PluginContextFactory();
    this.installer = new PluginInstaller();
    this.performanceTracker = new PluginPerformanceTracker();
    this.errorHandler = new PluginErrorHandler();
    // Loader will be initialized later with proper context
    this.loader = null as any;
  }

  /**
   * Get singleton instance of PluginManager
   */
  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Initialize plugin system for a project
   */
  async initialize(projectPath: string): Promise<void> {
    if (this.initialized && this.projectPath === projectPath) {
      return; // Already initialized for this project
    }

    try {
      this.projectPath = projectPath;
      
      // Create loader context using context factory
      this.loaderContext = await this.contextFactory.createLoaderContext(projectPath);
      
      // Initialize loader with context
      this.loader = new CLIPluginLoader(this.loaderContext);
      await this.loader.initialize(this.loaderContext);
      
      // Initialize other components
      await this.installer.initialize(this.loaderContext, this.contextFactory);
      await this.performanceTracker.initialize();
      
      this.initialized = true;
    } catch (error) {
      const pluginError = this.errorHandler.handleError(
        error as Error,
        {
          pluginId: 'system',
          operation: 'initialize'
        }
      );
      throw pluginError;
    }
  }

  /**
   * Load all configured plugins
   */
  async loadAllPlugins(): Promise<void> {
    this.ensureInitialized();
    
    try {
      const operationId = this.performanceTracker.startOperation(
        'system',
        { type: 'load_all_plugins', context: {} }
      );
      
      try {
        await this.loader.loadAllPlugins();
        
        // Register loaded plugins
        const loadedPlugins = this.loader.getAllPlugins();
        for (const plugin of loadedPlugins) {
          const context = await this.contextFactory.createPluginContext(
            plugin
          );
          const loadResult = {
            success: true,
            plugin: plugin,
            loadTime: 0,
            source: 'unknown',
            type: plugin.metadata.type
          };
          this.registry.register(plugin, context, loadResult);
        }
        
        this.performanceTracker.endOperation(operationId, true);
      } catch (error) {
        this.performanceTracker.endOperation(operationId, false, error as Error);
        throw error;
      }
    } catch (error) {
      const pluginError = this.errorHandler.handleError(
        error as Error,
        {
          pluginId: 'system',
          operation: 'load_all_plugins'
        }
      );
      throw pluginError;
    }
  }

  /**
   * Install a plugin from various sources
   */
  async installPlugin(options: PluginInstallOptions): Promise<PluginInstallResult> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      options.name,
      { type: 'install', context: { source: options.source } }
    );
    
    try {
      const result = await this.installer.installPlugin(options);
      
      if (result.success && result.plugin) {
        // Register the newly installed plugin
        const context = await this.contextFactory.createPluginContext(
          result.plugin
        );
        const loadResult = {
          success: true,
          plugin: result.plugin,
          loadTime: result.installTime,
          source: options.source,
          type: this.getPluginTypeFromSource(options.source)
        };
        this.registry.register(result.plugin, context, loadResult);
      }
      
      this.performanceTracker.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: options.name,
         pluginName: options.name,
         version: options.version || 'latest',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleInstallError(error as Error, options.name, options.source, operation);
       throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(name: string, options?: PluginUninstallOptions): Promise<void> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      name,
      { type: 'uninstall', context: {} }
    );
    
    try {
      // Deactivate plugin first
      await this.deactivatePlugin(name);
      
      // Unregister from registry
      this.registry.unregister(name);
      
      // Remove plugin files and configuration
      await this.installer.uninstallPlugin(name, options);
      
      this.performanceTracker.endOperation(operationId, true);
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: name,
         pluginName: name,
         version: 'unknown',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleLoadError(error as Error, name, operation);
       throw error;
    }
  }

  /**
   * Enable/activate a plugin
   */
  async enablePlugin(name: string): Promise<void> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      name,
      { type: 'enable', context: {} }
    );
    
    try {
      const success = await this.registry.activate(name);
      if (!success) {
        throw new Error(`Failed to enable plugin: ${name}`);
      }
      
      this.performanceTracker.endOperation(operationId, true);
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: name,
         pluginName: name,
         version: 'unknown',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleLoadError(error as Error, name, operation);
       throw error;
    }
  }

  /**
   * Disable/deactivate a plugin
   */
  async disablePlugin(name: string): Promise<void> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      name,
      { type: 'disable', context: {} }
    );
    
    try {
      const success = await this.registry.deactivate(name);
      if (!success) {
        throw new Error(`Failed to disable plugin: ${name}`);
      }
      
      this.performanceTracker.endOperation(operationId, true);
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: name,
         pluginName: name,
         version: 'unknown',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleLoadError(error as Error, name, operation);
       throw error;
    }
  }

  /**
   * Alias for disablePlugin for consistency
   */
  async deactivatePlugin(name: string): Promise<void> {
    return this.disablePlugin(name);
  }

  /**
   * Reload all plugins
   */
  async reloadPlugins(): Promise<void> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      'system',
      { type: 'reload_plugins', context: {} }
    );
    
    try {
      // Clear current registry
      this.registry.clear();
      
      // Reload all plugins
      await this.loadAllPlugins();
      
      this.performanceTracker.endOperation(operationId, true);
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: 'system',
         pluginName: 'System',
         version: '1.0.0',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleLoadError(error as Error, 'system', operation);
       throw error;
    }
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): IPlugin | undefined {
    const entry = this.registry.get(name);
    return entry?.plugin;
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): IPlugin[] {
    return this.registry.getAll().map(entry => entry.plugin);
  }

  /**
   * Get all enabled/active plugins
   */
  getEnabledPlugins(): IPlugin[] {
    return this.registry.getAll()
      .filter(entry => entry.active)
      .map(entry => entry.plugin);
  }

  /**
   * Check if a plugin is installed
   */
  isPluginInstalled(name: string): boolean {
    return this.registry.isRegistered(name);
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(name: string): boolean {
    const entry = this.registry.get(name);
    return entry?.active ?? false;
  }

  /**
   * Search for plugins in marketplace and npm
   */
  async searchPlugins(query: string, options?: PluginSearchOptions): Promise<PluginSearchResult[]> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      'system',
      { type: 'search_plugins', context: { query } }
    );
    
    try {
      const result = await this.installer.searchPlugins(query, options);
      this.performanceTracker.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: 'system',
         pluginName: 'System',
         version: '1.0.0',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleLoadError(error as Error, 'system', operation);
       throw error;
    }
  }

  /**
   * Get detailed information about a plugin
   */
  async getPluginInfo(name: string): Promise<PluginInfo> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      name,
      { type: 'get_info', context: {} }
    );
    
    try {
      const result = await this.installer.getPluginInfo(name);
      this.performanceTracker.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: name,
         pluginName: name,
         version: 'unknown',
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleLoadError(error as Error, name, operation);
       throw error;
    }
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(name: string): PluginConfig | undefined {
    const entry = this.registry.get(name);
    if (!entry) return undefined;
    
    // Extract configuration from plugin context or loader context
    return {
      enabled: entry.active,
      autoUpdate: false, // Default value, can be enhanced
      permissions: entry.context.permissions,
      settings: {} // Can be enhanced to store plugin-specific settings
    };
  }

  /**
   * Update plugin configuration
   */
  updatePluginConfig(name: string, config: Partial<PluginConfig>): void {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`Plugin not found: ${name}`);
    }
    
    // Update plugin configuration
    if (config.enabled !== undefined && config.enabled !== entry.active) {
      if (config.enabled) {
        this.enablePlugin(name);
      } else {
        this.disablePlugin(name);
      }
    }
    
    // Update permissions if provided
    if (config.permissions) {
      Object.assign(entry.context.permissions, config.permissions);
    }
  }

  /**
   * Validate a plugin
   */
  async validatePlugin(plugin: IPlugin): Promise<PluginValidationResult> {
    this.ensureInitialized();
    
    const operationId = this.performanceTracker.startOperation(
      plugin.metadata.name,
      { type: 'validate', context: {} }
    );
    
    try {
      const result = await this.installer.validatePlugin(plugin);
      this.performanceTracker.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.performanceTracker.endOperation(operationId, false, error as Error);
      const operation = {
         pluginId: plugin.metadata.id,
         pluginName: plugin.metadata.name,
         version: plugin.metadata.version,
         permissions: {} as any,
         workingDirectory: this.projectPath || process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: '~/.lorm',
         cacheDirectory: '~/.lorm/cache'
       };
       this.errorHandler.handleValidationError(error as Error, plugin, operation);
       throw error;
    }
  }

  /**
   * Get plugin permissions
   */
  getPluginPermissions(name: string): PluginPermissions | undefined {
    const entry = this.registry.get(name);
    return entry?.context.permissions;
  }

  /**
   * Get performance report for plugins
   */
  getPerformanceReport(pluginId?: string) {
    if (pluginId) {
      return this.performanceTracker.getPluginReport(pluginId);
    } else {
      return this.performanceTracker.getOverallSummary();
    }
  }

  /**
   * Get plugin registry for advanced operations
   */
  getRegistry(): IPluginRegistry {
    return this.registry;
  }

  /**
   * Get loader context for advanced operations
   */
  getLoaderContext(): PluginLoaderContext | undefined {
    return this.loaderContext;
  }

  /**
   * Reset plugin manager (for testing)
   */
  reset(): void {
    this.registry.clear();
    this.initialized = false;
    this.projectPath = undefined;
    this.loaderContext = undefined;
  }

  /**
   * Ensure plugin manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PluginManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Convert plugin source to plugin type
   */
  private getPluginTypeFromSource(source: string): PluginType {
    switch (source) {
      case 'npm':
        return 'npm';
      case 'local':
        return 'local';
      case 'marketplace':
        return 'marketplace';
      case 'git':
        return 'third-party';
      default:
        return 'third-party';
    }
  }
}

// Export singleton instance for convenience
export const pluginManager = PluginManager.getInstance();