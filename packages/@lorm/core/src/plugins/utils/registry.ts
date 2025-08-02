/**
 * Plugin Registry Manager for LORM Framework
 * Manages plugin registration, discovery, and marketplace integration
 */

import { createLogger } from '../utils/logger';
import {
  PluginName,
  PluginVersion,
  PluginRegistry,
  PluginInfo,
  PluginSearchOptions,
  PluginSearchResult,
  PluginListResult,
  MarketplacePlugin,
  PluginReview,
  PluginError,
  PluginErrorCode,
  PluginRuntimeAdapter,
  FilePath,
  StrictRecord
} from '../types';

/**
 * Manages plugin registry operations including installation tracking,
 * marketplace synchronization, and plugin discovery
 */
export class PluginRegistryManager {
  private readonly registryPath: FilePath;
  private registry: PluginRegistry | null = null;
  private lastSync: Date | null = null;

  constructor(
    private readonly adapter: PluginRuntimeAdapter,
    pluginsDir: FilePath
  ) {
    this.registryPath = `${pluginsDir}/registry.json` as FilePath;
  }

  /**
   * Initialize the registry manager
   */
  async initialize(): Promise<void> {
    try {
      await this.loadRegistry();
      await this.syncWithInstalledPlugins();
      this.updateRegistryMetadata();
      await this.saveRegistry();
      
      createLogger('PluginRegistry').info('Plugin registry initialized');
    } catch (error) {
      createLogger('PluginRegistry').error('Failed to initialize plugin registry:', error);
      throw new Error(`Registry initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List plugins with filtering and sorting options
   */
  async listPlugins(options: {
    category?: string;
    tag?: string;
    status?: 'installed' | 'available' | 'all';
    sortBy?: 'name' | 'version' | 'downloads' | 'rating' | 'updated';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<PluginListResult> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        throw new Error('Registry not loaded');
      }

      let plugins = Object.values(this.registry.plugins);

      // Apply filters
      if (options.category) {
        plugins = plugins.filter(plugin => 
          plugin.marketplace?.category === options.category
        );
      }

      if (options.status && options.status !== 'all') {
        plugins = plugins.filter(plugin => {
          if (options.status === 'installed') return plugin.installed;
          if (options.status === 'available') return !plugin.installed;
          return true;
        });
      }

      // Apply sorting
      if (options.sortBy) {
        plugins.sort((a, b) => {
          let comparison = 0;
          
          switch (options.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'version':
              comparison = a.version.localeCompare(b.version);
              break;
            case 'updated':
              const aDate = a.updateDate || new Date(0);
              const bDate = b.updateDate || new Date(0);
              comparison = aDate.getTime() - bDate.getTime();
              break;
            default:
              comparison = a.name.localeCompare(b.name);
          }
          
          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      const paginatedPlugins = plugins.slice(offset, offset + limit);

      return {
        success: true,
        plugins: paginatedPlugins,
        total: plugins.length,
        offset,
        limit
      };
      
    } catch (error) {
      console.error('Failed to list plugins:', error);
      
      return {
        success: false,
        plugins: [],
        total: 0,
        offset: 0,
        limit: 0,
        error: {
          name: 'REGISTRY_ERROR' as const,
          code: PluginErrorCode.REGISTRY_ERROR,
          message: `Failed to list plugins: ${error instanceof Error ? error.message : 'Unknown error'}`
        } as PluginError
      };
    }
  }

  /**
   * Search plugins by query with advanced filtering
   */
  async searchPlugins(query: string, options: PluginSearchOptions = {}): Promise<PluginSearchResult> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        throw new Error('Registry not loaded');
      }

      let plugins = Object.values(this.registry.plugins);
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

      // Apply text search
      if (searchTerms.length > 0) {
        plugins = plugins.filter(plugin => {
          const searchableText = [
            plugin.name,
            plugin.description,
            plugin.author || '',
            ...(plugin.keywords || [])
          ].join(' ').toLowerCase();
          
          return searchTerms.some(term => searchableText.includes(term));
        });
      }

      // Apply filters
      if (options.category) {
        plugins = plugins.filter(plugin => 
          plugin.marketplace?.category === options.category
        );
      }

      if (options.author) {
        plugins = plugins.filter(plugin => 
          plugin.author && plugin.author.toLowerCase().includes(options.author!.toLowerCase())
        );
      }

      if (options.tags && options.tags.length > 0) {
        plugins = plugins.filter(plugin => 
          plugin.keywords && options.tags!.some(tag => 
            plugin.keywords!.includes(tag)
          )
        );
      }

      // Calculate relevance scores and sort
      const scoredPlugins = plugins.map(plugin => ({
        plugin,
        score: this.calculateRelevanceScore(plugin, searchTerms)
      }));

      scoredPlugins.sort((a, b) => {
        if (options.sort) {
          switch (options.sort) {
            case 'name':
              return a.plugin.name.localeCompare(b.plugin.name);
            case 'updated':
              const aDate = a.plugin.updateDate || new Date(0);
              const bDate = b.plugin.updateDate || new Date(0);
              return bDate.getTime() - aDate.getTime();
            default:
              return b.score - a.score;
          }
        }
        return b.score - a.score;
      });

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      const paginatedResults = scoredPlugins.slice(offset, offset + limit);

      // Convert to MarketplacePlugin format
      const marketplacePlugins: MarketplacePlugin[] = paginatedResults.map(({ plugin }) => ({
        ...plugin,
        author: plugin.author || 'Unknown',
        downloads: 0, // Default value
        rating: 0, // Default value
        reviews: [], // Default value
        publishedAt: plugin.installDate || new Date(), // Default value
        updatedAt: plugin.updateDate || new Date(),
        homepage: '',
        repository: '',
        category: plugin.marketplace?.category,
        tags: plugin.keywords || [],
        isPremium: plugin.isPremium || false
      }));

      return {
        success: true,
        plugins: marketplacePlugins,
        total: plugins.length,
        offset,
        limit
      };
      
    } catch (error) {
      console.error('Failed to search plugins:', error);
      
      return {
        success: false,
        plugins: [],
        total: 0,
        offset: 0,
        limit: 0,
        error: {
          name: 'SEARCH_ERROR' as const,
          code: PluginErrorCode.REGISTRY_ERROR,
          message: `Failed to search plugins: ${error instanceof Error ? error.message : 'Unknown error'}`
        } as PluginError
      };
    }
  }

  /**
   * Get detailed information about a specific plugin
   */
  async getPluginInfo(name: PluginName): Promise<PluginInfo | null> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        return null;
      }

      return this.registry.plugins[name] || null;
      
    } catch (error) {
      console.error(`Failed to get plugin info for ${name}:`, error);
      return null;
    }
  }

  /**
   * Register a new plugin in the registry
   */
  async registerPlugin(plugin: PluginInfo): Promise<void> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        throw new Error('Registry not loaded');
      }

      this.registry.plugins[plugin.name] = {
        ...plugin,
        installDate: plugin.installDate || new Date(),
        updateDate: new Date()
      };
      
      this.updateRegistryMetadata();
      await this.saveRegistry();
      
      console.log(`Registered plugin: ${plugin.name}@${plugin.version}`);
      
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin from the registry
   */
  async unregisterPlugin(name: PluginName): Promise<void> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        throw new Error('Registry not loaded');
      }

      if (this.registry.plugins[name]) {
        delete this.registry.plugins[name];
        
        this.updateRegistryMetadata();
        await this.saveRegistry();
        
        console.log(`Unregistered plugin: ${name}`);
      }
      
    } catch (error) {
      console.error(`Failed to unregister plugin ${name}:`, error);
      throw error;
    }
  }

  /**
   * Set plugin enabled/disabled state
   */
  async setPluginEnabled(name: PluginName, enabled: boolean): Promise<void> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        throw new Error('Registry not loaded');
      }

      if (this.registry.plugins[name]) {
        this.registry.plugins[name].enabled = enabled;
        await this.saveRegistry();
        
        console.log(`Plugin ${name} ${enabled ? 'enabled' : 'disabled'}`);
      }
      
    } catch (error) {
      console.error(`Failed to set plugin ${name} enabled state:`, error);
      throw error;
    }
  }

  /**
   * Update plugin status and metadata
   */
  async updatePluginStatus(
    name: PluginName,
    status: 'installed' | 'available' | 'disabled',
    metadata?: Partial<PluginInfo>
  ): Promise<void> {
    try {
      await this.ensureRegistryLoaded();
      
      if (!this.registry) {
        throw new Error('Registry not loaded');
      }

      if (this.registry.plugins[name]) {
        this.registry.plugins[name] = {
          ...this.registry.plugins[name],
          installed: status === 'installed',
          enabled: status === 'installed',
          updateDate: new Date(),
          ...metadata
        };
        
        this.updateRegistryMetadata();
        await this.saveRegistry();
        
        console.log(`Updated plugin status: ${name} -> ${status}`);
      }
      
    } catch (error) {
      console.error(`Failed to update plugin status for ${name}:`, error);
      throw error;
    }
  }

  /**
   * Load registry from disk
   */
  private async loadRegistry(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      
      try {
        await fs.access(this.registryPath);
        const registryContent = await fs.readFile(this.registryPath, 'utf-8');
        this.registry = JSON.parse(registryContent);
        
        // Validate registry structure
        if (!this.registry || typeof this.registry !== 'object') {
          throw new Error('Invalid registry format');
        }
        
        // Ensure required fields
        if (!this.registry.plugins) {
          this.registry.plugins = {};
        }
      } catch (accessError) {
        // File doesn't exist, create new registry
        this.registry = {
          version: '1.0.0',
          plugins: {},
          lastUpdated: new Date()
        };
      }
      
    } catch (error) {
      console.error('Failed to load registry:', error);
      throw error;
    }
  }

  /**
   * Save registry to disk
   */
  private async saveRegistry(): Promise<void> {
    try {
      if (!this.registry) {
        throw new Error('No registry to save');
      }

      this.registry.lastUpdated = new Date();
      
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
      
      // Write registry file
      await fs.writeFile(this.registryPath, JSON.stringify(this.registry, null, 2));
      
    } catch (error) {
      console.error('Failed to save registry:', error);
      throw error;
    }
  }

  /**
   * Ensure registry is loaded
   */
  private async ensureRegistryLoaded(): Promise<void> {
    if (!this.registry) {
      await this.loadRegistry();
    }
  }

  /**
   * Sync registry with installed plugins
   */
  private async syncWithInstalledPlugins(): Promise<void> {
    // This would scan the plugins directory and update the registry
    // For now, we'll keep the existing registry data
  }

  /**
   * Update registry metadata
   */
  private updateRegistryMetadata(): void {
    if (!this.registry) return;
    
    // Update metadata based on current plugins
    // This is a simplified version
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(plugin: PluginInfo, searchTerms: string[]): number {
    let score = 0;
    const searchableText = [
      plugin.name,
      plugin.description,
      plugin.author || '',
      ...(plugin.keywords || [])
    ].join(' ').toLowerCase();

    searchTerms.forEach(term => {
      if (plugin.name.toLowerCase().includes(term)) score += 10;
      if (plugin.description.toLowerCase().includes(term)) score += 5;
      if (plugin.author?.toLowerCase().includes(term)) score += 3;
      if (plugin.keywords?.some(keyword => keyword.toLowerCase().includes(term))) score += 2;
    });

    return score;
  }
}