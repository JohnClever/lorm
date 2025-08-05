import chalk from "chalk";
import { fileExists } from "@/utils/file-utils";
import { languageHandler } from "@/utils/language-handler";
import { getCommandPrefix } from "@/utils/package-manager";
import { startServer } from "@lorm/core";
import { watchRouter } from "./gen-types";

const commandPrefix = getCommandPrefix();

export interface DevOptions {
  port?: number;
  host?: string;
  watch?: boolean;
}

export async function devCommand(options: DevOptions = {}) {
  const { port = 3000, host = "localhost", watch = true } = options;

  console.log(chalk.blue("🚀 Starting LORM development server..."));

  try {
    // Check if project is initialized
    const configExists = await checkProjectSetup();
    if (!configExists) {
      console.error(
        chalk.red(
          `❌ LORM project not found. Run '${commandPrefix} @lorm/cli init' first.`
        )
      );
      process.exit(1);
    }

    // Start watching router for type generation if watch is enabled
    if (watch) {
      console.log(chalk.blue("👀 Watching for router changes..."));
      watchRouter().catch((error) => {
        console.warn(
          chalk.yellow("⚠️  Router watching failed:"),
          error instanceof Error ? error.message : String(error)
        );
      });
    }

    // Start the server directly using @lorm/core
    console.log(chalk.blue(`🌐 Starting server on http://${host}:${port}`));
    await startServer(port, {
      host,
      cors: {
        credentials: true,
      },
    });

    console.log(chalk.green("✅ Development server started successfully"));
    console.log(chalk.gray("   Press Ctrl+C to stop the server"));

    // Keep the process alive
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\n🛑 Shutting down development server..."));
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      process.exit(0);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      chalk.red("❌ Failed to start development server:"),
      errorMessage
    );
    process.exit(1);
  }
}

async function checkProjectSetup(): Promise<boolean> {
  const filePaths = await languageHandler.getFilePaths();

  const configExists = await fileExists(filePaths.config);
  const routerExists = await fileExists(filePaths.router);
  const schemaExists = await fileExists(filePaths.schema);

  if (!configExists) {
    console.error(
      chalk.red("❌ Configuration file not found:"),
      filePaths.config
    );
    return false;
  }

  if (!routerExists) {
    console.warn(chalk.yellow("⚠️  Router file not found:"), filePaths.router);
  }

  if (!schemaExists) {
    console.warn(chalk.yellow("⚠️  Schema file not found:"), filePaths.schema);
  }

  return true;
}

// Removed complex generateTypes and startDevServer functions
// Now using startServer from @lorm/core directly and watchRouter from gen-types
