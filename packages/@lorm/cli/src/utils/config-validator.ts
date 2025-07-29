import chalk from 'chalk';
import { resolve } from 'path';
import { existsSync } from 'fs';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigValidationOptions {
  requireConfig?: boolean;
  requireSchema?: boolean;
  requireRouter?: boolean;
  checkDatabase?: boolean;
}

/**
 * Validates the Lorm project configuration
 */
export async function validateConfig(options: ConfigValidationOptions = {}): Promise<ValidationResult> {
  const {
    requireConfig = true,
    requireSchema = true,
    requireRouter = false,
    checkDatabase = false
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const cwd = process.cwd();

  if (requireConfig) {
    const configPath = resolve(cwd, 'lorm.config.js');
    if (!existsSync(configPath)) {
      errors.push('lorm.config.js not found. Run `npx @lorm/cli init` to create it.');
    } else {
      try {
        const config = await import(configPath);
        if (!config.default && !config.lormConfig) {
          warnings.push('lorm.config.js exists but may not export a valid configuration.');
        }
      } catch (error) {
        errors.push(`Invalid lorm.config.js: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (requireSchema) {
    const schemaPath = resolve(cwd, 'lorm.schema.js');
    if (!existsSync(schemaPath)) {
      errors.push('lorm.schema.js not found. Run `npx @lorm/cli init` to create it.');
    }
  }

  if (requireRouter) {
    const routerPath = resolve(cwd, 'lorm.router.js');
    if (!existsSync(routerPath)) {
      warnings.push('lorm.router.js not found. Some features may not work correctly.');
    }
  }

  const lormDir = resolve(cwd, '.lorm');
  if (!existsSync(lormDir)) {
    warnings.push('.lorm directory not found. Type generation may not work.');
  }

  const packageJsonPath = resolve(cwd, 'package.json');
  if (!existsSync(packageJsonPath)) {
    warnings.push('package.json not found. This may not be a valid Node.js project.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Displays validation results to the console
 */
export function displayValidationResults(result: ValidationResult): void {
  if (result.errors.length > 0) {
    console.error(chalk.red('\n❌ Configuration Errors:'));
    result.errors.forEach(error => {
      console.error(chalk.red(`  • ${error}`));
    });
  }

  if (result.warnings.length > 0) {
    console.warn(chalk.yellow('\n⚠️  Configuration Warnings:'));
    result.warnings.forEach(warning => {
      console.warn(chalk.yellow(`  • ${warning}`));
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log(chalk.green('\n✅ Configuration is valid!'));
  }
}

/**
 * Validates configuration and exits if invalid
 */
export async function validateConfigOrExit(options: ConfigValidationOptions = {}): Promise<void> {
  const result = await validateConfig(options);
  
  if (!result.isValid) {
    displayValidationResults(result);
    console.error(chalk.red('\nPlease fix the configuration errors before proceeding.'));
    throw new Error(result.errors[0] || 'Configuration validation failed');
  }

  if (result.warnings.length > 0) {
    displayValidationResults(result);
  }
}