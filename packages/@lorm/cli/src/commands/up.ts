import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import { loadConfig } from "@lorm/core";
import which from "which";
import { drizzleConfigTemplate } from "@lorm/lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the path to the drizzle-kit binary
 * @returns The path to the drizzle-kit executable
 * @throws Error if drizzle-kit is not found
 */
function resolveDrizzleKitBin(): string {
  try {
    const localBin = path.resolve(
      __dirname,
      "../../node_modules/.bin/drizzle-kit"
    );

    if (fssync.existsSync(localBin)) {
      console.log("🔍 [lorm] Using local drizzle-kit binary");
      return localBin;
    }

    const globalBin = which.sync("drizzle-kit", { nothrow: true });
    if (globalBin) {
      console.log("🔍 [lorm] Using global drizzle-kit binary");
      return globalBin;
    }

    throw new Error(
      "[lorm] drizzle-kit not found. Please make sure it's installed in @lorm/cli or globally."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("drizzle-kit not found")
    ) {
      throw error;
    }
    throw new Error(
      `[lorm] Failed to resolve drizzle-kit binary: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Ensures the .lorm directory exists
 * @param lormDir Path to the .lorm directory
 */
async function ensureLormDirectory(lormDir: string): Promise<void> {
  try {
    await fs.mkdir(lormDir, { recursive: true });
    console.log("📁 [lorm] Created .lorm directory");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create .lorm directory: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Creates the schema.js file that exports from lorm.schema
 * @param schemaTargetPath Path where schema.js should be created
 * @param rootDir Root directory of the project
 */
async function createSchemaFile(
  schemaTargetPath: string,
  rootDir: string
): Promise<void> {
  try {
    const schemaImport = `export * from "${path
      .join(rootDir, "lorm.schema")
      .replace(/\\/g, "/")}";`;

    await fs.writeFile(schemaTargetPath, schemaImport);
    console.log("📄 [lorm] Created schema.js file");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create schema.js file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Creates the drizzle.config.js file
 * @param drizzleConfigPath Path where drizzle.config.js should be created
 * @param config The loaded lorm configuration
 */
async function createDrizzleConfig(
  drizzleConfigPath: string,
  config: any
): Promise<void> {
  try {
    const configContent = drizzleConfigTemplate(config);
    await fs.writeFile(drizzleConfigPath, configContent);
    console.log("⚙️ [lorm] Created drizzle.config.js file");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create drizzle.config.js file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Executes the drizzle-kit up command
 * @param drizzleKitBin Path to the drizzle-kit binary
 * @param lormDir Directory where drizzle-kit should run
 */
async function executeDrizzleKitUp(
  drizzleKitBin: string,
  lormDir: string
): Promise<void> {
  try {
    console.log("🔄 [lorm] Running schema upgrade...");

    await execa(drizzleKitBin, ["up"], {
      cwd: lormDir,
      stdio: "inherit",
    });
  } catch (error) {
    if (error instanceof Error) {
      if ("exitCode" in error && typeof error.exitCode === "number") {
        throw new Error(
          `[lorm] drizzle-kit up failed with exit code ${error.exitCode}: ${error.message}`
        );
      }
      throw new Error(`[lorm] drizzle-kit up failed: ${error.message}`);
    }
    throw new Error(`[lorm] drizzle-kit up failed: ${String(error)}`);
  }
}

/**
 * Validates that the lorm.schema file exists
 * @param rootDir Root directory of the project
 */
async function validateSchemaFile(rootDir: string): Promise<void> {
  const schemaPath = path.join(rootDir, "lorm.schema.js");
  const schemaPathTs = path.join(rootDir, "lorm.schema.ts");

  try {
    const jsExists = await fs
      .access(schemaPath)
      .then(() => true)
      .catch(() => false);
    const tsExists = await fs
      .access(schemaPathTs)
      .then(() => true)
      .catch(() => false);

    if (!jsExists && !tsExists) {
      console.warn(
        "⚠️ [lorm] Warning: lorm.schema.js or lorm.schema.ts not found. " +
          "Make sure to create your schema file before running upgrade."
      );
    }
  } catch (error) {
    console.warn(
      `⚠️ [lorm] Warning: Could not validate schema file existence: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Checks if there are pending migrations in the migrations directory
 * @param rootDir Root directory of the project
 */
async function checkPendingMigrations(rootDir: string): Promise<void> {
  const migrationsDir = path.join(rootDir, "migrations");

  try {
    const migrationsDirExists = await fs
      .access(migrationsDir)
      .then(() => true)
      .catch(() => false);

    if (migrationsDirExists) {
      const files = await fs.readdir(migrationsDir);
      const migrationFiles = files.filter((file) => file.endsWith(".sql"));

      if (migrationFiles.length > 0) {
        console.log(
          `📋 [lorm] Found ${migrationFiles.length} migration file(s) to apply`
        );
      } else {
        console.log("📋 [lorm] No migration files found");
      }
    } else {
      console.log("📋 [lorm] No migrations directory found");
    }
  } catch (error) {
    console.warn(
      `⚠️ [lorm] Warning: Could not check migrations directory: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function up(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log("🚀 [lorm] Starting schema upgrade...");

    const rootDir = process.cwd();
    const lormDir = path.join(rootDir, ".lorm");
    const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
    const schemaTargetPath = path.join(lormDir, "schema.js");

    await validateSchemaFile(rootDir);

    await checkPendingMigrations(rootDir);

    console.log("📖 [lorm] Loading configuration...");
    const config = await loadConfig();

    await ensureLormDirectory(lormDir);
    await createSchemaFile(schemaTargetPath, rootDir);
    await createDrizzleConfig(drizzleConfigPath, config);

    const drizzleKitBin = resolveDrizzleKitBin();

    await executeDrizzleKitUp(drizzleKitBin, lormDir);

    const duration = Date.now() - startTime;
    console.log(
      `✅ [lorm] Schema upgrade completed successfully in ${duration}ms`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `❌ [lorm] Schema upgrade failed after ${duration}ms: ${errorMessage}`
    );

    if (errorMessage.includes("drizzle-kit not found")) {
      console.error(
        "💡 [lorm] Try installing drizzle-kit: npm install -g drizzle-kit"
      );
    } else if (errorMessage.includes("configuration")) {
      console.error(
        "💡 [lorm] Check your lorm.config.js file for correct database configuration"
      );
    } else if (errorMessage.includes("database")) {
      console.error(
        "💡 [lorm] Verify your database connection and credentials"
      );
    } else if (errorMessage.includes("migration")) {
      console.error("💡 [lorm] Check your migration files for syntax errors");
    }

    throw error;
  }
}
