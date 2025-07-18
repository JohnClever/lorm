import { promises as fs } from "fs";
import { select } from "@inquirer/prompts";
import chalk from "chalk";

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

export async function initProject(options: InitOptions = {}) {
  const { force = false, skipInstall = false } = options;

  try {
    console.log(chalk.blue("🚀 Initializing LORM project..."));

    if (!force && (await fileExists("lorm.config.js"))) {
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

    if (!skipInstall) {
      console.log(chalk.blue("📦 Installing dependencies..."));

      const packageManager = getPackageManager();
      const dependencies = getClientDependencies();

      if (dependencies.length > 0) {
        await installDependencies(dependencies, { packageManager });
        console.log(chalk.green("✅ Dependencies installed successfully"));
      } else {
        console.log(chalk.blue("ℹ️  No client-side dependencies to install"));
      }
    }

    console.log(chalk.blue("📝 Generating configuration files..."));

    const configContent = getConfigTemplate(adapter);
    await fs.writeFile("lorm.config.js", configContent);
    console.log(chalk.green("✅ Created lorm.config.js"));

    const routerContent = routerTemplate;
    await fs.writeFile("lorm.router.js", routerContent);
    console.log(chalk.green("✅ Created lorm.router.js"));

    const schemaContent = getSchemaTemplate(adapter);
    await fs.writeFile("lorm.schema.js", schemaContent);
    console.log(chalk.green("✅ Created lorm.schema.js"));

    // Check for metro.config.js and rename to metro.config.cjs
    if (await fileExists("metro.config.js")) {
      await fs.rename("metro.config.js", "metro.config.cjs");
      console.log(chalk.green("✅ Renamed metro.config.js to metro.config.cjs"));
    }

    // Add "type": "module" to package.json if it doesn't exist
    if (await fileExists("package.json")) {
      try {
        const packageJsonContent = await fs.readFile("package.json", "utf-8");
        const packageJson = JSON.parse(packageJsonContent);
        
        if (!packageJson.type) {
          packageJson.type = "module";
          await fs.writeFile("package.json", JSON.stringify(packageJson, null, 2));
          console.log(chalk.green("✅ Added \"type\": \"module\" to package.json"));
        } else {
          console.log(chalk.blue("ℹ️  package.json already has type field"));
        }
      } catch (error) {
        console.log(chalk.yellow("⚠️  Could not modify package.json:"), error);
      }
    }

    console.log(chalk.green("\n🎉 LORM project initialized successfully!"));
    console.log(chalk.blue("\n📖 Next steps:"));
    console.log(chalk.white("1. Update your database URL in lorm.config.js"));
    console.log(chalk.white("2. Define your schema in lorm.schema.js"));
    console.log(chalk.white("3. Create your API routes in lorm.router.js"));
    console.log(chalk.white("4. Start your development server"));

  
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
          chalk.gray(
            "   • Format: postgresql://user:pass@localhost:5432/dbname"
          )
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
          chalk.gray(
            "   • Get your connection string from PlanetScale dashboard"
          )
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
  } catch (error) {
    console.error(chalk.red("❌ Failed to initialize LORM project:"), error);
    throw error;
  }
}
