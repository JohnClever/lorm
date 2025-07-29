import fs from "fs/promises";
import path from "path";
import { drizzleConfigTemplate } from "@lorm/lib";

export async function validateSchemaFile(schemaPath: string): Promise<void> {
  try {
    await fs.access(schemaPath);
    console.log("✅ [lorm] Schema file found");
  } catch {
    throw new Error(
      `[lorm] Schema file not found at ${schemaPath}.\n` +
        "Please create a lorm.schema.js file in your project root or run 'npx @lorm/cli init' first."
    );
  }
}

export async function setupLormDirectory(
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
  } catch (error) {
    throw new Error(`[lorm] Failed to setup .lorm directory: ${error}`);
  }
}

export async function initializeCommand(commandName: string) {
  console.log(`🔄 [lorm] Starting ${commandName} process...`);

  const rootDir = process.cwd();
  const lormDir = path.join(rootDir, ".lorm");
  const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
  const schemaTargetPath = path.join(lormDir, "schema.js");

  console.log("📖 [lorm] Loading configuration...");
  const { loadConfig } = await import("@lorm/core");
  const config = await loadConfig();
  console.log(`📊 [lorm] Using ${config.db.adapter} database adapter`);

  await setupLormDirectory(
    lormDir,
    schemaTargetPath,
    drizzleConfigPath,
    rootDir,
    config
  );

  return { rootDir, lormDir, config };
}

export function handleCommandError(error: unknown, commandName: string): never {
  console.error(`❌ [lorm] ${commandName} failed:`);
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
