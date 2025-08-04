import { Logger, ICONS } from '../../utils/logger.js';
import { promises as fs } from "fs";
import { select, confirm } from "@inquirer/prompts";
import { templateManager, type DatabaseAdapter as TemplateManagerAdapter } from '../../utils/template-manager.js';
import { installDependencies } from '../../utils/package-manager.js';

export type DatabaseAdapter =
  | "neon"
  | "postgres"
  | "mysql"
  | "sqlite"
  | "planetscale"
  | "turso";

export interface InitOptions {
  force?: boolean;
  skipInstall?: boolean;
}

function getClientDependencies(includeClient: boolean = false): string[] {
  const baseDependencies = ["zod", "@lorm/schema", "@lorm/core"];

  if (includeClient) {
    baseDependencies.push("@lorm/client");
  }

  return baseDependencies;
}

// Language detection and file path generation is now handled by the template manager

async function createConfigFiles(adapter: DatabaseAdapter): Promise<void> {
  Logger.withIcon(ICONS.config, "Generating configuration files...");

  try {
    const projectRoot = process.cwd();
    const filePaths = await templateManager.getFilePaths(projectRoot);

    // Create config file using template manager
    const configContent = await templateManager.generateConfigTemplate({ adapter }, projectRoot);
    await fs.writeFile(filePaths.config, configContent);
    Logger.success(`Created ${filePaths.config}`);

    // Create lorm directory structure
    await fs.mkdir("lorm", { recursive: true });
    Logger.success(`Created lorm/ directory structure`);

    // Create router file using template manager
    const routerContent = await templateManager.generateRouterTemplate(projectRoot);
    await fs.writeFile(filePaths.router, routerContent);
    Logger.success(`Created ${filePaths.router}`);

    // Create schema file using template manager
    const schemaContent = await templateManager.generateSchemaTemplate(adapter, projectRoot);
    await fs.writeFile(filePaths.schema, schemaContent);
    Logger.success(`Created ${filePaths.schema}`);

    // Log project type information
    const { detectLanguage } = await import('../../utils/project-detection.js');
    const language = await detectLanguage(projectRoot);
    if (language === 'typescript') {
      Logger.withIcon(ICONS.success, "Generated TypeScript files with full type safety");
    } else {
      Logger.withIcon(ICONS.warning, "Generated JavaScript files (consider upgrading to TypeScript for better DX)");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to create configuration files: ${errorMessage}`);
    throw new Error(`Failed to create configuration files: ${errorMessage}`);
  }
}

async function promptForClientInstallation(): Promise<boolean> {
  try {
    const installClient = await confirm({
      message:
        "Do you want to install @lorm/client for frontend data fetching?",
      default: true,
    });

    if (installClient) {
      Logger.withIcon(ICONS.rocket, "@lorm/client will be included in the installation");
    } else {
      Logger.dim("Skipping @lorm/client installation");
    }

    return installClient;
  } catch (error) {
    Logger.warning(
      `Could not prompt for client installation, defaulting to false: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function installProjectDependencies(
  includeClient: boolean = false
): Promise<void> {
  Logger.withIcon(ICONS.tools, "Installing project dependencies...");

  try {
    const dependencies = getClientDependencies(includeClient);
    Logger.dim(`   Installing: ${dependencies.join(", ")}`);

    await installDependencies(dependencies);
    
    Logger.success("Dependencies installed successfully");
    
    if (includeClient) {
      Logger.success("@lorm/client installed for frontend data fetching");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to install dependencies: ${errorMessage}`);
    throw new Error(`Dependency installation failed: ${errorMessage}`);
  }
}

async function displayCompletionMessage(
  adapter: DatabaseAdapter,
  includeClient: boolean
): Promise<void> {
  Logger.withIcon(ICONS.success, "LORM project initialized successfully!");
  Logger.withIcon(ICONS.rocket, "Next steps:");

  const projectRoot = process.cwd();
  const filePaths = await templateManager.getFilePaths(projectRoot);
  
  console.log(`1. Update your database URL in ${filePaths.config}`);
  console.log(`2. Define your schema in ${filePaths.schema}`);
  console.log(`3. Create your API routes in ${filePaths.router}`);
  console.log("4. Start your development server");

  if (includeClient) {
    Logger.withIcon(ICONS.mobile, "Client-side usage:");
    Logger.dim("   • Import { createClient } from '@lorm/client'");
    Logger.dim("   • Use the client to fetch data from your LORM API");
    Logger.dim("   • Enjoy type-safe data fetching with auto-completion");
  }

  Logger.withIcon(ICONS.database, "Database-specific notes:");
  switch (adapter) {
    case "neon":
      Logger.dim("   • Get your connection string from Neon dashboard");
      Logger.dim("   • Format: postgresql://user:pass@host/dbname");
      break;
    case "postgres":
      Logger.dim("   • Ensure PostgreSQL server is running");
      Logger.dim("   • Format: postgresql://user:pass@localhost:5432/dbname");
      break;
    case "mysql":
      Logger.dim("   • Ensure MySQL server is running");
      Logger.dim("   • Format: mysql://user:pass@localhost:3306/dbname");
      break;
    case "sqlite":
      Logger.dim("   • Database file will be created automatically");
      Logger.dim("   • Format: file:./database.db");
      break;
    case "planetscale":
      Logger.dim("   • Get your connection string from PlanetScale dashboard");
      Logger.dim("   • Format: mysql://user:pass@host/dbname?sslaccept=strict");
      break;
    case "turso":
      Logger.dim("   • Get your database URL and auth token from Turso");
      Logger.dim("   • Format: libsql://your-db.turso.io");
      break;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initProject(options: InitOptions = {}): Promise<void> {
  const { force = false, skipInstall = false } = options;

  try {
    Logger.withIcon(ICONS.rocket, "Initializing LORM project...");
    Logger.dim(`   Working directory: ${process.cwd()}`);
    Logger.dim(`   Options: force=${force}, skipInstall=${skipInstall}`);

    // Check for existing config files (both .js and .ts)
    const configExists =
      (await fileExists("lorm.config.js")) ||
      (await fileExists("lorm.config.ts")) ||
      (await fileExists("lorm.config.mjs"));
    if (!force && configExists) {
      Logger.warning("LORM project already initialized. Use --force to overwrite.");
      return;
    }

    const adapter = (await select({
      message: "Select your database adapter:",
      choices: [
        {
          name: "🟢 Neon (PostgreSQL, Serverless)",
          value: "neon",
          description: "Serverless PostgreSQL with branching",
        },
        {
          name: "🐘 PostgreSQL",
          value: "postgres",
          description: "Traditional PostgreSQL database",
        },
        {
          name: "🐬 MySQL",
          value: "mysql",
          description: "MySQL database",
        },
        {
          name: "🗃️  SQLite",
          value: "sqlite",
          description: "Local SQLite database",
        },
        {
          name: "🌍 PlanetScale",
          value: "planetscale",
          description: "Serverless MySQL platform",
        },
        {
          name: "⚡ Turso",
          value: "turso",
          description: "Edge SQLite database",
        },
      ],
    })) as DatabaseAdapter;

    Logger.success(`Selected adapter: ${adapter}`);

    let includeClient = false;
    if (!skipInstall) {
      includeClient = await promptForClientInstallation();
      await installProjectDependencies(includeClient);
    } else {
      Logger.withIcon(ICONS.rocket, "Skipping dependency installation");
    }

    await createConfigFiles(adapter);

    await displayCompletionMessage(adapter, includeClient);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to initialize LORM project: ${errorMessage}`);

    Logger.withIcon(ICONS.tools, "Troubleshooting tips:");
    Logger.dim("   • Ensure you have write permissions in the current directory");
    Logger.dim("   • Check that your package manager is properly installed");
    Logger.dim("   • Try running with --force to overwrite existing files");

    throw error;
  }
}