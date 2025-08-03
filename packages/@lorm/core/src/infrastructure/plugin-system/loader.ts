import type {
  PluginLoaderContext,
  IPlugin
} from './types.js';

/**
 * Base plugin loader for LORM
 * Loads plugins from various sources during runtime
 */
export class BasePluginLoader {
  protected context: PluginLoaderContext;
  protected loadedPlugins = new Map<string, IPlugin>();

  constructor(context: PluginLoaderContext) {
    this.context = context;
  }

  /**
   * Load all plugins based on configuration
   */
  async loadAllPlugins(): Promise<void> {
    const { config, performanceMonitor } = this.context;
    
    performanceMonitor.start('plugin_loading');
    
    // Load configured plugins
    if (config.plugins) {
      await this.loadBuiltinPlugins(config.plugins.builtin || []);
      await this.loadNpmPlugins(config.plugins.npm || {});
      await this.loadLocalPlugins(config.plugins.local || []);
    }
    
    performanceMonitor.end('plugin_loading');
  }

  /**
   * Load built-in plugins
   */
  protected async loadBuiltinPlugins(plugins: string[]): Promise<void> {
    for (const pluginName of plugins) {
      try {
        // Built-in plugins would be loaded from a predefined location
        // TODO: Implement built-in plugin loading
      } catch (error) {
        console.warn(`⚠️  Failed to load built-in plugin ${pluginName}:`, error);
      }
    }
  }

  /**
   * Load NPM plugins
   */
  protected async loadNpmPlugins(plugins: Record<string, string>): Promise<void> {
    for (const [pluginName, version] of Object.entries(plugins)) {
      try {
        // TODO: Implement NPM plugin loading
      } catch (error) {
        console.warn(`⚠️  Failed to load NPM plugin ${pluginName}:`, error);
      }
    }
  }

  /**
   * Load local plugins
   */
  protected async loadLocalPlugins(plugins: string[]): Promise<void> {
    for (const pluginPath of plugins) {
      try {
        // TODO: Implement local plugin loading
      } catch (error) {
        console.warn(`⚠️  Failed to load local plugin ${pluginPath}:`, error);
      }
    }
  }

  /**
   * Get loaded plugin by name
   */
  getPlugin(name: string): IPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): IPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}

/**
 * CLI plugin loader for CLI environments
 * Extends base loader with CLI-specific functionality
 */
export class CLIPluginLoader extends BasePluginLoader {
  /**
   * Load all plugins including built-in commands
   */
  async loadAllPlugins(): Promise<void> {
    const { config, commandSystem, performanceMonitor } = this.context;
    
    performanceMonitor.start('builtin_plugins_load');
    
    // Load built-in commands first (if commandSystem supports it)
    if (commandSystem && typeof commandSystem.register === 'function') {
      // Built-in commands would be registered here
      // This is CLI-specific functionality
    }
    
    performanceMonitor.end('builtin_plugins_load');
    
    // Load other plugins using base implementation
    await super.loadAllPlugins();
  }
}