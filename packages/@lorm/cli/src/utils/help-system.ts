import chalk from 'chalk';

export interface CommandExample {
  command: string;
  description: string;
}

export interface CommandHelp {
  name: string;
  description: string;
  usage: string;
  examples: CommandExample[];
  options?: { flag: string; description: string; default?: string }[];
}

export const COMMAND_HELP: Record<string, CommandHelp> = {
  init: {
    name: 'init',
    description: 'Initialize a new Lorm project with configuration files',
    usage: 'npx @lorm/cli init [options]',
    examples: [
      {
        command: 'npx @lorm/cli init',
        description: 'Initialize project with interactive prompts'
      },
      {
        command: 'npx @lorm/cli init --force',
        description: 'Overwrite existing configuration files'
      },
      {
        command: 'npx @lorm/cli init --skip-install',
        description: 'Skip automatic dependency installation'
      }
    ],
    options: [
      { flag: '--force', description: 'Overwrite existing files' },
      { flag: '--skip-install', description: 'Skip dependency installation' }
    ]
  },
  dev: {
    name: 'dev',
    description: 'Start development server with file watching and type generation',
    usage: 'npx @lorm/cli dev [options]',
    examples: [
      {
        command: 'npx @lorm/cli dev',
        description: 'Start dev server on default port (3000)'
      },
      {
        command: 'npx @lorm/cli dev --port 8080',
        description: 'Start dev server on custom port'
      }
    ],
    options: [
      { flag: '--port <port>', description: 'Port to run the server on', default: '3000' }
    ]
  },
  'db:push': {
    name: 'db:push',
    description: 'Push schema changes directly to the database (destructive)',
    usage: 'npx @lorm/cli db:push [options]',
    examples: [
      {
        command: 'npx @lorm/cli db:push',
        description: 'Push schema with confirmation prompt'
      },
      {
        command: 'npx @lorm/cli db:push --force',
        description: 'Push schema without confirmation (dangerous)'
      }
    ],
    options: [
      { flag: '--force', description: 'Force push without confirmation' }
    ]
  },
  'db:generate': {
    name: 'db:generate',
    description: 'Generate migration files from schema changes',
    usage: 'npx @lorm/cli db:generate [options]',
    examples: [
      {
        command: 'npx @lorm/cli db:generate',
        description: 'Generate migration with auto-generated name'
      },
      {
        command: 'npx @lorm/cli db:generate --name add_users_table',
        description: 'Generate migration with custom name'
      }
    ],
    options: [
      { flag: '--name <name>', description: 'Custom migration name' }
    ]
  },
  'db:migrate': {
    name: 'db:migrate',
    description: 'Apply pending database migrations',
    usage: 'npx @lorm/cli db:migrate [options]',
    examples: [
      {
        command: 'npx @lorm/cli db:migrate',
        description: 'Apply all pending migrations'
      },
      {
        command: 'npx @lorm/cli db:migrate --to 20231201_add_users',
        description: 'Migrate to specific migration'
      }
    ],
    options: [
      { flag: '--to <target>', description: 'Migrate to specific migration' }
    ]
  },
  'db:pull': {
    name: 'db:pull',
    description: 'Pull and introspect schema from existing database',
    usage: 'npx @lorm/cli db:pull [options]',
    examples: [
      {
        command: 'npx @lorm/cli db:pull',
        description: 'Pull schema to default location'
      },
      {
        command: 'npx @lorm/cli db:pull --out ./schemas',
        description: 'Pull schema to custom directory'
      }
    ],
    options: [
      { flag: '--out <dir>', description: 'Output directory for schema files' }
    ]
  },
  'db:studio': {
    name: 'db:studio',
    description: 'Start Drizzle Studio for database management',
    usage: 'npx @lorm/cli db:studio [options]',
    examples: [
      {
        command: 'npx @lorm/cli db:studio',
        description: 'Start studio on default port (4983)'
      },
      {
        command: 'npx @lorm/cli db:studio --port 5000 --host 0.0.0.0',
        description: 'Start studio on custom port and host'
      }
    ],
    options: [
      { flag: '--port <port>', description: 'Port for Drizzle Studio', default: '4983' },
      { flag: '--host <host>', description: 'Host for Drizzle Studio', default: 'localhost' }
    ]
  },
  check: {
    name: 'check',
    description: 'Check schema consistency and validate configuration',
    usage: 'npx @lorm/cli check [options]',
    examples: [
      {
        command: 'npx @lorm/cli check',
        description: 'Basic configuration and schema check'
      },
      {
        command: 'npx @lorm/cli check --verbose',
        description: 'Detailed validation output'
      }
    ],
    options: [
      { flag: '--verbose', description: 'Show detailed validation output' }
    ]
  }
};

/**
 * Display detailed help for a specific command
 */
export function displayCommandHelp(commandName: string): void {
  const help = COMMAND_HELP[commandName];
  
  if (!help) {
    console.error(chalk.red(`Unknown command: ${commandName}`));
    return;
  }

  console.log(chalk.bold.blue(`\n${help.name}`));
  console.log(chalk.gray(help.description));
  
  console.log(chalk.bold('\nUsage:'));
  console.log(`  ${chalk.cyan(help.usage)}`);
  
  if (help.options && help.options.length > 0) {
    console.log(chalk.bold('\nOptions:'));
    help.options.forEach(option => {
      const defaultText = option.default ? chalk.gray(` (default: ${option.default})`) : '';
      console.log(`  ${chalk.yellow(option.flag.padEnd(20))} ${option.description}${defaultText}`);
    });
  }
  
  console.log(chalk.bold('\nExamples:'));
  help.examples.forEach(example => {
    console.log(`  ${chalk.cyan(example.command)}`);
    console.log(`    ${chalk.gray(example.description)}`);
  });
  
  console.log();
}

/**
 * Display general help with all available commands
 */
export function displayGeneralHelp(): void {
  console.log(chalk.bold.blue('\n🚀 Lorm CLI - Mobile-first framework'));
  console.log(chalk.gray('Build full-stack, type-safe mobile apps fast\n'));
  
  console.log(chalk.bold('Usage:'));
  console.log('  npx @lorm/cli <command> [options]\n');
  
  console.log(chalk.bold('Available Commands:'));
  
  const commands = Object.values(COMMAND_HELP);
  const maxNameLength = Math.max(...commands.map(cmd => cmd.name.length));
  
  commands.forEach(cmd => {
    console.log(`  ${chalk.cyan(cmd.name.padEnd(maxNameLength + 2))} ${chalk.gray(cmd.description)}`);
  });
  
  console.log('\n' + chalk.bold('Examples:'));
  console.log('  npx @lorm/cli init              Initialize a new project');
  console.log('  npx @lorm/cli dev               Start development server');
  console.log('  npx @lorm/cli db:push           Push schema to database');
  console.log('  npx @lorm/cli help <command>    Get help for specific command');
  
  console.log('\n' + chalk.gray('For more information, visit: https://lorm.dev/docs'));
  console.log();
}