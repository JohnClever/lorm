import { cac } from "cac";
import { detectProject } from "../utils/project-detection.js";
import { loadConfig } from "./config.js";
import {
  CLIPerformanceMonitor,
  type PerformanceOperation,
  ProjectScopedCache,
  PluginSandbox,
  CLIPluginLoader,
} from "@lorm/core/infrastructure";
import { UnifiedCommandSystem } from "../core/commands/registry.js";
import { Logger, ICONS } from "../utils/logger.js";

/**
 * Bootstrap the LORM CLI v2
 * Handles initialization, plugin loading, and command execution
 */
export async function bootstrap(): Promise<void> {
  const startTime = Date.now();

  // Initialize performance monitoring
  const performanceMonitor = new CLIPerformanceMonitor();
  performanceMonitor.start("cli_bootstrap");

  // Set up process exit handlers
  process.on("SIGINT", () => {
    Logger.goodbye();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    process.exit(0);
  });

  try {
    // 1. Project Detection
    performanceMonitor.start("project_detection");
    const projectContext = await detectProject();
    performanceMonitor.end("project_detection");

    // 2. Configuration Loading
    performanceMonitor.start("config_loading");
    const config = await loadConfig(projectContext);
    performanceMonitor.end("config_loading");

    // 3. Initialize Core Systems
    performanceMonitor.start("core_systems_init");
    const cache = new ProjectScopedCache(projectContext.root, config.cache);
    const sandbox = new PluginSandbox(config.security);
    const commandSystem = new UnifiedCommandSystem();
    performanceMonitor.end("core_systems_init");

    // 4. Plugin Loading
    performanceMonitor.start("plugin_loading");
    const pluginLoader = new CLIPluginLoader({
      projectContext,
      config,
      cache,
      sandbox,
      commandSystem,
      performanceMonitor,
    });

    await pluginLoader.loadAllPlugins();
    performanceMonitor.end("plugin_loading");

    // 5. CLI Setup
    performanceMonitor.start("cli_setup");
    const cli = cac("lorm");

    // Set CLI metadata
    cli.version("0.1.0");
    cli.help();

    // Register all commands from plugins
    commandSystem.applyToCAC(cli);
    performanceMonitor.end("cli_setup");

    // 6. Parse and Execute
    performanceMonitor.start("command_execution");

    // Check if any command was provided
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // No command specified, show help and exit
      cli.outputHelp();
      performanceMonitor.end("command_execution");
      return;
    }

    // Parse and execute command
    cli.parse();
    performanceMonitor.end("command_execution");
  } catch (error) {
    performanceMonitor.recordError(
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  } finally {
    // 7. Performance Summary
    performanceMonitor.end("cli_bootstrap");

    if (process.env["LORM_PERFORMANCE"] === "true") {
      const summary = performanceMonitor.generateSummary();
      Logger.withIcon(ICONS.chart, "Performance Summary:", "dim");
      Logger.performance("Total execution time", `${Date.now() - startTime}ms`);
      Logger.performance(
        "Memory usage",
        `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      );

      if (summary.operations.length > 0) {
        Logger.dim("Operations:");
        summary.operations.forEach((op: PerformanceOperation) => {
          Logger.performance(`  ${op.name}`, `${op.duration}ms`);
        });
      }
    }

    // Ensure process exits after bootstrap completion
    process.exit(0);
  }
}
