import chalk from 'chalk';
import { PluginManager, Plugin } from '@lorm/core';
import { BaseCommandOptions } from '@/types';

export class PluginDynamicHelpGenerator {
  private pluginManager: PluginManager;

  constructor(pluginManager: PluginManager) {
    this.pluginManager = pluginManager;
  }

  async displayCommandHelp(commandName: string): Promise<void> {
    const command = await this.findCommandInPlugins(commandName);
    if (!command) {
      console.error(chalk.red(`Unknown command: ${commandName}`));
      console.log(chalk.gray('Available commands:'));
      await this.listAvailableCommands();
      return;
    }

    console.log(chalk.bold.blue(`\n${command.name}`));
    console.log(chalk.gray(command.description));

    console.log(chalk.bold('\nUsage:'));
    const usage = this.generateUsage(command);
    console.log(`  ${chalk.cyan(usage)}`);

    if (command.options && command.options.length > 0) {
      console.log(chalk.bold('\nOptions:'));
      command.options.forEach((option: any) => {
        const defaultText = option.defaultValue
          ? chalk.gray(` (default: ${option.defaultValue})`)
          : '';
        console.log(
          `  ${chalk.yellow(option.flag.padEnd(20))} ${option.description}${defaultText}`
        );
      });
    }

    if (command.examples && command.examples.length > 0) {
      console.log(chalk.bold('\nExamples:'));
      command.examples.forEach((example: any) => {
        console.log(`  ${chalk.cyan(example)}`);
      });
    }

    if (command.aliases && command.aliases.length > 0) {
      console.log(chalk.bold('\nAliases:'));
      command.aliases.forEach((alias: any) => {
        console.log(`  ${chalk.cyan(alias)}`);
      });
    }

    const relatedCommands = await this.getRelatedCommands(command);
    if (relatedCommands.length > 0) {
      console.log(chalk.bold('\nRelated Commands:'));
      relatedCommands.forEach((cmd: any) => {
        console.log(
          `  ${chalk.cyan(cmd.name.padEnd(15))} ${chalk.gray(cmd.description)}`
        );
      });
    }

    console.log();
    console.log(chalk.gray(`💡 Run 'npx @lorm/cli help' to see all commands`));
    console.log();
  }

  async displayGeneralHelp(): Promise<void> {
    console.log(chalk.bold.blue('\n🚀 Lorm CLI - Mobile-first framework'));
    console.log(chalk.gray('Build full-stack, type-safe mobile apps fast\n'));

    console.log(chalk.bold('Usage:'));
    console.log('  npx @lorm/cli <command> [options]\n');

    console.log(chalk.bold('🚀 Quick Start:'));
    const quickStartCommands = ['init', 'dev', 'db:push'];
    for (const cmdName of quickStartCommands) {
      const cmd = await this.findCommandInPlugins(cmdName);
      if (cmd) {
        console.log(
          `  ${chalk.cyan(`npx @lorm/cli ${cmdName}`.padEnd(25))} ${chalk.gray(cmd.description)}`
        );
      }
    }
    console.log();

    const categories = await this.getCommandsByCategory();
    const categoryOrder = ['core', 'development', 'database', 'plugin', 'cache', 'security', 'utility'];

    categoryOrder.forEach((categoryKey) => {
      const commands = categories[categoryKey];
      if (commands && commands.length > 0) {
        const categoryName = this.getCategoryDisplayName(categoryKey);
        const categoryIcon = this.getCategoryIcon(categoryKey);
        console.log(chalk.bold(`${categoryIcon} ${categoryName}:`));
        commands.forEach((cmd) => {
          console.log(
            `   ${chalk.cyan(cmd.name.padEnd(15))} ${chalk.gray(cmd.description)}`
          );
        });
        console.log();
      }
    });

    console.log(chalk.bold('🔧 Global Options:'));
    const globalOptions = [
      { flag: '--help, -h', description: 'Show help for command' },
      { flag: '--version, -v', description: 'Show version number' },
      { flag: '--verbose', description: 'Enable verbose output' },
      { flag: '--quiet, -q', description: 'Suppress non-error output' },
    ];
    globalOptions.forEach((option) => {
      console.log(
        `  ${chalk.yellow(option.flag.padEnd(20))} ${chalk.gray(option.description)}`
      );
    });

    console.log();
    console.log(chalk.bold('📚 Resources:'));
    console.log(`  ${chalk.blue('Documentation:')} https://lorm.dev/docs`);
    console.log(`  ${chalk.blue('GitHub:')} https://github.com/lorm-dev/lorm`);
    console.log(`  ${chalk.blue('Discord:')} https://discord.gg/lorm`);
    console.log();
    console.log(
      chalk.gray("💡 Run 'npx @lorm/cli help <command>' for detailed command help")
    );
    console.log();
  }

  async displayCategoryHelp(categoryName: string): Promise<void> {
    const categories = await this.getCommandsByCategory();
    const normalizedCategory = categoryName.toLowerCase();
    const commands = categories[normalizedCategory];

    if (!commands || commands.length === 0) {
      console.error(chalk.red(`Unknown category: ${categoryName}`));
      console.log(chalk.gray('Available categories:'));
      Object.keys(categories).forEach((cat) => {
        const displayName = this.getCategoryDisplayName(cat);
        console.log(`  ${chalk.cyan(displayName)}`);
      });
      return;
    }

    const displayName = this.getCategoryDisplayName(normalizedCategory);
    const icon = this.getCategoryIcon(normalizedCategory);
    console.log(chalk.bold.blue(`\n${icon} ${displayName}`));
    console.log();

    commands.forEach((cmd) => {
      console.log(chalk.bold(cmd.name));
      console.log(`  ${chalk.gray(cmd.description)}`);
      console.log(`  ${chalk.cyan(this.generateUsage(cmd))}`);
      console.log();
    });

    console.log(
      chalk.gray(`💡 Run 'npx @lorm/cli help <command>' for detailed command help`)
    );
    console.log();
  }

  private async findCommandInPlugins(commandName: string): Promise<any> {
    const pluginInfos = await this.pluginManager.list();
    for (const pluginInfo of pluginInfos) {
      const plugin = this.pluginManager.getPlugin(pluginInfo.name as any);
      if (plugin && plugin.commands) {
        for (const command of plugin.commands) {
          if (command.name === commandName || (command.aliases && command.aliases.includes(commandName))) {
            return command;
          }
        }
      }
    }
    return null;
  }

  private async getAllCommands(): Promise<any[]> {
    const commands: any[] = [];
    const pluginInfos = await this.pluginManager.list();
    for (const pluginInfo of pluginInfos) {
      const plugin = this.pluginManager.getPlugin(pluginInfo.name as any);
      if (plugin && plugin.commands) {
        commands.push(...plugin.commands);
      }
    }
    return commands;
  }

  private generateUsage(command: any): string {
    let usage = `npx @lorm/cli ${command.name}`;
    if (command.options && command.options.length > 0) {
      usage += ' [options]';
    }
    return usage;
  }

  private async getCommandsByCategory(): Promise<Record<string, any[]>> {
    const categories: Record<string, any[]> = {};
    const commands = await this.getAllCommands();
    
    for (const command of commands) {
      const category = command.category || 'utility';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(command);
    }

    Object.keys(categories).forEach((category) => {
      categories[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return categories;
  }

  private async getRelatedCommands(command: any): Promise<any[]> {
    const category = command.category || 'utility';
    const relatedCommands: any[] = [];
    const commands = await this.getAllCommands();
    
    for (const cmd of commands) {
      if (cmd.category === category && cmd.name !== command.name) {
        relatedCommands.push(cmd);
      }
    }
    
    return relatedCommands.slice(0, 5);
  }

  private async listAvailableCommands(): Promise<void> {
    const commands = await this.getAllCommands();
    const commandNames = commands.map(cmd => cmd.name).sort();
    commandNames.forEach((name) => {
      console.log(`  ${chalk.cyan(name)}`);
    });
  }

  private getCategoryDisplayName(category: string): string {
    const displayNames: Record<string, string> = {
      core: 'Project Setup',
      development: 'Development',
      database: 'Database Operations',
      security: 'Security',
      plugin: 'Plugin Management',
      cache: 'Cache Management',
      utility: 'System Utilities',
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
      cache: '💾',
      utility: '🛠️',
    };
    return icons[category] || '📁';
  }
}

export function createPluginDynamicHelp(pluginManager: PluginManager) {
  return new PluginDynamicHelpGenerator(pluginManager);
}