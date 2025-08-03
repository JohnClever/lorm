import { CAC } from "cac";
import chalk from "chalk";
import { BaseCommandOptions, CommandConfig, ValidationConfig } from "./types";

export type { CommandConfig, ValidationConfig };

export class CommandRegistry {
  private commands: Map<string, CommandConfig<BaseCommandOptions>> = new Map();

  constructor() {}

  register<T extends BaseCommandOptions>(config: CommandConfig<T>): void {
    this.commands.set(config.name, config as CommandConfig<BaseCommandOptions>);
  }

  applyToCAC(cli: CAC): void {
    for (const [name, config] of this.commands) {
      let command = cli.command(name, config.description);

      if (config.aliases) {
        config.aliases.forEach((alias) => {
          command = command.alias(alias);
        });
      }

      if (config.options) {
        config.options.forEach((option) => {
          if (option.flag) {
            command = command.option(
              option.flag,
              option.description,
              option.defaultValue ? { default: option.defaultValue } : undefined
            );
          }
        });
      }

      if (config.examples) {
        config.examples.forEach((example) => {
          command = command.example(example);
        });
      }

      command.action(async (...args) => {
        await this.executeWithEnhancements(config, args, {
          requireConfig: config.requiresConfig ?? false,
          requireSchema: config.requiresSchema ?? false,
        });
      });
    }
  }

  private async executeWithEnhancements<T extends BaseCommandOptions>(
    config: CommandConfig<T>,
    args: (string | number | boolean)[],
    validation: ValidationConfig
  ): Promise<void> {
    const options = (args[args.length - 1] || {}) as T;
    const otherArgs = args.slice(0, -1) as string[];

    try {
      if (validation.requireConfig || validation.requireSchema) {
        // Validation would be implemented here
        // For now, we'll skip validation to maintain compatibility
      }

      await config.action(options, ...otherArgs);
    } catch (error) {
      console.error(chalk.red(`Error executing ${config.name}:`), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  getCommandsByCategory(): Record<string, CommandConfig<BaseCommandOptions>[]> {
    const categories: Record<string, CommandConfig<BaseCommandOptions>[]> = {
      core: [],
      database: [],
      development: [],
      utility: [],
      plugin: [],
      security: [],
    };

    for (const config of this.commands.values()) {
      const category = config.category || "utility";
      if (categories[category]) {
        categories[category].push(config);
      }
    }

    return categories;
  }

  getCommand(name: string): CommandConfig<BaseCommandOptions> | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CommandConfig<BaseCommandOptions>[] {
    return Array.from(this.commands.values());
  }

  getCommandsMap(): Map<string, CommandConfig<BaseCommandOptions>> {
    return new Map(this.commands);
  }
}

export function createCommand<T extends BaseCommandOptions>(
  config: CommandConfig<T>
): CommandConfig<T> {
  return {
    category: "utility",
    ...config,
  };
}

export function createDatabaseCommand<T extends BaseCommandOptions>(
  config: Omit<CommandConfig<T>, "category" | "requiresConfig">
): CommandConfig<T> {
  return {
    ...config,
    category: "database",
    requiresConfig: true,
  } as CommandConfig<T>;
}

export function createDevelopmentCommand<T extends BaseCommandOptions>(
  config: Omit<CommandConfig<T>, "category">
): CommandConfig<T> {
  return {
    ...config,
    category: "development",
  };
}

// Alias for backward compatibility
export const UnifiedCommandSystem = CommandRegistry;