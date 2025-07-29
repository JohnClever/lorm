import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import type { CAC } from 'cac';

export interface PluginContext {
  cli: CAC;
  version: string;
  cwd: string;
  utils: {
    chalk: typeof chalk;
    validateConfig: any;
    errorRecovery: any;
    cache: any;
  };
}

export interface PluginCommand {
  name: string;
  description: string;
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: any;
  }>;
  action: (options: any, context: PluginContext) => Promise<void> | void;
  aliases?: string[];
}

export interface PluginHook {
  name: string;
  handler: (context: PluginContext, ...args: any[]) => Promise<void> | void;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  commands?: PluginCommand[];
  hooks?: PluginHook[];
  init?: (context: PluginContext) => Promise<void> | void;
  cleanup?: (context: PluginContext) => Promise<void> | void;
  isPremium?: boolean;
  license?: {
    type: 'free' | 'premium' | 'enterprise';
    requiresKey?: boolean;
    serviceEndpoint?: string;
  };
  marketplace?: {
    category?: string;
    tags?: string[];
    author?: string;
    homepage?: string;
    repository?: string;
  };
}

export interface PluginConfig {
  plugins: string[];
  disabled?: string[];
  settings?: Record<string, any>;
  authorizedUsers?: string[];
  requireAuth?: boolean;
  marketplace?: {
    enabled: boolean;
    registryUrl?: string;
    apiKey?: string;
  };
  premium?: {
    licenseKey?: string;
    serviceUrl?: string;
  };
}

/**
 * Plugin system for extending CLI functionality
 */
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<string, PluginHook[]>();
  private context: PluginContext;
  private config: PluginConfig;

  constructor(context: PluginContext) {
    this.context = context;
    this.config = this.loadConfig();
  }

  /**
   * Check if current user is authorized to load plugins
   */
  private isAuthorizedUser(): boolean {
    if (!this.config.requireAuth) {
      return true;
    }

    const currentUser = process.env.USER || process.env.USERNAME || process.env.LOGNAME;
    
    if (!currentUser) {
      console.warn(chalk.yellow('⚠️  Could not determine current user'));
      return false;
    }

    const authorizedUsers = this.config.authorizedUsers || [];
    const isAuthorized = authorizedUsers.includes(currentUser);
    
    if (!isAuthorized) {
      console.warn(chalk.red(`🔒 Plugin access denied for user: ${currentUser}`));
      console.warn(chalk.yellow(`   Authorized users: ${authorizedUsers.join(', ')}`));
    }
    
    return isAuthorized;
  }

  /**
   * Load and initialize all plugins
   */
  async loadPlugins(): Promise<void> {
    if (!this.isAuthorizedUser()) {
      console.log(chalk.gray('🔒 Plugin loading disabled - unauthorized user'));
      return;
    }

    const pluginPaths = this.discoverPlugins();
    
    if (pluginPaths.length === 0) {
      console.log(chalk.gray('📦 No plugins found'));
      return;
    }
    
    console.log(chalk.blue(`🔍 Discovering ${pluginPaths.length} plugin(s)...`));
    
    for (const pluginPath of pluginPaths) {
      try {
        await this.loadPlugin(pluginPath);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to load plugin ${pluginPath}: ${error}`));
      }
    }

    for (const plugin of this.plugins.values()) {
      try {
        if (plugin.isPremium && !(await this.validatePremiumPlugin(plugin))) {
          console.warn(chalk.yellow(`⚠️  Skipping premium plugin ${plugin.name} - validation failed`));
          continue;
        }
        
        if (plugin.init) {
          await plugin.init(this.context);
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to initialize plugin ${plugin.name}: ${error}`));
      }
    }
    
    const loadedCount = this.plugins.size;
    if (loadedCount > 0) {
      console.log(chalk.green(`✅ Successfully loaded ${loadedCount} plugin(s)`));
    }
  }

  /**
   * Register plugin commands with CLI
   */
  registerCommands(): void {
    for (const plugin of this.plugins.values()) {
      if (!plugin.commands) continue;

      for (const command of plugin.commands) {
        try {
          const cmd = this.context.cli.command(command.name, command.description);
          
          if (command.options) {
            command.options.forEach(option => {
              cmd.option(option.flags, option.description, {
                default: option.defaultValue
              });
            });
          }

          if (command.aliases) {
            command.aliases.forEach(alias => cmd.alias(alias));
          }

          cmd.action(async (options: any) => {
            try {
              await command.action(options, this.context);
            } catch (error) {
              console.error(chalk.red(`❌ Plugin command ${command.name} failed: ${error}`));
              process.exit(1);
            }
          });

          console.log(chalk.gray(`🔌 Registered plugin command: ${command.name}`));
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Failed to register command ${command.name}: ${error}`));
        }
      }
    }
  }

  async executeHooks(hookName: string, ...args: any[]): Promise<void> {
    const hooks = this.hooks.get(hookName) || [];
    
    for (const hook of hooks) {
      try {
        await hook.handler(this.context, ...args);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Hook ${hookName} failed: ${error}`));
      }
    }
  }

  getPluginInfo(): Array<{ name: string; version: string; description?: string; isPremium?: boolean; marketplace?: any }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      isPremium: plugin.isPremium,
      marketplace: plugin.marketplace
    }));
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  async cleanup(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      try {
        if (plugin.cleanup) {
          await plugin.cleanup(this.context);
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to cleanup plugin ${plugin.name}: ${error}`));
      }
    }
  }

  /**
   * Validate premium plugin license and connectivity
   */
  private async validatePremiumPlugin(plugin: Plugin): Promise<boolean> {
    if (!plugin.isPremium || !plugin.license) {
      return true;
    }

    const { type, requiresKey, serviceEndpoint } = plugin.license;
    
    if (requiresKey) {
      const licenseKey = this.config.premium?.licenseKey || process.env.LORM_LICENSE_KEY;
      if (!licenseKey) {
        console.error(chalk.red(`❌ Premium plugin ${plugin.name} requires a license key`));
        console.log(chalk.gray('   Set LORM_LICENSE_KEY environment variable or configure in .lorm/plugins.json'));
        return false;
      }
    }

    if (serviceEndpoint) {
      try {
        const serviceUrl = this.config.premium?.serviceUrl || serviceEndpoint;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${serviceUrl}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.premium?.licenseKey || process.env.LORM_LICENSE_KEY}`,
            'User-Agent': `lorm-cli/${this.context.version}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(chalk.yellow(`⚠️  Premium service for ${plugin.name} is unavailable (${response.status})`));
          return false;
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not connect to premium service for ${plugin.name}: ${error}`));
        return false;
      }
    }

    return true;
  }

  /**
   * Install plugin from marketplace
   */
  async installFromMarketplace(pluginName: string, version?: string): Promise<boolean> {
    if (!this.config.marketplace?.enabled) {
      console.error(chalk.red('❌ Marketplace is not enabled'));
      return false;
    }

    const registryUrl = this.config.marketplace.registryUrl || 'https://registry.lorm.dev';
    const apiKey = this.config.marketplace.apiKey || process.env.LORM_MARKETPLACE_API_KEY;

    try {
      console.log(chalk.blue(`📦 Installing ${pluginName}${version ? `@${version}` : ''} from marketplace...`));
      
      const response = await fetch(`${registryUrl}/plugins/${pluginName}${version ? `/${version}` : ''}`, {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
          'User-Agent': `lorm-cli/${this.context.version}`
        }
      });

      if (!response.ok) {
        throw new Error(`Plugin not found or access denied (${response.status})`);
      }

      const pluginData = await response.json();
      

      
      console.log(chalk.green(`✅ Successfully installed ${pluginName}@${pluginData.version}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to install plugin ${pluginName}: ${error}`));
      return false;
    }
  }

  /**
   * Search marketplace for plugins
   */
  async searchMarketplace(query: string, category?: string): Promise<any[]> {
    if (!this.config.marketplace?.enabled) {
      console.error(chalk.red('❌ Marketplace is not enabled'));
      return [];
    }

    const registryUrl = this.config.marketplace.registryUrl || 'https://registry.lorm.dev';
    const apiKey = this.config.marketplace.apiKey || process.env.LORM_MARKETPLACE_API_KEY;

    try {
      const searchParams = new URLSearchParams({ q: query });
      if (category) searchParams.append('category', category);
      
      const response = await fetch(`${registryUrl}/search?${searchParams}`, {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
          'User-Agent': `lorm-cli/${this.context.version}`
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error(chalk.red(`❌ Marketplace search failed: ${error}`));
      return [];
    }
  }

  /**
   * Get plugin marketplace info
   */
  getMarketplaceInfo(): { enabled: boolean; registryUrl?: string; hasApiKey: boolean } {
    return {
      enabled: this.config.marketplace?.enabled || false,
      registryUrl: this.config.marketplace?.registryUrl,
      hasApiKey: !!(this.config.marketplace?.apiKey || process.env.LORM_MARKETPLACE_API_KEY)
    };
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    const pluginName = this.getPluginNameFromPath(pluginPath);
    if (this.config.disabled?.includes(pluginName)) {
      return;
    }

    try {
      const pluginModule = await import(pluginPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      if (!plugin.name || !plugin.version) {
        throw new Error('Plugin must have name and version');
      }

      if (this.plugins.has(plugin.name)) {
        console.warn(chalk.yellow(`⚠️  Plugin ${plugin.name} already loaded, skipping`));
        return;
      }

      this.plugins.set(plugin.name, plugin);

      if (plugin.hooks) {
        plugin.hooks.forEach(hook => {
          if (!this.hooks.has(hook.name)) {
            this.hooks.set(hook.name, []);
          }
          this.hooks.get(hook.name)!.push(hook);
        });
      }

      console.log(chalk.green(`✅ Loaded plugin: ${plugin.name}@${plugin.version}`));
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error}`);
    }
  }

  private discoverPlugins(): string[] {
    const plugins: string[] = [];

    if (this.config.requireAuth) {
      console.log(chalk.gray('🔒 Auth mode: Only loading local plugins from .lorm/plugins/'));
      
      const localPluginsDir = resolve(this.context.cwd, '.lorm', 'plugins');
      if (existsSync(localPluginsDir)) {
        try {
          const files = readdirSync(localPluginsDir);
          files.forEach((file: string) => {
            if (file.endsWith('.js') || file.endsWith('.mjs')) {
              plugins.push(resolve(localPluginsDir, file));
            }
          });
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Could not read local plugins directory: ${error}`));
        }
      }
      
      return plugins;
    }

    try {
      const packageJsonPath = resolve(this.context.cwd, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        Object.keys(dependencies).forEach(dep => {
          if (dep.startsWith('lorm-plugin-') || dep.startsWith('@lorm/plugin-')) {
            try {
              const pluginPath = require.resolve(dep, { paths: [this.context.cwd] });
              plugins.push(pluginPath);
            } catch (error) {
              console.warn(chalk.yellow(`⚠️  Could not resolve plugin ${dep}`));
            }
          }
        });
      }
    } catch (error) {
    }

    this.config.plugins.forEach(pluginName => {
      try {
        const pluginPath = require.resolve(pluginName, { paths: [this.context.cwd] });
        if (!plugins.includes(pluginPath)) {
          plugins.push(pluginPath);
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not resolve configured plugin ${pluginName}`));
      }
    });

    const localPluginsDir = resolve(this.context.cwd, '.lorm', 'plugins');
    if (existsSync(localPluginsDir)) {
      try {
        const files = readdirSync(localPluginsDir);
        files.forEach((file: string) => {
          if (file.endsWith('.js') || file.endsWith('.mjs')) {
            plugins.push(resolve(localPluginsDir, file));
          }
        });
      } catch (error) {
      }
    }

    return plugins;
  }

  private loadConfig(): PluginConfig {
    const defaultConfig: PluginConfig = {
      plugins: [],
      disabled: [],
      settings: {},
      authorizedUsers: [],
      requireAuth: false,
      marketplace: {
        enabled: false,
        registryUrl: 'https://registry.lorm.dev'
      },
      premium: {}
    };

    try {
      const configPath = resolve(this.context.cwd, '.lorm', 'plugins.json');
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8');
        return { ...defaultConfig, ...JSON.parse(content) };
      }
    } catch (error) {
    }

    return defaultConfig;
  }

  private getPluginNameFromPath(pluginPath: string): string {
    const parts = pluginPath.split(/[\/\\]/);
    const filename = parts[parts.length - 1];
    return filename.replace(/\.(js|mjs)$/, '');
  }
}


export function createPlugin(plugin: Omit<Plugin, 'version'> & { version?: string }): Plugin {
  return {
    version: '1.0.0',
    ...plugin
  };
}


export const pluginUtils = {
 
  command(
    name: string,
    description: string,
    action: PluginCommand['action'],
    options?: PluginCommand['options']
  ): PluginCommand {
    return { name, description, action, options };
  },

  hook(name: string, handler: PluginHook['handler']): PluginHook {
    return { name, handler };
  },

  validate(plugin: any): plugin is Plugin {
    return (
      typeof plugin === 'object' &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string'
    );
  },

  /**
   * Create a premium plugin with license validation
   */
  createPremiumPlugin(
    plugin: Omit<Plugin, 'isPremium' | 'license'>,
    license: {
      type: 'premium' | 'enterprise';
      requiresKey?: boolean;
      serviceEndpoint?: string;
    }
  ): Plugin {
    return {
      ...plugin,
      isPremium: true,
      license
    };
  },

  /**
   * Create a marketplace-ready plugin
   */
  createMarketplacePlugin(
    plugin: Omit<Plugin, 'marketplace'>,
    marketplace: {
      category: string;
      tags: string[];
      author: string;
      homepage?: string;
      repository?: string;
    }
  ): Plugin {
    return {
      ...plugin,
      marketplace
    };
  },

  /**
   * Create a service-connected plugin
   */
  createServicePlugin(
    plugin: Omit<Plugin, 'isPremium' | 'license'>,
    serviceEndpoint: string,
    requiresKey: boolean = true
  ): Plugin {
    return {
      ...plugin,
      isPremium: true,
      license: {
        type: 'premium',
        requiresKey,
        serviceEndpoint
      }
    };
  },

  /**
   * Validate service connectivity
   */
  async validateService(endpoint: string, apiKey?: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${endpoint}/health`, {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
};