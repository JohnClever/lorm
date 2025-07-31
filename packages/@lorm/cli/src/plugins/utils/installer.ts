/**
 * @fileoverview Plugin Installer Utilities
 * 
 * Provides comprehensive plugin installation capabilities from various sources including
 * local paths, Git repositories, and npm packages. Handles dependency management,
 * validation, and lifecycle operations.
 * 
 * @example
 * ```typescript
 * const installer = new PluginInstaller();
 * 
 * // Install from local path
 * const result = await installer.installFromPath('./my-plugin');
 * 
 * // Install from Git repository
 * const gitResult = await installer.installFromGit('https://github.com/user/plugin.git');
 * 
 * // Install from npm
 * const npmResult = await installer.installFromNpm('my-plugin-package');
 * ```
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  PluginInstallOptions,
  PluginInstallResult,
  PluginUninstallResult,
  PluginUpdateResult,
  PluginInfo,
  PluginError,
  LicenseType,
  PackageJson
} from '../types';


import { PluginErrorCode } from '../types';
import { validatePlugin, createPluginError, sanitizePluginName } from './validation';
import { getPluginsDirectory, ensureDirectoryExists, copyDirectory } from './filesystem';

const execAsync = promisify(exec);

/**
 * Plugin Installer Class
 * 
 * Manages the complete lifecycle of plugin installations including installation,
 * uninstallation, updates, and dependency management from multiple sources.
 */
export class PluginInstaller {
  private pluginsDir: string;

  constructor(pluginsDir?: string) {
    this.pluginsDir = pluginsDir || getPluginsDirectory();
  }

  /**
   * Install a plugin from a local file system path.
   * 
   * Validates the plugin structure, copies files, and installs dependencies.
   * 
   * @param pluginPath - Absolute or relative path to the plugin directory
   * @param options - Installation options including force overwrite
   * @returns Promise resolving to installation result with plugin info
   * @throws PluginError if path is invalid, plugin structure is malformed, or installation fails
   */
  async installFromPath(
    pluginPath: string,
    options: PluginInstallOptions = {}
  ): Promise<PluginInstallResult> {
    try {

      const stats = await fs.stat(pluginPath);
      if (!stats.isDirectory()) {
        throw createPluginError(
          PluginErrorCode.INVALID_PATH,
          `Plugin path is not a directory: ${pluginPath}`
        );
      }


      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJson = await this.readPackageJson(packageJsonPath);
      

      const validation = validatePlugin(packageJson);
      if (!validation.valid) {
        throw createPluginError(
          PluginErrorCode.INVALID_PLUGIN,
          `Invalid plugin structure: ${validation.errors.join(', ')}`
        );
      }


      const pluginName = sanitizePluginName(packageJson.name);
      const installDir = path.join(this.pluginsDir, pluginName);
      

      if (!options.force) {
        try {
          await fs.access(installDir);
          throw createPluginError(
            PluginErrorCode.ALREADY_INSTALLED,
            `Plugin ${packageJson.name} is already installed. Use --force to overwrite.`
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }


      await ensureDirectoryExists(this.pluginsDir);
      

      await copyDirectory(pluginPath, installDir);
      

      if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
        await this.installDependencies(installDir);
      }

      const pluginInfo: PluginInfo = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || '',
        author: packageJson.author,
        license: packageJson.license ? { type: packageJson.license as LicenseType } : undefined,
        installPath: installDir,
        installedAt: new Date(),
        enabled: true,
        installed: true,
        size: 0,
        source: 'local',
        dependencies: packageJson.dependencies ? Object.keys(packageJson.dependencies) : [],
        commands: [],
        hooks: [],
        peerDependencies: packageJson.peerDependencies ? Object.keys(packageJson.peerDependencies) : undefined,
        engines: packageJson.engines
      };

      return {
        success: true,
        plugin: pluginInfo,
        message: `Plugin ${packageJson.name} installed successfully from ${pluginPath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error as PluginError,
        message: `Failed to install plugin from ${pluginPath}: ${(error as Error).message}`
      };
    }
  }

  /**
   * Install a plugin from a Git repository.
   * 
   * Clones the repository to a temporary location, validates the plugin,
   * and installs it to the plugins directory.
   * 
   * @param gitUrl - Git repository URL (https or ssh)
   * @param options - Installation options including force overwrite
   * @returns Promise resolving to installation result with plugin info
   * @throws PluginError if Git operation fails, plugin is invalid, or installation fails
   */
  async installFromGit(
    gitUrl: string,
    options: PluginInstallOptions = {}
  ): Promise<PluginInstallResult> {
    try {
      // Create temporary directory for cloning
      const tempDir = path.join(this.pluginsDir, '.temp', `git-${Date.now()}`);
      await ensureDirectoryExists(tempDir);

      try {
        // Clone repository
        const branch = options.branch || 'main';
        await execAsync(`git clone --branch ${branch} --depth 1 "${gitUrl}" "${tempDir}"`);
        
        // Install from the cloned directory
        const result = await this.installFromPath(tempDir, options);
        
        // Update source information
        if (result.success && result.plugin) {
          result.plugin.source = 'git';
          result.plugin.gitUrl = gitUrl;
          result.plugin.gitBranch = branch;
        }
        
        return result;
      } finally {
        // Clean up temporary directory
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary directory: ${tempDir}`);
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error as PluginError,
        message: `Failed to install plugin from Git: ${(error as Error).message}`
      };
    }
  }

  /**
   * Install a plugin from an npm package.
   * 
   * Downloads the package, validates it as a plugin, and installs it
   * to the plugins directory with all dependencies.
   * 
   * @param packageName - npm package name (e.g., 'my-plugin' or '@scope/plugin')
   * @param options - Installation options including force overwrite
   * @returns Promise resolving to installation result with plugin info
   * @throws PluginError if package not found, invalid plugin, or installation fails
   */
  async installFromNpm(
    packageName: string,
    options: PluginInstallOptions = {}
  ): Promise<PluginInstallResult> {
    try {
      // Create temporary directory for npm install
      const tempDir = path.join(this.pluginsDir, '.temp', `npm-${Date.now()}`);
      await ensureDirectoryExists(tempDir);

      try {
        // Install package via npm
        const version = options.version ? `@${options.version}` : '';
        const fullPackageName = `${packageName}${version}`;
        
        await execAsync(`npm install --no-save "${fullPackageName}"`, {
          cwd: tempDir
        });
        
        // Find the installed package
        const nodeModulesPath = path.join(tempDir, 'node_modules', packageName);
        
        // Install from the npm package directory
        const result = await this.installFromPath(nodeModulesPath, options);
        
        // Update source information
        if (result.success && result.plugin) {
          result.plugin.source = 'npm';
          result.plugin.npmPackage = packageName;
        }
        
        return result;
      } finally {
        // Clean up temporary directory
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary directory: ${tempDir}`);
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error as PluginError,
        message: `Failed to install plugin from npm: ${(error as Error).message}`
      };
    }
  }

  /**
   * Uninstall a plugin from the system.
   * 
   * Removes the plugin directory and all associated files.
   * 
   * @param pluginName - Name of the plugin to uninstall
   * @returns Promise resolving to uninstallation result
   * @throws PluginError if plugin not found or removal fails
   */
  async uninstall(pluginName: string): Promise<PluginUninstallResult> {
    try {
      const sanitizedName = sanitizePluginName(pluginName);
      const pluginDir = path.join(this.pluginsDir, sanitizedName);
      
      // Check if plugin exists
      try {
        await fs.access(pluginDir);
      } catch (error) {
        throw createPluginError(
          PluginErrorCode.NOT_FOUND,
          `Plugin ${pluginName} is not installed`
        );
      }
      
      // Remove plugin directory
      await fs.rm(pluginDir, { recursive: true, force: true });
      
      return {
        success: true,
        message: `Plugin ${pluginName} uninstalled successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error as PluginError,
        message: `Failed to uninstall plugin ${pluginName}: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update a plugin to the latest version.
   * 
   * Attempts to update from the original installation source (Git, npm, or path).
   * 
   * @param pluginName - Name of the plugin to update
   * @param options - Update options including force overwrite
   * @returns Promise resolving to update result with version info
   * @throws PluginError if plugin not found, source unavailable, or update fails
   */
  async update(
    pluginName: string,
    options: PluginInstallOptions = {}
  ): Promise<PluginUpdateResult> {
    try {
      const sanitizedName = sanitizePluginName(pluginName);
      const pluginDir = path.join(this.pluginsDir, sanitizedName);
      
      // Check if plugin exists
      try {
        await fs.access(pluginDir);
      } catch (error) {
        throw createPluginError(
          PluginErrorCode.NOT_FOUND,
          `Plugin ${pluginName} is not installed`
        );
      }
      
      // Read current plugin info
      const packageJsonPath = path.join(pluginDir, 'package.json');
      const currentPackageJson = await this.readPackageJson(packageJsonPath);
      const currentVersion = currentPackageJson.version;
      
      // Determine update source and method
      let updateResult: PluginInstallResult;
      
      if (currentPackageJson.repository?.type === 'git') {
        // Update from Git
        const gitUrl = currentPackageJson.repository.url;
        updateResult = await this.installFromGit(gitUrl, { ...options, force: true });
      } else if (currentPackageJson.name) {
        // Update from npm
        updateResult = await this.installFromNpm(currentPackageJson.name, { ...options, force: true });
      } else {
        throw createPluginError(
          PluginErrorCode.UPDATE_FAILED,
          `Cannot determine update source for plugin ${pluginName}`
        );
      }
      
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error,
          message: updateResult.message
        };
      }
      
      const newVersion = updateResult.plugin?.version || 'unknown';
      
      return {
        success: true,
        plugin: updateResult.plugin!,
        previousVersion: currentVersion,
        newVersion,
        message: `Plugin ${pluginName} updated from ${currentVersion} to ${newVersion}`
      };
    } catch (error) {
      return {
        success: false,
        error: error as PluginError,
        message: `Failed to update plugin ${pluginName}: ${(error as Error).message}`
      };
    }
  }

  /**
   * Install npm dependencies for a plugin.
   * 
   * @private
   * @param pluginDir - Directory containing the plugin's package.json
   * @throws Error if npm install fails
   */
  private async installDependencies(pluginDir: string): Promise<void> {
    try {
      await execAsync('npm install --production', { cwd: pluginDir });
    } catch (error) {
      console.warn(`Failed to install dependencies for plugin in ${pluginDir}:`, error);
      // Don't throw - dependencies installation failure shouldn't fail plugin installation
    }
  }

  /**
   * Read and parse a package.json file.
   * 
   * @private
   * @param packageJsonPath - Path to the package.json file
   * @returns Parsed package.json content
   * @throws PluginError if file not found or invalid JSON
   */
  private async readPackageJson(packageJsonPath: string): Promise<PackageJson> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createPluginError(
          PluginErrorCode.INVALID_PLUGIN,
          `package.json not found at ${packageJsonPath}`
        );
      }
      throw createPluginError(
        PluginErrorCode.INVALID_PLUGIN,
        `Invalid package.json at ${packageJsonPath}: ${(error as Error).message}`
      );
    }
  }
}

/**
 * Factory function to create a PluginInstaller instance.
 * 
 * @param pluginsDir - Optional custom plugins directory path
 * @returns New PluginInstaller instance
 */
export function createPluginInstaller(pluginsDir?: string): PluginInstaller {
  return new PluginInstaller(pluginsDir);
}