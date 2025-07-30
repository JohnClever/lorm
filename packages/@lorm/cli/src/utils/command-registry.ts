import { CAC } from "cac";
import { PerformanceMonitor, PerformanceTracker } from "./performance";
import { ErrorRecovery, RecoveryOptions } from "./error-recovery";
import chalk from "chalk";

export interface CommandConfig {
  name: string;
  description: string;
  aliases?: string[];
  options?: Array<{
    flag: string;
    description: string;
    defaultValue?: any;
  }>;
  requiresConfig?: boolean;
  requiresSchema?: boolean;
  action: (options: any, ...args: any[]) => Promise<void>;
  examples?: string[];
  category?: 'core' | 'database' | 'development' | 'utility' | 'plugin';
}

export interface ValidationConfig {
  requireConfig?: boolean;
  requireSchema?: boolean;
}

export class CommandRegistry {
  private performanceMonitor: PerformanceMonitor;
  private commands: Map<string, CommandConfig> = new Map();

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
  }

  register(config: CommandConfig): void {
    this.commands.set(config.name, config);
  }

  applyToCAC(cli: CAC): void {
    for (const [name, config] of this.commands) {
      let command = cli.command(name, config.description);

      if (config.aliases) {
        config.aliases.forEach(alias => {
          command = command.alias(alias);
        });
      }

      if (config.options) {
        config.options.forEach(option => {
          command = command.option(
            option.flag,
            option.description,
            option.defaultValue ? { default: option.defaultValue } : undefined
          );
        });
      }

      command.action(async (...args) => {
        await this.executeWithEnhancements(
          config,
          args,
          {
            requireConfig: config.requiresConfig,
            requireSchema: config.requiresSchema,
          }
        );
      });
    }
  }

  private async executeWithEnhancements(
    config: CommandConfig,
    args: any[],
    validation: ValidationConfig
  ): Promise<void> {
    const tracker = this.performanceMonitor.startTracking(config.name);
    const options = args[args.length - 1] || {}; // Options are always the last argument
    
    try {
      const { validateConfigOrExit } = await import("./config-validator.js");
      
      await ErrorRecovery.withErrorHandling(async () => {
        if (validation.requireConfig || validation.requireSchema) {
          await validateConfigOrExit(validation);
        }

        console.log(chalk.blue(`[lorm] ${this.getStartMessage(config.name)}...`));

        await config.action(...(args as [any, ...any[]]));

        console.log(chalk.green(`✅ ${this.getSuccessMessage(config.name)}!`));

        tracker.end(options, true);
      }, this.getContextMessage(config.name));
    } catch (error) {
      tracker.recordError();
      tracker.end(options, false);
      throw error;
    }
  }

  getCommandsByCategory(): Record<string, CommandConfig[]> {
    const categories: Record<string, CommandConfig[]> = {
      core: [],
      database: [],
      development: [],
      utility: [],
      plugin: [],
    };

    for (const config of this.commands.values()) {
      const category = config.category || 'utility';
      categories[category].push(config);
    }

    return categories;
  }

  getCommand(name: string): CommandConfig | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CommandConfig[] {
    return Array.from(this.commands.values());
  }

  private getStartMessage(commandName: string): string {
    const messages: Record<string, string> = {
      'dev': 'Starting development server',
      'init': 'Initializing lorm project',
      'db:push': 'Pushing schema to database',
      'db:generate': 'Generating migration files',
      'db:migrate': 'Applying database migrations',
      'db:pull': 'Pulling schema from database',
      'db:up': 'Upgrading schema',
      'db:studio': 'Starting Drizzle Studio',
      'check': 'Checking schema consistency',
    };
    return messages[commandName] || `Executing ${commandName}`;
  }

  private getSuccessMessage(commandName: string): string {
    const messages: Record<string, string> = {
      'dev': 'Development server started',
      'init': 'Project initialized successfully',
      'db:push': 'Schema pushed successfully',
      'db:generate': 'Migration files generated',
      'db:migrate': 'Migrations applied successfully',
      'db:pull': 'Schema pulled successfully',
      'db:up': 'Schema upgraded successfully',
      'db:studio': 'Drizzle Studio started',
      'check': 'Schema check completed',
    };
    return messages[commandName] || `${commandName} completed successfully`;
  }

  private getContextMessage(commandName: string): string {
    const messages: Record<string, string> = {
      'dev': 'Development server startup',
      'init': 'Project initialization',
      'db:push': 'Schema push',
      'db:generate': 'Migration generation',
      'db:migrate': 'Migration execution',
      'db:pull': 'Schema introspection',
      'db:up': 'Schema upgrade',
      'db:studio': 'Drizzle Studio startup',
      'check': 'Schema validation',
    };
    return messages[commandName] || 'Command execution';
  }
}

export function createCommand(config: CommandConfig): CommandConfig {
  return {
    category: 'utility',
    ...config,
  };
}

export function createDatabaseCommand(
  config: Omit<CommandConfig, 'category' | 'requiresConfig'>
): CommandConfig {
  return {
    ...config,
    category: 'database',
    requiresConfig: true,
  };
}

export function createDevelopmentCommand(
  config: Omit<CommandConfig, 'category'>
): CommandConfig {
  return {
    ...config,
    category: 'development',
  };
}