import chalk from "chalk";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { resolve } from "path";
import { loadConfig } from "@lorm/core";
import { fileExists } from "@/utils/file-utils";
import { languageHandler } from "@/utils/language-handler";
import { drizzleConfigTemplate } from "@/templates";
import { getCommandPrefix } from "@/utils/package-manager";

const commandPrefix = getCommandPrefix()

export interface DbPushOptions {
  force?: boolean;
  verbose?: boolean;
}

export async function dbPushCommand(options: DbPushOptions = {}) {
  const { force = false, verbose = false } = options;

  console.log(chalk.blue("📤 Pushing schema changes to database..."));

  try {
    // Check if project is initialized
    const configExists = await checkProjectSetup();
    if (!configExists) {
      console.error(
        chalk.red(`❌ LORM project not found. Run '${commandPrefix} @lorm/cli init' first.`)
      );
      process.exit(1);
    }

    // Create drizzle config if it doesn't exist
    await ensureDrizzleConfig();

    // Run drizzle-kit push
    await runDrizzlePush(force, verbose);

    console.log(chalk.green("✅ Schema changes pushed successfully!"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("❌ Failed to push schema changes:"), errorMessage);
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

// checkDrizzleKit function removed - drizzle-kit is bundled with the CLI

async function ensureDrizzleConfig(): Promise<void> {
  const lormDir = resolve(".lorm");
  const drizzleConfigPath = resolve(".lorm/drizzle.config.ts");
  const schemaPath = resolve(".lorm/schema.ts");
  
  // Create .lorm directory if it doesn't exist
  try {
    await fs.mkdir(lormDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
  
  if (await fileExists(drizzleConfigPath)) {
    console.log(chalk.gray("📄 Using existing .lorm/drizzle.config.ts"));
    return;
  }

  console.log(chalk.blue("📝 Creating .lorm/drizzle.config.ts and schema.ts..."));

  // Load the LORM config and generate drizzle config using template
  const config = await loadConfig();
  const filePaths = await languageHandler.getFilePaths();
  
  // Create schema.ts that re-exports the main schema
  const schemaContent = `// Auto-generated schema re-export for Drizzle
export * from "../${filePaths.schema.replace(/\.(ts|js|mjs)$/, "")}";`;
  await fs.writeFile(schemaPath, schemaContent);
  
  // Generate drizzle config that points to the .lorm schema
  const drizzleConfig = drizzleConfigTemplate(config).replace(
    "schema: './schema.js'",
    "schema: './schema.ts'"
  );

  await fs.writeFile(drizzleConfigPath, drizzleConfig);
  console.log(chalk.green("✅ Created .lorm/drizzle.config.ts and schema.ts"));
}

async function runDrizzlePush(force: boolean, verbose: boolean): Promise<void> {
  const args = ["drizzle-kit", "push:pg", "--config=.lorm/drizzle.config.ts"];
  
  if (force) {
    args.push("--force");
  }
  
  if (verbose) {
    args.push("--verbose");
  }

  console.log(chalk.blue("🔄 Running drizzle-kit push..."));
  
  return new Promise((resolve, reject) => {
    const child = spawn(commandPrefix, args, {
      stdio: "inherit",
      env: { ...process.env }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`drizzle-kit push failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run drizzle-kit: ${error.message}`));
    });
  });
}