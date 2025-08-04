import {
  PluginManager,
  PluginContextFactory,
  PluginInstaller,
  PluginRegistry,
  PluginErrorHandler,
  PluginPerformanceTracker
} from '@lorm/core/infrastructure/plugin-system';
import type {
  PluginInstallOptions,
  PluginInstallResult,
  PluginUninstallOptions,
  PluginSearchOptions,
  PluginSearchResult,
  PluginListOptions,
  PluginInfo,
  PluginConfig,
  PluginPerformanceReport,
  PluginRegistryEntry,
  IPlugin
} from '@lorm/core/infrastructure/plugin-system';

/**
 * CLI Plugin Service - Thin wrapper around core plugin manager
 * Provides CLI-specific formatting and error handling
 */
export class CLIPluginService {
  private pluginManager: PluginManager;
  private initialized = false;
  
  constructor() {
    this.pluginManager = PluginManager.getInstance();
  }
  
  /**
   * Initialize the plugin service
   */
  async initialize(projectRoot?: string): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      if (projectRoot) {
        await this.pluginManager.initialize(projectRoot);
      } else {
        await this.pluginManager.initialize(process.cwd());
      }
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize plugin service: ${error}`);
    }
  }
  
  /**
   * Install a plugin with CLI-friendly output
   */
  async installPlugin(
    name: string,
    options: Partial<PluginInstallOptions> = {}
  ): Promise<{
    success: boolean;
    message: string;
    plugin?: IPlugin;
    installTime?: number;
  }> {
    this.ensureInitialized();
    
    const installOptions: PluginInstallOptions = {
      name,
      source: options.source || 'marketplace',
      version: options.version,
      force: options.force || false,
      skipDependencies: options.skipDependencies || false,
      registry: options.registry,
      auth: options.auth
    };
    
    try {
      const result = await this.pluginManager.installPlugin(installOptions);
      
      if (result.success) {
        const timeStr = result.installTime ? ` in ${result.installTime}ms` : '';
        const depsStr = result.dependencies?.length 
          ? ` with ${result.dependencies.length} dependencies` 
          : '';
        
        return {
          success: true,
          message: `✅ Plugin '${name}' installed successfully${timeStr}${depsStr}`,
          plugin: result.plugin,
          installTime: result.installTime
        };
      } else {
        return {
          success: false,
          message: `❌ Failed to install plugin '${name}': ${result.error?.message}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Installation error: ${error}`
      };
    }
  }
  
  /**
   * Uninstall a plugin with CLI-friendly output
   */
  async uninstallPlugin(
    name: string,
    options: PluginUninstallOptions = {}
  ): Promise<{
    success: boolean;
    message: string;
    removedFiles?: string[];
  }> {
    this.ensureInitialized();
    
    try {
      await this.pluginManager.uninstallPlugin(name, options);
      
      const configStr = options.removeConfig === false ? '' : ' and configuration';
      const depsStr = options.removeDependencies ? ' and dependencies' : '';
      
      return {
        success: true,
        message: `✅ Plugin '${name}' uninstalled successfully${configStr}${depsStr}`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to uninstall plugin '${name}': ${error}`
      };
    }
  }
  
  /**
   * Enable a plugin with CLI-friendly output
   */
  async enablePlugin(name: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      await this.pluginManager.enablePlugin(name);
      return {
        success: true,
        message: `✅ Plugin '${name}' enabled successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to enable plugin '${name}': ${error}`
      };
    }
  }
  
  /**
   * Disable a plugin with CLI-friendly output
   */
  async disablePlugin(name: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      await this.pluginManager.disablePlugin(name);
      return {
        success: true,
        message: `✅ Plugin '${name}' disabled successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to disable plugin '${name}': ${error}`
      };
    }
  }
  
  /**
   * Reload a plugin with CLI-friendly output
   */
  async reloadPlugin(name: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      // Since PluginManager doesn't have reloadPlugin(name), we'll disable and enable
      await this.pluginManager.disablePlugin(name);
      await this.pluginManager.enablePlugin(name);
      return {
        success: true,
        message: `✅ Plugin '${name}' reloaded successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to reload plugin '${name}': ${error}`
      };
    }
  }
  
  /**
   * Reload all plugins with CLI-friendly output
   */
  async reloadPlugins(): Promise<{
    success: boolean;
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      await this.pluginManager.reloadPlugins();
      return {
        success: true,
        message: `✅ All plugins reloaded successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to reload plugins: ${error}`
      };
    }
  }
  
  /**
   * List plugins with CLI-friendly formatting
   */
  async listPlugins(options: PluginListOptions = {}): Promise<{
    plugins: Array<{
      name: string;
      version: string;
      status: string;
      description: string;
      type: string;
      enabled: boolean;
      dependencies: string[];
      lastModified: string;
      errorMessage?: string;
    }>;
    summary: {
      total: number;
      enabled: number;
      disabled: number;
      errors: number;
    };
  }> {
    this.ensureInitialized();
    
    // Get plugins based on options
    let pluginList: IPlugin[];
    if (options.enabled === true) {
      pluginList = this.pluginManager.getEnabledPlugins();
    } else if (options.enabled === false) {
      // Get all plugins and filter out enabled ones
      const allPlugins = this.pluginManager.getAllPlugins();
      const enabledPlugins = this.pluginManager.getEnabledPlugins();
      const enabledNames = new Set(enabledPlugins.map((p: IPlugin) => p.metadata.name));
      pluginList = allPlugins.filter((p: IPlugin) => !enabledNames.has(p.metadata.name));
    } else {
      pluginList = this.pluginManager.getAllPlugins();
    }
    
    const plugins = pluginList.map((plugin: IPlugin) => ({
      name: plugin.metadata.name,
      version: plugin.metadata.version,
      status: this.pluginManager.isPluginEnabled(plugin.metadata.name) ? 'enabled' : 'disabled',
      description: plugin.metadata.description,
      type: plugin.metadata.type || 'unknown',
      enabled: this.pluginManager.isPluginEnabled(plugin.metadata.name),
      dependencies: Array.isArray(plugin.metadata.dependencies) ? plugin.metadata.dependencies.map((dep: any) => dep.name) : [],
      lastModified: plugin.metadata.lastModified || new Date().toISOString(),
      errorMessage: plugin.status === 'error' ? plugin.error?.message : undefined
    }));
    
    const summary = {
      total: plugins.length,
      enabled: plugins.filter((p: any) => p.enabled).length,
      disabled: plugins.filter((p: any) => !p.enabled && p.status !== 'error').length,
      errors: plugins.filter((p: any) => p.status === 'error').length
    };
    
    return { plugins, summary };
  }
  
  /**
   * Search plugins with CLI-friendly formatting
   */
  async searchPlugins(
    query: string,
    options: PluginSearchOptions = {}
  ): Promise<{
    results: Array<{
      name: string;
      version: string;
      description: string;
      author: string;
      keywords: string[];
      downloads: number;
      verified: boolean;
      source: string;
      installed: boolean;
    }>;
    summary: {
      total: number;
      sources: string[];
      verified: number;
    };
  }> {
    this.ensureInitialized();
    
    const searchResults = await this.pluginManager.searchPlugins(query, options);
    const installedPlugins = this.pluginManager.getAllPlugins();
    const installedNames = new Set(installedPlugins.map((p: any) => p.metadata.name));
    
    const results = searchResults.map((result: any) => ({
      name: result.name,
      version: result.version,
      description: result.description,
      author: result.author,
      keywords: result.keywords || [],
      downloads: result.downloads || 0,
      verified: result.verified || false,
      source: result.source,
      installed: installedNames.has(result.name)
    }));
    
    const summary = {
      total: results.length,
      sources: [...new Set(results.map((r: any) => r.source))] as string[],
      verified: results.filter((r: any) => r.verified).length
    };
    
    return { results, summary };
  }
  
  /**
   * Get plugin information with CLI-friendly formatting
   */
  async getPluginInfo(name: string): Promise<{
    found: boolean;
    info?: {
      metadata: {
        name: string;
        version: string;
        description: string;
        author: string;
        license: string;
        type: string;
        keywords: string[];
        engines: Record<string, string>;
      };
      status: string;
      installedVersion?: string;
      latestVersion?: string;
      dependencies: Array<{
        name: string;
        version: string;
        required: boolean;
      }>;
      permissions: any;
    };
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      const info = await this.pluginManager.getPluginInfo(name);
      
      return {
        found: true,
        info: {
          metadata: {
            name: info.metadata.name,
            version: info.metadata.version,
            description: info.metadata.description,
            author: info.metadata.author,
            license: info.metadata.license,
            type: info.metadata.type || 'unknown',
            keywords: info.metadata.keywords || [],
            engines: info.metadata.engines || {}
          },
          status: info.status,
          installedVersion: info.installedVersion,
          latestVersion: info.latestVersion,
          dependencies: (info.dependencies || []).map((dep: any) => ({
            name: dep.name || dep,
            version: dep.version || '*',
            required: dep.required !== false
          })),
          permissions: info.permissions
        },
        message: `Plugin '${name}' information retrieved successfully`
      };
    } catch (error) {
      return {
        found: false,
        message: `❌ Plugin '${name}' not found: ${error}`
      };
    }
  }
  
  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    name: string,
    config: PluginConfig
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      await this.pluginManager.updatePluginConfig(name, config);
      return {
        success: true,
        message: `✅ Configuration for plugin '${name}' updated successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to update configuration for plugin '${name}': ${error}`
      };
    }
  }
  
  /**
   * Get plugin performance report
   */
  async getPluginPerformance(name: string): Promise<{
    found: boolean;
    report?: {
      plugin: string;
      totalOperations: number;
      successRate: number;
      averageExecutionTime: number;
      memoryUsage: {
        peak: number;
        average: number;
        current: number;
      };
      recentOperations: Array<{
        operation: string;
        duration: number;
        success: boolean;
        timestamp: Date;
        memoryDelta: number;
      }>;
      issues: string[];
      recommendations: string[];
    };
    message: string;
  }> {
    this.ensureInitialized();
    
    try {
      const plugins = this.pluginManager.getAllPlugins();
      const plugin = plugins.find((p: IPlugin) => p.metadata.name === name);
      
      if (!plugin) {
        return {
          found: false,
          message: `Plugin '${name}' not found`
        };
      }
      
      // Get plugin-specific performance report directly from performance tracker
      const performanceTracker = (this.pluginManager as any).performanceTracker;
      if (!performanceTracker) {
        return {
          found: false,
          message: `Performance tracking not available`
        };
      }
      
      const report = performanceTracker.getPluginReport(name);
      
      return {
        found: true,
        report: {
          ...report,
          plugin: report.pluginName
        },
        message: `Performance report for plugin '${name}' retrieved successfully`
      };
    } catch (error) {
      return {
        found: false,
        message: `❌ Failed to get performance report for plugin '${name}': ${error}`
      };
    }
  }
  
  /**
   * Get performance summary for all plugins
   */
  async getPerformanceSummary(): Promise<any> {
    this.ensureInitialized();
    // Get the overall summary directly from performance tracker
    const performanceTracker = (this.pluginManager as any).performanceTracker;
    return performanceTracker ? performanceTracker.getOverallSummary() : {
      totalPlugins: 0,
      totalOperations: 0,
      overallSuccessRate: 0,
      activeOperations: 0,
      slowestPlugins: [],
      mostActivePlugins: [],
      errorPronePlugins: [],
      memoryUsage: { current: 0, trend: 'stable' }
    };
  }
  
  /**
   * Get overall plugin system status
   */
  async getSystemStatus(): Promise<{
    initialized: boolean;
    pluginCount: number;
    enabledCount: number;
    errorCount: number;
    performance: {
      totalOperations: number;
      overallSuccessRate: number;
      activeOperations: number;
      memoryUsage: {
        current: number;
        trend: string;
      };
    };
    issues: string[];
  }> {
    if (!this.initialized) {
      return {
        initialized: false,
        pluginCount: 0,
        enabledCount: 0,
        errorCount: 0,
        performance: {
          totalOperations: 0,
          overallSuccessRate: 0,
          activeOperations: 0,
          memoryUsage: {
            current: 0,
            trend: 'stable'
          }
        },
        issues: ['Plugin system not initialized']
      };
    }
    
    const plugins = await this.listPlugins();
    const performanceSummary = await this.getPerformanceSummary();
    
    const issues: string[] = [];
    
    // Check for common issues
    if (plugins.summary.errors > 0) {
      issues.push(`${plugins.summary.errors} plugin(s) in error state`);
    }
    
    if (performanceSummary.overallSuccessRate < 0.9) {
      issues.push(`Low overall success rate: ${Math.round(performanceSummary.overallSuccessRate * 100)}%`);
    }
    
    if (performanceSummary.memoryUsage.trend === 'increasing') {
      issues.push('Memory usage is increasing');
    }
    
    return {
      initialized: true,
      pluginCount: plugins.summary.total,
      enabledCount: plugins.summary.enabled,
      errorCount: plugins.summary.errors,
      performance: {
        totalOperations: performanceSummary.totalOperations || 0,
        overallSuccessRate: performanceSummary.overallSuccessRate,
        activeOperations: performanceSummary.activeOperations,
        memoryUsage: performanceSummary.memoryUsage
      },
      issues
    };
  }
  
  /**
   * Format plugin list for CLI display
   */
  formatPluginList(
    plugins: Array<{
      name: string;
      version: string;
      status: string;
      description: string;
      enabled: boolean;
      errorMessage?: string;
    }>,
    options: { verbose?: boolean; showDisabled?: boolean } = {}
  ): string[] {
    const lines: string[] = [];
    
    for (const plugin of plugins) {
      if (!options.showDisabled && !plugin.enabled && plugin.status !== 'error') {
        continue;
      }
      
      const statusIcon = this.getStatusIcon(plugin.status, plugin.enabled);
      const nameVersion = `${plugin.name}@${plugin.version}`;
      
      if (options.verbose) {
        lines.push(`${statusIcon} ${nameVersion}`);
        lines.push(`   ${plugin.description}`);
        
        if (plugin.errorMessage) {
          lines.push(`   ❌ Error: ${plugin.errorMessage}`);
        }
        
        lines.push(''); // Empty line for spacing
      } else {
        const description = plugin.description.length > 50 
          ? plugin.description.substring(0, 47) + '...' 
          : plugin.description;
        lines.push(`${statusIcon} ${nameVersion.padEnd(30)} ${description}`);
      }
    }
    
    return lines;
  }
  
  /**
   * Get status icon for plugin
   */
  private getStatusIcon(status: string, enabled: boolean): string {
    if (status === 'error') return '❌';
    if (enabled) return '✅';
    return '⚪';
  }
  
  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Plugin service not initialized. Call initialize() first.');
    }
  }
}