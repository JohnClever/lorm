import { cac } from "cac";
import { detectProject } from "../utils/project-detection.js";
import { loadConfig } from "./config.js";
import {
  ProjectScopedCache,
} from "@lorm/core";
import { cliSecurityService } from "../services/security.js";
import { UnifiedCommandSystem } from "../core/commands/registry.js";
import { Logger, ICONS } from "../utils/logger.js";
import { cliPerformanceService } from "../services/performance.js";
import { CLIPluginService } from "../services/plugin-service";

/**
 * Bootstrap the LORM CLI v2
 * Handles initialization, plugin loading, and command execution
 */
export async function bootstrap(): Promise<void> {
  // Start performance monitoring session
  cliPerformanceService.startSession('cli_bootstrap', {
    command: process.argv.slice(2).join(' ') || 'default',
    args: process.argv.slice(2)
  });

  // Set up process exit handlers
  process.on("SIGINT", () => {
    cliPerformanceService.endSession();
    Logger.goodbye();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cliPerformanceService.endSession();
    process.exit(0);
  });

  try {
    // 1. Project Detection
    const projectContext = await cliPerformanceService.trackOperation('project_detection', async () => {
      return await detectProject();
    });

    // 2. Configuration Loading
    const config = await cliPerformanceService.trackOperation('config_loading', async () => {
      return await loadConfig(projectContext);
    });

    // 3. Initialize Core Systems
    const { cache, sandbox, commandSystem } = await cliPerformanceService.trackOperation('core_systems_init', async () => {
      const cache = new ProjectScopedCache(projectContext.root, config.cache);
      
      // Update security configuration with project-specific settings
      cliSecurityService.updateConfig({
        sandboxing: config.security.sandboxing,
        allowedPaths: config.security.allowedPaths.length > 0 ? config.security.allowedPaths : [projectContext.root],
        allowedNetworkHosts: config.security.allowedNetworkHosts
      });
      
      // Get the configured sandbox from security service
      const sandbox = cliSecurityService.getSandbox();
      
      const commandSystem = new UnifiedCommandSystem();
      
      return { cache, sandbox, commandSystem };
    });

    // 4. Load Built-in Commands
    await cliPerformanceService.trackOperation('builtin_commands_loading', async () => {
      const { getAllCommands } = await import("../core/commands/index.js");
      const allCommands = getAllCommands(commandSystem);
      allCommands.forEach(command => commandSystem.register(command));
    });

    // 5. Plugin System Initialization
    await cliPerformanceService.trackOperation('plugin_system_init', async () => {
      const pluginService = new CLIPluginService();
      await pluginService.initialize(projectContext.root);
      
      // Load and register plugin commands
      const enabledPlugins = await pluginService.listPlugins({ enabled: true });
      
      // Register plugin commands with the command system
      for (const plugin of enabledPlugins.plugins) {
        try {
          // Plugin commands will be automatically registered through the plugin manager
          Logger.dim(`✓ Loaded plugin: ${plugin.name}`);
        } catch (error) {
          Logger.warning(`Failed to load plugin ${plugin.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    // 6. CLI Setup
    const cli = await cliPerformanceService.trackOperation('cli_setup', async () => {
      const cli = cac("lorm");

      // Set CLI metadata
      cli.version("0.1.0");
      // Note: Don't call cli.help() as it overrides our custom help command

      // Register all commands from plugins
      commandSystem.applyToCAC(cli);
      
      return cli;
    });

    // 7. Parse and Execute

    await cliPerformanceService.trackOperation('command_execution', async () => {
      // Check if any command was provided
      const args = process.argv.slice(2);

      // Intercept --help flag to use custom help system
      if (args.includes('--help') || args.includes('-h')) {
        // Use custom help system instead of CAC's default
        const { createDynamicHelp } = await import('../utils/help-system.js');
        const helpGenerator = createDynamicHelp(commandSystem.getCommandsMap());
        
        // Show general help for --help flag
        helpGenerator.displayGeneralHelp();
        return;
      }

      if (args.length === 0) {
        // No command specified, show custom help and exit
        const { createDynamicHelp } = await import('../utils/help-system.js');
        const helpGenerator = createDynamicHelp(commandSystem.getCommandsMap());
        helpGenerator.displayGeneralHelp();
        return;
      }

      // Parse and execute command
      cli.parse();
    });
  } catch (error) {
    // Record error in performance monitoring
    cliPerformanceService.recordError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    // End performance session
    cliPerformanceService.endSession();
  }
}
