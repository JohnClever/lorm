import { readFile, access, constants } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * Utility functions for common file operations
 * Consolidates repeated file access and reading patterns
 */

/**
 * Check if a file exists at the given path
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if any of the given files exist in the specified directory
 */
export async function findExistingFile(directory: string, filenames: string[]): Promise<string | null> {
  for (const filename of filenames) {
    const filePath = join(directory, filename);
    if (await fileExists(filePath)) {
      return filename;
    }
  }
  return null;
}

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Read and parse a YAML file
 */
export async function readYamlFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return parseYaml(content) as T;
  } catch {
    return null;
  }
}

/**
 * Configuration file parser interface
 */
export interface ConfigParser<T = any> {
  file: string;
  parser: (content: string) => T;
  key?: string;
}

/**
 * Load configuration from multiple sources with priority
 */
export async function loadConfigFromSources<T>(
  directory: string,
  sources: ConfigParser<T>[],
  defaultConfig: T
): Promise<T> {
  for (const source of sources) {
    try {
      const configPath = join(directory, source.file);
      const content = await readFile(configPath, 'utf-8');
      const parsed = source.parser(content);
      const config = source.key && typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>)[source.key] : parsed;
      
      if (config) {
        return config as T;
      }
    } catch {
      // Continue to next source if file doesn't exist or is invalid
      continue;
    }
  }

  return defaultConfig;
}

/**
 * Read package.json from a directory
 */
export async function readPackageJson(directory: string): Promise<any | null> {
  const packageJsonPath = join(directory, 'package.json');
  return readJsonFile(packageJsonPath);
}

/**
 * Find project root by looking for indicator files
 */
export async function findProjectRoot(
  startPath: string = process.cwd(),
  indicators: string[] = ['package.json', '.git', 'lerna.json', 'nx.json', 'rush.json']
): Promise<string> {
  let currentPath = startPath;
  const rootPath = '/';

  while (currentPath !== rootPath) {
    const existingFile = await findExistingFile(currentPath, indicators);
    if (existingFile) {
      return currentPath;
    }

    // Move up one directory
    const parentPath = join(currentPath, '..');
    if (parentPath === currentPath) {
      break; // Reached filesystem root
    }
    currentPath = parentPath;
  }

  // Fallback to current working directory
  return process.cwd();
}