import { promises as fs } from "fs";
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import path from "path";

import {
  getPackageManager,
  installDependencies,
  fileExists,
  routerTemplate,
  getConfigTemplate,
  getSchemaTemplate,
} from "@lorm/lib";

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

function getClientDependencies(): string[] {
  return ["zod", "@lorm/core", "@lorm/schema", "@lorm/lib"];
}

async function isReactNativeProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    
    if (!(await fileExists(packageJsonPath))) {
      console.log(chalk.gray("📄 No package.json found, assuming non-React Native project"));
      return false;
    }

    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    
    const hasReactNative = !!(
      packageJson.dependencies?.["react-native"] ||
      packageJson.devDependencies?.["react-native"]
    );

    if (hasReactNative) {
      console.log(chalk.blue("📱 React Native project detected"));
    }

    return hasReactNative;
  } catch (error) {
    console.log(chalk.yellow("⚠️  Could not determine project type, assuming non-React Native:"), 
      error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function handleReactNativeConfig(): Promise<void> {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const metroConfigPath = path.join(process.cwd(), "metro.config.js");
  const metroConfigCjsPath = path.join(process.cwd(), "metro.config.cjs");

  console.log(chalk.blue("🔧 Configuring React Native project for ES modules..."));

  try {
    if (await fileExists(packageJsonPath)) {
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);
      
      if (!packageJson.type) {
        packageJson.type = "module";
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
        console.log(chalk.green("✅ Added type: 'module' to package.json"));
      } else if (packageJson.type === "module") {
        console.log(chalk.gray("ℹ️  package.json already has type: 'module'"));
      } else {
        console.log(chalk.yellow(`⚠️  package.json has type: '${packageJson.type}', consider changing to 'module'`));
      }
    } else {
      console.log(chalk.red("❌ package.json not found, cannot add type: 'module'"));
    }

    const metroConfigExists = await fileExists(metroConfigPath);
    const metroConfigCjsExists = await fileExists(metroConfigCjsPath);

    if (metroConfigExists && !metroConfigCjsExists) {
      await fs.rename(metroConfigPath, metroConfigCjsPath);
      console.log(chalk.green("✅ Renamed metro.config.js to metro.config.cjs"));
    } else if (metroConfigExists && metroConfigCjsExists) {
      console.log(chalk.yellow("⚠️  Both metro.config.js and metro.config.cjs exist, please resolve manually"));
    } else if (!metroConfigExists && metroConfigCjsExists) {
      console.log(chalk.gray("ℹ️  metro.config.cjs already exists"));
    } else {
      console.log(chalk.gray("ℹ️  No metro config files found"));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("❌ Failed to configure React Native project:"), errorMessage);
    throw new Error(`React Native configuration failed: ${errorMessage}`);
  }
}

async function createConfigFiles(adapter: DatabaseAdapter): Promise<void> {
  console.log(chalk.blue("📝 Generating configuration files..."));

  const files = [
    { name: "lorm.config.js", content: getConfigTemplate(adapter), description: "configuration" },
    { name: "lorm.router.js", content: routerTemplate, description: "router" },
    { name: "lorm.schema.js", content: getSchemaTemplate(adapter), description: "schema" },
  ];

  for (const file of files) {
    try {
      await fs.writeFile(file.name, file.content);
      console.log(chalk.green(`✅ Created ${file.name}`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Failed to create ${file.name}:`), errorMessage);
      throw new Error(`Failed to create ${file.description} file: ${errorMessage}`);
    }
  }
}

async function installProjectDependencies(): Promise<void> {
  console.log(chalk.blue("📦 Installing dependencies..."));

  try {
    const packageManager = getPackageManager();
    const dependencies = getClientDependencies();

    console.log(chalk.gray(`   Using package manager: ${packageManager}`));
    console.log(chalk.gray(`   Installing: ${dependencies.join(", ")}`));

    if (dependencies.length > 0) {
      await installDependencies(dependencies, { packageManager });
      console.log(chalk.green("✅ Dependencies installed successfully"));
    } else {
      console.log(chalk.blue("ℹ️  No client-side dependencies to install"));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("❌ Failed to install dependencies:"), errorMessage);
    throw new Error(`Dependency installation failed: ${errorMessage}`);
  }
}

function displayCompletionMessage(adapter: DatabaseAdapter, isRN: boolean): void {
  console.log(chalk.green("\n🎉 LORM project initialized successfully!"));
  console.log(chalk.blue("\n📖 Next steps:"));
  console.log(chalk.white("1. Update your database URL in lorm.config.js"));
  console.log(chalk.white("2. Define your schema in lorm.schema.js"));
  console.log(chalk.white("3. Create your API routes in lorm.router.js"));
  console.log(chalk.white("4. Start your development server"));

  if (isRN) {
    console.log(chalk.blue("\n📱 React Native specific notes:"));
    console.log(chalk.gray("   • metro.config.js has been renamed to metro.config.cjs"));
    console.log(chalk.gray("   • type: 'module' has been added to package.json"));
    console.log(chalk.gray("   • This ensures compatibility with ES modules"));
  }

  console.log(chalk.blue("\n💡 Database-specific notes:"));
  switch (adapter) {
    case "neon":
      console.log(chalk.gray("   • Get your connection string from Neon dashboard"));
      console.log(chalk.gray("   • Format: postgresql://user:pass@host/dbname"));
      break;
    case "postgres":
      console.log(chalk.gray("   • Ensure PostgreSQL server is running"));
      console.log(chalk.gray("   • Format: postgresql://user:pass@localhost:5432/dbname"));
      break;
    case "mysql":
      console.log(chalk.gray("   • Ensure MySQL server is running"));
      console.log(chalk.gray("   • Format: mysql://user:pass@localhost:3306/dbname"));
      break;
    case "sqlite":
      console.log(chalk.gray("   • Database file will be created automatically"));
      console.log(chalk.gray("   • Format: file:./database.db"));
      break;
    case "planetscale":
      console.log(chalk.gray("   • Get your connection string from PlanetScale dashboard"));
      console.log(chalk.gray("   • Format: mysql://user:pass@host/dbname?sslaccept=strict"));
      break;
    case "turso":
      console.log(chalk.gray("   • Get your database URL and auth token from Turso"));
      console.log(chalk.gray("   • Format: libsql://your-db.turso.io"));
      break;
  }
}

export async function initProject(options: InitOptions = {}) {
  const { force = false, skipInstall = false } = options;

  try {
    console.log(chalk.blue("🚀 Initializing LORM project..."));
    console.log(chalk.gray(`   Working directory: ${process.cwd()}`));
    console.log(chalk.gray(`   Options: force=${force}, skipInstall=${skipInstall}`));

    if (!force && (await fileExists("lorm.config.js"))) {
      console.log(
        chalk.yellow(
          "⚠️  LORM project already initialized. Use --force to overwrite."
        )
      );
      return;
    }

    const isRN = await isReactNativeProject();
    if (isRN) {
      await handleReactNativeConfig();
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

    if (!skipInstall) {
      await installProjectDependencies();
    } else {
      console.log(chalk.blue("⏭️  Skipping dependency installation"));
    }

    await createConfigFiles(adapter);

    displayCompletionMessage(adapter, isRN);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("❌ Failed to initialize LORM project:"), errorMessage);
    
    console.log(chalk.gray("\n🔍 Troubleshooting tips:"));
    console.log(chalk.gray("   • Ensure you have write permissions in the current directory"));
    console.log(chalk.gray("   • Check that your package manager is properly installed"));
    console.log(chalk.gray("   • Try running with --force to overwrite existing files"));
    
    throw error;
  }
}
