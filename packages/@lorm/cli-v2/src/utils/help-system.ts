import { Logger, ICONS } from './logger.js';
import { CommandConfig } from '../core/commands/registry';
import { BaseCommandOptions } from '../core/commands/types';

export class DynamicHelpGenerator {
  private commands: Map<string, CommandConfig<BaseCommandOptions>>;

  constructor(commands: Map<string, CommandConfig<BaseCommandOptions>>) {
    this.commands = commands;
  }

  displayCommandHelp(commandName: string): void {
    const command = this.commands.get(commandName);
    if (!command) {
      Logger.error(`Unknown command: ${commandName}`);
      Logger.info('Available commands:');
      this.listAvailableCommands();
      return;
    }

    Logger.withIcon(ICONS.document, `Help: ${command.name}`);
    Logger.dim(command.description);

    Logger.bold('\nUsage:');
    const usage = this.generateUsage(command);
    Logger.info(`  ${usage}`);

    if (command.options && command.options.length > 0) {
      Logger.bold('\nOptions:');
      command.options.forEach((option) => {
        const defaultText = option.defaultValue
          ? ` (default: ${option.defaultValue})`
          : '';
        Logger.dim(
          `  ${(option.flag || option.name || '').padEnd(20)} ${option.description}${defaultText}`
        );
      });
    }

    if (command.examples && command.examples.length > 0) {
      Logger.bold('\nExamples:');
      command.examples.forEach((example) => {
        Logger.info(`  ${example}`);
      });
    }

    if (command.aliases && command.aliases.length > 0) {
      Logger.bold('\nAliases:');
      command.aliases.forEach((alias) => {
        Logger.info(`  ${alias}`);
      });
    }

    const relatedCommands = this.getRelatedCommands(command);
    if (relatedCommands.length > 0) {
      Logger.bold('\nRelated Commands:');
      relatedCommands.forEach((cmd) => {
        Logger.dim(
          `  ${cmd.name.padEnd(15)} ${cmd.description}`
        );
      });
    }

    console.log();
    Logger.info(`💡 Run 'npx @lorm/cli help' to see all commands`);
    console.log();
  }

  displayGeneralHelp(): void {
    Logger.withIcon(ICONS.document, 'LORM CLI v2 - Help System');
    Logger.dim('Build full-stack, type-safe mobile apps fast\n');

    Logger.bold('Usage:');
    console.log('  npx @lorm/cli <command> [options]\n');

    Logger.bold('🚀 Quick Start:');
    const quickStartCommands = ['init', 'dev', 'db:push'];
    quickStartCommands.forEach((cmdName) => {
      const cmd = this.commands.get(cmdName);
      if (cmd) {
        Logger.dim(
          `  ${`npx @lorm/cli ${cmdName}`.padEnd(25)} ${cmd.description}`
        );
      }
    });
    console.log();

    const categories = this.getCommandsByCategory();
    const categoryOrder = ['core', 'development', 'database', 'security', 'plugin', 'utility'];

    categoryOrder.forEach((categoryKey) => {
      const commands = categories[categoryKey];
      if (commands && commands.length > 0) {
        const categoryName = this.getCategoryDisplayName(categoryKey);
        const categoryIcon = this.getCategoryIcon(categoryKey);
        Logger.bold(`${categoryIcon} ${categoryName}:`);
        commands.forEach((cmd) => {
          Logger.dim(
            `   ${cmd.name.padEnd(15)} ${cmd.description}`
          );
        });
        console.log();
      }
    });

    Logger.bold('🔧 Global Options:');
    const globalOptions = [
      { flag: '--help, -h', description: 'Show help for command' },
      { flag: '--version, -v', description: 'Show version number' },
      { flag: '--verbose', description: 'Enable verbose output' },
      { flag: '--quiet, -q', description: 'Suppress non-error output' },
    ];
    globalOptions.forEach((option) => {
      Logger.dim(
        `  ${option.flag.padEnd(20)} ${option.description}`
      );
    });
    console.log();

    Logger.bold('📚 Resources:');
    console.log(`  Documentation: https://lorm.dev/docs`);
    console.log(`  GitHub: https://github.com/lorm-dev/lorm`);
    console.log(`  Discord: https://discord.gg/lorm`);
    console.log();

    Logger.info("💡 Run 'npx @lorm/cli help <command>' for detailed command help");
    console.log();
  }

  displayCategoryHelp(categoryName: string): void {
    const categories = this.getCommandsByCategory();
    const normalizedCategory = categoryName.toLowerCase();
    const commands = categories[normalizedCategory];

    if (!commands || commands.length === 0) {
      Logger.error(`Unknown category: ${categoryName}`);
      Logger.info('Available categories:');
      Object.keys(categories).forEach((cat) => {
        const displayName = this.getCategoryDisplayName(cat);
        Logger.info(`  ${displayName}`);
      });
      return;
    }

    const displayName = this.getCategoryDisplayName(normalizedCategory);
    const icon = this.getCategoryIcon(normalizedCategory);
    Logger.withIcon(ICONS.document, `${icon} ${displayName}`);
    console.log();

    commands.forEach((cmd) => {
      Logger.bold(cmd.name);
      Logger.dim(`  ${cmd.description}`);
      Logger.info(`  ${this.generateUsage(cmd)}`);
      console.log();
    });

    Logger.info(`💡 Run 'npx @lorm/cli help <command>' for detailed command help`);
    console.log();
  }

  private generateUsage(command: CommandConfig<BaseCommandOptions>): string {
    let usage = `npx @lorm/cli ${command.name}`;
    if (command.options && command.options.length > 0) {
      usage += ' [options]';
    }
    return usage;
  }

  private getCommandsByCategory(): Record<string, CommandConfig<BaseCommandOptions>[]> {
    const categories: Record<string, CommandConfig<BaseCommandOptions>[]> = {};
    for (const command of this.commands.values()) {
      const category = command.category || 'utility';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(command);
    }

    Object.keys(categories).forEach((category) => {
      categories[category]?.sort((a, b) => a.name.localeCompare(b.name));
    });

    return categories;
  }

  private getRelatedCommands(command: CommandConfig<BaseCommandOptions>): CommandConfig<BaseCommandOptions>[] {
    const category = command.category || 'utility';
    const relatedCommands: CommandConfig<BaseCommandOptions>[] = [];

    for (const cmd of this.commands.values()) {
      if (cmd.category === category && cmd.name !== command.name) {
        relatedCommands.push(cmd);
      }
    }

    return relatedCommands.slice(0, 5);
  }

  private listAvailableCommands(): void {
    const commandNames = Array.from(this.commands.keys()).sort();
    commandNames.forEach((name) => {
      Logger.dim(`  ${name}`);
    });
  }

  private getCategoryDisplayName(category: string): string {
    const displayNames: Record<string, string> = {
      core: 'Project Setup',
      development: 'Development',
      database: 'Database',
      security: 'Security',
      plugin: 'Plugin Management',
      utility: 'Utility Tools',
    };
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      core: '🚀',
      development: '⚡',
      database: '🗄️',
      security: '🔒',
      plugin: '🔌',
      utility: '🛠️',
    };
    return icons[category] || '📁';
  }
}

export function createDynamicHelp(commands: Map<string, CommandConfig<BaseCommandOptions>>): DynamicHelpGenerator {
  return new DynamicHelpGenerator(commands);
}