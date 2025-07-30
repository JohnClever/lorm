import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface PluginInfo {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  installed: boolean;
  enabled: boolean;
  path?: string;
}

export interface PluginRegistry {
  plugins: Record<string, PluginInfo>;
  lastUpdated: string;
}

export class PluginManager {
  private registryPath = '.lorm/plugin-registry.json';
  private pluginsDir = '.lorm/plugins';

  async listPlugins(options: { installed?: boolean; enabled?: boolean } = {}): Promise<PluginInfo[]> {
    const registry = await this.loadRegistry();
    let plugins = Object.values(registry.plugins);

    if (options.installed !== undefined) {
      plugins = plugins.filter(p => p.installed === options.installed);
    }

    if (options.enabled !== undefined) {
      plugins = plugins.filter(p => p.enabled === options.enabled);
    }

    return plugins;
  }

  async installPlugin(nameOrPath: string, options: { force?: boolean } = {}): Promise<void> {
    console.log(`📦 Installing plugin: ${nameOrPath}`);

    // Ensure plugins directory exists
    await fs.mkdir(this.pluginsDir, { recursive: true });

    let pluginInfo: PluginInfo;

    if (nameOrPath.startsWith('.') || nameOrPath.startsWith('/') || nameOrPath.includes('\\')) {
      // Local path
      pluginInfo = await this.installFromPath(nameOrPath, options);
    } else if (nameOrPath.includes('/')) {
      // Git repository
      pluginInfo = await this.installFromGit(nameOrPath, options);
    } else {
      // npm package
      pluginInfo = await this.installFromNpm(nameOrPath, options);
    }

    // Update registry
    const registry = await this.loadRegistry();
    registry.plugins[pluginInfo.name] = pluginInfo;
    registry.lastUpdated = new Date().toISOString();
    await this.saveRegistry(registry);

    console.log(`✅ Plugin ${pluginInfo.name} installed successfully`);
  }

  async uninstallPlugin(name: string): Promise<void> {
    console.log(`🗑️  Uninstalling plugin: ${name}`);

    const registry = await this.loadRegistry();
    const plugin = registry.plugins[name];

    if (!plugin) {
      throw new Error(`Plugin ${name} is not installed`);
    }

    if (plugin.path) {
      try {
        await fs.rm(plugin.path, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Warning: Could not remove plugin files: ${error}`);
      }
    }

    delete registry.plugins[name];
    registry.lastUpdated = new Date().toISOString();
    await this.saveRegistry(registry);

    console.log(`✅ Plugin ${name} uninstalled successfully`);
  }

  async enablePlugin(name: string): Promise<void> {
    const registry = await this.loadRegistry();
    const plugin = registry.plugins[name];

    if (!plugin) {
      throw new Error(`Plugin ${name} is not installed`);
    }

    plugin.enabled = true;
    registry.lastUpdated = new Date().toISOString();
    await this.saveRegistry(registry);

    console.log(`✅ Plugin ${name} enabled`);
  }

  async disablePlugin(name: string): Promise<void> {
    const registry = await this.loadRegistry();
    const plugin = registry.plugins[name];

    if (!plugin) {
      throw new Error(`Plugin ${name} is not installed`);
    }

    plugin.enabled = false;
    registry.lastUpdated = new Date().toISOString();
    await this.saveRegistry(registry);

    console.log(`✅ Plugin ${name} disabled`);
  }

  async updatePlugin(name: string): Promise<void> {
    console.log(`🔄 Updating plugin: ${name}`);

    const registry = await this.loadRegistry();
    const plugin = registry.plugins[name];

    if (!plugin) {
      throw new Error(`Plugin ${name} is not installed`);
    }

    // For now, we'll reinstall the plugin
    // In a real implementation, this would check for updates
    await this.uninstallPlugin(name);
    await this.installPlugin(name);

    console.log(`✅ Plugin ${name} updated successfully`);
  }

  async searchPlugins(query: string): Promise<PluginInfo[]> {
    // This would search a plugin registry in a real implementation
    // For now, return empty array
    console.log(`🔍 Searching for plugins matching: ${query}`);
    console.log('Plugin search is not implemented yet. This feature will be available in a future version.');
    return [];
  }

  displayPlugins(plugins: PluginInfo[]): void {
    if (plugins.length === 0) {
      console.log('No plugins found.');
      return;
    }

    console.log('\n📋 Installed Plugins\n');
    
    plugins.forEach(plugin => {
      const status = plugin.enabled ? '🟢 Enabled' : '🔴 Disabled';
      const installed = plugin.installed ? '📦 Installed' : '❌ Not Installed';
      
      console.log(`${plugin.name} (${plugin.version})`);
      console.log(`  Status: ${status}`);
      console.log(`  Installation: ${installed}`);
      
      if (plugin.description) {
        console.log(`  Description: ${plugin.description}`);
      }
      
      if (plugin.author) {
        console.log(`  Author: ${plugin.author}`);
      }
      
      if (plugin.homepage) {
        console.log(`  Homepage: ${plugin.homepage}`);
      }
      
      console.log('');
    });
  }

  private async installFromPath(path: string, options: { force?: boolean }): Promise<PluginInfo> {
    const packageJsonPath = join(path, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const pluginPath = join(this.pluginsDir, packageJson.name);
      
      // Copy plugin files
      await this.copyDirectory(path, pluginPath);
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        author: packageJson.author,
        homepage: packageJson.homepage,
        installed: true,
        enabled: true,
        path: pluginPath,
      };
    } catch (error) {
      throw new Error(`Failed to install plugin from path: ${error}`);
    }
  }

  private async installFromGit(repository: string, options: { force?: boolean }): Promise<PluginInfo> {
    const pluginName = repository.split('/').pop()?.replace('.git', '') || 'unknown';
    const pluginPath = join(this.pluginsDir, pluginName);
    
    try {
      execSync(`git clone ${repository} ${pluginPath}`, { stdio: 'inherit' });
      
      const packageJsonPath = join(pluginPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        author: packageJson.author,
        homepage: packageJson.homepage,
        installed: true,
        enabled: true,
        path: pluginPath,
      };
    } catch (error) {
      throw new Error(`Failed to install plugin from git: ${error}`);
    }
  }

  private async installFromNpm(packageName: string, options: { force?: boolean }): Promise<PluginInfo> {
    const pluginPath = join(this.pluginsDir, packageName);
    
    try {
      // Create plugin directory
      await fs.mkdir(pluginPath, { recursive: true });
      
      // Install package
      execSync(`npm install ${packageName}`, { 
        cwd: pluginPath, 
        stdio: 'inherit' 
      });
      
      // Read package.json from node_modules
      const packageJsonPath = join(pluginPath, 'node_modules', packageName, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        author: packageJson.author,
        homepage: packageJson.homepage,
        installed: true,
        enabled: true,
        path: pluginPath,
      };
    } catch (error) {
      throw new Error(`Failed to install plugin from npm: ${error}`);
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async loadRegistry(): Promise<PluginRegistry> {
    try {
      const data = await fs.readFile(this.registryPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        plugins: {},
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async saveRegistry(registry: PluginRegistry): Promise<void> {
    await fs.mkdir('.lorm', { recursive: true });
    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
  }
}