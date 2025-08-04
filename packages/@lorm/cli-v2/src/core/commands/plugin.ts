/**
 * Plugin Commands for CLI v2
 * Manages plugin installation, configuration, and lifecycle using the new core infrastructure
 */

import { createCommand } from '../../utils/command-factory';
import { CLIPluginService } from '../../services/plugin-service';
import { Logger } from '../../utils/logger';
import { detectProject } from '../../utils/project-detection';
import type { BaseCommandOptions, CommandConfig } from './types.js';

// Plugin command interfaces for CLI-specific options
interface CLIPluginInstallOptions {
  name: string;
  source: 'npm' | 'local' | 'git' | 'marketplace';
  version?: string;
  force?: boolean;
}

interface CLIPluginUninstallOptions {
  name: string;
  force?: boolean;
}

interface CLIPluginListOptions {
  enabled?: boolean;
  disabled?: boolean;
  format?: 'table' | 'json' | 'simple';
}

interface CLIPluginSearchOptions {
  query: string;
  limit?: number;
  source?: 'npm' | 'marketplace' | 'all';
}

interface CLIPluginEnableOptions {
  name: string;
}

interface CLIPluginDisableOptions {
  name: string;
}

interface CLIPluginUpdateOptions {
  name: string;
  force?: boolean;
}

interface CLIPluginReloadOptions {
  // No specific options for reload
}

/**
 * Install a plugin from various sources
 */
export const pluginInstallCommand = createCommand({
  name: 'plugin:install',
  description: 'Install a plugin from npm, local path, git repository, or marketplace',
  options: [
    {
      flag: 'name',
      description: 'Plugin name or path'
    },
    {
      flag: 'source',
      description: 'Plugin source (npm, local, git, marketplace)',
      defaultValue: 'npm'
    },
    {
      flag: 'version',
      description: 'Specific version to install (for npm/marketplace)'
    },
    {
      flag: 'force',
      description: 'Force installation even if plugin already exists',
      defaultValue: false
    }
  ],
  action: async (options: BaseCommandOptions & { name: string; source?: string; force?: boolean; dev?: boolean; global?: boolean; version?: string }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const installOptions = {
        source: options.source as any,
        version: options.version,
        force: options.force
      };
      
      const result = await pluginService.installPlugin(options.name, installOptions);
      Logger.success(result.message);
    } catch (error) {
      Logger.error('Failed to install plugin');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Uninstall a plugin
 */
export const pluginUninstallCommand = createCommand({
  name: 'plugin:uninstall',
  description: 'Uninstall a plugin and remove it from the system',
  options: [
    {
      flag: 'name',
      description: 'Plugin name to uninstall'
    },
    {
      flag: 'force',
      description: 'Force uninstallation even if there are errors',
      defaultValue: false
    }
  ],
  action: async (options: BaseCommandOptions & { name: string; force?: boolean }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const uninstallOptions = {
        force: options.force
      };
      
      const result = await pluginService.uninstallPlugin(options.name, uninstallOptions);
      Logger.success(result.message);
    } catch (error) {
      Logger.error('Failed to uninstall plugin');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * List installed plugins
 */
export const pluginListCommand = createCommand({
  name: 'plugin:list',
  description: 'List all installed plugins with their status and information',
  options: [
    {
      flag: 'enabled',
      description: 'Show only enabled plugins',
      defaultValue: false
    },
    {
      flag: 'disabled',
      description: 'Show only disabled plugins',
      defaultValue: false
    },
    {
      flag: 'format',
      description: 'Output format (table, json, simple)',
      defaultValue: 'table'
    }
  ],
  action: async (options: BaseCommandOptions & { enabled?: boolean; disabled?: boolean; format?: string }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const listOptions = {
        enabled: options.enabled,
        disabled: options.disabled
      };
      
      const result = await pluginService.listPlugins(listOptions);
      
      if (result.plugins.length === 0) {
        Logger.info('No plugins are currently installed');
        Logger.dim('Use "lorm plugin:search <query>" to find plugins to install');
        return;
      }
      
      // Display plugins in requested format
      if (options.format === 'json') {
        console.log(JSON.stringify(result.plugins, null, 2));
      } else if (options.format === 'simple') {
        result.plugins.forEach(plugin => {
          const status = plugin.enabled ? '✓' : '✗';
          console.log(`${status} ${plugin.name} (${plugin.version})`);
        });
      } else {
        // Table format (default)
        Logger.info(`Found ${result.plugins.length} plugin(s):`);
        console.log('');
        
        // Header
        console.log('Name'.padEnd(25) + 'Version'.padEnd(12) + 'Status'.padEnd(10) + 'Description');
        console.log('-'.repeat(80));
        
        // Plugin rows
        result.plugins.forEach(plugin => {
          const name = plugin.name.padEnd(25);
          const version = plugin.version.padEnd(12);
          const status = (plugin.enabled ? 'Enabled' : 'Disabled').padEnd(10);
          const description = plugin.description || 'No description';
          
          console.log(`${name}${version}${status}${description}`);
        });
        
        console.log('');
        Logger.dim(`Total: ${result.plugins.length} plugin(s)`);
      }
    } catch (error) {
      Logger.error('Failed to list plugins');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Search for plugins in various sources
 */
export const pluginSearchCommand = createCommand({
  name: 'plugin:search',
  description: 'Search for plugins in npm registry, marketplace, or other sources',
  options: [
    {
      flag: 'query',
      description: 'Search query (plugin name, keywords, or description)'
    },
    {
      flag: 'limit',
      description: 'Maximum number of results to show',
      defaultValue: 10
    },
    {
      flag: 'source',
      description: 'Search source',
      defaultValue: 'all'
    }
  ],
  action: async (options: BaseCommandOptions & { query: string; limit?: number; source?: string }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const searchOptions = {
        limit: options.limit || 10,
        sources: options.source === 'all' ? ['npm', 'marketplace'] : [options.source as any]
      };
      
      const results = await pluginService.searchPlugins(options.query, searchOptions);
      
      if (results.results.length === 0) {
        Logger.info('No plugins found matching your search criteria');
        Logger.dim('Try different keywords or check the plugin name spelling');
        return;
      }
      
      Logger.info(`Found ${results.results.length} plugin(s):`);
      console.log('');
      
      // Header
      console.log('Name'.padEnd(30) + 'Version'.padEnd(12) + 'Author'.padEnd(20) + 'Description');
      console.log('-'.repeat(100));
      
      // Plugin rows
      results.results.forEach((plugin: any) => {
        const name = plugin.name.padEnd(30);
        const version = plugin.version.padEnd(12);
        const author = (plugin.author || 'Unknown').padEnd(20);
        const description = plugin.description || 'No description available';
        
        console.log(`${name}${version}${author}${description}`);
        
        if (plugin.keywords && plugin.keywords.length > 0) {
          console.log(`${''.padEnd(30)}${''.padEnd(12)}${''.padEnd(20)}Keywords: ${plugin.keywords.join(', ')}`);
        }
        console.log('');
      });
      
      Logger.dim(`Use "lorm plugin:install <name>" to install a plugin`);
    } catch (error) {
      Logger.error('Failed to search plugins');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Enable a plugin
 */
export const pluginEnableCommand = createCommand({
  name: 'plugin:enable',
  description: 'Enable a disabled plugin and activate its functionality',
  options: [
    {
      flag: 'name',
      description: 'Plugin name to enable'
    }
  ],
  action: async (options: BaseCommandOptions & { name: string }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const result = await pluginService.enablePlugin(options.name);
      Logger.success(result.message);
    } catch (error) {
      Logger.error('Failed to enable plugin');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Disable a plugin
 */
export const pluginDisableCommand = createCommand({
  name: 'plugin:disable',
  description: 'Disable an enabled plugin and deactivate its functionality',
  options: [
    {
      flag: 'name',
      description: 'Plugin name to disable'
    }
  ],
  action: async (options: BaseCommandOptions & { name: string }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const result = await pluginService.disablePlugin(options.name);
      Logger.success(result.message);
    } catch (error) {
      Logger.error('Failed to disable plugin');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Update a plugin to the latest version
 */
export const pluginUpdateCommand = createCommand({
  name: 'plugin:update',
  description: 'Update a plugin to the latest available version',
  options: [
    {
      flag: 'name',
      description: 'Plugin name to update'
    },
    {
      flag: 'force',
      description: 'Force update even if already up to date',
      defaultValue: false
    }
  ],
  action: async (options: BaseCommandOptions & { name: string; force?: boolean }) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      // Update is handled through uninstall + install for now
      Logger.info(`Updating plugin "${options.name}"...`);
      
      // Get current plugin info
      const pluginInfo = await pluginService.getPluginInfo(options.name);
      
      // Uninstall current version
      await pluginService.uninstallPlugin(options.name, { force: true });
      
      // Reinstall latest version
      await pluginService.installPlugin(options.name, { 
        source: 'npm',
        force: true 
      });
      
      Logger.success(`Successfully updated plugin "${options.name}"`);
    } catch (error) {
      Logger.error('Failed to update plugin');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Reload the plugin system
 */
export const pluginReloadCommand = createCommand({
  name: 'plugin:reload',
  description: 'Reload the entire plugin system and refresh all plugins',
  options: [],
  action: async (options: BaseCommandOptions) => {
    try {
      const projectContext = await detectProject();
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      const result = await pluginService.reloadPlugins();
      Logger.success(result.message);
    } catch (error) {
      Logger.error('Failed to reload plugin system');
      if (error instanceof Error) {
        Logger.error(error.message);
      }
      process.exit(1);
    }
  }
});

/**
 * Export all plugin commands
 */
export const getPluginCommands = (): CommandConfig<BaseCommandOptions>[] => [
  pluginInstallCommand as CommandConfig<BaseCommandOptions>,
  pluginUninstallCommand as CommandConfig<BaseCommandOptions>,
  pluginListCommand as CommandConfig<BaseCommandOptions>,
  pluginSearchCommand as CommandConfig<BaseCommandOptions>,
  pluginEnableCommand as CommandConfig<BaseCommandOptions>,
  pluginDisableCommand as CommandConfig<BaseCommandOptions>,
  pluginUpdateCommand as CommandConfig<BaseCommandOptions>,
  pluginReloadCommand as CommandConfig<BaseCommandOptions>
];