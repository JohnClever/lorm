import type {
  PluginLoaderContext,
  IPlugin
} from './types.js';
import type { PluginContext } from '../security/types.js';

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
    const { performanceMonitor, sandbox } = this.context;
    
    for (const pluginName of plugins) {
      try {
        performanceMonitor.start(`builtin_plugin_load_${pluginName}`);
        
        // Built-in plugins are loaded from the core package
        const builtinPath = `@lorm/core/plugins/${pluginName}`;
        
        // Load plugin in sandbox for security
         const pluginContext: PluginContext = {
           pluginId: pluginName,
           pluginName: pluginName,
           version: '1.0.0', // Default version for built-in plugins
           permissions: {
             filesystem: { read: [process.cwd()], write: [], execute: [] },
             network: { hosts: [], ports: [] },
             process: { spawn: false, env: [] },
             system: { exit: false, signals: false }
           },
           workingDirectory: process.cwd(),
           tempDirectory: '/tmp',
           configDirectory: process.cwd() + '/.lorm',
           cacheDirectory: process.cwd() + '/.lorm/cache'
         };
         
         const result = await sandbox.execute(
            pluginContext,
            async () => {
              const pluginModule = await import(builtinPath);
              return pluginModule.default || pluginModule;
            }
          );
          
          if (!result.success) {
            throw result.error || new Error('Failed to load plugin');
          }
          
          const plugin = result.result;
          
          // Validate plugin structure
          if (!this.validatePlugin(plugin)) {
            throw new Error(`Invalid plugin structure for ${pluginName}`);
          }
          
          // Store loaded plugin
          this.loadedPlugins.set(pluginName, plugin);
        
        performanceMonitor.end(`builtin_plugin_load_${pluginName}`);
        
      } catch (error) {
        performanceMonitor.recordError(error instanceof Error ? error : new Error(String(error)));
        console.warn(`⚠️  Failed to load built-in plugin ${pluginName}:`, error);
      }
    }
  }

  /**
   * Load NPM plugins
   */
  protected async loadNpmPlugins(plugins: Record<string, string>): Promise<void> {
    const { performanceMonitor, sandbox, cache } = this.context;
    
    for (const [pluginName, version] of Object.entries(plugins)) {
      try {
        performanceMonitor.start(`npm_plugin_load_${pluginName}`);
        
        // Check cache first
        const cacheKey = `npm_plugin_${pluginName}_${version}`;
        let plugin = await cache.get(cacheKey);
        
        if (!plugin) {
          // Load plugin from node_modules
           const pluginContext: PluginContext = {
             pluginId: pluginName,
             pluginName: pluginName,
             version: version,
             permissions: {
               filesystem: { read: [process.cwd() + '/node_modules'], write: [], execute: [] },
               network: { hosts: [], ports: [] },
               process: { spawn: false, env: [] },
               system: { exit: false, signals: false }
             },
             workingDirectory: process.cwd(),
             tempDirectory: '/tmp',
             configDirectory: process.cwd() + '/.lorm',
             cacheDirectory: process.cwd() + '/.lorm/cache'
           };
           
           const result = await sandbox.execute(
             pluginContext,
             async () => {
               // Try to resolve the plugin from node_modules
               const { resolve } = await import('path');
               const { access } = await import('fs/promises');
               
               // Check if plugin exists in node_modules
               const pluginPath = resolve(process.cwd(), 'node_modules', pluginName);
               await access(pluginPath); // Throws if not accessible
               
               // Import the plugin
               const pluginModule = await import(pluginPath);
               return pluginModule.default || pluginModule;
             }
           );
           
           if (!result.success) {
             throw result.error || new Error('Failed to load plugin');
           }
           
           plugin = result.result;
          
          // Cache the loaded plugin for 1 hour
          await cache.set(cacheKey, plugin, 3600000);
        }
        
        // Validate plugin structure
        if (!this.validatePlugin(plugin)) {
          throw new Error(`Invalid plugin structure for ${pluginName}`);
        }
        
        // Store loaded plugin
        this.loadedPlugins.set(pluginName, plugin);
        
        performanceMonitor.end(`npm_plugin_load_${pluginName}`);
        
      } catch (error) {
        performanceMonitor.recordError(error instanceof Error ? error : new Error(String(error)));
        console.warn(`⚠️  Failed to load NPM plugin ${pluginName}:`, error);
      }
    }
  }

  /**
   * Load local plugins
   */
  protected async loadLocalPlugins(plugins: string[]): Promise<void> {
    const { performanceMonitor, sandbox, cache } = this.context;
    
    for (const pluginPath of plugins) {
      try {
        performanceMonitor.start(`local_plugin_load_${pluginPath}`);
        
        // Check cache first
        const cacheKey = `local_plugin_${pluginPath}`;
        let plugin = await cache.get(cacheKey);
        
        if (!plugin) {
          // Load plugin from local path
           const pluginContext: PluginContext = {
             pluginId: pluginPath,
             pluginName: pluginPath.split('/').pop() || pluginPath,
             version: '1.0.0', // Default version for local plugins
             permissions: {
               filesystem: { read: [process.cwd(), pluginPath], write: [], execute: [] },
               network: { hosts: [], ports: [] },
               process: { spawn: false, env: [] },
               system: { exit: false, signals: false }
             },
             workingDirectory: process.cwd(),
             tempDirectory: '/tmp',
             configDirectory: process.cwd() + '/.lorm',
             cacheDirectory: process.cwd() + '/.lorm/cache'
           };
           
           const result = await sandbox.execute(
             pluginContext,
             async () => {
               const { resolve, isAbsolute } = await import('path');
               const { access, stat } = await import('fs/promises');
               
               // Resolve the plugin path
               const resolvedPath = isAbsolute(pluginPath) 
                 ? pluginPath 
                 : resolve(process.cwd(), pluginPath);
               
               // Check if plugin exists and is accessible
               await access(resolvedPath);
               const stats = await stat(resolvedPath);
               
               let pluginModule;
               if (stats.isDirectory()) {
                 // Load from directory (look for index.js, index.ts, or package.json main)
                 const indexPath = resolve(resolvedPath, 'index.js');
                 try {
                   await access(indexPath);
                   pluginModule = await import(indexPath);
                 } catch {
                   // Try index.ts
                   const indexTsPath = resolve(resolvedPath, 'index.ts');
                   try {
                     await access(indexTsPath);
                     pluginModule = await import(indexTsPath);
                   } catch {
                     // Try package.json main field
                     const packageJsonPath = resolve(resolvedPath, 'package.json');
                     const { readFile } = await import('fs/promises');
                     const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
                     const mainPath = resolve(resolvedPath, packageJson.main || 'index.js');
                     pluginModule = await import(mainPath);
                   }
                 }
               } else {
                 // Load from file
                 pluginModule = await import(resolvedPath);
               }
               
               return pluginModule.default || pluginModule;
             }
           );
           
           if (!result.success) {
             throw result.error || new Error('Failed to load plugin');
           }
           
           plugin = result.result;
          
          // Cache the loaded plugin for 30 minutes (shorter than npm plugins)
          await cache.set(cacheKey, plugin, 1800000);
        }
        
        // Validate plugin structure
        if (!this.validatePlugin(plugin)) {
          throw new Error(`Invalid plugin structure for ${pluginPath}`);
        }
        
        // Extract plugin name from path or metadata
        const pluginName = plugin.metadata?.name || pluginPath.split('/').pop() || pluginPath;
        
        // Store loaded plugin
        this.loadedPlugins.set(pluginName, plugin);
        
        performanceMonitor.end(`local_plugin_load_${pluginPath}`);
        
      } catch (error) {
        performanceMonitor.recordError(error instanceof Error ? error : new Error(String(error)));
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

  /**
   * Validate plugin structure
   */
  protected validatePlugin(plugin: any): plugin is IPlugin {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    // Check required metadata
    if (!plugin.metadata || typeof plugin.metadata !== 'object') {
      return false;
    }

    const { metadata } = plugin;
    if (!metadata.name || typeof metadata.name !== 'string') {
      return false;
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      return false;
    }

    // Check optional methods are functions if they exist
    if (plugin.activate && typeof plugin.activate !== 'function') {
      return false;
    }

    if (plugin.deactivate && typeof plugin.deactivate !== 'function') {
      return false;
    }

    if (plugin.commands && !Array.isArray(plugin.commands)) {
      return false;
    }

    if (plugin.hooks && !Array.isArray(plugin.hooks)) {
      return false;
    }

    return true;
  }

  /**
   * Reload all plugins
   */
  async reload(): Promise<void> {
    const { performanceMonitor } = this.context;
    
    performanceMonitor.start('plugin_loader_reload');
    
    // Clear loaded plugins
    this.loadedPlugins.clear();
    
    // Reload all plugins
    await this.loadAllPlugins();
    
    performanceMonitor.end('plugin_loader_reload');
  }

  /**
   * Unload a specific plugin
   */
  async unloadPlugin(name: string): Promise<void> {
     const plugin = this.loadedPlugins.get(name);
     if (plugin && plugin.deactivate) {
       const pluginContext: PluginContext = {
         pluginId: name,
         pluginName: name,
         version: plugin.metadata.version,
         permissions: {
           filesystem: { read: [process.cwd()], write: [], execute: [] },
           network: { hosts: [], ports: [] },
           process: { spawn: false, env: [] },
           system: { exit: false, signals: false }
         },
         workingDirectory: process.cwd(),
         tempDirectory: '/tmp',
         configDirectory: process.cwd() + '/.lorm',
         cacheDirectory: process.cwd() + '/.lorm/cache'
       };
       await plugin.deactivate(pluginContext);
     }
     
     this.loadedPlugins.delete(name);
   }
}

/**
 * CLI plugin loader for CLI environments
 * Extends base loader with CLI-specific functionality
 */
export class CLIPluginLoader extends BasePluginLoader {
  /**
   * Initialize the CLI plugin loader
   */
  async initialize(context: PluginLoaderContext): Promise<void> {
    this.context = context;
  }

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