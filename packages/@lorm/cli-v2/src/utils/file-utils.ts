import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Common file existence utilities to reduce repeated existsSync patterns
 */

/**
 * Check if any of the provided files exist
 */
export function anyFileExists(files: string[]): string | null {
  return files.find(file => existsSync(file)) || null;
}

/**
 * Check if all provided files exist
 */
export function allFilesExist(files: string[]): boolean {
  return files.every(file => existsSync(file));
}

/**
 * Check for common configuration files
 */
export function findConfigFile(cwd: string = process.cwd()): string | null {
  const configFiles = [
    'lorm.config.ts',
    'lorm.config.js',
    'drizzle.config.ts'
  ].map(file => join(cwd, file));
  
  return anyFileExists(configFiles);
}

/**
 * Check for package manager lock files
 */
export function detectPackageManagerFromLockFiles(cwd: string = process.cwd()): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  const lockFiles = [
    { file: 'bun.lockb', manager: 'bun' as const },
    { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
    { file: 'yarn.lock', manager: 'yarn' as const },
    { file: 'package-lock.json', manager: 'npm' as const }
  ];
  
  for (const { file, manager } of lockFiles) {
    if (existsSync(join(cwd, file))) {
      return manager;
    }
  }
  
  return 'npm'; // default fallback
}

/**
 * Check if directory is a LORM project
 */
export function isLormProject(cwd: string = process.cwd()): boolean {
  const lormDir = join(cwd, '.lorm');
  return existsSync(lormDir);
}

/**
 * Check for schema file in LORM project
 */
export function hasSchemaFile(cwd: string = process.cwd()): boolean {
  const schemaPath = join(cwd, '.lorm', 'schema.ts');
  return existsSync(schemaPath);
}

/**
 * Check for package.json file
 */
export function hasPackageJson(cwd: string = process.cwd()): boolean {
  return existsSync(join(cwd, 'package.json'));
}

/**
 * Get LORM directory path
 */
export function getLormDir(cwd: string = process.cwd()): string {
  return join(cwd, '.lorm');
}

/**
 * Get schema file path
 */
export function getSchemaPath(cwd: string = process.cwd()): string {
  return join(cwd, '.lorm', 'schema.ts');
}