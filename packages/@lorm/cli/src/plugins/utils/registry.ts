/**
 * Plugin Registry Utilities
 * Manages plugin metadata, marketplace interactions, and plugin discovery
 */

import type {
  PluginRegistry,
  PluginInfo,
  MarketplacePlugin,
  PluginSearchOptions,
  PluginSearchResult,
  PluginListResult,
  PluginError
} from '../types';
import { PluginErrorCode } from '../types';
import { createPluginError, validatePlugin } from './validation';
import {
  getPluginConfigDirectory,
  readJsonFile,
  writeJsonFile,
  pathExists,
  ensureDirectoryExists
} from './filesystem';
import path from 'path';

/**
 * Plugin Registry Manager
 * Handles local plugin registry and marketplace interactions
 */
export class PluginRegistryManager {
  private registryPath: string;
  private cachePath: string;
  private registry: PluginRegistry | null = null;

  constructor() {
    const configDir = getPluginConfigDirectory();
    this.registryPath = path.join(configDir, 'registry.json');
    this.cachePath = path.join(configDir, 'marketplace-cache.json');
  }

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    try {
      await ensureDirectoryExists(path.dirname(this.registryPath));
      
      if (await pathExists(this.registryPath)) {
        this.registry = await readJsonFile<PluginRegistry>(this.registryPath);
      } else {
        this.registry = {
          plugins: {},
          lastUpdated: new Date(),
          version: '1.0.0'
        };
        await this.saveRegistry();
      }
    } catch (error) {
      throw createPluginError(
        PluginErrorCode.REGISTRY_INIT_FAILED,
        `Failed to initialize plugin registry: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get the current registry
   */
  async getRegistry(): Promise<PluginRegistry> {
    if (!this.registry) {
      await this.initialize();
    }
    return this.registry!;
  }

  /**
   * Save the registry to disk
   */
  private async saveRegistry(): Promise<void> {
    if (!this.registry) {
      throw createPluginError(PluginErrorCode.REGISTRY_NOT_INITIALIZED, 'Registry not initialized');
    }
    
    this.registry.lastUpdated = new Date();
    await writeJsonFile(this.registryPath, this.registry);
  }

  /**
   * Register a plugin in the local registry
   */
  async registerPlugin(pluginInfo: PluginInfo): Promise<void> {
    const registry = await this.getRegistry();
    
    // Validate plugin info
    const validation = validatePlugin(pluginInfo);
    if (!validation.valid) {
      throw createPluginError(
        PluginErrorCode.INVALID_STRUCTURE,
        `Cannot register invalid plugin: ${validation.errors.join(', ')}`
      );
    }
    
    registry.plugins[pluginInfo.name] = pluginInfo;
    await this.saveRegistry();
  }

  /**
   * Unregister a plugin from the local registry
   */
  async unregisterPlugin(pluginName: string): Promise<void> {
    const registry = await this.getRegistry();
    
    if (!(pluginName in registry.plugins)) {
      throw createPluginError(
        PluginErrorCode.NOT_FOUND,
        `Plugin ${pluginName} is not registered`
      );
    }
    
    delete registry.plugins[pluginName];
    await this.saveRegistry();
  }

  /**
   * Get a specific plugin from the registry
   */
  async getPlugin(pluginName: string): Promise<PluginInfo | null> {
    const registry = await this.getRegistry();
    return registry.plugins[pluginName] || null;
  }

  /**
   * List all registered plugins
   */
  async listPlugins(options: PluginSearchOptions = {}): Promise<PluginListResult> {
    try {
      const registry = await this.getRegistry();
      let plugins = Object.values(registry.plugins);
      
      // Apply filters
      if (options.enabled !== undefined) {
        plugins = plugins.filter(plugin => plugin.enabled === options.enabled);
      }
      
      if (options.source) {
        plugins = plugins.filter(plugin => plugin.source === options.source);
      }
      
      if (options.author) {
        plugins = plugins.filter(plugin => 
          (plugin.author || '').toLowerCase().includes(options.author!.toLowerCase())
        );
      }
      
      // Apply search query
      if (options.query) {
        const query = options.query.toLowerCase();
        plugins = plugins.filter(plugin => 
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          (plugin.keywords && plugin.keywords.some(keyword => 
            keyword.toLowerCase().includes(query)
          ))
        );
      }
      
      // Sort plugins
      const sortBy = options.sortBy || 'name';
      plugins.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'version':
            return a.version.localeCompare(b.version);
          case 'installedAt':
            const aDate = a.installedAt ? new Date(a.installedAt).getTime() : 0;
            const bDate = b.installedAt ? new Date(b.installedAt).getTime() : 0;
            return bDate - aDate;
          case 'author':
            return (a.author || '').localeCompare(b.author || '');
          default:
            return 0;
        }
      });
      
      // Apply pagination
      const limit = options.limit || plugins.length;
      const offset = options.offset || 0;
      const paginatedPlugins = plugins.slice(offset, offset + limit);
      
      return {
        success: true,
        plugins: paginatedPlugins,
        total: plugins.length,
        offset,
        limit
      };
    } catch (error) {
      return {
        success: false,
        plugins: [],
        total: 0,
        offset: 0,
        limit: 0,
        error: error as PluginError
      };
    }
  }

  /**
   * Update plugin information in the registry
   */
  async updatePlugin(pluginName: string, updates: Partial<PluginInfo>): Promise<void> {
    const registry = await this.getRegistry();
    
    if (!(pluginName in registry.plugins)) {
      throw createPluginError(
        PluginErrorCode.NOT_FOUND,
        `Plugin ${pluginName} is not registered`
      );
    }
    
    registry.plugins[pluginName] = {
      ...registry.plugins[pluginName],
      ...updates
    };
    
    await this.saveRegistry();
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginName: string): Promise<void> {
    await this.updatePlugin(pluginName, { enabled: true });
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginName: string): Promise<void> {
    await this.updatePlugin(pluginName, { enabled: false });
  }

  /**
   * Search marketplace for plugins
   */
  async searchMarketplace(options: PluginSearchOptions = {}): Promise<PluginSearchResult> {
    try {
      // In a real implementation, this would make HTTP requests to a marketplace API
      // For now, I'm return a mock result
      const mockMarketplacePlugins: MarketplacePlugin[] = [
        {
          name: '@lorm/plugin-git',
          version: '1.0.0',
          description: 'Git integration plugin for LORM CLI',
          author: 'LORM Team',
          license: { type: 'MIT' },
          keywords: ['git', 'version-control'],
          downloadUrl: 'https://registry.npmjs.org/@lorm/plugin-git/-/plugin-git-1.0.0.tgz',
          homepage: 'https://github.com/lorm/plugins/tree/main/packages/git',
          repository: {
            type: 'git',
            url: 'https://github.com/lorm/plugins.git'
          },
          downloads: 1250,
          rating: 4.8,
          reviews: [
            {
              rating: 5,
              comment: 'Excellent Git integration!',
              author: 'developer1',
              date: new Date('2024-01-15')
            }
          ],
          publishedAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          name: '@lorm/plugin-docker',
          version: '1.2.0',
          description: 'Docker management plugin for LORM CLI',
          author: 'LORM Team',
          license: { type: 'MIT' },
          keywords: ['docker', 'containers'],
          downloadUrl: 'https://registry.npmjs.org/@lorm/plugin-docker/-/plugin-docker-1.2.0.tgz',
          homepage: 'https://github.com/lorm/plugins/tree/main/packages/docker',
          repository: {
            type: 'git',
            url: 'https://github.com/lorm/plugins.git'
          },
          downloads: 890,
          rating: 4.6,
          reviews: [
            {
              rating: 5,
              comment: 'Great Docker integration',
              author: 'developer2',
              date: new Date('2024-01-10')
            }
          ],
          publishedAt: new Date('2023-12-15'),
          updatedAt: new Date('2024-01-10')
        }
      ];
      
      let filteredPlugins = mockMarketplacePlugins;
      
      // Apply search query
      if (options.query) {
        const query = options.query.toLowerCase();
        filteredPlugins = filteredPlugins.filter(plugin => 
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          (plugin.keywords && plugin.keywords.some(keyword => 
            keyword.toLowerCase().includes(query)
          ))
        );
      }
      
      // Apply author filter
      if (options.author) {
        filteredPlugins = filteredPlugins.filter(plugin => 
          plugin.author.toLowerCase().includes(options.author!.toLowerCase())
        );
      }
      
      // Sort plugins
      const sortBy = options.sortBy || 'downloads';
      filteredPlugins.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'downloads':
            return b.downloads - a.downloads;
          case 'rating':
            return b.rating - a.rating;
          case 'publishedAt':
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          case 'updatedAt':
            const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            return bUpdated - aUpdated;
          default:
            return 0;
        }
      });
      
      // Apply pagination
      const limit = options.limit || filteredPlugins.length;
      const offset = options.offset || 0;
      const paginatedPlugins = filteredPlugins.slice(offset, offset + limit);
      
      return {
        success: true,
        plugins: paginatedPlugins,
        total: filteredPlugins.length,
        offset,
        limit
      };
    } catch (error) {
      return {
        success: false,
        plugins: [],
        total: 0,
        offset: 0,
        limit: 0,
        error: error as PluginError
      };
    }
  }

  /**
   * Get plugin details from marketplace
   */
  async getMarketplacePlugin(pluginName: string): Promise<MarketplacePlugin | null> {
    const searchResult = await this.searchMarketplace({ query: pluginName });
    
    if (searchResult.success && searchResult.plugins.length > 0) {
      return searchResult.plugins.find(plugin => plugin.name === pluginName) || null;
    }
    
    return null;
  }

  /**
   * Check if a plugin is installed
   */
  async isPluginInstalled(pluginName: string): Promise<boolean> {
    const plugin = await this.getPlugin(pluginName);
    return plugin !== null;
  }

  /**
   * Get installed plugin count
   */
  async getInstalledPluginCount(): Promise<number> {
    const registry = await this.getRegistry();
    return Object.keys(registry.plugins).length;
  }

  /**
   * Get enabled plugin count
   */
  async getEnabledPluginCount(): Promise<number> {
    const registry = await this.getRegistry();
    return Object.values(registry.plugins).filter(plugin => plugin.enabled).length;
  }

  /**
   * Clear the registry (for testing or reset)
   */
  async clearRegistry(): Promise<void> {
    this.registry = {
      plugins: {},
      lastUpdated: new Date(),
      version: '1.0.0'
    };
    await this.saveRegistry();
  }

  /**
   * Export registry data
   */
  async exportRegistry(): Promise<PluginRegistry> {
    return await this.getRegistry();
  }

  /**
   * Import registry data
   */
  async importRegistry(registryData: PluginRegistry): Promise<void> {
    // Validate registry structure
    if (!registryData.plugins || typeof registryData.plugins !== 'object') {
      throw createPluginError(
        PluginErrorCode.INVALID_REGISTRY,
        'Invalid registry data structure'
      );
    }
    
    // Validate each plugin in the registry
    for (const [name, plugin] of Object.entries(registryData.plugins)) {
      const validation = validatePlugin(plugin);
      if (!validation.valid) {
        throw createPluginError(
          PluginErrorCode.INVALID_STRUCTURE,
          `Invalid plugin ${name} in registry: ${validation.errors.join(', ')}`
        );
      }
    }
    
    this.registry = {
      ...registryData,
      lastUpdated: new Date()
    };
    
    await this.saveRegistry();
  }
}

/**
 * Create a new plugin registry manager instance
 */
export function createPluginRegistry(): PluginRegistryManager {
  return new PluginRegistryManager();
}

/**
 * Global registry instance
 */
let globalRegistry: PluginRegistryManager | null = null;

/**
 * Get the global plugin registry instance
 */
export function getPluginRegistry(): PluginRegistryManager {
  if (!globalRegistry) {
    globalRegistry = createPluginRegistry();
  }
  return globalRegistry;
}