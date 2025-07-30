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
    const schemaImport = `export * from "${path
      .join(rootDir, "lorm.schema")
      .replace(/\\\\/g, "/")}";`;

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
  const schemaPath = path.join(rootDir, "lorm.schema.js");
  const schemaPathTs = path.join(rootDir, "lorm.schema.ts");

  try {
    const jsExists = await fileExists(schemaPath);
    const tsExists = await fileExists(schemaPathTs);

    if (!jsExists && !tsExists) {
      console.warn(
        "⚠️ [lorm] Warning: lorm.schema.js or lorm.schema.ts not found. " +
          "Make sure to create your schema file."
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
