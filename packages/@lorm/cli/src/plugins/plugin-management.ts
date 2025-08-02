import { createSimplePlugin, SimplePlugin, SimplePluginBuilder } from "@lorm/core";
import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { CommonCommandOptions } from "@/types";

interface PluginInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  installed: boolean;
  source: 'marketplace' | 'git' | 'local' | 'npm';
  author?: string;
  homepage?: string;
  lastUpdated?: string;
}

interface PluginInstallOptions extends CommonCommandOptions {
  source?: string;
  pluginVersion?: string;
  dev?: boolean;
}

interface PluginListOptions extends CommonCommandOptions {
  enabled?: boolean;
  disabled?: boolean;
  format?: 'table' | 'json' | 'simple';
}

interface PluginSearchOptions extends CommonCommandOptions {
  category?: string;
  author?: string;
  limit?: number;
}

/**
 * Plugin Management Service
 */
class PluginManagementService {
  private pluginsConfigPath: string;
  private pluginsDir: string;

  constructor() {
    this.pluginsConfigPath = resolve(process.cwd(), '.lorm', 'plugins.json');
    this.pluginsDir = resolve(process.cwd(), '.lorm', 'plugins');
  }

  /**
   * Get installed plugins configuration
   */
  private getPluginsConfig(): Record<string, PluginInfo> {
    if (!existsSync(this.pluginsConfigPath)) {
      return {};
    }
    try {
      return JSON.parse(readFileSync(this.pluginsConfigPath, 'utf8'));
    } catch {
      return {};
    }
  }

  /**
   * Save plugins configuration
   */
  private savePluginsConfig(config: Record<string, PluginInfo>): void {
    try {
      writeFileSync(this.pluginsConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save plugins configuration: ${error}`);
    }
  }

  /**
   * Install a plugin
   */
  async installPlugin(name: string, options: PluginInstallOptions): Promise<void> {
    console.log(chalk.blue(`📦 Installing plugin: ${name}`));
    
    const config = this.getPluginsConfig();
    
    if (config[name]?.installed) {
      console.log(chalk.yellow(`⚠️  Plugin ${name} is already installed`));
      return;
    }

    // Simulate plugin installation
    const pluginInfo: PluginInfo = {
      name,
      version: options.pluginVersion || '1.0.0',
      description: `Plugin ${name}`,
      enabled: true,
      installed: true,
      source: (options.source as any) || 'marketplace',
      author: 'Unknown',
      lastUpdated: new Date().toISOString()
    };

    config[name] = pluginInfo;
    this.savePluginsConfig(config);

    console.log(chalk.green(`✅ Successfully installed plugin: ${name}`));
    console.log(chalk.gray(`   Version: ${pluginInfo.version}`));
    console.log(chalk.gray(`   Source: ${pluginInfo.source}`));
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(name: string): Promise<void> {
    console.log(chalk.blue(`🗑️  Uninstalling plugin: ${name}`));
    
    const config = this.getPluginsConfig();
    
    if (!config[name]?.installed) {
      console.log(chalk.red(`❌ Plugin ${name} is not installed`));
      return;
    }

    delete config[name];
    this.savePluginsConfig(config);

    console.log(chalk.green(`✅ Successfully uninstalled plugin: ${name}`));
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(name: string): Promise<void> {
    console.log(chalk.blue(`🔌 Enabling plugin: ${name}`));
    
    const config = this.getPluginsConfig();
    
    if (!config[name]?.installed) {
      console.log(chalk.red(`❌ Plugin ${name} is not installed`));
      return;
    }

    if (config[name].enabled) {
      console.log(chalk.yellow(`⚠️  Plugin ${name} is already enabled`));
      return;
    }

    config[name].enabled = true;
    this.savePluginsConfig(config);

    console.log(chalk.green(`✅ Successfully enabled plugin: ${name}`));
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(name: string): Promise<void> {
    console.log(chalk.blue(`🔌 Disabling plugin: ${name}`));
    
    const config = this.getPluginsConfig();
    
    if (!config[name]?.installed) {
      console.log(chalk.red(`❌ Plugin ${name} is not installed`));
      return;
    }

    if (!config[name].enabled) {
      console.log(chalk.yellow(`⚠️  Plugin ${name} is already disabled`));
      return;
    }

    config[name].enabled = false;
    this.savePluginsConfig(config);

    console.log(chalk.green(`✅ Successfully disabled plugin: ${name}`));
  }

  /**
   * List installed plugins
   */
  async listPlugins(options: PluginListOptions): Promise<void> {
    const config = this.getPluginsConfig();
    const plugins = Object.values(config);

    if (plugins.length === 0) {
      console.log(chalk.gray('No plugins installed'));
      return;
    }

    // Filter plugins based on options
    let filteredPlugins = plugins;
    if (options.enabled) {
      filteredPlugins = plugins.filter(p => p.enabled);
    } else if (options.disabled) {
      filteredPlugins = plugins.filter(p => !p.enabled);
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(filteredPlugins, null, 2));
      return;
    }

    console.log(chalk.bold('\n📦 Installed Plugins:\n'));
    
    if (options.format === 'table') {
      console.log(chalk.gray('Name'.padEnd(20) + 'Version'.padEnd(12) + 'Status'.padEnd(10) + 'Source'));
      console.log(chalk.gray('-'.repeat(60)));
    }

    filteredPlugins.forEach(plugin => {
      const status = plugin.enabled ? chalk.green('enabled') : chalk.red('disabled');
      const name = chalk.cyan(plugin.name);
      
      if (options.format === 'table') {
        console.log(`${name.padEnd(20)} ${plugin.version.padEnd(12)} ${status.padEnd(10)} ${plugin.source}`);
      } else {
        console.log(`${name} (${plugin.version}) - ${status}`);
        if (plugin.description) {
          console.log(chalk.gray(`  ${plugin.description}`));
        }
      }
    });

    console.log(chalk.gray(`\nTotal: ${filteredPlugins.length} plugins`));
  }

  /**
   * Show plugin information
   */
  async showPluginInfo(name: string): Promise<void> {
    const config = this.getPluginsConfig();
    const plugin = config[name];

    if (!plugin) {
      console.log(chalk.red(`❌ Plugin ${name} is not installed`));
      return;
    }

    console.log(chalk.bold(`\n📦 Plugin Information: ${chalk.cyan(name)}\n`));
    console.log(`${chalk.bold('Name:')} ${plugin.name}`);
    console.log(`${chalk.bold('Version:')} ${plugin.version}`);
    console.log(`${chalk.bold('Description:')} ${plugin.description}`);
    console.log(`${chalk.bold('Status:')} ${plugin.enabled ? chalk.green('enabled') : chalk.red('disabled')}`);
    console.log(`${chalk.bold('Source:')} ${plugin.source}`);
    
    if (plugin.author) {
      console.log(`${chalk.bold('Author:')} ${plugin.author}`);
    }
    
    if (plugin.homepage) {
      console.log(`${chalk.bold('Homepage:')} ${plugin.homepage}`);
    }
    
    if (plugin.lastUpdated) {
      console.log(`${chalk.bold('Last Updated:')} ${new Date(plugin.lastUpdated).toLocaleDateString()}`);
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(name: string): Promise<void> {
    console.log(chalk.blue(`🔄 Updating plugin: ${name}`));
    
    const config = this.getPluginsConfig();
    
    if (!config[name]?.installed) {
      console.log(chalk.red(`❌ Plugin ${name} is not installed`));
      return;
    }

    // Simulate update
    config[name].lastUpdated = new Date().toISOString();
    this.savePluginsConfig(config);

    console.log(chalk.green(`✅ Successfully updated plugin: ${name}`));
  }

  /**
   * Search for available plugins
   */
  async searchPlugins(query: string, options: PluginSearchOptions): Promise<void> {
    console.log(chalk.blue(`🔍 Searching for plugins: ${query}`));
    
    // Mock search results
    const mockResults = [
      {
        name: `${query}-auth`,
        version: '2.1.0',
        description: `Authentication plugin for ${query}`,
        author: 'LORM Team',
        downloads: 1250,
        rating: 4.8
      },
      {
        name: `${query}-cache`,
        version: '1.5.2',
        description: `Caching solution for ${query}`,
        author: 'Community',
        downloads: 890,
        rating: 4.6
      },
      {
        name: `${query}-utils`,
        version: '3.0.1',
        description: `Utility functions for ${query}`,
        author: 'LORM Team',
        downloads: 2100,
        rating: 4.9
      }
    ];

    if (mockResults.length === 0) {
      console.log(chalk.gray('No plugins found matching your search'));
      return;
    }

    console.log(chalk.bold(`\n🔍 Search Results (${mockResults.length} found):\n`));
    
    mockResults.slice(0, options.limit || 10).forEach(plugin => {
      console.log(chalk.cyan(plugin.name) + chalk.gray(` (${plugin.version})`));
      console.log(chalk.gray(`  ${plugin.description}`));
      console.log(chalk.gray(`  Author: ${plugin.author} | Downloads: ${plugin.downloads} | Rating: ${plugin.rating}/5`));
      console.log();
    });
  }
}

const pluginService = new PluginManagementService();

/**
 * Create plugin management plugin
 */
export const createPluginManagementPlugin = (): SimplePlugin => {
  return new SimplePluginBuilder('plugin-management', '1.0.0')
    .description('Plugin lifecycle management commands')
    .addCommand({
      name: 'plugin:install',
      description: 'Install a new plugin',
      aliases: ['install-plugin'],
      category: 'plugin',
      options: [
        {
          flag: '--source',
          description: 'Plugin source (marketplace, git, local, npm)',
          defaultValue: 'marketplace'
        },
        {
          flag: '--plugin-version',
          description: 'Specific version to install'
        },
        {
          flag: '--dev',
          description: 'Install as development dependency',
          defaultValue: false
        }
      ],
      examples: [
        'lorm plugin:install auth-plugin',
        'lorm plugin:install my-plugin --source=git --plugin-version=2.0.0'
      ],
      action: async (args: Record<string, unknown>) => {
        const pluginName = (args._ as string[])?.[0];
        if (!pluginName) {
          console.log(chalk.red('❌ Plugin name is required'));
          console.log(chalk.gray('Usage: lorm plugin:install <plugin-name>'));
          return;
        }
        await pluginService.installPlugin(pluginName, args);
      }
    })
    .addCommand({
      name: 'plugin:uninstall',
      description: 'Uninstall a plugin',
      aliases: ['uninstall-plugin', 'plugin:remove'],
      category: 'plugin',
      examples: [
        'lorm plugin:uninstall auth-plugin'
      ],
      action: async (args: Record<string, unknown>) => {
        const pluginName = (args._ as string[])?.[0];
        if (!pluginName) {
          console.log(chalk.red('❌ Plugin name is required'));
          console.log(chalk.gray('Usage: lorm plugin:uninstall <plugin-name>'));
          return;
        }
        await pluginService.uninstallPlugin(pluginName);
      }
    })
    .addCommand({
      name: 'plugin:enable',
      description: 'Enable a disabled plugin',
      aliases: ['enable-plugin'],
      category: 'plugin',
      examples: [
        'lorm plugin:enable auth-plugin'
      ],
      action: async (args: Record<string, unknown>) => {
        const pluginName = (args._ as string[])?.[0];
        if (!pluginName) {
          console.log(chalk.red('❌ Plugin name is required'));
          console.log(chalk.gray('Usage: lorm plugin:enable <plugin-name>'));
          return;
        }
        await pluginService.enablePlugin(pluginName);
      }
    })
    .addCommand({
      name: 'plugin:disable',
      description: 'Disable an enabled plugin',
      aliases: ['disable-plugin'],
      category: 'plugin',
      examples: [
        'lorm plugin:disable auth-plugin'
      ],
      action: async (args: Record<string, unknown>) => {
        const pluginName = (args._ as string[])?.[0];
        if (!pluginName) {
          console.log(chalk.red('❌ Plugin name is required'));
          console.log(chalk.gray('Usage: lorm plugin:disable <plugin-name>'));
          return;
        }
        await pluginService.disablePlugin(pluginName);
      }
    })
    .addCommand({
      name: 'plugin:list',
      description: 'List all installed plugins',
      aliases: ['list-plugins', 'plugins'],
      category: 'plugin',
      options: [
          {
            flag: '--enabled',
            description: 'Show only enabled plugins'
          },
          {
            flag: '--disabled',
            description: 'Show only disabled plugins'
          },
          {
            flag: '--format',
            description: 'Output format (table, json)',
            defaultValue: 'table'
          }
        ],
      examples: [
        'lorm plugin:list',
        'lorm plugin:list --enabled --format=table'
      ],
      action: async (args: Record<string, unknown>) => {
        const options: PluginListOptions = {
          enabled: args.enabled as boolean,
          disabled: args.disabled as boolean,
          format: (args.format as 'table' | 'json' | 'simple') || 'table'
        };
        await pluginService.listPlugins(options);
      }
    })
    .addCommand({
      name: 'plugin:info',
      description: 'Show detailed information about a plugin',
      aliases: ['plugin-info'],
      category: 'plugin',
      examples: [
        'lorm plugin:info auth-plugin'
      ],
      action: async (args: Record<string, unknown>) => {
        const pluginName = (args._ as string[])?.[0];
        if (!pluginName) {
          console.log(chalk.red('❌ Plugin name is required'));
          console.log(chalk.gray('Usage: lorm plugin:info <plugin-name>'));
          return;
        }
        await pluginService.showPluginInfo(pluginName);
      }
    })
    .addCommand({
      name: 'plugin:update',
      description: 'Update a plugin to latest version',
      aliases: ['update-plugin'],
      category: 'plugin',
      examples: [
        'lorm plugin:update auth-plugin'
      ],
      action: async (args: Record<string, unknown>) => {
        const pluginName = (args._ as string[])?.[0];
        if (!pluginName) {
          console.log(chalk.red('❌ Plugin name is required'));
          console.log(chalk.gray('Usage: lorm plugin:update <plugin-name>'));
          return;
        }
        await pluginService.updatePlugin(pluginName);
      }
    })
    .addCommand({
      name: 'plugin:search',
      description: 'Search for available plugins',
      aliases: ['search-plugins'],
      category: 'plugin',
      options: [
        {
          flag: '--category',
          description: 'Filter by category'
        },
        {
          flag: '--author',
          description: 'Filter by author'
        },
        {
          flag: '--limit',
          description: 'Maximum number of results',
          defaultValue: 10
        }
      ],
      examples: [
        'lorm plugin:search auth',
        'lorm plugin:search database --category=db --limit=5'
      ],
      action: async (args: Record<string, unknown>) => {
        const query = (args._ as string[])?.[0];
        if (!query) {
          console.log(chalk.red('❌ Search query is required'));
          console.log(chalk.gray('Usage: lorm plugin:search <query>'));
          return;
        }
        await pluginService.searchPlugins(query, args);
      }
    })
    .build();
};