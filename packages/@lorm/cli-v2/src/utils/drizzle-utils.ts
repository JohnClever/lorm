import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';

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

    drizzleProcess.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✅ [lorm] ${successMessage}`));
        resolve();
      } else {
        reject(new Error(`Drizzle Kit command failed with exit code ${code}`));
      }
    });

    drizzleProcess.on('error', (error) => {
      reject(new Error(`Failed to start Drizzle Kit: ${error.message}`));
    });
  });
}

/**
 * Initialize command with basic validation
 * Migrated from v1 implementation
 */
export async function initializeCommand(operation: string): Promise<{ lormDir: string }> {
  console.log(chalk.blue(`🚀 [lorm] Starting ${operation}...`));
  
  const lormDir = join(process.cwd(), '.lorm');
  
  if (!existsSync(lormDir)) {
    throw new Error('LORM project not initialized. Run "lorm init" first.');
  }
  
  return { lormDir };
}

/**
 * Initialize command with advanced validation
 * Migrated from v1 implementation
 */
export async function initializeAdvancedCommand(): Promise<{ lormDir: string }> {
  const lormDir = join(process.cwd(), '.lorm');
  
  if (!existsSync(lormDir)) {
    throw new Error('LORM project not initialized. Run "lorm init" first.');
  }
  
  const schemaPath = join(lormDir, 'schema.ts');
  if (!existsSync(schemaPath)) {
    console.log(chalk.yellow('⚠️  No schema file found. Some operations may not work correctly.'));
  }
  
  return { lormDir };
}

/**
 * Handle command errors
 * Migrated from v1 implementation
 */
export function handleCommandError(error: string | Error, operation: string): void {
  const errorMessage = error instanceof Error ? error.message : error;
  console.error(chalk.red(`❌ [lorm] ${operation} failed:`));
  console.error(chalk.red(errorMessage));
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
  console.error(chalk.red(`❌ [lorm] ${operation} failed after ${duration}ms:`));
  console.error(chalk.red(errorMessage));
  process.exit(1);
}