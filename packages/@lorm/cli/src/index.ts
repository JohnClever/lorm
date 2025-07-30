import { cac } from "cac";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import {
  lazyLoaders,
  preloadModules,
  PerformanceMonitor,
  warmCache,
  getCacheStats,
  HealthChecker,
  CommandRegistry,
  createCommand,
  createDatabaseCommand,
  createDevelopmentCommand,
} from "@/utils";

import type {
  HelpCommandOptions,
  InitCommandOptions,
  CheckCommandOptions,
  HealthCommandOptions,
  PerformanceCommandOptions,
  CacheStatsCommandOptions,
  SecurityLogsCommandOptions,
  SecurityAuditCommandOptions,
  DevCommandOptions,
  DbPushCommandOptions,
  DbGenerateCommandOptions,
  DbMigrateCommandOptions,
  DbPullCommandOptions,
  DbUpCommandOptions,
  DbStudioCommandOptions,
  DbDropCommandOptions,
  PluginListCommandOptions,
  PluginInstallCommandOptions,
  PluginUninstallCommandOptions,
  PluginEnableCommandOptions,
  PluginDisableCommandOptions,
  PluginUpdateCommandOptions,
  PluginSearchCommandOptions,
} from "@/types";

import { PluginManager as SimplePluginManager } from "./commands/plugin-manager";

const performanceMonitor = new PerformanceMonitor();

const getLormLib = async () => {
  const {
    CommandCache,
    PluginManager,
    PerformanceMonitor,
    ErrorRecovery,
    validateConfigOrExit,
    displayGeneralHelp,
    displayCommandHelp,
    displayCategoryHelp,
    displayQuickStart,
  } = await import("./utils/index");
  return {
    commandCache: CommandCache,
    PluginManager,
    PerformanceMonitor,
    validateConfigOrExit,
    ErrorRecovery,
    displayGeneralHelp,
    displayCommandHelp,
    displayCategoryHelp,
    displayQuickStart,
  };
};

const getChalk = async () => {
  const chalk = await import("chalk");
  return chalk.default;
};

const getPluginCommands = async () => {
  const { registerPluginCommands } = await import("./commands/plugin");
  return { registerPluginCommands };
};

const getCheckCommand = async () => {
  const { check } = await import("./commands/check");
  return { check };
};

const cli = cac("lorm");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8")
);

const commandRegistry = new CommandRegistry();

let errorRecoveryInitialized = false;
const initializeErrorRecovery = async () => {
  if (!errorRecoveryInitialized) {
    const { ErrorRecovery } = await getLormLib();
    ErrorRecovery.setupGracefulShutdown();
    errorRecoveryInitialized = true;
    return ErrorRecovery;
  }
  const { ErrorRecovery } = await getLormLib();
  return ErrorRecovery;
};

let pluginManager: any = null;
const getPluginManager = async () => {
  if (!pluginManager) {
    const { PluginManager, commandCache } = await getLormLib();
    const chalk = await getChalk();
    const { validateConfigOrExit, ErrorRecovery } = await getLormLib();

    pluginManager = new PluginManager({
      cli,
      version: packageJson.version,
      cwd: process.cwd(),
      utils: {
        chalk,
        validateConfig: validateConfigOrExit,
        errorRecovery: ErrorRecovery,
        cache: commandCache,
      },
    });
  }
  return pluginManager;
};

async function loadPluginsAndParse() {
  const ErrorRecovery = await initializeErrorRecovery();

  try {
    const pluginManager = await getPluginManager();
    await pluginManager.loadPlugins();
    pluginManager.registerCommands();

    const { registerPluginCommands } = await getPluginCommands();
    registerPluginCommands(cli, pluginManager);
  } catch (error) {
    const chalk = await getChalk();
    console.warn(chalk.yellow(`⚠️  Plugin loading failed: ${error}`));
  }

  try {
    cli.parse();
  } catch (error) {
    ErrorRecovery.handleError(error as Error, "CLI parsing");
  }

  if (process.argv.length <= 2) {
    const { displayGeneralHelp } = await getLormLib();
    displayGeneralHelp();
  }
}

commandRegistry.register(
  createCommand({
    name: "help [command]",
    description: "Show detailed help information with examples",
    category: "utility",
    action: async (options: HelpCommandOptions, command?: string) => {
      const { displayCommandHelp, displayGeneralHelp, displayCategoryHelp } =
        await getLormLib();
      if (command) {
        displayCommandHelp(command);
      } else {
        displayGeneralHelp();
      }
    },
  })
);

commandRegistry.register(
  createDevelopmentCommand({
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
    examples: ["npx @lorm/cli dev", "npx @lorm/cli dev --port 3001"],
    action: async (options: DevCommandOptions) => {
      await preloadModules(["lormCore", "chokidar"]);

      const { startServer } = await lazyLoaders.lormCore();
      const { watchRouter } = await import("./commands/gen-lorm-types");

      watchRouter();
      await startServer();

      console.log(`🚀 Dev server running on port ${options.port}`);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "init",
    description: "Initialize a new Lorm project with configuration files",
    category: "core",
    options: [
      { flag: "--force", description: "Overwrite existing files" },
      { flag: "--skip-install", description: "Skip dependency installation" },
    ],
    examples: [
      "npx @lorm/cli init",
      "npx @lorm/cli init --force",
      "npx @lorm/cli init --skip-install",
    ],
    action: async (options: InitCommandOptions) => {
      const { initProject } = await import("./commands/init");
      await initProject(options);
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:push",
    description: "Push schema changes directly to the database (destructive)",
    aliases: ["push"],
    requiresSchema: true,
    options: [
      { flag: "--force", description: "Force push without confirmation" },
    ],
    examples: [
      "npx @lorm/cli db:push",
      "npx @lorm/cli push",
      "npx @lorm/cli db:push --force",
    ],
    action: async (options: DbPushCommandOptions) => {
      const { push } = await import("./commands/db/index");
      await push();
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:generate",
    description: "Generate migration files from schema changes",
    aliases: ["generate"],
    requiresSchema: true,
    options: [{ flag: "--name <name>", description: "Custom migration name" }],
    examples: [
      "npx @lorm/cli db:generate",
      "npx @lorm/cli generate",
      "npx @lorm/cli db:generate --name add_users_table",
    ],
    action: async (options: DbGenerateCommandOptions) => {
      const { generate } = await import("./commands/db/index");
      await generate();
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:migrate",
    description: "Apply pending database migrations",
    aliases: ["migrate"],
    options: [
      { flag: "--to <target>", description: "Migrate to specific migration" },
    ],
    examples: [
      "npx @lorm/cli db:migrate",
      "npx @lorm/cli migrate",
      "npx @lorm/cli db:migrate --to 20231201_001",
    ],
    action: async (options: DbMigrateCommandOptions) => {
      const { migrate } = await import("./commands/db/index");
      await migrate();
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:pull",
    description: "Pull database schema and generate types",
    aliases: ["pull"],
    options: [
      {
        flag: "--introspect",
        description: "Only introspect, don't generate types",
      },
    ],
    examples: [
      "npx @lorm/cli db:pull",
      "npx @lorm/cli pull",
      "npx @lorm/cli db:pull --introspect",
    ],
    action: async (options: DbPullCommandOptions) => {
      const { pull } = await import("./commands/db/index");
      await pull();
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "check",
    description: "Check configuration and schema validity",
    category: "core",
    options: [{ flag: "--fix", description: "Attempt to fix common issues" }],
    examples: ["npx @lorm/cli check", "npx @lorm/cli check --fix"],
    action: async (options: CheckCommandOptions) => {
      const { check } = await import("./commands/check");
      await check(options);
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:up",
    description: "Upgrade schema to latest version",
    aliases: ["up"],
    requiresSchema: true,
    options: [
      {
        flag: "--dry-run",
        description: "Show what would be upgraded without applying",
      },
    ],
    examples: [
      "npx @lorm/cli db:up",
      "npx @lorm/cli up",
      "npx @lorm/cli db:up --dry-run",
    ],
    action: async (options: DbUpCommandOptions) => {
      const { up } = await import("./commands/db/index");
      await up();
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:studio",
    description: "Open database studio for visual management",
    aliases: ["studio"],
    options: [
      {
        flag: "--port <port>",
        description: "Port for studio server",
        defaultValue: 4983,
      },
      {
        flag: "--host <host>",
        description: "Host for studio server",
        defaultValue: "localhost",
      },
    ],
    examples: [
      "npx @lorm/cli db:studio",
      "npx @lorm/cli studio",
      "npx @lorm/cli db:studio --port 5000",
    ],
    action: async (options: DbStudioCommandOptions) => {
      const { studio } = await import("./commands/db/index");
      await studio();
    },
  })
);

commandRegistry.register(
  createDatabaseCommand({
    name: "db:drop",
    description: "⚠️  Drop all tables and data (DANGER ZONE)",
    aliases: ["drop"],
    requiresSchema: false,
    options: [
      {
        flag: "--force",
        description: "Skip confirmation prompts (use with extreme caution)",
      },
      {
        flag: "--confirm",
        description: "Confirm destructive operation",
      },
    ],
    examples: [
      "npx @lorm/cli db:drop",
      "npx @lorm/cli drop",
      "npx @lorm/cli db:drop --force",
    ],
    action: async (options: DbDropCommandOptions) => {
      const { drop } = await import("./commands/db/index");
      await drop(options);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "perf",
    description: "Show performance metrics and diagnostics",
    category: "development",
    options: [
      { flag: "--clear", description: "Clear performance history" },
      { flag: "--export <file>", description: "Export metrics to file" },
    ],
    examples: [
      "npx @lorm/cli perf",
      "npx @lorm/cli perf --clear",
      "npx @lorm/cli perf --export metrics.json",
    ],
    action: async (options: PerformanceCommandOptions) => {
      const { PerformanceMonitor } = await getLormLib();
      const chalk = await getChalk();

      const perfMonitor = new PerformanceMonitor();

      if (options.clear) {
        await perfMonitor.clearMetrics();
        console.log(chalk.green("✅ Performance history cleared!"));
        return;
      }

      const report = await perfMonitor.generateReport();
      perfMonitor.displayReport();

      if (options.export) {
        console.log(chalk.blue(`📊 Metrics exported to ${options.export}`));
      }
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "health",
    description: "Run health checks and system diagnostics",
    category: "development",
    aliases: ["doctor"],
    options: [
      { flag: "--system", description: "Show system information" },
      { flag: "--json", description: "Output results in JSON format" },
    ],
    examples: [
      "npx @lorm/cli health",
      "npx @lorm/cli doctor",
      "npx @lorm/cli health --system",
      "npx @lorm/cli health --json",
    ],
    action: async (options: HealthCommandOptions) => {
      const healthChecker = new HealthChecker();

      if (options.system) {
        const systemInfo = await healthChecker.getSystemInfo();
        healthChecker.displaySystemInfo(systemInfo);
      }

      const results = await healthChecker.runAllChecks();

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        healthChecker.displayResults(results);
      }

      const hasFailures = results.some((r) => r.status === "fail");
      if (hasFailures) {
        process.exit(1);
      }
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "doctor",
    description: "Alias for health command - run comprehensive diagnostics",
    category: "development",
    action: async (options: HealthCommandOptions) => {
      const healthChecker = new HealthChecker();
      const systemInfo = await healthChecker.getSystemInfo();
      const results = await healthChecker.runAllChecks();

      healthChecker.displaySystemInfo(systemInfo);
      healthChecker.displayResults(results);

      const hasFailures = results.some((r) => r.status === "fail");
      if (hasFailures) {
        process.exit(1);
      }
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:list",
    description: "List installed plugins",
    category: "plugin",
    aliases: ["plugins"],
    options: [
      { flag: "--installed", description: "Show only installed plugins" },
      { flag: "--enabled", description: "Show only enabled plugins" },
    ],
    examples: [
      "npx @lorm/cli plugin:list",
      "npx @lorm/cli plugins",
      "npx @lorm/cli plugin:list --enabled",
    ],
    action: async (options: PluginListCommandOptions) => {
      const pluginManager = new SimplePluginManager();
      const plugins = await pluginManager.listPlugins({
        installed: options.installed,
        enabled: options.enabled,
      });
      pluginManager.displayPlugins(plugins);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:install",
    description: "Install a plugin from npm, git, or local path",
    category: "plugin",
    options: [
      {
        flag: "--force",
        description: "Force installation even if plugin exists",
      },
    ],
    examples: [
      "npx @lorm/cli plugin:install @lorm/plugin-example",
      "npx @lorm/cli plugin:install github:user/lorm-plugin",
      "npx @lorm/cli plugin:install ./local-plugin",
      "npx @lorm/cli plugin:install @lorm/plugin-example --force",
    ],
    action: async (options: PluginInstallCommandOptions) => {
      const nameOrPath = options._?.[0];
      if (!nameOrPath) {
        console.error("❌ Plugin name or path is required");
        process.exit(1);
      }

      const pluginManager = new SimplePluginManager();
      await pluginManager.installPlugin(nameOrPath, { force: options.force });
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:uninstall",
    description: "Uninstall a plugin",
    category: "plugin",
    examples: ["npx @lorm/cli plugin:uninstall @lorm/plugin-example"],
    action: async (options: PluginUninstallCommandOptions) => {
      const name = options._?.[0];
      if (!name) {
        console.error("❌ Plugin name is required");
        process.exit(1);
      }

      const pluginManager = new SimplePluginManager();
      await pluginManager.uninstallPlugin(name);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:enable",
    description: "Enable a plugin",
    category: "plugin",
    examples: ["npx @lorm/cli plugin:enable @lorm/plugin-example"],
    action: async (options: PluginEnableCommandOptions) => {
      const name = options._?.[0];
      if (!name) {
        console.error("❌ Plugin name is required");
        process.exit(1);
      }

      const pluginManager = new SimplePluginManager();
      await pluginManager.enablePlugin(name);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:disable",
    description: "Disable a plugin",
    category: "plugin",
    examples: ["npx @lorm/cli plugin:disable @lorm/plugin-example"],
    action: async (options: PluginDisableCommandOptions) => {
      const name = options._?.[0];
      if (!name) {
        console.error("❌ Plugin name is required");
        process.exit(1);
      }

      const pluginManager = new SimplePluginManager();
      await pluginManager.disablePlugin(name);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:update",
    description: "Update a plugin to the latest version",
    category: "plugin",
    examples: ["npx @lorm/cli plugin:update @lorm/plugin-example"],
    action: async (options: PluginUpdateCommandOptions) => {
      const name = options._?.[0];
      if (!name) {
        console.error("❌ Plugin name is required");
        process.exit(1);
      }

      const pluginManager = new SimplePluginManager();
      await pluginManager.updatePlugin(name);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "plugin:search",
    description: "Search for available plugins",
    category: "plugin",
    examples: [
      "npx @lorm/cli plugin:search auth",
      "npx @lorm/cli plugin:search database",
    ],
    action: async (options: PluginSearchCommandOptions) => {
      const query = options._?.[0];
      if (!query) {
        console.error("❌ Search query is required");
        process.exit(1);
      }

      const pluginManager = new SimplePluginManager();
      const plugins = await pluginManager.searchPlugins(query);
      pluginManager.displayPlugins(plugins);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "security:logs",
    description: "Display security audit logs",
    category: "security",
    options: [
      {
        flag: "-n, --lines <number>",
        description: "Number of lines to display",
        defaultValue: 50,
      },
      {
        flag: "-l, --level <level>",
        description: "Filter by log level (info, warn, error, critical)",
      },
      {
        flag: "-f, --follow",
        description: "Follow log output in real-time",
      },
      {
        flag: "-j, --json",
        description: "Output in JSON format",
      },
      {
        flag: "-s, --search <term>",
        description: "Search for specific term in logs",
      },
    ],
    examples: [
      "npx @lorm/cli security:logs",
      "npx @lorm/cli security:logs --lines 100",
      "npx @lorm/cli security:logs --level error",
      "npx @lorm/cli security:logs --search 'db_drop'",
      "npx @lorm/cli security:logs --json",
    ],
    action: async (options: SecurityLogsCommandOptions) => {
      const { securityLogs } = await import("@/commands/security/logs");
      await securityLogs(options);
    },
  })
);

commandRegistry.register(
  createCommand({
    name: "security:audit",
    description: "Perform comprehensive security analysis",
    category: "security",
    options: [
      {
        flag: "-v, --verbose",
        description: "Show detailed audit information",
      },
      {
        flag: "-j, --json",
        description: "Output in JSON format",
      },
      {
        flag: "--fix",
        description: "Attempt to fix security issues automatically",
      },
      {
        flag: "--severity <level>",
        description: "Filter by severity level (low, medium, high, critical)",
      },
    ],
    examples: [
      "npx @lorm/cli security:audit",
      "npx @lorm/cli security:audit --verbose",
      "npx @lorm/cli security:audit --json",
      "npx @lorm/cli security:audit --severity high",
    ],
    action: async (options: SecurityAuditCommandOptions) => {
      const { securityAudit } = await import("./commands/security/audit");
      await securityAudit(options);
    },
  })
);

commandRegistry.applyToCAC(cli);

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  (async () => {
    const { displayGeneralHelp } = await getLormLib();
    displayGeneralHelp();
    process.exit(0);
  })();
}

cli.on("command:*", async () => {
  const chalk = await getChalk();
  console.error(chalk.red(`Unknown command: ${cli.args[0]}`));
  console.log(
    chalk.gray("\nRun 'npx @lorm/cli help' to see available commands")
  );
  process.exit(1);
});

cli.version(packageJson.version);

const main = async () => {
  const tracker = performanceMonitor.startTracking("cli-startup");

  try {
    await warmCache("high");

    await loadPluginsAndParse();

    cli
      .command("cache:stats", "Show cache statistics")
      .action(async (options: CacheStatsCommandOptions) => {
        const chalk = await getChalk();
        const stats = getCacheStats();
        console.log(chalk.blue("\n📊 Cache Statistics:"));

        console.log(chalk.green(`✅ Cached modules (${stats.cached.length}):`));
        stats.cached.forEach((module) => {
          console.log(`  ${module}`);
        });

        if (stats.loading.length > 0) {
          console.log(
            chalk.yellow(`⏳ Loading modules (${stats.loading.length}):`)
          );
          stats.loading.forEach((module) => {
            console.log(`  ${module}`);
          });
        }

        if (stats.errors.length > 0) {
          console.log(
            chalk.red(`❌ Modules with errors (${stats.errors.length}):`)
          );
          stats.errors.forEach(({ module, error }) => {
            console.log(`  ${module}: ${error}`);
          });
        }
      });



    tracker.end(undefined, true);
  } catch (error) {
    tracker.recordError();
    tracker.end(undefined, false);
    throw error;
  }
};

main().catch(console.error);

export const check = async () => {
  const { check } = await import("./commands/check");
  return check;
};

export { performanceMonitor };
