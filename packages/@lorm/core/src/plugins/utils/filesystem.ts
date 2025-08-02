// Plugin Filesystem Utilities for LORM Framework
// Handles plugin file operations and directory management

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from './logger';
import {
  FilePath,
  PluginName,
  PluginRuntimeAdapter,
  PluginError,
  PluginErrorCode,
  StrictRecord
} from '../types';

/**
 * Plugin Filesystem Manager
 * 
 * Provides filesystem utilities specifically for plugin operations:
 * - Safe file and directory operations
 * - Plugin directory structure management
 * - Temporary file handling
 * - File validation and security checks
 * - Atomic operations for plugin installation
 */
export class PluginFilesystemManager {
  private readonly tempDirs: Set<string> = new Set();
  private readonly lockFiles: Map<string, Date> = new Map();

  constructor(
    private readonly adapter: PluginRuntimeAdapter,
    private readonly pluginsDir: FilePath
  ) {}

  /**
   * Initialize the filesystem manager
   */
  async initialize(): Promise<void> {
    try {
      // Ensure plugins directory exists
      await this.ensureDirectory(this.pluginsDir);
      
      // Create subdirectories
      await this.ensureDirectory(path.join(this.pluginsDir, '.temp'));
      await this.ensureDirectory(path.join(this.pluginsDir, '.cache'));
      await this.ensureDirectory(path.join(this.pluginsDir, '.backups'));
      
      // Clean up any leftover temporary files
      await this.cleanupTempFiles();
      
      createLogger('PluginFilesystemManager').info('Plugin filesystem manager initialized');
    } catch (error) {
      createLogger('PluginFilesystemManager').error('Failed to initialize plugin filesystem manager:', error);
      throw error;
    }
  }

  /**
   * Create a temporary directory for plugin operations
   */
  async createTempDirectory(prefix = 'plugin-temp'): Promise<FilePath> {
    try {
      const tempBase = path.join(this.pluginsDir, '.temp');
      const tempName = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempPath = path.join(tempBase, tempName);
      
      await this.ensureDirectory(tempPath);
      
      // Track temporary directory for cleanup
      this.tempDirs.add(tempPath);
      
      createLogger('PluginFilesystemManager').debug(`Created temporary directory: ${tempPath}`);
      
      return tempPath as FilePath;
    } catch (error) {
      createLogger('PluginFilesystemManager').error('Failed to create temporary directory:', error);
      throw this.createFilesystemError('Failed to create temporary directory', error);
    }
  }

  /**
   * Remove a temporary directory
   */
  async removeTempDirectory(tempPath: FilePath): Promise<void> {
    try {
      try {
        await fs.access(tempPath);
        await fs.rmdir(tempPath, { recursive: true });
      } catch {
        // Directory doesn't exist, ignore
      }
      
      // Remove from tracking
      this.tempDirs.delete(tempPath);
      
      createLogger('PluginFilesystemManager').debug(`Removed temporary directory: ${tempPath}`);
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to remove temporary directory ${tempPath}:`, error);
      // Don't throw here - cleanup should be best effort
    }
  }

  /**
   * Clean up all temporary files and directories
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const tempBase = path.join(this.pluginsDir, '.temp');
      
      try {
        await fs.access(tempBase);
        const tempEntries = await fs.readdir(tempBase);
        
        for (const entry of tempEntries) {
          const entryPath = path.join(tempBase, entry);
          
          try {
            const stats = await fs.stat(entryPath);
            if (stats.isDirectory()) {
              await fs.rmdir(entryPath, { recursive: true });
            } else {
              await fs.unlink(entryPath);
            }
          } catch (error) {
            createLogger('PluginFilesystemManager').warn(`Failed to cleanup temp entry ${entryPath}:`, error);
          }
        }
      } catch {
        // Directory doesn't exist, ignore
      }
      
      // Clear tracking
      this.tempDirs.clear();
      
      createLogger('PluginFilesystemManager').debug('Cleaned up temporary files');
    } catch (error) {
      createLogger('PluginFilesystemManager').error('Failed to cleanup temporary files:', error);
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
        createLogger('PluginFilesystemManager').debug(`Created directory: ${dirPath}`);
      }
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to ensure directory ${dirPath}:`, error);
      throw this.createFilesystemError(`Failed to create directory: ${dirPath}`, error);
    }
  }

  /**
   * Get the plugin directory path
   */
  getPluginDirectory(pluginName: PluginName): FilePath {
    return path.join(this.pluginsDir, pluginName) as FilePath;
  }

  /**
   * Get the plugin cache directory path
   */
  getPluginCacheDirectory(pluginName: PluginName): FilePath {
    return path.join(this.pluginsDir, '.cache', pluginName) as FilePath;
  }

  /**
   * Get the plugin backup directory path
   */
  getPluginBackupDirectory(pluginName: PluginName): FilePath {
    return path.join(this.pluginsDir, '.backups', pluginName) as FilePath;
  }

  /**
   * Check if a plugin directory exists
   */
  async pluginExists(pluginName: PluginName): Promise<boolean> {
    try {
      const pluginDir = this.getPluginDirectory(pluginName);
      try {
        await fs.access(pluginDir);
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to check if plugin exists ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Validate plugin directory structure
   */
  async validatePluginStructure(pluginPath: FilePath): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if directory exists
      try {
        await fs.access(pluginPath);
      } catch {
        errors.push('Plugin directory does not exist');
        return { valid: false, errors, warnings };
      }

      // Check if it's a directory
      try {
        const stats = await fs.stat(pluginPath);
        if (!stats.isDirectory()) {
          errors.push('Plugin path is not a directory');
          return { valid: false, errors, warnings };
        }
      } catch {
        errors.push('Cannot access plugin path');
        return { valid: false, errors, warnings };
      }

      // Check for package.json
      const packageJsonPath = path.join(pluginPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        // Validate package.json
        try {
          const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageContent);
          
          if (!packageJson.name) {
            errors.push('package.json is missing name field');
          }
          
          if (!packageJson.version) {
            errors.push('package.json is missing version field');
          }
          
          if (!packageJson.main && !packageJson.exports) {
            warnings.push('package.json is missing main or exports field');
          }
        } catch (parseError) {
          errors.push('package.json is not valid JSON');
        }
      } catch {
        errors.push('package.json file is missing');
      }

      // Check for main entry point
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8').catch(() => '{}');
      const packageJson = JSON.parse(packageJsonContent);
      const mainFile = packageJson.main || 'index.js';
      const mainPath = path.join(pluginPath, mainFile);
      
      try {
        await fs.access(mainPath);
      } catch {
        errors.push(`Main entry point '${mainFile}' does not exist`);
      }

      // Check for common directories
      const commonDirs = ['src', 'lib', 'dist'];
      let hasSourceDir = false;
      
      for (const dir of commonDirs) {
        const dirPath = path.join(pluginPath, dir);
        try {
          await fs.access(dirPath);
          hasSourceDir = true;
          break;
        } catch {
          // Directory doesn't exist, continue
        }
      }
      
      if (!hasSourceDir) {
        warnings.push('No common source directory found (src, lib, or dist)');
      }

      // Check for README
      const readmeFiles = ['README.md', 'README.txt', 'readme.md', 'readme.txt'];
      let hasReadme = false;
      
      for (const readme of readmeFiles) {
        const readmePath = path.join(pluginPath, readme);
        try {
          await fs.access(readmePath);
          hasReadme = true;
          break;
        } catch {
          // File doesn't exist, continue
        }
      }
      
      if (!hasReadme) {
        warnings.push('No README file found');
      }

      // Check for license file
      const licenseFiles = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'license.txt'];
      let hasLicense = false;
      
      for (const license of licenseFiles) {
        const licensePath = path.join(pluginPath, license);
        try {
          await fs.access(licensePath);
          hasLicense = true;
          break;
        } catch {
          // File doesn't exist, continue
        }
      }
      
      if (!hasLicense) {
        warnings.push('No LICENSE file found');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to validate plugin structure for ${pluginPath}:`, error);
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        valid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Copy a directory recursively
   */
  async copyDirectory(sourcePath: string, destPath: string): Promise<void> {
    try {
      await this.ensureDirectory(destPath);
      
      const entries = await fs.readdir(sourcePath);
      
      for (const entry of entries) {
        const sourceEntryPath = path.join(sourcePath, entry);
        const destEntryPath = path.join(destPath, entry);
        
        const stats = await fs.stat(sourceEntryPath);
        if (stats.isDirectory()) {
          await this.copyDirectory(sourceEntryPath, destEntryPath);
        } else {
          await fs.copyFile(sourceEntryPath, destEntryPath);
        }
      }
      
      createLogger('PluginFilesystemManager').debug(`Copied directory from ${sourcePath} to ${destPath}`);
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to copy directory from ${sourcePath} to ${destPath}:`, error);
      throw this.createFilesystemError('Failed to copy directory', error);
    }
  }

  /**
   * Move a directory
   */
  async moveDirectory(sourcePath: string, destPath: string): Promise<void> {
    try {
      // Ensure destination parent directory exists
      const destParent = path.dirname(destPath);
      await this.ensureDirectory(destParent);
      
      // Try to use native move operation first
      try {
        await fs.rename(sourcePath, destPath);
      } catch (moveError) {
        // Fallback to copy + remove
        await this.copyDirectory(sourcePath, destPath);
        await fs.rmdir(sourcePath, { recursive: true });
      }
      
      createLogger('PluginFilesystemManager').debug(`Moved directory from ${sourcePath} to ${destPath}`);
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to move directory from ${sourcePath} to ${destPath}:`, error);
      throw this.createFilesystemError('Failed to move directory', error);
    }
  }

  /**
   * Create a backup of a plugin
   */
  async createPluginBackup(pluginName: PluginName): Promise<FilePath> {
    try {
      const pluginDir = this.getPluginDirectory(pluginName);
      
      try {
        await fs.access(pluginDir);
      } catch {
        throw new Error(`Plugin directory does not exist: ${pluginDir}`);
      }
      
      const backupDir = this.getPluginBackupDirectory(pluginName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}`);
      
      await this.ensureDirectory(backupDir);
      await this.copyDirectory(pluginDir, backupPath);
      
      createLogger('PluginFilesystemManager').info(`Created backup for plugin ${pluginName}: ${backupPath}`);
      
      return backupPath as FilePath;
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to create backup for plugin ${pluginName}:`, error);
      throw this.createFilesystemError('Failed to create plugin backup', error);
    }
  }

  /**
   * Restore a plugin from backup
   */
  async restorePluginFromBackup(pluginName: PluginName, backupPath: FilePath): Promise<void> {
    try {
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error(`Backup does not exist: ${backupPath}`);
      }
      
      const pluginDir = this.getPluginDirectory(pluginName);
      
      // Remove current plugin directory if it exists
      try {
        await fs.access(pluginDir);
        await fs.rmdir(pluginDir, { recursive: true });
      } catch {
        // Directory doesn't exist, ignore
      }
      
      // Restore from backup
      await this.copyDirectory(backupPath, pluginDir);
      
      createLogger('PluginFilesystemManager').info(`Restored plugin ${pluginName} from backup: ${backupPath}`);
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to restore plugin ${pluginName} from backup:`, error);
      throw this.createFilesystemError('Failed to restore plugin from backup', error);
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(pluginName: PluginName, keepCount = 5): Promise<void> {
    try {
      const backupDir = this.getPluginBackupDirectory(pluginName);
      
      try {
        await fs.access(backupDir);
      } catch {
        return;
      }
      
      const backups = await fs.readdir(backupDir);
      
      if (backups.length <= keepCount) {
        return;
      }
      
      // Sort backups by creation time (newest first)
      const backupStats = await Promise.all(
        backups.map(async (backup) => {
          const backupPath = path.join(backupDir, backup);
          const stats = await fs.stat(backupPath);
          return { name: backup, path: backupPath, created: stats.birthtime };
        })
      );
      
      backupStats.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      // Remove old backups
      const backupsToRemove = backupStats.slice(keepCount);
      
      for (const backup of backupsToRemove) {
        await fs.rmdir(backup.path, { recursive: true });
        createLogger('PluginFilesystemManager').debug(`Removed old backup: ${backup.path}`);
      }
      
      if (backupsToRemove.length > 0) {
        createLogger('PluginFilesystemManager').info(`Cleaned up ${backupsToRemove.length} old backups for plugin ${pluginName}`);
      }
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to cleanup old backups for plugin ${pluginName}:`, error);
    }
  }

  /**
   * Acquire a file lock
   */
  async acquireLock(lockName: string, timeoutMs = 30000): Promise<void> {
    const lockPath = path.join(this.pluginsDir, '.temp', `${lockName}.lock`);
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if lock file exists
        try {
          await fs.access(lockPath);
          // Check if lock is stale
          const lockContent = await fs.readFile(lockPath, 'utf-8');
          const lockTime = new Date(lockContent);
          const lockAge = Date.now() - lockTime.getTime();
          
          // Consider lock stale after 5 minutes
          if (lockAge > 5 * 60 * 1000) {
            await fs.unlink(lockPath);
          } else {
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
        } catch {
          // Lock file doesn't exist, continue to create it
        }
        
        // Create lock file
        await fs.writeFile(lockPath, new Date().toISOString());
        this.lockFiles.set(lockName, new Date());
        
        createLogger('PluginFilesystemManager').debug(`Acquired lock: ${lockName}`);
        return;
        
      } catch (error) {
        // Lock creation failed, wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    throw new Error(`Failed to acquire lock '${lockName}' within ${timeoutMs}ms`);
  }

  /**
   * Release a file lock
   */
  async releaseLock(lockName: string): Promise<void> {
    try {
      const lockPath = path.join(this.pluginsDir, '.temp', `${lockName}.lock`);
      
      try {
        await fs.access(lockPath);
        await fs.unlink(lockPath);
      } catch {
        // Lock file doesn't exist, which is fine
      }
      
      this.lockFiles.delete(lockName);
      
      createLogger('PluginFilesystemManager').debug(`Released lock: ${lockName}`);
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to release lock ${lockName}:`, error);
    }
  }

  /**
   * Get directory size
   */
  async getDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;
      
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        
        const stats = await fs.stat(entryPath);
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(entryPath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to get directory size for ${dirPath}:`, error);
      return 0;
    }
  }

  /**
   * Validate file path security
   */
  validatePath(filePath: string): boolean {
    try {
      // Normalize path
      const normalizedPath = path.normalize(filePath);
      
      // Check for path traversal attempts
      if (normalizedPath.includes('..')) {
        return false;
      }
      
      // Check if path is within plugins directory
      const relativePath = path.relative(this.pluginsDir, normalizedPath);
      if (relativePath.startsWith('..')) {
        return false;
      }
      
      return true;
    } catch (error) {
      createLogger('PluginFilesystemManager').error(`Failed to validate path ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Create a filesystem error
   */
  private createFilesystemError(message: string, originalError?: unknown): PluginError {
    return {
      name: 'PluginFilesystemError',
      code: PluginErrorCode.FILESYSTEM_ERROR,
      message,
      details: {
        originalError: originalError instanceof Error ? originalError : new Error(String(originalError))
      }
    };
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup(): Promise<void> {
    try {
      // Release all locks
      for (const lockName of this.lockFiles.keys()) {
        await this.releaseLock(lockName);
      }
      
      // Clean up temporary directories
      await this.cleanupTempFiles();
      
      createLogger('PluginFilesystemManager').info('Plugin filesystem manager cleaned up');
    } catch (error) {
      createLogger('PluginFilesystemManager').error('Failed to cleanup plugin filesystem manager:', error);
    }
  }
}