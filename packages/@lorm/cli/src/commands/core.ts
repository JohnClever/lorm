import {
  createCommand,
  createDevelopmentCommand,
  CommandRegistry,
  getCommandPrefix,
} from "@/utils";
import { startServer } from "@lorm/core";
import { initProject } from "./init.js";
import type {
  HelpCommandOptions,
  InitCommandOptions,
  CheckCommandOptions,
  DevCommandOptions,
} from "@/types";

const commandPrefix = getCommandPrefix();

export const createHelpCommand = (commandRegistry: CommandRegistry) =>
  createCommand({
    name: "help [command]",
    description: "Show detailed help information with examples",
    category: "utility",
    action: async (options: HelpCommandOptions, command?: string) => {
      const { createDynamicHelp } = await import("../utils/dynamic-help.js");
      const helpGenerator = createDynamicHelp(commandRegistry.getCommandsMap());
      if (command) {
        const categories = [
          "core",
          "development",
          "database",
          "security",
          // "plugin", // moved to @lorm/core
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
    },
  });
export const devCommand = createDevelopmentCommand({
  name: "dev",
  description:
    "Start development server with file watching and type generation",
  requiresConfig: true,
  requiresSchema: true,
  options: [
    {
      flag: "--port <port>",
      description: "Port to run the server on",
      defaultValue: 3000,
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli dev`,
    `${commandPrefix} @lorm/cli dev --port 3001`,
  ],
  action: async (options: DevCommandOptions) => {
    await startServer(options.port, {
      host: "localhost",
    });
    console.log(`🚀 Dev server running on port ${options.port}`);
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
    await initProject({
      force: options.force,
      skipInstall: options["skip-install"],
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
  action: async (options: CheckCommandOptions) => {
    const { validateConfigOrExit } = await import(
      "../utils/config-validator.js"
    );
    await validateConfigOrExit();
  },
});
export const getCoreCommands = (commandRegistry: CommandRegistry) => [
  createHelpCommand(commandRegistry),
  devCommand,
  initCommand,
  checkCommand,
];
