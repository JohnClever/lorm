import chalk from "chalk";
import { promises as fs } from "fs";
import { select, confirm } from "@inquirer/prompts";
import { getConfigTemplate, getSchemaTemplate, routerTemplate, routerTsTemplate } from '../../utils/templates';

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

async function detectLanguage(): Promise<{ isTypeScript: boolean; isModule: boolean }> {
  try {
    const packageJsonExists = await fs.access('package.json').then(() => true).catch(() => false);
    if (packageJsonExists) {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const isModule = packageJson.type === 'module';
      
      // Check for TypeScript in dependencies or devDependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const isTypeScript = 'typescript' in deps || '@types/node' in deps;
      
      return { isTypeScript, isModule };
    }
  } catch (error) {
    // Ignore errors, use defaults
  }
  
  return { isTypeScript: false, isModule: false };
}

function getFilePaths(isTypeScript: boolean, isModule: boolean) {
  const ext = isTypeScript ? 'ts' : (isModule ? 'mjs' : 'js');
  const configExt = isTypeScript ? 'ts' : 'js';
  
  return {
    config: `lorm.config.${configExt}`,
    router: `lorm/router.${ext}`,
    schema: `lorm/schema.${ext}`,
  };
}

async function createConfigFiles(adapter: DatabaseAdapter): Promise<void> {
  console.log(chalk.blue("📝 Generating configuration files..."));

  try {
    const languageInfo = await detectLanguage();
    const filePaths = getFilePaths(languageInfo.isTypeScript, languageInfo.isModule);

    // Create config file
    const configContent = getConfigTemplate(adapter);
    await fs.writeFile(filePaths.config, configContent);
    console.log(chalk.green(`✅ Created ${filePaths.config}`));

    // Create lorm directory structure
    await fs.mkdir("lorm", { recursive: true });
    console.log(chalk.green(`✅ Created lorm/ directory structure`));

    // Create router file
    const routerContent = languageInfo.isTypeScript ? routerTsTemplate : routerTemplate;
    await fs.writeFile(filePaths.router, routerContent);
    console.log(chalk.green(`✅ Created ${filePaths.router}`));

    // Create schema file
    const schemaContent = getSchemaTemplate(adapter);
    await fs.writeFile(filePaths.schema, schemaContent);
    console.log(chalk.green(`✅ Created ${filePaths.schema}`));

    // Log project type information
    if (languageInfo.isTypeScript) {
      console.log(
        chalk.blue("🔷 Generated TypeScript files with full type safety")
      );
    } else {
      console.log(
        chalk.blue(
          "🟨 Generated JavaScript files (consider upgrading to TypeScript for better DX)"
        )
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      chalk.red(`❌ Failed to create configuration files:`),
      errorMessage
    );
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
      console.log(
        chalk.blue("📦 @lorm/client will be included in the installation")
      );
    } else {
      console.log(chalk.gray("⏭️  Skipping @lorm/client installation"));
    }

    return installClient;
  } catch (error) {
    console.log(
      chalk.yellow(
        "⚠️  Could not prompt for client installation, defaulting to false:"
      ),
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

async function installProjectDependencies(
  includeClient: boolean = false
): Promise<void> {
  console.log(chalk.blue("📦 Installing project dependencies..."));

  try {
    const dependencies = getClientDependencies(includeClient);
    console.log(chalk.gray(`   Installing: ${dependencies.join(", ")}`));

    // For now, just log what would be installed
    // In a real implementation, this would use a package manager
    console.log(chalk.green("✅ Dependencies would be installed (placeholder)"));

    if (includeClient) {
      console.log(
        chalk.green("✅ @lorm/client would be installed for frontend data fetching")
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      chalk.red("❌ Failed to install dependencies:"),
      errorMessage
    );
    throw new Error(`Dependency installation failed: ${errorMessage}`);
  }
}

async function displayCompletionMessage(
  adapter: DatabaseAdapter,
  includeClient: boolean
): Promise<void> {
  console.log(chalk.green("\n🎉 LORM project initialized successfully!"));
  console.log(chalk.blue("\n📖 Next steps:"));

  const languageInfo = await detectLanguage();
  const filePaths = getFilePaths(languageInfo.isTypeScript, languageInfo.isModule);
  
  console.log(
    chalk.white(`1. Update your database URL in ${filePaths.config}`)
  );
  console.log(chalk.white(`2. Define your schema in ${filePaths.schema}`));
  console.log(chalk.white(`3. Create your API routes in ${filePaths.router}`));
  console.log(chalk.white("4. Start your development server"));

  if (includeClient) {
    console.log(chalk.blue("\n📱 Client-side usage:"));
    console.log(chalk.gray("   • Import { createClient } from '@lorm/client'"));
    console.log(
      chalk.gray("   • Use the client to fetch data from your LORM API")
    );
    console.log(
      chalk.gray("   • Enjoy type-safe data fetching with auto-completion")
    );
  }

  console.log(chalk.blue("\n💡 Database-specific notes:"));
  switch (adapter) {
    case "neon":
      console.log(
        chalk.gray("   • Get your connection string from Neon dashboard")
      );
      console.log(
        chalk.gray("   • Format: postgresql://user:pass@host/dbname")
      );
      break;
    case "postgres":
      console.log(chalk.gray("   • Ensure PostgreSQL server is running"));
      console.log(
        chalk.gray("   • Format: postgresql://user:pass@localhost:5432/dbname")
      );
      break;
    case "mysql":
      console.log(chalk.gray("   • Ensure MySQL server is running"));
      console.log(
        chalk.gray("   • Format: mysql://user:pass@localhost:3306/dbname")
      );
      break;
    case "sqlite":
      console.log(
        chalk.gray("   • Database file will be created automatically")
      );
      console.log(chalk.gray("   • Format: file:./database.db"));
      break;
    case "planetscale":
      console.log(
        chalk.gray("   • Get your connection string from PlanetScale dashboard")
      );
      console.log(
        chalk.gray(
          "   • Format: mysql://user:pass@host/dbname?sslaccept=strict"
        )
      );
      break;
    case "turso":
      console.log(
        chalk.gray("   • Get your database URL and auth token from Turso")
      );
      console.log(chalk.gray("   • Format: libsql://your-db.turso.io"));
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
    console.log(chalk.blue("🚀 Initializing LORM project..."));
    console.log(chalk.gray(`   Working directory: ${process.cwd()}`));
    console.log(
      chalk.gray(`   Options: force=${force}, skipInstall=${skipInstall}`)
    );

    // Check for existing config files (both .js and .ts)
    const configExists =
      (await fileExists("lorm.config.js")) ||
      (await fileExists("lorm.config.ts")) ||
      (await fileExists("lorm.config.mjs"));
    if (!force && configExists) {
      console.log(
        chalk.yellow(
          "⚠️  LORM project already initialized. Use --force to overwrite."
        )
      );
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

    console.log(chalk.green(`✅ Selected adapter: ${adapter}`));

    let includeClient = false;
    if (!skipInstall) {
      includeClient = await promptForClientInstallation();
      await installProjectDependencies(includeClient);
    } else {
      console.log(chalk.blue("⏭️  Skipping dependency installation"));
    }

    await createConfigFiles(adapter);

    await displayCompletionMessage(adapter, includeClient);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      chalk.red("❌ Failed to initialize LORM project:"),
      errorMessage
    );

    console.log(chalk.gray("\n🔍 Troubleshooting tips:"));
    console.log(
      chalk.gray(
        "   • Ensure you have write permissions in the current directory"
      )
    );
    console.log(
      chalk.gray("   • Check that your package manager is properly installed")
    );
    console.log(
      chalk.gray("   • Try running with --force to overwrite existing files")
    );

    throw error;
  }
}