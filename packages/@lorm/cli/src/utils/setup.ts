import path from "path";
import { loadConfig } from "@lorm/core";
import { drizzleConfigTemplate } from "@/templates";
import { FileUtils } from "./file-utils";
import { languageHandler } from "./language-handler";

/**
 * Detects if the React Native project uses TypeScript by checking for tsconfig.json
 * @returns Promise<boolean> - true if TypeScript is detected, false otherwise
 */
export async function detectTypeScript(): Promise<boolean> {
  const languageInfo = await languageHandler.detectLanguage();
  return languageInfo.isTypeScript;
}

export async function validateSchemaFile(): Promise<string> {
  return await languageHandler.findSchemaFile();
}

export async function setupLormDirectory(
  lormDir: string,
  schemaTargetPath: string,
  drizzleConfigPath: string,
  rootDir: string,
  config: any
): Promise<void> {
  try {
    await FileUtils.ensureDir(lormDir);
    console.log("📁 [lorm] Created .lorm directory");

    const schemaPath = await validateSchemaFile();
    
    // Generate the correct import path using the language handler
    const relativePath = languageHandler.generateRelativeImport(schemaTargetPath, schemaPath);
    const schemaImport = `export * from "${relativePath}";`;
    
    await FileUtils.writeFile(schemaTargetPath, schemaImport);
    console.log("📝 [lorm] Generated schema import file");

    await FileUtils.writeFile(drizzleConfigPath, drizzleConfigTemplate(config));
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
