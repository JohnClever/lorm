import { CAC } from "cac";
import { PerformanceMonitor } from "./performance-monitor";
import { BaseCommandOptions, CommandConfig, ValidationConfig } from "../types.js";
import chalk from "chalk";

export type { CommandConfig, ValidationConfig };
export class CommandRegistry {
  private performanceMonitor: PerformanceMonitor;
  private commands: Map<string, CommandConfig<BaseCommandOptions>> = new Map();
  constructor() {
    this.performanceMonitor = new PerformanceMonitor({
      enabled: true,
      logPath: './logs/performance.log',
      maxLogSize: 10 * 1024 * 1024,
      retentionDays: 30,
      slowCommandThreshold: 1000,
      memoryWarningThreshold: 100 * 1024 * 1024
    });
  }
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
          command = command.option(
            option.flag,
            option.description,
            option.defaultValue ? { default: option.defaultValue } : undefined
          );
        });
      }
      if (config.examples) {
        config.examples.forEach((example) => {
          command = command.example(example);
        });
      }
      command.action(async (...args) => {
        await this.executeWithEnhancements(config, args, {
          requireConfig: config.requiresConfig,
          requireSchema: config.requiresSchema,
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
    const tracker = this.performanceMonitor.startCommand(config.name, otherArgs);
    try {
      const { validateConfigOrExit } = await import("./config-validator");
      if (validation.requireConfig || validation.requireSchema) {
        await validateConfigOrExit(validation);
      }
      console.log(
        chalk.blue(`[lorm] ${this.getStartMessage(config.name)}...`)
      );
      await config.action(options, ...otherArgs);
      console.log(chalk.green(`✅ ${this.getSuccessMessage(config.name)}!`));
      await tracker.end(true);
    } catch (error) {
      await tracker.end(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
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
      categories[category].push(config);
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
  private getStartMessage(commandName: string): string {
    const messages: Record<string, string> = {
      dev: "Starting development server",
      init: "Initializing lorm project",
      "db:push": "Pushing schema to database",
      "db:generate": "Generating migration files",
      "db:migrate": "Applying database migrations",
      "db:drop": "Dropping all database tables",
      "db:pull": "Pulling schema from database",
      "db:up": "Upgrading schema",
      "db:studio": "Starting Drizzle Studio",
      check: "Checking schema consistency",
    };
    return messages[commandName] || `Executing ${commandName}`;
  }
  private getSuccessMessage(commandName: string): string {
    const messages: Record<string, string> = {
      dev: "Development server started",
      init: "Project initialized successfully",
      "db:push": "Schema pushed successfully",
      "db:generate": "Migration files generated",
      "db:migrate": "Migrations applied successfully",
      "db:drop": "Database tables dropped successfully",
      "db:pull": "Schema pulled successfully",
      "db:up": "Schema upgraded successfully",
      "db:studio": "Drizzle Studio started",
      check: "Schema check completed",
    };
    return messages[commandName] || `${commandName} completed successfully`;
  }
  private getContextMessage(commandName: string): string {
    const messages: Record<string, string> = {
      dev: "Development server startup",
      init: "Project initialization",
      "db:push": "Schema push",
      "db:generate": "Migration generation",
      "db:migrate": "Migration execution",
      "db:drop": "Database drop operation",
      "db:pull": "Schema introspection",
      "db:up": "Schema upgrade",
      "db:studio": "Drizzle Studio startup",
      check: "Schema validation",
    };
    return messages[commandName] || "Command execution";
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
