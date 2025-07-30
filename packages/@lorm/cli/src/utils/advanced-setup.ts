import path from "path";

import { drizzleConfigTemplate } from "@/templates";
import { loadConfig } from "@lorm/core";
import { FileUtils, fileExists } from "./file-utils";

export async function ensureLormDirectory(lormDir: string): Promise<void> {
  try {
    await FileUtils.ensureDir(lormDir);
    console.log("📁 [lorm] Created .lorm directory");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create .lorm directory: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function createSchemaFile(
  schemaTargetPath: string,
  rootDir: string
): Promise<void> {
  try {
    // Try to find the schema file in the new structure first
    const newSchemaPath = path.join(rootDir, "lorm/schema/index");
    const legacySchemaPath = path.join(rootDir, "lorm.schema");
    
    let schemaImport: string;
    
    // Check if new structure exists
    const newTsExists = await fileExists(path.join(rootDir, "lorm/schema/index.ts"));
    const newJsExists = await fileExists(path.join(rootDir, "lorm/schema/index.js"));
    
    if (newTsExists || newJsExists) {
      schemaImport = `export * from "${newSchemaPath.replace(/\\\\/g, "/")}";`;
    } else {
      schemaImport = `export * from "${legacySchemaPath.replace(/\\\\/g, "/")}";`;
    }

    await FileUtils.writeFile(schemaTargetPath, schemaImport);
    console.log("📄 [lorm] Created schema.js file");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create schema.js file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function createDrizzleConfig(
  drizzleConfigPath: string,
  config: any
): Promise<void> {
  try {
    const configContent = drizzleConfigTemplate(config);
    await FileUtils.writeFile(drizzleConfigPath, configContent);
    console.log("⚙️ [lorm] Created drizzle.config.js file");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create drizzle.config.js file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function validateSchemaFileOptional(
  rootDir: string
): Promise<void> {
  const newSchemaPath = path.join(rootDir, "lorm/schema/index.ts");
  const newSchemaPathJs = path.join(rootDir, "lorm/schema/index.js");
  const legacySchemaPath = path.join(rootDir, "lorm.schema.js");
  const legacySchemaPathTs = path.join(rootDir, "lorm.schema.ts");

  try {
    const newTsExists = await fileExists(newSchemaPath);
    const newJsExists = await fileExists(newSchemaPathJs);
    const legacyJsExists = await fileExists(legacySchemaPath);
    const legacyTsExists = await fileExists(legacySchemaPathTs);

    if (!newTsExists && !newJsExists && !legacyJsExists && !legacyTsExists) {
      console.warn(
        "⚠️ [lorm] Warning: Schema file not found. " +
          "Expected lorm/schema/index.ts, lorm/schema/index.js, lorm.schema.js, or lorm.schema.ts. " +
          "Make sure to create your schema file."
      );
    } else if ((legacyJsExists || legacyTsExists) && !newTsExists && !newJsExists) {
      console.warn(
        "⚠️ [lorm] Warning: Using legacy schema structure. " +
          "Consider migrating to lorm/schema/index.ts for better organization."
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

export async function initializeAdvancedCommand(commandName: string) {
  console.log(`🚀 [lorm] Starting ${commandName}...`);

  const rootDir = process.cwd();
  const lormDir = path.join(rootDir, ".lorm");
  const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
  const schemaTargetPath = path.join(lormDir, "schema.js");

  console.log("📖 [lorm] Loading configuration...");
  const config = await loadConfig();

  await validateSchemaFileOptional(rootDir);
  await ensureLormDirectory(lormDir);
  await createSchemaFile(schemaTargetPath, rootDir);
  await createDrizzleConfig(drizzleConfigPath, config);

  return { rootDir, lormDir, config };
}

export function handleAdvancedCommandError(
  error: unknown,
  commandName: string,
  duration?: number
): never {
  const durationText = duration ? ` after ${duration}ms` : "";
  const errorMessage = error instanceof Error ? error.message : String(error);

  console.error(
    `❌ [lorm] ${commandName} failed${durationText}: ${errorMessage}`
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
    console.error("💡 [lorm] Verify your database connection and credentials");
  }

  throw error;
}
