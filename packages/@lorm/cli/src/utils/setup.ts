import path from "path";
import { loadConfig, type lormConfig } from "@lorm/core";
import { drizzleConfigTemplate } from "@/templates";
import { FileUtils, fileExists } from "./file-utils";
import { languageHandler } from "./language-handler";

export interface SetupOptions {
  force?: boolean;
  skipInstall?: boolean;
  validationMode?: 'strict' | 'optional';
  errorSeverity?: 'error' | 'warning';
}

export interface InitializeOptions {
  validationMode?: 'strict' | 'optional';
  showDuration?: boolean;
}

// Language detection
export async function detectTypeScript(): Promise<boolean> {
  const languageInfo = await languageHandler.detectLanguage();
  return languageInfo.isTypeScript;
}

// Schema validation with configurable modes
export async function validateSchemaFile(mode: 'strict' | 'optional' = 'strict'): Promise<string | void> {
  const rootDir = process.cwd();
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
      const message = "Schema file not found. Expected lorm/schema/index.ts, lorm/schema/index.js, lorm.schema.js, or lorm.schema.ts.";
      if (mode === 'strict') {
        throw new Error(message);
      } else {
        console.warn(`⚠️ [lorm] Warning: ${message} Make sure to create your schema file.`);
        return;
      }
    }

    if ((legacyJsExists || legacyTsExists) && !newTsExists && !newJsExists) {
      const message = "Using legacy schema structure. Consider migrating to lorm/schema/index.ts for better organization.";
      if (mode === 'strict') {
        console.warn(`⚠️ [lorm] Warning: ${message}`);
      } else {
        console.warn(`⚠️ [lorm] Warning: ${message}`);
      }
    }

    // Return the found schema path for strict mode
    if (mode === 'strict') {
      return await languageHandler.findSchemaFile();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (mode === 'strict') {
      throw error;
    } else {
      console.warn(`⚠️ [lorm] Warning: Could not validate schema file existence: ${errorMessage}`);
    }
  }
}

// Unified directory creation
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

// Unified schema file creation
export async function createSchemaFile(
  schemaTargetPath: string,
  rootDir: string,
  validationMode: 'strict' | 'optional' = 'strict'
): Promise<void> {
  try {
    let schemaImport: string;
    
    if (validationMode === 'strict') {
      const schemaPath = await validateSchemaFile('strict') as string;
      const relativePath = languageHandler.generateRelativeImport(schemaTargetPath, schemaPath);
      schemaImport = `export * from "${relativePath}";`;
    } else {
      // Legacy approach for optional mode
      const newSchemaPath = path.join(rootDir, "lorm/schema/index");
      const legacySchemaPath = path.join(rootDir, "lorm.schema");
      
      const newTsExists = await fileExists(path.join(rootDir, "lorm/schema/index.ts"));
      const newJsExists = await fileExists(path.join(rootDir, "lorm/schema/index.js"));
      
      if (newTsExists || newJsExists) {
        schemaImport = `export * from "${newSchemaPath.replace(/\\\\/g, "/")}";`;
      } else {
        schemaImport = `export * from "${legacySchemaPath.replace(/\\\\/g, "/")}";`;
      }
    }

    await FileUtils.writeFile(schemaTargetPath, schemaImport);
    console.log(validationMode === 'strict' ? "📝 [lorm] Generated schema import file" : "📄 [lorm] Created schema.js file");
  } catch (error) {
    throw new Error(
      `[lorm] Failed to create schema file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Unified drizzle config creation
export async function createDrizzleConfig(
  drizzleConfigPath: string,
  config: lormConfig
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

// Unified setup directory function
export async function setupLormDirectory(
  lormDir: string,
  schemaTargetPath: string,
  drizzleConfigPath: string,
  rootDir: string,
  config: lormConfig,
  validationMode: 'strict' | 'optional' = 'strict'
): Promise<void> {
  try {
    await ensureLormDirectory(lormDir);
    await createSchemaFile(schemaTargetPath, rootDir, validationMode);
    await createDrizzleConfig(drizzleConfigPath, config);
    
    if (validationMode === 'strict') {
      console.log("⚙️ [lorm] Generated drizzle config file");
    }
  } catch (error) {
    throw new Error(`[lorm] Failed to setup .lorm directory: ${error}`);
  }
}

// Project initialization (from original setup.ts)
export async function createInitialProject(options: SetupOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  
  // Check for existing config files
  const configFiles = ['lorm.config.ts', 'lorm.config.js'];
  const existingConfig = configFiles.find(async (file) => {
    try {
      await FileUtils.access(path.join(rootDir, file));
      return true;
    } catch {
      return false;
    }
  });
  
  if (existingConfig && !options.force) {
    console.log(`⚠️  [lorm] Configuration file already exists: ${path.basename(existingConfig)}`);
    console.log("Use --force to overwrite existing files");
    return;
  }
  
  // Prompt for database adapter selection
  const { lazyLoaders } = await import("./lazy-loader.js");
  const inquirer = await lazyLoaders.inquirer() as {
    select: (options: { message: string; choices: Array<{ name: string; value: string }>; default?: string }) => Promise<string>;
  };
  
  const selectedAdapter = await inquirer.select({
    message: 'Which database would you like to use?',
    choices: [
      { name: 'PostgreSQL (Neon, Supabase, etc.)', value: 'neon' },
      { name: 'PostgreSQL (Standard)', value: 'postgres' },
      { name: 'MySQL', value: 'mysql' },
      { name: 'PlanetScale (MySQL)', value: 'planetscale' },
      { name: 'SQLite (Local development)', value: 'sqlite' },
      { name: 'Turso (SQLite)', value: 'turso' }
    ],
    default: 'neon'
  });
  
  // Detect TypeScript
  const isTypeScript = await detectTypeScript();
  const configExtension = isTypeScript ? '.ts' : '.js';
  const configPath = path.join(rootDir, `lorm.config${configExtension}`);
  
  // Create config file
  const { getConfigTemplate, getConfigJsTemplate } = await import("../templates/index.js");
  const configContent = isTypeScript 
    ? getConfigTemplate(selectedAdapter)
    : getConfigJsTemplate(selectedAdapter);
  
  await FileUtils.writeFile(configPath, configContent);
  console.log(`📝 [lorm] Created ${path.basename(configPath)}`);
  
  // Create schema directory and file
  const schemaDir = path.join(rootDir, "lorm", "schema");
  const schemaPath = path.join(schemaDir, `index${configExtension}`);
  
  await FileUtils.ensureDir(schemaDir);
  
  const { getSchemaTsTemplate, getSchemaJsTemplate } = await import("../templates/index.js");
  const schemaContent = isTypeScript 
    ? getSchemaTsTemplate(selectedAdapter)
    : getSchemaJsTemplate(selectedAdapter);
  
  await FileUtils.writeFile(schemaPath, schemaContent);
  console.log(`📝 [lorm] Created ${path.relative(rootDir, schemaPath)}`);
  
  // Create router directory and file
  const routerDir = path.join(rootDir, "lorm", "router");
  const routerPath = path.join(routerDir, `index${configExtension}`);
  
  await FileUtils.ensureDir(routerDir);
  
  const { routerTsTemplate, routerTemplate } = await import("../templates/index.js");
  const routerContent = isTypeScript ? routerTsTemplate : routerTemplate;
  
  await FileUtils.writeFile(routerPath, routerContent);
  console.log(`📝 [lorm] Created ${path.relative(rootDir, routerPath)}`);
  
  console.log("\n✅ [lorm] Project initialized successfully!");
  console.log("\nNext steps:");
  console.log("1. Update your database URL in lorm.config" + configExtension);
  console.log("2. Modify your schema in lorm/schema/index" + configExtension);
  console.log("3. Run 'npx @lorm/cli dev' to start development");
}

// Unified command initialization
export async function initializeCommand(
  commandName: string,
  options: InitializeOptions = {}
) {
  const startTime = Date.now();
  const validationMode = options.validationMode || 'strict';
  
  console.log(validationMode === 'strict' 
    ? `🔄 [lorm] Starting ${commandName} process...`
    : `🚀 [lorm] Starting ${commandName}...`
  );
  
  const rootDir = process.cwd();
  const lormDir = path.join(rootDir, ".lorm");
  const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
  const schemaTargetPath = path.join(lormDir, "schema.js");
  
  console.log("📖 [lorm] Loading configuration...");
  const config = await loadConfig();
  
  if (validationMode === 'strict') {
    console.log(`📊 [lorm] Using ${config.db.adapter} database adapter`);
  }
  
  // Validate schema with appropriate mode
  await validateSchemaFile(validationMode);
  
  await setupLormDirectory(
    lormDir,
    schemaTargetPath,
    drizzleConfigPath,
    rootDir,
    config,
    validationMode
  );
  
  const duration = options.showDuration ? Date.now() - startTime : undefined;
  
  return { rootDir, lormDir, config, duration };
}

// Unified error handling
export function handleCommandError(
  error: Error | string,
  commandName: string,
  options: { duration?: number; severity?: 'error' | 'warning'; enhanced?: boolean } = {}
): never {
  const { duration, severity = 'error', enhanced = false } = options;
  const durationText = duration ? ` after ${duration}ms` : "";
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const prefix = severity === 'error' ? '❌' : '⚠️';
  console.error(`${prefix} [lorm] ${commandName} failed${durationText}: ${errorMessage}`);
  
  if (enhanced) {
    // Enhanced error suggestions
    if (errorMessage.includes("drizzle-kit not found")) {
      console.error("💡 [lorm] Try installing drizzle-kit: npm install -g drizzle-kit");
    } else if (errorMessage.includes("configuration")) {
      console.error("💡 [lorm] Check your lorm.config.js file for correct database configuration");
    } else if (errorMessage.includes("database")) {
      console.error("💡 [lorm] Verify your database connection and credentials");
    }
  }
  
  if (severity === 'error') {
    process.exit(1);
  }
  
  throw error;
}

// Legacy compatibility exports
export const initializeAdvancedCommand = (commandName: string) => 
  initializeCommand(commandName, { validationMode: 'optional', showDuration: true });

export const handleAdvancedCommandError = (
  error: Error | string,
  commandName: string,
  duration?: number
) => handleCommandError(error, commandName, { duration, enhanced: true });

export const validateSchemaFileOptional = () => validateSchemaFile('optional');