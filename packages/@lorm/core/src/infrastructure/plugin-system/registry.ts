import type {
  IPlugin,
  IPluginRegistry,
  PluginRegistryEntry,
  PluginConfig,
  PluginInfo,
  PluginMetadata,
  PluginOperationContext,
  PluginLoadResult,
  PluginType
} from './types.js';
import type { PluginContext } from '../security/types.js';



/**
 * Plugin Registry for centralized plugin state management
 */
export class PluginRegistry implements IPluginRegistry {
  private entries = new Map<string, PluginRegistryEntry>();
  private dependencyGraph = new Map<string, Set<string>>();
  private reverseDependencyGraph = new Map<string, Set<string>>();
  
  /**
   * Register a plugin in the registry
   */
  register(plugin: IPlugin, context: PluginContext, loadResult: PluginLoadResult): void {
    const pluginName = plugin.metadata.name;
    
    const entry: PluginRegistryEntry = {
      plugin,
      context,
      loadResult,
      active: false,
      loadTime: Date.now()
    };
    
    this.entries.set(pluginName, entry);
    
    // Update dependency graphs
    const dependencies = this.extractDependencies(plugin);
    this.updateDependencyGraphs(pluginName, dependencies);
    
    console.log(`Plugin ${pluginName} registered successfully`);
  }
  
  /**
   * Unregister a plugin from the registry
   */
  unregister(pluginName: string): boolean {
    if (!this.entries.has(pluginName)) {
      return false;
    }
    
    // Check if plugin has dependents
    const dependents = this.getDependents(pluginName);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister plugin ${pluginName}. It has dependents: ${dependents.join(', ')}`
      );
    }
    
    // Remove from dependency graphs
    this.removeDependencyGraphs(pluginName);
    
    // Remove from entries
    this.entries.delete(pluginName);
    
    console.log(`Plugin ${pluginName} unregistered successfully`);
    return true;
  }
  
  /**
   * Get a plugin registry entry by name
   */
  get(pluginName: string): PluginRegistryEntry | undefined {
    return this.entries.get(pluginName);
  }
  
  /**
   * Check if a plugin is registered
   */
  has(pluginName: string): boolean {
    return this.entries.has(pluginName);
  }
  
  /**
   * Get all registered plugin entries
   */
  getAll(): PluginRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(pluginName: string): boolean {
    return this.entries.has(pluginName);
  }

  /**
   * Activate a plugin
   */
  async activate(pluginName: string): Promise<boolean> {
    const entry = this.entries.get(pluginName);
    if (!entry) {
      return false;
    }
    entry.active = true;
    return true;
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(pluginName: string): Promise<boolean> {
    const entry = this.entries.get(pluginName);
    if (!entry) {
      return false;
    }
    entry.active = false;
    return true;
  }
  
  /**
   * Get plugins by type
   */
  getByType(type: PluginType): PluginRegistryEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.plugin.metadata.type === type);
  }


  
  /**
   * Enable a plugin
   */
  enable(pluginName: string): boolean {
    const entry = this.entries.get(pluginName);
    if (!entry) {
      return false;
    }
    
    // Check dependencies are enabled
    const missingDeps = this.checkDependencies(pluginName);
    if (missingDeps.length > 0) {
      throw new Error(
        `Cannot enable plugin ${pluginName}. Missing dependencies: ${missingDeps.join(', ')}`
      );
    }
    
    entry.active = true;
    
    return true;
  }
  
  /**
   * Disable a plugin
   */
  disable(pluginName: string): boolean {
    const entry = this.entries.get(pluginName);
    if (!entry) {
      return false;
    }
    
    entry.active = false;
    return true;
  }

  
  /**
   * Get plugin dependencies
   */
  getDependencies(pluginName: string): string[] {
    const deps = this.dependencyGraph.get(pluginName);
    return deps ? Array.from(deps) : [];
  }
  
  /**
   * Get plugin dependents
   */
  getDependents(pluginName: string): string[] {
    const dependents = this.reverseDependencyGraph.get(pluginName);
    return dependents ? Array.from(dependents) : [];
  }
  
  /**
   * Check if dependencies are satisfied
   */
  checkDependencies(pluginName: string): string[] {
    const dependencies = this.getDependencies(pluginName);
    const missing: string[] = [];
    
    for (const dep of dependencies) {
      const entry = this.entries.get(dep);
      if (!entry || !entry.active) {
        missing.push(dep);
      }
    }
    
    return missing;
  }
  
  /**
   * Get dependency resolution order
   */
  getDependencyOrder(pluginNames: string[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    
    const visit = (pluginName: string) => {
      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving ${pluginName}`);
      }
      
      if (visited.has(pluginName)) {
        return;
      }
      
      visiting.add(pluginName);
      
      // Visit dependencies first
      const dependencies = this.getDependencies(pluginName);
      for (const dep of dependencies) {
        if (pluginNames.includes(dep)) {
          visit(dep);
        }
      }
      
      visiting.delete(pluginName);
      visited.add(pluginName);
      result.push(pluginName);
    };
    
    for (const pluginName of pluginNames) {
      if (!visited.has(pluginName)) {
        visit(pluginName);
      }
    }
    
    return result;
  }
  

  
  /**
   * Search plugins
   */
  search(query: string, filters?: {
    type?: string;
    enabled?: boolean;
  }): IPlugin[] {
    let plugins = Array.from(this.entries.values()).map(entry => entry.plugin);
    
    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      plugins = plugins.filter(plugin => 
        plugin.metadata.name.toLowerCase().includes(lowerQuery) ||
        plugin.metadata.description.toLowerCase().includes(lowerQuery) ||
        (plugin.metadata.keywords || []).some(keyword => 
          keyword.toLowerCase().includes(lowerQuery)
        )
      );
    }
    
    // Apply filters
    if (filters) {
      if (filters.type) {
        plugins = plugins.filter(plugin => plugin.metadata.type === filters.type);
      }
      
      if (filters.enabled !== undefined) {
        plugins = plugins.filter(plugin => {
          const entry = this.entries.get(plugin.metadata.name);
          return entry?.active === filters.enabled;
        });
      }
    }
    
    return plugins;
  }
  
  /**
   * Get registry statistics
   */
  getStats() {
    const total = this.entries.size;
    const byStatus = {
      active: 0,
      inactive: 0
    };
    
    const byType = new Map<string, number>();
    
    for (const [name, entry] of this.entries) {
      if (entry.active) {
        byStatus.active++;
      } else {
        byStatus.inactive++;
      }
      
      const type = entry.plugin.metadata.type || 'unknown';
      byType.set(type, (byType.get(type) || 0) + 1);
    }
    
    return {
      total,
      byStatus,
      byType: Object.fromEntries(byType),
      dependencyCount: this.dependencyGraph.size,
      circularDependencies: this.detectCircularDependencies()
    };
  }
  
  /**
   * Clear registry
   */
  clear(): void {
    this.entries.clear();
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
  }
  
  /**
   * Extract dependencies from plugin metadata
   */
  private extractDependencies(plugin: IPlugin): string[] {
    const deps: string[] = [];
    
    if (plugin.metadata.dependencies) {
      deps.push(...Object.keys(plugin.metadata.dependencies));
    }
    
    return deps;
  }
  
  /**
   * Update dependency graphs
   */
  private updateDependencyGraphs(pluginName: string, dependencies: string[]): void {
    // Update forward dependency graph
    this.dependencyGraph.set(pluginName, new Set(dependencies));
    
    // Update reverse dependency graph
    for (const dep of dependencies) {
      if (!this.reverseDependencyGraph.has(dep)) {
        this.reverseDependencyGraph.set(dep, new Set());
      }
      this.reverseDependencyGraph.get(dep)!.add(pluginName);
    }
  }
  
  /**
   * Remove from dependency graphs
   */
  private removeDependencyGraphs(pluginName: string): void {
    // Get dependencies before removal
    const dependencies = this.getDependencies(pluginName);
    
    // Remove from forward graph
    this.dependencyGraph.delete(pluginName);
    
    // Remove from reverse graph
    for (const dep of dependencies) {
      const dependents = this.reverseDependencyGraph.get(dep);
      if (dependents) {
        dependents.delete(pluginName);
        if (dependents.size === 0) {
          this.reverseDependencyGraph.delete(dep);
        }
      }
    }
    
    // Remove from reverse graph as a dependent
    this.reverseDependencyGraph.delete(pluginName);
  }
  
  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = [];
    
    const visit = (pluginName: string) => {
      if (visiting.has(pluginName)) {
        // Found a cycle
        const cycleStart = path.indexOf(pluginName);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), pluginName]);
        }
        return;
      }
      
      if (visited.has(pluginName)) {
        return;
      }
      
      visiting.add(pluginName);
      path.push(pluginName);
      
      const dependencies = this.getDependencies(pluginName);
      for (const dep of dependencies) {
        visit(dep);
      }
      
      path.pop();
      visiting.delete(pluginName);
      visited.add(pluginName);
    };
    
    for (const pluginName of this.entries.keys()) {
      if (!visited.has(pluginName)) {
        visit(pluginName);
      }
    }
    
    return cycles;
  }
}