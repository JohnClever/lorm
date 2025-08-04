import type { BaseCommandOptions, CommandConfig } from '../core/commands/types.js';
import { getCommandPrefix as getPackageManagerPrefix } from './package-manager.js';

export interface CommandFactoryConfig<T extends BaseCommandOptions> {
  name: string;
  description: string;
  aliases?: string[];
  category?: 'core' | 'database' | 'development' | 'utility' | 'security' | 'plugin' | 'cache';
  requiresConfig?: boolean;
  requiresSchema?: boolean;
  options?: Array<{
    flag: string;
    description: string;
    defaultValue?: any;
  }>;
  examples?: string[];
  action: (options: T) => Promise<void> | void;
}

export function createCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return {
    name: config.name,
    description: config.description,
    aliases: config.aliases || [],
    category: config.category || 'utility',
    requiresConfig: config.requiresConfig ?? true,
    requiresSchema: config.requiresSchema ?? true,
    options: config.options || [],
    examples: config.examples || [],
    action: config.action,
  };
}

/**
 * Category-specific command defaults
 */
const CATEGORY_DEFAULTS = {
  database: { requiresConfig: true, requiresSchema: true },
  security: { requiresConfig: true, requiresSchema: false },
  cache: { requiresConfig: true, requiresSchema: false },
  utility: { requiresConfig: false, requiresSchema: false },
  plugin: { requiresConfig: false, requiresSchema: false },
  core: { requiresConfig: true, requiresSchema: true },
  development: { requiresConfig: true, requiresSchema: false }
} as const;

/**
 * Create a command with category-specific defaults
 */
export function createCategoryCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>,
  category: keyof typeof CATEGORY_DEFAULTS,
  options?: {
    namePrefix?: string;
    exampleTransform?: (example: string) => string;
  }
): CommandConfig<T> {
  const defaults = CATEGORY_DEFAULTS[category];
  const namePrefix = options?.namePrefix || '';
  const exampleTransform = options?.exampleTransform;
  
  return createCommand({
    ...config,
    name: namePrefix + config.name,
    category,
    requiresConfig: config.requiresConfig ?? defaults.requiresConfig,
    requiresSchema: config.requiresSchema ?? defaults.requiresSchema,
    examples: exampleTransform 
      ? (config.examples?.map(exampleTransform) || [])
      : (config.examples || [])
  });
}

// Simplified category-specific factory functions
export function createDbCommand<T extends BaseCommandOptions>(
  config: Omit<CommandConfig<T>, 'category' | 'requiresConfig'>
): CommandConfig<T> {
  return {
    ...config,
    category: 'database',
    requiresConfig: true,
  } as CommandConfig<T>;
}

export function createPluginCommand<T extends BaseCommandOptions>(
  config: Omit<CommandConfig<T>, 'category'>
): CommandConfig<T> {
  return {
    ...config,
    category: 'plugin',
  };
}

export function createSecurityCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCategoryCommand(config, 'security');
}

export function createCacheCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  const commandPrefix = getCommandPrefix();
  return createCategoryCommand(config, 'cache', {
    namePrefix: 'cache:',
    exampleTransform: (example: string) => example.replace(/^lorm /, `${commandPrefix} @lorm/cli cache:`)
  });
}

export function createUtilityCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCategoryCommand(config, 'utility');
}

export function registerCommands<T extends BaseCommandOptions>(
  commands: CommandConfig<T>[],
  registry: { register: (config: CommandConfig<T>) => void }
): void {
  commands.forEach(command => registry.register(command));
}

export function createCommandGroup<T extends BaseCommandOptions>(
  name: string,
  commands: CommandConfig<T>[]
): { name: string; commands: CommandConfig<T>[] } {
  return { name, commands };
}

export function getCommandPrefix(): string {
  return getPackageManagerPrefix();
}