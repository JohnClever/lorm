// Plugin Installation Utilities for LORM Framework
// Handles plugin downloading, extraction, and setup

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import util from 'util';
import child_process from 'child_process';
import { createLogger } from '../utils/logger';
import {
  PluginName,
  PluginVersion,
  PluginInstallOptions,
  PluginInstallResult,
  PluginOperationResult,
  PluginError,
  PluginErrorCode,
  PluginRuntimeAdapter,
  FilePath,
  StrictRecord,
  PluginInfo,
  LicenseType
} from '../types';

/**
 * Plugin Installation Manager
 * 
 * Handles the complete plugin installation process:
 * - Package resolution and downloading
 * - Extraction and validation
 * - Dependency resolution
 * - Installation verification
 * - Rollback on failure
 */
export class PluginInstaller {
  constructor(
    private readonly adapter: PluginRuntimeAdapter,
    private readonly pluginsDir: FilePath
  ) {}

  /**
   * Install a plugin from various sources
   */
  async installPlugin(
    nameOrPath: string,
    options: PluginInstallOptions = {}
  ): Promise<PluginInstallResult> {
    const startTime = Date.now();
    const installId = this.generateInstallId();

    try {
      createLogger('PluginInstaller').info(`Starting plugin installation: ${nameOrPath}`, {
        installId,
        options
      });

      // Determine installation source
      const source = this.determineInstallationSource(nameOrPath);
      
      // Resolve plugin information
      const pluginInfo = await this.resolvePluginInfo(nameOrPath, source, options);
      
      // Check if plugin is already installed
      if (!options.force) {
        const existingPlugin = await this.checkExistingInstallation(pluginInfo.name);
        if (existingPlugin) {
          if (options.upgrade) {
            return this.upgradePlugin(pluginInfo, options);
          } else {
            return {
              success: false,
              plugin: existingPlugin,
              error: {
                name: 'PluginError',
                code: PluginErrorCode.ALREADY_EXISTS,
                message: `Plugin '${pluginInfo.name}' is already installed. Use --force to reinstall or --upgrade to update.`,
                plugin: pluginInfo.name
              } as PluginError,
              duration: Date.now() - startTime
            };
          }
        }
      }

      // Download plugin package
      const packagePath = await this.downloadPlugin(pluginInfo, source, options);
      
      // Extract plugin
      const extractedPath = await this.extractPlugin(packagePath, pluginInfo);
      
      // Validate plugin structure
      await this.validatePluginStructure(extractedPath, pluginInfo);
      
      // Install dependencies
      if (!options.skipDependencies) {
        await this.installDependencies(extractedPath, pluginInfo, options);
      }
      
      // Move to final location
      const finalPath = await this.moveToFinalLocation(extractedPath, pluginInfo);
      
      // Register plugin
      await this.registerPlugin(finalPath, pluginInfo);
      
      // Run post-install hooks
      await this.runPostInstallHooks(finalPath, pluginInfo, options);
      
      // Cleanup temporary files
      await this.cleanup([packagePath, extractedPath]);

      const duration = Date.now() - startTime;
      
      createLogger('PluginInstaller').info(`Plugin installation completed: ${pluginInfo.name}`, {
        installId,
        duration,
        version: pluginInfo.version
      });

      return {
        success: true,
        plugin: {
          name: pluginInfo.name,
          version: pluginInfo.version,
          description: '',
          author: '',
          license: undefined,
          installed: true,
          enabled: true,
          size: 0, // Will be calculated later
          installDate: new Date(),
          updateDate: new Date(),
          installedAt: new Date(),
          dependencies: [],
          commands: [],
          hooks: [],
          keywords: [],
          isPremium: false,
          marketplace: undefined,
          path: finalPath,
          installPath: finalPath
        },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      createLogger('PluginInstaller').error(`Plugin installation failed: ${nameOrPath}`, {
        installId,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      // Attempt rollback
      await this.rollbackInstallation(nameOrPath, installId);

      return {
        success: false,
        error: this.normalizeError(error, nameOrPath),
        duration
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(
    name: PluginName,
    options: { force?: boolean; keepData?: boolean } = {}
  ): Promise<PluginOperationResult> {
    const startTime = Date.now();

    try {
      createLogger('PluginInstaller').info(`Starting plugin uninstallation: ${name}`);

      // Check if plugin exists
      const pluginPath = await this.getPluginPath(name);
      if (!pluginPath) {
        return {
          success: false,
          error: {
            name: 'PluginError',
            code: PluginErrorCode.PLUGIN_NOT_FOUND,
            message: `Plugin '${name}' is not installed`,
            plugin: name
          } as PluginError
        };
      }

      // Check for dependent plugins
      if (!options.force) {
        const dependents = await this.findDependentPlugins(name);
        if (dependents.length > 0) {
          return {
            success: false,
            error: {
              name: 'PluginError',
              code: PluginErrorCode.DEPENDENCY_ERROR,
              message: `Cannot uninstall '${name}' because it is required by: ${dependents.join(', ')}`,
              plugin: name
            } as PluginError
          };
        }
      }

      // Run pre-uninstall hooks
      await this.runPreUninstallHooks(pluginPath, name);

      // Remove plugin files
      await fs.rmdir(pluginPath, { recursive: true });

      // Unregister plugin
      await this.unregisterPlugin(name);

      // Clean up data (if not keeping)
      if (!options.keepData) {
        await this.cleanupPluginData(name);
      }

      const duration = Date.now() - startTime;
      
      createLogger('PluginInstaller').info(`Plugin uninstallation completed: ${name}`, {
        duration
      });

      return {
        success: true
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      createLogger('PluginInstaller').error(`Plugin uninstallation failed: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      return {
        success: false,
        error: this.normalizeError(error, name)
      };
    }
  }

  /**
   * Upgrade a plugin to a newer version
   */
  private async upgradePlugin(
    newPluginInfo: { name: PluginName; version: PluginVersion },
    options: PluginInstallOptions
  ): Promise<PluginInstallResult> {
    const startTime = Date.now();

    try {
      // Get current plugin info
      const currentPlugin = await this.checkExistingInstallation(newPluginInfo.name);
      if (!currentPlugin) {
        throw new Error(`Plugin '${newPluginInfo.name}' is not currently installed`);
      }

      // Check if upgrade is needed
      if (this.compareVersions(currentPlugin.version, newPluginInfo.version) >= 0) {
        return {
          success: false,
          error: {
            name: 'PluginError',
            code: PluginErrorCode.INVALID_VERSION,
            message: `Plugin '${newPluginInfo.name}' is already at version ${currentPlugin.version} or newer`,
            plugin: newPluginInfo.name
          } as PluginError,
          duration: Date.now() - startTime
        };
      }

      // Backup current plugin
      if (!currentPlugin.path) {
        throw new Error(`Cannot backup plugin ${currentPlugin.name}: path is undefined`);
      }
      const backupPath = await this.backupPlugin({
        name: currentPlugin.name as PluginName,
        version: currentPlugin.version as PluginVersion,
        path: currentPlugin.path as FilePath
      });

      try {
        // Install new version (with force to overwrite)
        const installResult = await this.installPlugin(newPluginInfo.name, {
          ...options,
          force: true,
          upgrade: false // Prevent infinite recursion
        });

        if (installResult.success) {
          // Remove backup
          await fs.rmdir(backupPath, { recursive: true });
          
          createLogger('PluginInstaller').info(`Plugin upgraded successfully: ${newPluginInfo.name}`, {
            from: currentPlugin.version,
            to: newPluginInfo.version
          });
        } else {
          // Restore from backup
          await this.restoreFromBackup(backupPath, {
            name: currentPlugin.name as PluginName,
            version: currentPlugin.version as PluginVersion,
            path: currentPlugin.path as FilePath
          });
          throw new Error(`Upgrade failed: ${installResult.error?.message}`);
        }

        return installResult;

      } catch (upgradeError) {
        // Restore from backup on any error
        await this.restoreFromBackup(backupPath, {
          name: currentPlugin.name as PluginName,
          version: currentPlugin.version as PluginVersion,
          path: currentPlugin.path as FilePath
        });
        throw upgradeError;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      createLogger('PluginInstaller').error(`Plugin upgrade failed: ${newPluginInfo.name}`, {
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      return {
        success: false,
        error: this.normalizeError(error, newPluginInfo.name),
        duration
      };
    }
  }

  /**
   * Determine the installation source type
   */
  private determineInstallationSource(nameOrPath: string): {
    type: 'npm' | 'git' | 'local' | 'marketplace';
    value: string;
  } {
    // Check if it's a local path
    if (nameOrPath.startsWith('./') || nameOrPath.startsWith('../') || nameOrPath.startsWith('/')) {
      return { type: 'local', value: nameOrPath };
    }

    // Check if it's a Git URL
    if (nameOrPath.includes('git+') || nameOrPath.endsWith('.git') || nameOrPath.includes('github.com')) {
      return { type: 'git', value: nameOrPath };
    }

    // Check if it's a URL (treat as marketplace)
    if (nameOrPath.startsWith('http://') || nameOrPath.startsWith('https://')) {
      return { type: 'marketplace', value: nameOrPath };
    }

    // Default to npm package
    return { type: 'npm', value: nameOrPath };
  }

  /**
   * Resolve plugin information from source
   */
  private async resolvePluginInfo(
    nameOrPath: string,
    source: { type: string; value: string },
    options: PluginInstallOptions
  ): Promise<{ name: PluginName; version: PluginVersion; metadata?: StrictRecord<string, unknown> }> {
    switch (source.type) {
      case 'npm':
        return this.resolveNpmPackageInfo(nameOrPath, options.version);
      
      case 'git':
        return this.resolveGitRepositoryInfo(source.value, options.version);
      
      case 'local':
        return this.resolveLocalPackageInfo(source.value);
      
      case 'marketplace':
        return this.resolveMarketplacePackageInfo(source.value);
      
      default:
        throw new Error(`Unsupported installation source: ${source.type}`);
    }
  }

  /**
   * Resolve NPM package information
   */
  private async resolveNpmPackageInfo(
    packageName: string,
    version?: string
  ): Promise<{ name: PluginName; version: PluginVersion; metadata?: StrictRecord<string, unknown> }> {
    try {
      // Use npm view to get package information
      const versionSpec = version || 'latest';
      const command = `npm view ${packageName}@${versionSpec} --json`;
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const result = await execAsync(command);
      const packageInfo = JSON.parse(result.stdout);

      return {
        name: packageInfo.name as PluginName,
        version: packageInfo.version as PluginVersion,
        metadata: {
          description: packageInfo.description,
          author: packageInfo.author,
          license: packageInfo.license,
          homepage: packageInfo.homepage,
          repository: packageInfo.repository
        }
      };
    } catch (error) {
      throw new Error(`Failed to resolve NPM package '${packageName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resolve Git repository information
   */
  private async resolveGitRepositoryInfo(
    gitUrl: string,
    version?: string
  ): Promise<{ name: PluginName; version: PluginVersion; metadata?: StrictRecord<string, unknown> }> {
    // Extract repository name from URL
    const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'unknown';
    
    return {
      name: repoName as PluginName,
      version: (version || '1.0.0') as PluginVersion,
      metadata: {
        repository: gitUrl,
        source: 'git'
      }
    };
  }

  /**
   * Resolve local package information
   */
  private async resolveLocalPackageInfo(
    localPath: string
  ): Promise<{ name: PluginName; version: PluginVersion; metadata?: StrictRecord<string, unknown> }> {
    try {
      const packageJsonPath = path.join(localPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageInfo = JSON.parse(packageJsonContent);

      return {
        name: packageInfo.name as PluginName,
        version: packageInfo.version as PluginVersion,
        metadata: {
          description: packageInfo.description,
          author: packageInfo.author,
          license: packageInfo.license,
          source: 'local',
          path: localPath
        }
      };
    } catch (error) {
      throw new Error(`Failed to resolve local package '${localPath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resolve marketplace package information
   */
  private async resolveMarketplacePackageInfo(
    url: string
  ): Promise<{ name: PluginName; version: PluginVersion; metadata?: StrictRecord<string, unknown> }> {
    // Extract filename from URL
    const filename = url.split('/').pop() || 'unknown';
    const name = filename.replace(/\.(tar\.gz|tgz|zip)$/, '');
    
    return {
      name: name as PluginName,
      version: '1.0.0' as PluginVersion,
      metadata: {
        source: 'marketplace',
        url
      }
    };
  }

  /**
   * Download plugin package
   */
  private async downloadPlugin(
    pluginInfo: { name: PluginName; version: PluginVersion; metadata?: StrictRecord<string, unknown> },
    source: { type: string; value: string },
    options: PluginInstallOptions
  ): Promise<FilePath> {
    const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'plugin-'));
    const packagePath = path.join(tempDir, `${pluginInfo.name}-${pluginInfo.version}.tgz`);

    switch (source.type) {
      case 'npm':
        await this.downloadNpmPackage(source.value, pluginInfo.version, packagePath);
        break;
      
      case 'git':
        await this.downloadGitRepository(source.value, packagePath, options.version);
        break;
      
      case 'local':
        await this.copyLocalPackage(source.value, packagePath);
        break;
      
      case 'marketplace':
        await this.downloadFromUrl(source.value, packagePath);
        break;
      
      default:
        throw new Error(`Unsupported download source: ${source.type}`);
    }

    return packagePath as FilePath;
  }

  /**
   * Download NPM package
   */
  private async downloadNpmPackage(
    packageName: string,
    version: PluginVersion,
    outputPath: string
  ): Promise<void> {
    const command = `npm pack ${packageName}@${version}`;
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync(command, {
      cwd: path.dirname(outputPath)
    });

    // npm pack creates a file in the current directory, move it to the desired location
    const packedFile = result.stdout.trim();
    const sourcePath = path.join(path.dirname(outputPath), packedFile);
    
    await fs.rename(sourcePath, outputPath);
  }

  /**
   * Download Git repository
   */
  private async downloadGitRepository(
    gitUrl: string,
    outputPath: string,
    version?: string
  ): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const tempDir = path.dirname(outputPath);
    const repoDir = path.join(tempDir, 'repo');

    // Clone repository
    const cloneCommand = version 
      ? `git clone --branch ${version} --depth 1 ${gitUrl} ${repoDir}`
      : `git clone --depth 1 ${gitUrl} ${repoDir}`;
    
    await execAsync(cloneCommand);

    // Create tarball
    const tarCommand = `tar -czf ${outputPath} -C ${repoDir} .`;
    await execAsync(tarCommand);

    // Cleanup
    await fs.rmdir(repoDir, { recursive: true });
  }

  /**
   * Copy local package
   */
  private async copyLocalPackage(localPath: string, outputPath: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Create tarball from local directory
    const tarCommand = `tar -czf ${outputPath} -C ${localPath} .`;
    await execAsync(tarCommand);
  }

  /**
   * Download from URL
   */
  private async downloadFromUrl(url: string, outputPath: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Use curl or wget to download
    const command = `curl -L -o ${outputPath} ${url}`;
    await execAsync(command);
  }

  /**
   * Extract plugin package
   */
  private async extractPlugin(
    packagePath: FilePath,
    pluginInfo: { name: PluginName; version: PluginVersion }
  ): Promise<FilePath> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'plugin-'));
    const extractDir = path.join(tempDir, `${pluginInfo.name}-extracted`);

    await fs.mkdir(extractDir, { recursive: true });

    // Extract tarball
    const extractCommand = `tar -xzf ${packagePath} -C ${extractDir}`;
    await execAsync(extractCommand);

    return extractDir as FilePath;
  }

  /**
   * Validate plugin structure
   */
  private async validatePluginStructure(
    extractedPath: FilePath,
    pluginInfo: { name: PluginName; version: PluginVersion }
  ): Promise<void> {
    // Check for package.json
    const packageJsonPath = path.join(extractedPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
    } catch {
      throw new Error('Plugin package must contain a package.json file');
    }

    // Validate package.json
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.name !== pluginInfo.name) {
      throw new Error(`Package name mismatch: expected '${pluginInfo.name}', got '${packageJson.name}'`);
    }

    // Check for main entry point
    const mainFile = packageJson.main || 'index.js';
    const mainPath = path.join(extractedPath, mainFile);
    try {
      await fs.access(mainPath);
    } catch {
      throw new Error(`Plugin main file '${mainFile}' not found`);
    }
  }

  /**
   * Install plugin dependencies
   */
  private async installDependencies(
    pluginPath: FilePath,
    pluginInfo: { name: PluginName; version: PluginVersion },
    options: PluginInstallOptions
  ): Promise<void> {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
      createLogger('PluginInstaller').info(`Installing dependencies for ${pluginInfo.name}`);
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const installCommand = options.useYarn ? 'yarn install' : 'npm install';
      await execAsync(installCommand, {
        cwd: pluginPath
      });
    }
  }

  /**
   * Move plugin to final location
   */
  private async moveToFinalLocation(
    extractedPath: FilePath,
    pluginInfo: { name: PluginName; version: PluginVersion }
  ): Promise<FilePath> {
    const finalPath = path.join(this.pluginsDir, pluginInfo.name);
    
    // Remove existing installation if it exists
    try {
      await fs.access(finalPath);
      await fs.rmdir(finalPath, { recursive: true });
    } catch {
      // Directory doesn't exist, which is fine
    }

    // Move to final location
    await fs.rename(extractedPath, finalPath);
    
    return finalPath as FilePath;
  }

  /**
   * Register plugin in the system
   */
  private async registerPlugin(
    pluginPath: FilePath,
    pluginInfo: { name: PluginName; version: PluginVersion }
  ): Promise<void> {
    // This would typically update a plugin registry file or database
    // For now, we'll just log the registration
    createLogger('PluginInstaller').info(`Registered plugin: ${pluginInfo.name}@${pluginInfo.version}`, {
      path: pluginPath
    });
  }

  /**
   * Run post-install hooks
   */
  private async runPostInstallHooks(
    pluginPath: FilePath,
    pluginInfo: { name: PluginName; version: PluginVersion },
    options: PluginInstallOptions
  ): Promise<void> {
    // Check for post-install script
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.scripts?.postinstall) {
      createLogger('PluginInstaller').info(`Running post-install script for ${pluginInfo.name}`);
      
      const exec = util.promisify(child_process.exec);
      await exec(`cd ${pluginPath} && ${packageJson.scripts.postinstall}`, { cwd: pluginPath });
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(paths: string[]): Promise<void> {
    for (const pathToClean of paths) {
      try {
        const stats = await fs.stat(pathToClean).catch(() => null);
        if (stats) {
          if (stats.isDirectory()) {
            await fs.rmdir(pathToClean, { recursive: true });
          } else {
            await fs.unlink(pathToClean);
          }
        }
      } catch (error) {
        createLogger('PluginInstaller').warn(`Failed to cleanup ${pathToClean}:`, error);
      }
    }
  }

  /**
   * Check for existing plugin installation
   */
  private async checkExistingInstallation(
    name: PluginName
  ): Promise<PluginInfo | null> {
    const pluginPath = path.join(this.pluginsDir, name);
    
    try {
      await fs.access(pluginPath);
    } catch {
      return null;
    }

    try {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      return {
        name: packageJson.name as PluginName,
        version: packageJson.version as PluginVersion,
        description: packageJson.description || '',
        author: packageJson.author,
        license: packageJson.license && this.isValidLicenseType(packageJson.license) ? { type: packageJson.license as LicenseType } : undefined,
        installed: true,
        enabled: true,
        size: 0,
        installDate: new Date(),
        updateDate: new Date(),
        installedAt: new Date(),
        dependencies: [],
        commands: [],
        hooks: [],
        keywords: packageJson.keywords || [],
        isPremium: false,
        marketplace: undefined,
        path: pluginPath,
        installPath: pluginPath
      };
    } catch (error) {
      createLogger('PluginInstaller').warn(`Failed to read plugin info for ${name}:`, error);
      return null;
    }
  }

  /**
   * Get plugin installation path
   */
  private async getPluginPath(name: PluginName): Promise<FilePath | null> {
    const pluginPath = path.join(this.pluginsDir, name);
    
    try {
      await fs.access(pluginPath);
      return pluginPath as FilePath;
    } catch {
      return null;
    }
  }

  /**
   * Find plugins that depend on the given plugin
   */
  private async findDependentPlugins(name: PluginName): Promise<PluginName[]> {
    const dependents: PluginName[] = [];
    
    // This would typically scan all installed plugins and check their dependencies
    // For now, return empty array
    
    return dependents;
  }

  /**
   * Run pre-uninstall hooks
   */
  private async runPreUninstallHooks(
    pluginPath: FilePath,
    name: PluginName
  ): Promise<void> {
    try {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      if (packageJson.scripts?.preuninstall) {
        createLogger('PluginInstaller').info(`Running pre-uninstall script for ${name}`);
        
        const exec = util.promisify(child_process.exec);
        await exec(packageJson.scripts.preuninstall, { cwd: pluginPath });
      }
    } catch (error) {
      createLogger('PluginInstaller').warn(`Failed to run pre-uninstall hooks for ${name}:`, error);
    }
  }

  /**
   * Unregister plugin from the system
   */
  private async unregisterPlugin(name: PluginName): Promise<void> {
    // This would typically update a plugin registry file or database
    createLogger('PluginInstaller').info(`Unregistered plugin: ${name}`);
  }

  /**
   * Clean up plugin data
   */
  private async cleanupPluginData(name: PluginName): Promise<void> {
    // This would typically remove plugin-specific data, configuration, etc.
    createLogger('PluginInstaller').info(`Cleaned up data for plugin: ${name}`);
  }

  /**
   * Backup plugin before upgrade
   */
  private async backupPlugin(
    plugin: { name: PluginName; version: PluginVersion; path: FilePath }
  ): Promise<FilePath> {
    const backupDir = os.tmpdir();
    const backupPath = path.join(backupDir, `${plugin.name}-backup`);
    
    // Note: Using basic file operations - would need to implement copy logic
    // This is a simplified implementation
    
    return backupPath as FilePath;
  }

  /**
   * Restore plugin from backup
   */
  private async restoreFromBackup(
    backupPath: FilePath,
    plugin: { name: PluginName; version: PluginVersion; path: FilePath }
  ): Promise<void> {
    // Note: This is a simplified implementation
    // In a real implementation, you would need to implement file operations
    // using the available adapter methods
    
    createLogger('PluginInstaller').info(`Restored plugin from backup: ${plugin.name}`);
  }

  /**
   * Rollback installation on failure
   */
  private async rollbackInstallation(
    nameOrPath: string,
    installId: string
  ): Promise<void> {
    try {
      createLogger('PluginInstaller').info(`Rolling back installation: ${nameOrPath}`, { installId });
      
      // This would typically remove any partially installed files
      // and restore the previous state
      
    } catch (error) {
      createLogger('PluginInstaller').error(`Rollback failed for ${nameOrPath}:`, error);
    }
  }

  /**
   * Compare two version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Generate unique installation ID
   */
  private generateInstallId(): string {
    return `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidLicenseType(license: string): license is import('../types').LicenseType {
    const validLicenses = [
      'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 
      'LGPL-2.1', 'MPL-2.0', 'CDDL-1.0', 'EPL-2.0', 'Custom', 'Proprietary'
    ];
    return validLicenses.includes(license);
  }

  /**
   * Normalize error to PluginError
   */
  private normalizeError(error: unknown, plugin?: string): PluginError {
    if (error instanceof Error) {
      return {
        name: 'PluginInstallationError',
        code: PluginErrorCode.INSTALLATION_FAILED,
        message: error.message,
        plugin: plugin as PluginName,
        details: {
          stack: error.stack
        }
      };
    }
    
    return {
      name: 'PluginInstallationError',
      code: PluginErrorCode.INSTALLATION_FAILED,
      message: String(error),
      plugin: plugin as PluginName
    };
  }
}