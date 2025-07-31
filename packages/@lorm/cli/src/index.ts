import { cac } from "cac";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import {
  PerformanceMonitor,
  warmCache,
  CommandRegistry,
  getCommandPrefix,
} from "@/utils";
import { getPluginManager, createPluginCommand } from "./plugins";
import { getCoreCommands } from "./commands/core";
import { allDbCommands } from "./commands/db";
import { allUtilityCommands } from "./commands/utility";
import { allSecurityCommands } from "./commands/security";
import { allCacheCommands } from "./commands/cache";
const performanceMonitor = new PerformanceMonitor({
  enabled: true,
  logPath: "./logs/performance.log",
  maxLogSize: 10 * 1024 * 1024,
  retentionDays: 30,
  slowCommandThreshold: 1000,
  memoryWarningThreshold: 100 * 1024 * 1024,
});

const getChalk = async () => {
  const chalk = await import("chalk");
  return chalk.default;
};
const getPluginCommands = async () => {
  return { pluginCommand: createPluginCommand() };
};
const cli = cac("lorm");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8")
);
const commandRegistry = new CommandRegistry();
async function loadPlugins() {
  try {
    // Use plugin manager with autoLoad disabled to prevent hanging
    const pluginManager = getPluginManager();
    await pluginManager.initialize();
    // Don't auto-load all plugins during CLI startup to avoid hanging
    // Plugins will be loaded on-demand when plugin commands are used
  } catch (error) {
    const chalk = await getChalk();
    console.warn(chalk.yellow(`⚠️  Plugin loading failed: ${error}`));
  }
}

async function setupPluginCommands() {
  try {
    const { registerPluginCommands } = await import('./plugins/commands/index.js');
    registerPluginCommands(commandRegistry);
  } catch (error) {
    const chalk = await getChalk();
    console.warn(chalk.yellow(`⚠️  Plugin command setup failed: ${error}`));
  }
}
getCoreCommands(commandRegistry).forEach((command) =>
  commandRegistry.register(command)
);
allDbCommands.forEach((command) => commandRegistry.register(command));
allUtilityCommands.forEach((command) => commandRegistry.register(command));
allSecurityCommands.forEach((command) => commandRegistry.register(command));
allCacheCommands.forEach((command) => commandRegistry.register(command));

// Setup plugin commands before applying to CAC
(async () => {
  await setupPluginCommands();
  commandRegistry.applyToCAC(cli);
})();

// Setup plugin commands before help handling
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  (async () => {
    // Setup plugin commands first
    await setupPluginCommands();
    
    const { createDynamicHelp } = await import("./utils/dynamic-help.js");
    const helpGenerator = createDynamicHelp(commandRegistry.getCommandsMap());
    
    // Check if help is requested for a specific command
    const helpIndex = process.argv.findIndex(arg => arg === "--help" || arg === "-h");
    const commandName = helpIndex > 0 ? process.argv[helpIndex - 1] : null;
    
    // Filter out file paths and invalid command names
    const isValidCommandName = commandName && 
      commandName !== "lorm" && 
      !commandName.startsWith("-") && 
      !commandName.includes("/") && 
      !commandName.endsWith(".js");
    
    if (isValidCommandName) {
      // Try to find the command by exact match first, then by base name
      const commands = commandRegistry.getCommandsMap();
      let foundCommand = commands.get(commandName);
      
      if (!foundCommand) {
        // Look for commands that start with the command name (for parameterized commands)
        for (const [key, value] of commands.entries()) {
          if (key.startsWith(commandName + " ") || key.startsWith(commandName + ":")) {
            foundCommand = value;
            break;
          }
        }
      }
      
      if (foundCommand) {
        helpGenerator.displayCommandHelp(foundCommand.name);
      } else {
        helpGenerator.displayCommandHelp(commandName);
      }
    } else {
      helpGenerator.displayGeneralHelp();
    }
    process.exit(0);
  })();
}
cli.on("command:*", async () => {
  const chalk = await getChalk();
  const commandPrefix = getCommandPrefix();
  console.error(chalk.red(`Unknown command: ${cli.args[0]}`));
  console.log(
    chalk.gray(`\nRun '${commandPrefix} @lorm/cli help' to see available commands`)
  );
  process.exit(1);
});
cli.version(packageJson.version);
const main = async () => {
  const tracker = performanceMonitor.startCommand("cli-startup", []);
  try {
    await warmCache("high");
    await setupPluginCommands();
    await loadPlugins();
    
    // Parse CLI after all commands are registered
    try {
      cli.parse();
    } catch (error) {
      console.error("CLI parsing error:", error);
    }
    
    if (process.argv.length <= 2) {
      console.log("LORM CLI - Use --help for available commands");
    }
    
    await tracker.end(true);
  } catch (error) {
    await tracker.end(
      false,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
};
main().catch(console.error);
export const check = async () => {
  const { validateConfigOrExit } = await import("./utils/config-validator.js");
  return validateConfigOrExit;
};
export { performanceMonitor };
