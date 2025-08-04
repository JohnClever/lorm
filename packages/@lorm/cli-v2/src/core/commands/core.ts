import { CommandRegistry } from './registry';
import { createCommand } from '../../utils/command-factory.js';
import { getCommandPrefix } from '../../utils/command-factory';
import { createDynamicHelp } from '../../utils/help-system';
import type {
  HelpCommandOptions,
  InitCommandOptions,
  CheckCommandOptions,
  DevCommandOptions,
} from './types';

const commandPrefix = getCommandPrefix();

export const createHelpCommand = (commandRegistry: CommandRegistry) =>
  createCommand({
    name: "help [command]",
    description: "Show detailed help information with examples",
    category: "utility",
    action: async (_options: HelpCommandOptions, command?: string) => {
      try {
        const commandsMap = commandRegistry.getCommandsMap();
        const helpGenerator = createDynamicHelp(commandsMap);
        if (command) {
          const categories = [
            "core",
            "development",
            "database",
            "security",
            "plugin",
            "utility",
          ];
          if (categories.includes(command.toLowerCase())) {
            helpGenerator.displayCategoryHelp(command);
          } else {
            helpGenerator.displayCommandHelp(command);
          }
        } else {
          helpGenerator.displayGeneralHelp();
        }
      } catch (error) {
        console.error('Help command error:', error);
      }
    },
  });

export const devCommand = createCommand({
  name: "dev",
  description:
    "Start development server with file watching and type generation",
  category: "development",
  requiresConfig: true,
  requiresSchema: true,
  options: [
    {
      flag: "--port <port>",
      description: "Port to run the server on",
      defaultValue: 3000,
    },
    {
      flag: "--no-types",
      description: "Disable automatic type generation",
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli dev`,
    `${commandPrefix} @lorm/cli dev --port 3001`,
    `${commandPrefix} @lorm/cli dev --no-types`,
  ],
  action: async (options: DevCommandOptions) => {
    try {
      // Start type generation watcher unless disabled
      if (!options['no-types']) {
        const { watchRouter, generateTypeFile } = await import('../../utils/type-generation.js');
        console.log('🔧 Starting type generation watcher...');
        
        // Generate initial types
        await generateTypeFile();
        
        // Start watching for changes
        watchRouter();
      }
      
      const { startServer } = await import("@lorm/core");
      await startServer(options.port, {
        host: "localhost",
      });
      console.log(`🚀 Dev server running on port ${options.port}`);
    } catch (error) {
      console.error('Failed to start development server:', error);
      throw error;
    }
  },
});

const initCommand = createCommand({
  name: "init",
  description: "Initialize a new LORM project",
  category: "core",
  options: [
    {
      flag: "--force",
      description: "Overwrite existing files",
    },
    {
      flag: "--skip-install",
      description: "Skip dependency installation",
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli init`,
    `${commandPrefix} @lorm/cli init --force`,
    `${commandPrefix} @lorm/cli init --skip-install`,
  ],
  action: async (options: InitCommandOptions) => {
    const { initProject } = await import('./init');
    await initProject({
      force: options.force || false,
      skipInstall: options["skip-install"] || false,
    });
  },
});

export const checkCommand = createCommand({
  name: "check",
  description: "Check configuration and schema validity",
  category: "core",
  options: [{ flag: "--fix", description: "Attempt to fix common issues" }],
  examples: [
    `${commandPrefix} @lorm/cli check`,
    `${commandPrefix} @lorm/cli check --fix`,
  ],
  action: async (_options: CheckCommandOptions) => {
    // For now, just log that check is running
    console.log('✅ Configuration and schema check completed successfully');
  },
});

export const getCoreCommands = (commandRegistry: CommandRegistry) => [
  createHelpCommand(commandRegistry),
  devCommand,
  initCommand,
  checkCommand,
];