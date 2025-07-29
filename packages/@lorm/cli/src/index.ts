import { cac } from "cac";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { lazyLoaders, preloadModules } from "./utils/lazy-loader";

const getLormLib = async () => {
  const {
    CommandCache,
    PluginManager,
    PerformanceMonitor,
    ErrorRecovery,
    displayGeneralHelp,
    displayCommandHelp,
  } = await import("./utils/index.js");
  const { validateConfigOrExit } = await import("@lorm/core");
  return {
    commandCache: CommandCache,
    PluginManager,
    PerformanceMonitor,
    validateConfigOrExit,
    ErrorRecovery,
    displayGeneralHelp,
    displayCommandHelp,
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

cli
  .command("help [command]", "Show detailed help information with examples")
  .action(async (command) => {
    const { displayCommandHelp, displayGeneralHelp } = await getLormLib();
    if (command) {
      displayCommandHelp(command);
    } else {
      displayGeneralHelp();
    }
  });

cli
  .command(
    "dev",
    "Start development server with file watching and type generation"
  )
  .option("--port <port>", "Port to run the server on", { default: 3000 })
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("dev");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true, requireSchema: true });

      console.log(chalk.blue("⚡ [lorm] Starting dev server..."));

      await preloadModules(["lormCore", "chokidar"]);

      const { startServer } = await lazyLoaders.lormCore();
      const { watchRouter } = await import("./commands/gen-lorm-types.js");

      watchRouter();
      await startServer();

      console.log(chalk.green(`🚀 Dev server running on port ${options.port}`));

      perfTracker.end(options);
    }, "Development server startup");
  });

cli
  .command("init", "Initialize a new Lorm project with configuration files")
  .option("--force", "Overwrite existing files")
  .option("--skip-install", "Skip dependency installation")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery } = await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("init");

    await ErrorRecovery.withErrorHandling(async () => {
      console.log(chalk.blue("[lorm] Initializing lorm project..."));

      const { initProject } = await import("./commands/init.js");

      await initProject(options);
      console.log(chalk.green("✅ Project initialized successfully!"));

      perfTracker.end(options);
    }, "Project initialization");
  });

cli
  .command(
    "db:push",
    "Push schema changes directly to the database (destructive)"
  )
  .alias("push")
  .option("--force", "Force push without confirmation")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("db:push");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true, requireSchema: true });
      console.log(chalk.blue("[lorm] Pushing schema to database..."));

      const { push } = await import("./commands/db/index.js");

      await push();
      console.log(chalk.green("✅ Schema pushed successfully!"));

      perfTracker.end(options);
    }, "Schema push");
  });

cli
  .command("db:generate", "Generate migration files from schema changes")
  .alias("generate")
  .option("--name <name>", "Custom migration name")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("db:generate");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true, requireSchema: true });
      console.log(chalk.blue("[lorm] Generating migration files..."));

      const { generate } = await import("./commands/db/index.js");

      await generate();
      console.log(chalk.green("✅ Migration files generated!"));

      perfTracker.end(options);
    }, "Migration generation");
  });

cli
  .command("db:migrate", "Apply pending database migrations")
  .alias("migrate")
  .option("--to <target>", "Migrate to specific migration")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("db:migrate");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true });
      console.log(chalk.blue("[lorm] Applying database migrations..."));

      const { migrate } = await import("./commands/db/index.js");

      await migrate();
      console.log(chalk.green("✅ Migrations applied successfully!"));

      perfTracker.end(options);
    }, "Migration execution");
  });

cli
  .command("db:pull", "Pull and introspect schema from existing database")
  .alias("pull")
  .option("--out <dir>", "Output directory for schema files")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("db:pull");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true });
      console.log(chalk.blue("[lorm] Pulling schema from database..."));

      const { pull } = await import("./commands/db/index.js");

      await pull();
      console.log(chalk.green("✅ Schema pulled successfully!"));

      perfTracker.end(options);
    }, "Schema introspection");
  });

cli
  .command("check", "Check schema consistency and validate configuration")
  .option("--verbose", "Show detailed validation output")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery } = await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("check");

    await ErrorRecovery.withErrorHandling(async () => {
      console.log(chalk.blue("[lorm] Checking schema consistency..."));

      await getCheckCommand();
      console.log(chalk.green("✅ Schema check completed!"));

      perfTracker.end(options);
    }, "Schema validation");
  });

cli
  .command("db:up", "Upgrade schema to latest version")
  .alias("up")
  .option("--dry-run", "Show what would be upgraded without applying")
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("db:up");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true, requireSchema: true });
      console.log(chalk.blue("[lorm] Upgrading schema..."));

      const { up } = await import("./commands/db/index.js");

      await up();
      console.log(chalk.green("✅ Schema upgraded successfully!"));

      perfTracker.end(options);
    }, "Schema upgrade");
  });

cli
  .command("db:studio", "Start Drizzle Studio for database management")
  .alias("studio")
  .option("--port <port>", "Port for Drizzle Studio", { default: 4983 })
  .option("--host <host>", "Host for Drizzle Studio", { default: "localhost" })
  .action(async (options) => {
    const { PerformanceMonitor, ErrorRecovery, validateConfigOrExit } =
      await getLormLib();
    const chalk = await getChalk();

    const startTime = Date.now();
    const perfMonitor = new PerformanceMonitor();
    const perfTracker = perfMonitor.startTracking("db:studio");

    await ErrorRecovery.withErrorHandling(async () => {
      await validateConfigOrExit({ requireConfig: true });
      console.log(chalk.blue("[lorm] Starting Drizzle Studio..."));

      const { studio } = await import("./commands/db/index.js");

      await studio();
      console.log(
        chalk.green(
          `🎨 Drizzle Studio running on ${options.host}:${options.port}`
        )
      );

      perfTracker.end(options);
    }, "Drizzle Studio startup");
  });

cli
  .command("perf", "Show CLI performance metrics and diagnostics")
  .option("--clear", "Clear performance metrics")
  .action(async (options) => {
    const { PerformanceMonitor } = await getLormLib();
    const chalk = await getChalk();

    const perfMonitor = new PerformanceMonitor();
    if (options.clear) {
      perfMonitor.clearMetrics();
      console.log(chalk.green("✅ Performance metrics cleared!"));
    } else {
      perfMonitor.displayReport();
    }
  });

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("-"));

  (async () => {
    const { displayCommandHelp, displayGeneralHelp } = await getLormLib();
    if (command && command !== "--help" && command !== "-h") {
      displayCommandHelp(command);
    } else {
      displayGeneralHelp();
    }
    process.exit(0);
  })();
}

cli.on("command:*", async (unknownCommand) => {
  const chalk = await getChalk();
  console.log(chalk.red(`❌ Unknown command: ${unknownCommand}`));
  console.log(
    chalk.blue("\n📖 Run 'lorm help' to see all available commands.")
  );
  process.exit(1);
});

cli.version(packageJson.version);

loadPluginsAndParse();

export const check = async () => {
  const { check } = await import("./commands/check.js");
  return check;
};
