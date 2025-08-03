/**
 * Command system types for LORM CLI v2 (migrated from v1)
 * Compatible with v1 command structure
 */

/**
 * Base command options with common CLI flags
 */
export interface BaseCommandOptions {
  help?: boolean;
  version?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  config?: string;
  cwd?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Validation configuration for commands
 */
export interface ValidationConfig {
  requireConfig?: boolean;
  requireSchema?: boolean;
}

/**
 * Command option definition
 */
export interface CommandOption {
  name?: string;
  flag?: string;
  description: string;
  defaultValue?: string | number | boolean;
  type?: 'string' | 'number' | 'boolean';
  required?: boolean;
  alias?: string;
  default?: any;
}

/**
 * Command configuration interface
 */
export interface CommandConfig<T extends BaseCommandOptions = BaseCommandOptions> {
  name: string;
  description: string;
  category?: 'core' | 'database' | 'development' | 'utility' | 'security' | 'plugin' | 'cache';
  aliases?: string[];
  options?: CommandOption[];
  examples?: string[];
  requiresConfig?: boolean;
  requiresSchema?: boolean;
  action: (options: T, ...args: string[]) => Promise<void> | void;
}

/**
 * Specific command option types
 */
export interface HelpCommandOptions extends BaseCommandOptions {
  command?: string;
}

export interface InitCommandOptions extends BaseCommandOptions {
  force?: boolean;
  'skip-install'?: boolean;
}

export interface DevCommandOptions extends BaseCommandOptions {
  port?: number;
}

export interface CheckCommandOptions extends BaseCommandOptions {
  fix?: boolean;
}

export interface DbCommandOptions extends BaseCommandOptions {
  force?: boolean;
  seed?: boolean;
  reset?: boolean;
  migrate?: boolean;
}

export interface PerfCommandOptions extends BaseCommandOptions {
  format?: 'json' | 'table';
  output?: string;
}

export interface HealthCommandOptions extends BaseCommandOptions {
  format?: 'json' | 'table';
  output?: string;
}

export interface SecurityCommandOptions extends BaseCommandOptions {
  format?: 'json' | 'table';
  output?: string;
}

export interface CacheCommandOptions extends BaseCommandOptions {
  all?: boolean;
  pattern?: string;
}

/**
 * Command context interface
 */
export interface CommandContext {
  projectRoot: string;
  hasLormConfig: boolean;
  projectType?: 'mobile' | 'web' | 'api' | 'unknown';
  lormConfig?: any;
  framework?: string;
  language?: string;
}

/**
 * Generic command options type
 */
export type CommandOptions = BaseCommandOptions;

/**
 * Command definition interface
 */
export interface CommandDefinition {
  name: string;
  description: string;
  category?: 'core' | 'database' | 'development' | 'utility' | 'security' | 'plugin';
  aliases?: string[];
  options?: CommandOption[];
  examples?: string[];
  requiresLormConfig?: boolean;
  mobileOnly?: boolean;
  handler: (context: CommandContext, options: CommandOptions) => Promise<void>;
}