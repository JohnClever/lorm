import chalk from "chalk";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { resolve } from "path";
import { fileExists } from "@/utils/file-utils";
import { languageHandler } from "@/utils/language-handler";

export interface DbStudioOptions {
  port?: number;
  host?: string;
  verbose?: boolean;
}

export async function dbStudioCommand(options: DbStudioOptions = {}) {
  const { port = 4983, host = "localhost", verbose = false } = options;

  console.log(chalk.blue("🎨 Starting database studio..."));

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

    // Check if drizzle-kit is available
    const drizzleKitAvailable = await checkDrizzleKit();
    if (!drizzleKitAvailable) {
      console.error(
        chalk.red(
          "❌ drizzle-kit not found. Install it with: npm install -D drizzle-kit"
        )
      );
      process.exit(1);
    }

    // Create drizzle config if it doesn't exist
    await ensureDrizzleConfig();

    // Start drizzle studio
    await startDrizzleStudio(port, host, verbose);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("❌ Failed to start database studio:"), errorMessage);
    process.exit(1);
  }
}

async function checkProjectSetup(): Promise<boolean> {
  const filePaths = await languageHandler.getFilePaths();
  
  const configExists = await fileExists(filePaths.config);
  const schemaExists = await fileExists(filePaths.schema);

  if (!configExists) {
    console.error(chalk.red("❌ Configuration file not found:"), filePaths.config);
    return false;
  }

  if (!schemaExists) {
    console.error(chalk.red("❌ Schema file not found:"), filePaths.schema);
    return false;
  }

  return true;
}

async function checkDrizzleKit(): Promise<boolean> {
  try {
    const packageJsonPath = resolve("package.json");
    if (await fileExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
      const hasDrizzleKit = 
        packageJson.devDependencies?.["drizzle-kit"] ||
        packageJson.dependencies?.["drizzle-kit"];
      
      if (hasDrizzleKit) {
        return true;
      }
    }
    
    // Try to run drizzle-kit to see if it's globally available
    return new Promise((resolve) => {
      const child = spawn("npx", ["drizzle-kit", "--version"], {
        stdio: "pipe"
      });
      
      child.on("close", (code) => {
        resolve(code === 0);
      });
      
      child.on("error", () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function ensureDrizzleConfig(): Promise<void> {
  const drizzleConfigPath = resolve("drizzle.config.ts");
  
  if (await fileExists(drizzleConfigPath)) {
    console.log(chalk.gray("📄 Using existing drizzle.config.ts"));
    return;
  }

  console.log(chalk.blue("📝 Creating drizzle.config.ts..."));

  const filePaths = await languageHandler.getFilePaths();
  
  const drizzleConfig = `import { defineConfig } from 'drizzle-kit';
import { loadConfig } from '@lorm/core';

export default defineConfig(async () => {
  const config = await loadConfig();
  
  return {
    schema: '${filePaths.schema}',
    out: './drizzle',
    driver: config.db.adapter === 'postgres' ? 'pg' : 
            config.db.adapter === 'mysql' ? 'mysql2' : 'better-sqlite',
    dbCredentials: {
      connectionString: config.db.url,
    },
  };
});
`;

  await fs.writeFile(drizzleConfigPath, drizzleConfig);
  console.log(chalk.green("✅ Created drizzle.config.ts"));
}

async function startDrizzleStudio(port: number, host: string, verbose: boolean): Promise<void> {
  const args = ["drizzle-kit", "studio"];
  
  args.push("--port", port.toString());
  args.push("--host", host);
  
  if (verbose) {
    args.push("--verbose");
  }

  console.log(chalk.blue(`🌐 Starting Drizzle Studio on http://${host}:${port}`));
  console.log(chalk.gray("   Press Ctrl+C to stop the studio"));
  
  const studioProcess = spawn("npx", args, {
    stdio: "inherit",
    env: { ...process.env }
  });

  // Handle process cleanup
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n🛑 Shutting down database studio..."));
    studioProcess.kill("SIGTERM");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    studioProcess.kill("SIGTERM");
    process.exit(0);
  });

  studioProcess.on("error", (error) => {
    console.error(chalk.red("❌ Studio process error:"), error.message);
    process.exit(1);
  });

  studioProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(chalk.red(`❌ Studio exited with code ${code}`));
      process.exit(code);
    }
  });

  console.log(chalk.green("✅ Database studio started successfully"));
}