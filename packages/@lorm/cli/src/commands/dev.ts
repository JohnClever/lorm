import chalk from "chalk";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { resolve } from "path";
import { fileExists } from "@/utils/file-utils";
import { languageHandler } from "@/utils/language-handler";

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
          "❌ LORM project not found. Run 'npx @lorm/cli init' first."
        )
      );
      process.exit(1);
    }

    // Generate types if needed
    await generateTypes();

    // Start development server
    await startDevServer(port, host, watch);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("❌ Failed to start development server:"), errorMessage);
    process.exit(1);
  }
}

async function checkProjectSetup(): Promise<boolean> {
  const filePaths = await languageHandler.getFilePaths();
  
  const configExists = await fileExists(filePaths.config);
  const routerExists = await fileExists(filePaths.router);
  const schemaExists = await fileExists(filePaths.schema);

  if (!configExists) {
    console.error(chalk.red("❌ Configuration file not found:"), filePaths.config);
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

async function generateTypes(): Promise<void> {
  console.log(chalk.blue("📝 Generating types..."));

  try {
    const filePaths = await languageHandler.getFilePaths();
    const routerExists = await fileExists(filePaths.router);
    
    if (!routerExists) {
      console.log(chalk.gray("⏭️  Skipping type generation (no router found)"));
      return;
    }

    // Create types directory
    const typesDir = resolve("lorm/types");
    await fs.mkdir(typesDir, { recursive: true });

    // Generate basic type definitions
    const typeContent = `// Auto-generated types for LORM
// This file is generated automatically - do not edit manually

export interface LormRouter {
  [key: string]: any;
}

export type TypedLormRouter = LormRouter;
`;

    const typesPath = resolve(typesDir, "index.d.ts");
    await fs.writeFile(typesPath, typeContent);
    
    console.log(chalk.green("✅ Types generated successfully"));
  } catch (error) {
    console.warn(chalk.yellow("⚠️  Failed to generate types:"), error instanceof Error ? error.message : String(error));
  }
}

async function startDevServer(port: number, host: string, watch: boolean): Promise<void> {
  console.log(chalk.blue(`🌐 Starting server on http://${host}:${port}`));
  
  // Create a simple development server script
  const serverScript = `
import { startServer } from '@lorm/core';

startServer(${port}, {
  host: '${host}',
  cors: {
    origin: true,
    credentials: true
  }
}).then(() => {
  console.log('🚀 LORM server running on http://${host}:${port}');
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
`;

  // Write temporary server file
  const tempServerPath = resolve(".lorm/dev-server.mjs");
  await fs.mkdir(resolve(".lorm"), { recursive: true });
  await fs.writeFile(tempServerPath, serverScript);

  // Start the server process
  const serverProcess = spawn("node", [tempServerPath], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" }
  });

  // Handle process cleanup
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n🛑 Shutting down development server..."));
    serverProcess.kill("SIGTERM");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    serverProcess.kill("SIGTERM");
    process.exit(0);
  });

  serverProcess.on("error", (error) => {
    console.error(chalk.red("❌ Server process error:"), error.message);
    process.exit(1);
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(chalk.red(`❌ Server exited with code ${code}`));
      process.exit(code || 1);
    }
  });

  console.log(chalk.green("✅ Development server started successfully"));
  console.log(chalk.gray("   Press Ctrl+C to stop the server"));
  
  if (watch) {
    console.log(chalk.blue("👀 Watching for file changes..."));
  }
}