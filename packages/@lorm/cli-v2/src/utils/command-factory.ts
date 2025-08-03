import type { BaseCommandOptions, CommandConfig } from '../core/commands/types.js';

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
  return createCommand({
    ...config,
    name: config.name,
    category: "security",
    requiresConfig: config.requiresConfig ?? true,
    requiresSchema: config.requiresSchema ?? false,
    examples: config.examples || []
  });
}

export function createCacheCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCommand({
    ...config,
    name: `cache:${config.name}`,
    category: "cache",
    requiresConfig: config.requiresConfig ?? true,
    requiresSchema: config.requiresSchema ?? false,
    examples: config.examples?.map((example: string) =>
      example.replace(/^lorm /, `lorm cache:`)
    ) || [],
  });
}

export function createUtilityCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCommand({
    ...config,
    name: config.name,
    category: "utility",
    requiresConfig: config.requiresConfig ?? false,
    requiresSchema: config.requiresSchema ?? false,
    examples: config.examples || []
  });
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
  return 'npx';
}