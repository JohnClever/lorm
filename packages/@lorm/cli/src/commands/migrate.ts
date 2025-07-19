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
 * Resolves the drizzle-kit binary path
 * @returns The path to the drizzle-kit binary
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
      "[lorm] drizzle-kit not found. Please install it:\n" +
        "  npm install drizzle-kit\n" +
        "  or\n" +
        "  npm install -g drizzle-kit"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("drizzle-kit not found")
    ) {
      throw error;
    }
    throw new Error(`[lorm] Failed to resolve drizzle-kit binary: ${error}`);
  }
}

/**
 * Validates that the schema file exists
 * @param schemaPath The path to the schema file
 * @throws Error if schema file doesn't exist
 */
async function validateSchemaFile(schemaPath: string): Promise<void> {
  try {
    await fs.access(schemaPath);
    console.log("✅ [lorm] Schema file found");
  } catch {
    throw new Error(
      `[lorm] Schema file not found at ${schemaPath}.\n` +
        "Please create a lorm.schema.js file in your project root or run 'lorm init' first."
    );
  }
}

/**
 * Validates that migration files exist
 * @param migrationsDir The path to the migrations directory
 */
async function validateMigrations(migrationsDir: string): Promise<void> {
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql"));

    if (migrationFiles.length === 0) {
      console.warn(
        "⚠️ [lorm] No migration files found.\n" +
          "Run 'lorm generate' first to create migration files."
      );
    } else {
      console.log(`📄 [lorm] Found ${migrationFiles.length} migration file(s)`);
    }
  } catch {
    console.warn(
      "⚠️ [lorm] Migrations directory not found.\n" +
        "Run 'lorm generate' first to create migration files."
    );
  }
}

/**
 * Sets up the .lorm directory and required files
 * @param lormDir The .lorm directory path
 * @param schemaTargetPath The schema target file path
 * @param drizzleConfigPath The drizzle config file path
 * @param rootDir The project root directory
 * @param config The loaded configuration
 */
async function setupLormDirectory(
  lormDir: string,
  schemaTargetPath: string,
  drizzleConfigPath: string,
  rootDir: string,
  config: any
): Promise<void> {
  try {
    await fs.mkdir(lormDir, { recursive: true });
    console.log("📁 [lorm] Created .lorm directory");

    const schemaPath = path.join(rootDir, "lorm.schema.js");
    await validateSchemaFile(schemaPath);

    const schemaImport = `export * from "${path
      .join(rootDir, "lorm.schema")
      .replace(/\\/g, "/")}";`;
    await fs.writeFile(schemaTargetPath, schemaImport);
    console.log("📝 [lorm] Generated schema import file");

    await fs.writeFile(drizzleConfigPath, drizzleConfigTemplate(config));
    console.log("⚙️ [lorm] Generated drizzle config file");

    const migrationsDir = path.join(lormDir, "migrations");
    await validateMigrations(migrationsDir);
  } catch (error) {
    throw new Error(`[lorm] Failed to setup .lorm directory: ${error}`);
  }
}

/**
 * Executes the drizzle-kit migrate command
 * @param drizzleKitBin The path to drizzle-kit binary
 * @param lormDir The .lorm directory path
 */
async function executeMigrate(
  drizzleKitBin: string,
  lormDir: string
): Promise<void> {
  try {
    console.log("🚀 [lorm] Applying database migrations...");

    await execa(drizzleKitBin, ["migrate"], {
      cwd: lormDir,
      stdio: "inherit",
    });

    console.log("✅ [lorm] Database migrations applied successfully!");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`[lorm] Failed to apply migrations: ${error.message}`);
    }
    throw new Error(`[lorm] Failed to apply migrations: ${error}`);
  }
}

export async function migrate(): Promise<void> {
  try {
    console.log("🔄 [lorm] Starting database migration process...");

    const rootDir = process.cwd();
    const lormDir = path.join(rootDir, ".lorm");
    const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
    const schemaTargetPath = path.join(lormDir, "schema.js");

    console.log("📖 [lorm] Loading configuration...");
    const config = await loadConfig();
    console.log(`📊 [lorm] Using ${config.db.adapter} database adapter`);

    await setupLormDirectory(
      lormDir,
      schemaTargetPath,
      drizzleConfigPath,
      rootDir,
      config
    );

    const drizzleKitBin = resolveDrizzleKitBin();

    await executeMigrate(drizzleKitBin, lormDir);
  } catch (error) {
    console.error("❌ [lorm] Migration failed:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}
