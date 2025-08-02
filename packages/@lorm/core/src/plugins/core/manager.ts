// Core Plugin Manager for LORM Framework
// This is the main orchestrator of the plugin system

import {
  Plugin,
  PluginName,
  PluginVersion,
  FilePath,
  PluginInfo,
  PluginCommand,
  PluginHook,
  CommandName,
  HookName,
  PluginInstallOptions,
  PluginInstallResult,
  PluginUninstallResult,
  PluginUpdateResult,
  PluginSearchResult,
  PluginContext,
  PluginRuntimeAdapter,
  IPluginManager,
  PluginError,
  PluginErrorCode,
  StrictRecord,
  ValidationResult
} from '../types';

import { PluginValidator } from '../utils/validation';
import { PluginInstaller } from '../utils/installation';
import { PluginRegistryManager } from '../utils/registry';
import { PluginContextFactory } from './context-factory';

/**
 * Core Plugin Manager
 * 
 * This class serves as the central orchestrator for the plugin system.
 * It manages plugin lifecycle, registration, and coordination between
 * different plugin subsystems.
 */
export class PluginManager implements IPluginManager {
  private readonly plugins = new Map<PluginName, Plugin>();
  private readonly pluginStates = new Map<PluginName, 'installed' | 'enabled' | 'disabled' | 'error'>();
  private readonly validator: PluginValidator;
  private readonly installer: PluginInstaller;
  private readonly registry: PluginRegistryManager;
  private readonly contextFactory: PluginContextFactory;
  private initialized = false;

  constructor(private readonly runtimeAdapter: PluginRuntimeAdapter, private readonly pluginsDir: FilePath = './plugins' as FilePath) {
    this.validator = new PluginValidator();
    this.installer = new PluginInstaller(runtimeAdapter, pluginsDir);
    this.registry = new PluginRegistryManager(runtimeAdapter, pluginsDir);
    this.contextFactory = new PluginContextFactory(runtimeAdapter, pluginsDir);
  }

  /**
   * Initialize the plugin manager and all subsystems
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize subsystems
      await this.registry.initialize();

      // Load installed plugins
      await this.loadInstalledPlugins();

      // Enable plugins that were previously enabled
      await this.enablePreviouslyEnabledPlugins();

      this.initialized = true;
      this.runtimeAdapter.emit('plugin-manager:initialized');
    } catch (error) {
      const pluginError = this.createPluginError(
        PluginErrorCode.PLUGIN_MANAGER_INIT_FAILED,
        'Failed to initialize plugin manager',
        { originalError: error }
      );
      throw pluginError;
    }
  }

  /**
   * Install a plugin from various sources
   */
  async install(nameOrPath: PluginName | FilePath, options: PluginInstallOptions = {}): Promise<PluginInstallResult> {
    this.ensureInitialized();

    try {
      // Check if plugin is already installed
      if (this.isInstalled(nameOrPath as PluginName)) {
        if (!options.force) {
          return {
            success: false,
            error: this.createPluginError(
              PluginErrorCode.ALREADY_INSTALLED,
              `Plugin ${nameOrPath} is already installed`
            )
          };
        }
      }

      // Install the plugin
      const installResult = await this.installer.installPlugin(nameOrPath, options);
      
      if (!installResult.success || !installResult.plugin) {
        return installResult;
      }

      // Load and validate the plugin
      const plugin = await this.loadPlugin(installResult.plugin.name);
      if (!plugin) {
        return {
          success: false,
          error: this.createPluginError(
            PluginErrorCode.LOAD_FAILED,
            `Failed to load installed plugin ${installResult.plugin.name}`
          )
        };
      }

      // Register the plugin
      this.plugins.set(plugin.name, plugin);
      this.pluginStates.set(plugin.name, 'installed');

      // Update registry
      await this.registry.registerPlugin(installResult.plugin);

      this.runtimeAdapter.emit('plugin:installed', plugin.name, installResult.plugin);

      return {
        success: true,
        plugin: installResult.plugin,
        message: `Plugin ${plugin.name} installed successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: this.createPluginError(
          PluginErrorCode.INSTALL_FAILED,
          `Failed to install plugin ${nameOrPath}`,
          { originalError: error }
        )
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(name: PluginName): Promise<PluginUninstallResult> {
    this.ensureInitialized();

    try {
      if (!this.isInstalled(name)) {
        return {
          success: false,
          error: this.createPluginError(
            PluginErrorCode.NOT_INSTALLED,
            `Plugin ${name} is not installed`
          )
        };
      }

      // Disable the plugin first if it's enabled
      if (this.isEnabled(name)) {
        await this.disable(name);
      }

      // Uninstall the plugin
      const uninstallResult = await this.installer.uninstallPlugin(name);
      
      if (!uninstallResult.success) {
        return uninstallResult;
      }

      // Remove from internal state
      this.plugins.delete(name);
      this.pluginStates.delete(name);

      // Update registry
      await this.registry.unregisterPlugin(name);

      this.runtimeAdapter.emit('plugin:uninstalled', name);

      return {
        success: true,
        plugin: name,
        message: `Plugin ${name} uninstalled successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: this.createPluginError(
          PluginErrorCode.UNINSTALL_FAILED,
          `Failed to uninstall plugin ${name}`,
          { originalError: error }
        )
      };
    }
  }

  /**
   * Update a plugin to the latest version
   */
  async update(name: PluginName): Promise<PluginUpdateResult> {
    this.ensureInitialized();

    try {
      if (!this.isInstalled(name)) {
        return {
          success: false,
          error: this.createPluginError(
            PluginErrorCode.NOT_INSTALLED,
            `Plugin ${name} is not installed`
          )
        };
      }

      const currentPlugin = this.plugins.get(name);
      const currentVersion = currentPlugin?.version;

      // Update the plugin
      const updateResult = await this.installer.installPlugin(name, { force: true });
      
      if (!updateResult.success || !updateResult.plugin) {
        return updateResult;
      }

      // Reload the plugin
      const updatedPlugin = await this.loadPlugin(name);
      if (!updatedPlugin) {
        return {
          success: false,
          error: this.createPluginError(
            PluginErrorCode.LOAD_FAILED,
            `Failed to load updated plugin ${name}`
          )
        };
      }

      // Update internal state
      this.plugins.set(name, updatedPlugin);

      // Update registry
      await this.registry.updatePluginStatus(name, 'installed', updateResult.plugin);

      this.runtimeAdapter.emit('plugin:updated', name, currentVersion, updatedPlugin.version);

      return {
        success: true,
        plugin: updateResult.plugin,
        previousVersion: currentVersion,
        newVersion: updatedPlugin.version,
        message: `Plugin ${name} updated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: this.createPluginError(
          PluginErrorCode.UPDATE_FAILED,
          `Failed to update plugin ${name}`,
          { originalError: error }
        )
      };
    }
  }

  /**
   * Enable a plugin
   */
  async enable(name: PluginName): Promise<void> {
    this.ensureInitialized();

    if (!this.isInstalled(name)) {
      throw this.createPluginError(
        PluginErrorCode.NOT_INSTALLED,
        `Plugin ${name} is not installed`
      );
    }

    if (this.isEnabled(name)) {
      return; // Already enabled
    }

    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw this.createPluginError(
        PluginErrorCode.PLUGIN_NOT_FOUND,
        `Plugin ${name} not found in loaded plugins`
      );
    }

    try {
      // Create plugin context
      const context = await this.contextFactory.createContext(plugin.name, plugin as unknown as StrictRecord<string, unknown>);

      // Execute plugin initialization
      if (plugin.init) {
        await plugin.init(context);
      }
      if (plugin.initialize) {
        await plugin.initialize(context);
      }

      // Register plugin commands
      if (plugin.commands) {
        for (const command of plugin.commands) {
          this.registerCommand({ ...command, pluginName: name });
        }
      }

      // Register plugin hooks
      if (plugin.hooks) {
        for (const hook of plugin.hooks) {
          this.registerHook({ ...hook, pluginName: name });
        }
      }

      // Execute lifecycle hook
      if (plugin.lifecycle?.onActivate) {
        await plugin.lifecycle.onActivate(context);
      }

      // Update state
      this.pluginStates.set(name, 'enabled');
      await this.registry.setPluginEnabled(name, true);

      this.runtimeAdapter.emit('plugin:enabled', name);
    } catch (error) {
      this.pluginStates.set(name, 'error');
      throw this.createPluginError(
        PluginErrorCode.ENABLE_FAILED,
        `Failed to enable plugin ${name}`,
        { originalError: error }
      );
    }
  }

  /**
   * Disable a plugin
   */
  async disable(name: PluginName): Promise<void> {
    this.ensureInitialized();

    if (!this.isInstalled(name)) {
      throw this.createPluginError(
        PluginErrorCode.NOT_INSTALLED,
        `Plugin ${name} is not installed`
      );
    }

    if (!this.isEnabled(name)) {
      return; // Already disabled
    }

    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw this.createPluginError(
        PluginErrorCode.PLUGIN_NOT_FOUND,
        `Plugin ${name} not found in loaded plugins`
      );
    }

    try {
      // Create plugin context
      const context = await this.contextFactory.createContext(plugin.name, plugin as unknown as StrictRecord<string, unknown>);

      // Execute lifecycle hook
      if (plugin.lifecycle?.onDeactivate) {
        await plugin.lifecycle.onDeactivate(context);
      }

      // Unregister plugin commands
      if (plugin.commands) {
        for (const command of plugin.commands) {
          this.unregisterCommand(command.name);
        }
      }

      // Unregister plugin hooks
      if (plugin.hooks) {
        for (const hook of plugin.hooks) {
          this.unregisterHook(hook.name, name);
        }
      }

      // Execute plugin cleanup
      if (plugin.cleanup) {
        await plugin.cleanup();
      }

      // Update state
      this.pluginStates.set(name, 'disabled');
      await this.registry.setPluginEnabled(name, false);

      this.runtimeAdapter.emit('plugin:disabled', name);
    } catch (error) {
      this.pluginStates.set(name, 'error');
      throw this.createPluginError(
        PluginErrorCode.DISABLE_FAILED,
        `Failed to disable plugin ${name}`,
        { originalError: error }
      );
    }
  }

  /**
   * List all installed plugins
   */
  async list(): Promise<readonly PluginInfo[]> {
    this.ensureInitialized();
    // Return in-memory plugins instead of registry plugins for CLI usage
    const pluginInfos: PluginInfo[] = [];
    for (const [name, plugin] of this.plugins) {
      const state = this.pluginStates.get(name) || 'installed';
      pluginInfos.push({
        name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        license: plugin.license,
        enabled: state === 'enabled',
        installed: true,
        size: 0, // Default size
        dependencies: Object.keys(plugin.dependencies || {}),
        commands: plugin.commands ? Array.from(plugin.commands) : [],
        hooks: plugin.hooks ? Array.from(plugin.hooks) : [],
        keywords: plugin.keywords ? Array.from(plugin.keywords) : [],
        isPremium: plugin.isPremium,
        marketplace: plugin.marketplace ? {
          category: plugin.metadata?.category
        } : undefined,
        peerDependencies: Object.keys(plugin.peerDependencies || {}),
        engines: plugin.engines || {},
        source: 'local' as const
      });
    }
    return pluginInfos;
  }

  /**
   * Search for plugins in the marketplace
   */
  async search(query: string): Promise<PluginSearchResult> {
    this.ensureInitialized();
    return this.registry.searchPlugins(query);
  }

  /**
   * Get a specific plugin instance
   */
  getPlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(
    name: PluginName
  ): Plugin<TConfig> | undefined {
    return this.plugins.get(name) as Plugin<TConfig> | undefined;
  }

  /**
   * Check if a plugin is installed
   */
  isInstalled(name: PluginName): boolean {
    return this.plugins.has(name);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(name: PluginName): boolean {
    return this.pluginStates.get(name) === 'enabled';
  }

  /**
   * Register a command (delegated to command manager)
   */
  registerCommand(command: PluginCommand): void {
    // TODO: Implement command registration logic
    this.runtimeAdapter.emit('command:registered', command);
  }

  /**
   * Unregister a command (delegated to command manager)
   */
  unregisterCommand(name: CommandName): void {
    // TODO: Implement command unregistration logic
    this.runtimeAdapter.emit('command:unregistered', name);
  }

  /**
   * Register a hook
   */
  registerHook(hook: PluginHook): void {
    // Hook registration logic would go here
    // For now, we'll emit an event to let the runtime adapter handle it
    this.runtimeAdapter.emit('hook:registered', hook);
  }

  /**
   * Unregister a hook
   */
  unregisterHook(name: HookName, pluginName: PluginName): void {
    // Hook unregistration logic would go here
    // For now, we'll emit an event to let the runtime adapter handle it
    this.runtimeAdapter.emit('hook:unregistered', name, pluginName);
  }

  /**
   * Validate a plugin
   */
  validatePlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(
    plugin: unknown
  ): plugin is Plugin<TConfig> {
    const result = this.validator.validatePlugin(plugin);
    return result.valid;
  }

  /**
   * Create a plugin context (synchronous - returns existing context)
   */
  createPluginContext<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(
    plugin: Plugin<TConfig>
  ): PluginContext<TConfig> {
    // First try to get existing context
    const existingContext = this.contextFactory.getContext(plugin.name);
    if (existingContext) {
      return existingContext as PluginContext<TConfig>;
    }
    
    // If no existing context, we need to create one asynchronously
    // This is a design issue - the interface expects sync but creation is async
    // For now, throw an error indicating the context needs to be created first
    throw this.createPluginError(
      PluginErrorCode.PLUGIN_NOT_FOUND,
      `Plugin context for '${plugin.name}' not found. Context must be created asynchronously first.`,
      { pluginName: plugin.name }
    );
  }

  /**
   * Create a plugin context asynchronously
   */
  async createPluginContextAsync<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(
    plugin: Plugin<TConfig>
  ): Promise<PluginContext<TConfig>> {
    return this.contextFactory.createContext(plugin.name, plugin as unknown as StrictRecord<string, unknown>) as Promise<PluginContext<TConfig>>;
  }

  /**
   * Get plugin manager statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    error: number;
  } {
    const states = Array.from(this.pluginStates.values());
    return {
      total: states.length,
      enabled: states.filter(s => s === 'enabled').length,
      disabled: states.filter(s => s === 'disabled').length,
      error: states.filter(s => s === 'error').length
    };
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw this.createPluginError(
        PluginErrorCode.PLUGIN_MANAGER_INIT_FAILED,
        'Plugin manager is not initialized'
      );
    }
  }

  private async loadInstalledPlugins(): Promise<void> {
    const result = await this.registry.listPlugins();
    
    for (const pluginInfo of result.plugins) {
      try {
        const plugin = await this.loadPlugin(pluginInfo.name);
        if (plugin) {
          this.plugins.set(plugin.name, plugin);
          this.pluginStates.set(plugin.name, 'installed');
        }
      } catch (error) {
        this.runtimeAdapter.createLogger('PluginManager').warn(
          `Failed to load plugin ${pluginInfo.name}:`,
          error
        );
      }
    }
  }

  private async enablePreviouslyEnabledPlugins(): Promise<void> {
    const result = await this.registry.listPlugins();
    const enabledPlugins = result.plugins.filter(p => p.enabled).map(p => p.name as PluginName);
    
    for (const pluginName of enabledPlugins) {
      try {
        await this.enable(pluginName);
      } catch (error) {
        this.runtimeAdapter.createLogger('PluginManager').warn(
          `Failed to enable plugin ${pluginName}:`,
          error
        );
      }
    }
  }

  private async loadPlugin(name: string): Promise<Plugin | null> {
    try {
      // TODO: Implement plugin loading logic
      // This would typically involve loading the plugin from the filesystem
      // For now, we'll create a basic plugin structure from registry info
      const pluginInfo = await this.registry.getPluginInfo(name as PluginName);
      if (!pluginInfo) {
        return null;
      }
      // Return a basic plugin structure based on registry info
      return {
        name: name as PluginName,
        version: pluginInfo.version as PluginVersion,
        description: pluginInfo.description,
        author: pluginInfo.author || 'Unknown',
        license: pluginInfo.license || { type: 'MIT' }
      } as Plugin;
    } catch (error) {
      this.runtimeAdapter.createLogger('PluginManager').error(
        `Failed to load plugin ${name}:`,
        error
      );
      return null;
    }
  }

  private createPluginError(
    code: PluginErrorCode,
    message: string,
    details?: { originalError?: unknown; [key: string]: unknown }
  ): PluginError {
    const error = new Error(message) as PluginError;
    error.code = code;
    error.details = details ? {
      ...details,
      originalError: details.originalError instanceof Error ? details.originalError : undefined
    } : undefined;
    return error;
  }
}