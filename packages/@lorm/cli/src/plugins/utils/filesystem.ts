/**
 * Plugin Filesystem Utilities
 * Handles file system operations for plugins
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createPluginError } from './validation';
import { PluginErrorCode } from '../types';

/**
 * Get the default plugins directory
 */
export function getPluginsDirectory(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.lorm', 'plugins');
}

/**
 * Get the plugin cache directory
 */
export function getPluginCacheDirectory(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.lorm', 'cache', 'plugins');
}

/**
 * Get the plugin configuration directory
 */
export function getPluginConfigDirectory(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.lorm', 'config', 'plugins');
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * Copy a directory recursively
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
  try {
    // Ensure destination directory exists
    await ensureDirectoryExists(dest);
    
    // Read source directory
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    // Copy each entry
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        await copyDirectory(srcPath, destPath);
      } else {
        // Skip certain files
        if (shouldSkipFile(entry.name)) {
          continue;
        }
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    throw createPluginError(
      PluginErrorCode.FILESYSTEM_ERROR,
      `Failed to copy directory from ${src} to ${dest}: ${(error as Error).message}`
    );
  }
}

/**
 * Check if a file should be skipped during copy
 */
function shouldSkipFile(filename: string): boolean {
  const skipPatterns = [
    '.DS_Store',
    'Thumbs.db',
    '.gitignore',
    '.npmignore',
    '*.log',
    '*.tmp',
    '*.temp'
  ];
  
  return skipPatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    }
    return filename === pattern;
  });
}

/**
 * Read a JSON file safely
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createPluginError(
        PluginErrorCode.FILE_NOT_FOUND,
        `File not found: ${filePath}`
      );
    }
    throw createPluginError(
      PluginErrorCode.INVALID_JSON,
      `Invalid JSON in file ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Write a JSON file safely
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  try {
    const dirPath = path.dirname(filePath);
    await ensureDirectoryExists(dirPath);
    
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw createPluginError(
      PluginErrorCode.FILESYSTEM_ERROR,
      `Failed to write JSON file ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Check if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats safely
 */
export async function getFileStats(filePath: string): Promise<Awaited<ReturnType<typeof fs.stat>> | null> {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * List directories in a path
 */
export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw createPluginError(
      PluginErrorCode.FILESYSTEM_ERROR,
      `Failed to list directories in ${dirPath}: ${(error as Error).message}`
    );
  }
}

/**
 * Remove a directory recursively
 */
export async function removeDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    throw createPluginError(
      PluginErrorCode.FILESYSTEM_ERROR,
      `Failed to remove directory ${dirPath}: ${(error as Error).message}`
    );
  }
}

/**
 * Create a temporary directory
 */
export async function createTempDirectory(prefix: string = 'lorm-plugin'): Promise<string> {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
    return tempDir;
  } catch (error) {
    throw createPluginError(
      PluginErrorCode.FILESYSTEM_ERROR,
      `Failed to create temporary directory: ${(error as Error).message}`
    );
  }
}

/**
 * Clean up temporary directories
 */
export async function cleanupTempDirectories(baseDir: string): Promise<void> {
  try {
    const tempDir = path.join(baseDir, '.temp');
    if (await pathExists(tempDir)) {
      await removeDirectory(tempDir);
    }
  } catch (error) {
    console.warn(`Failed to cleanup temporary directories: ${(error as Error).message}`);
  }
}

/**
 * Get plugin directory path
 */
export function getPluginDirectory(pluginName: string, baseDir?: string): string {
  const pluginsDir = baseDir || getPluginsDirectory();
  return path.join(pluginsDir, pluginName);
}

/**
 * Get plugin package.json path
 */
export function getPluginPackageJsonPath(pluginName: string, baseDir?: string): string {
  return path.join(getPluginDirectory(pluginName, baseDir), 'package.json');
}

/**
 * Get plugin main file path
 */
export function getPluginMainPath(pluginName: string, mainFile: string = 'index.js', baseDir?: string): string {
  return path.join(getPluginDirectory(pluginName, baseDir), mainFile);
}

/**
 * Ensure plugin directories structure exists
 */
export async function ensurePluginDirectories(): Promise<void> {
  await Promise.all([
    ensureDirectoryExists(getPluginsDirectory()),
    ensureDirectoryExists(getPluginCacheDirectory()),
    ensureDirectoryExists(getPluginConfigDirectory())
  ]);
}

/**
 * Get directory size in bytes
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    let totalSize = 0;
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(entryPath);
      } else {
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if directory is empty
 */
export async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length === 0;
  } catch {
    return true;
  }
}

/**
 * Create a backup of a directory
 */
export async function backupDirectory(srcDir: string, backupDir: string): Promise<void> {
  try {
    await copyDirectory(srcDir, backupDir);
  } catch (error) {
    throw createPluginError(
      PluginErrorCode.BACKUP_FAILED,
      `Failed to backup directory ${srcDir}: ${(error as Error).message}`
    );
  }
}

/**
 * Restore a directory from backup
 */
export async function restoreFromBackup(backupDir: string, targetDir: string): Promise<void> {
  try {
    // Remove target directory if it exists
    if (await pathExists(targetDir)) {
      await removeDirectory(targetDir);
    }
    
    // Copy backup to target
    await copyDirectory(backupDir, targetDir);
  } catch (error) {
    throw createPluginError(
      PluginErrorCode.RESTORE_FAILED,
      `Failed to restore from backup ${backupDir}: ${(error as Error).message}`
    );
  }
}