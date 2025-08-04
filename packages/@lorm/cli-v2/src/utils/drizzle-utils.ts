import { join } from 'path';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { Logger } from './logger.js';
import { findConfigFile, isLormProject, hasSchemaFile } from './file-utils.js';
import { getCommandPrefix } from './command-factory.js';

const commandPrefix = getCommandPrefix();

/**
 * Execute Drizzle Kit commands
 * Migrated from v1 implementation
 */
export async function executeDrizzleKit(
  command: string,
  lormDir: string,
  successMessage: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const configPath = join(lormDir, 'drizzle.config.ts');
    
    if (!existsSync(configPath)) {
      reject(new Error(`Drizzle config not found at ${configPath}`));
      return;
    }

    const drizzleProcess = spawn('npx', ['drizzle-kit', command, '--config', configPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    drizzleProcess.on('close', (code: number) => {
      if (code === 0) {
        Logger.success(`[lorm] ${successMessage}`);
        resolve();
      } else {
        reject(new Error(`Drizzle Kit command failed with exit code ${code}`));
      }
    });

    drizzleProcess.on('error', (error: Error) => {
      reject(new Error(`Failed to start Drizzle Kit: ${error.message}`));
    });
  });
}

/**
 * Initialize command with basic validation
 * Migrated from v1 implementation
 */
export async function initializeCommand(operation: string): Promise<{ lormDir: string }> {
  Logger.info(`🚀 [lorm] Starting ${operation}...`);
  
  const lormDir = join(process.cwd(), '.lorm');
  
  if (!isLormProject(process.cwd())) {
    throw new Error(`LORM project not initialized. Run "${commandPrefix} @lorm/cli init" first.`);
  }
  
  return { lormDir };
}

/**
 * Initialize command with advanced validation
 * Migrated from v1 implementation
 */
export async function initializeAdvancedCommand(): Promise<{ lormDir: string }> {
  const lormDir = join(process.cwd(), '.lorm');
  
  if (!isLormProject(process.cwd())) {
    throw new Error(`LORM project not initialized. Run "${commandPrefix} @lorm/cli init" first.`);
  }
  
  if (!hasSchemaFile(process.cwd())) {
    Logger.warning('No schema file found. Some operations may not work correctly.');
  }
  
  return { lormDir };
}

/**
 * Handle command errors
 * Migrated from v1 implementation
 */
export function handleCommandError(error: string | Error, operation: string): void {
  const errorMessage = error instanceof Error ? error.message : error;
  Logger.error(`[lorm] ${operation} failed: ${errorMessage}`);
  process.exit(1);
}

/**
 * Handle advanced command errors with timing
 * Migrated from v1 implementation
 */
export function handleAdvancedCommandError(
  error: string | Error, 
  operation: string, 
  duration: number
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  Logger.error(`[lorm] ${operation} failed after ${duration}ms: ${errorMessage}`);
  process.exit(1);
}