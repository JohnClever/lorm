import { resolve } from "path";
import { readFileSync } from "fs";
import chalk from "chalk";
import { exists } from "./file-utils";
import { SecurityValidator, SecurityAuditLogger } from "./security";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface ConfigValidationOptions {
  requireConfig?: boolean;
  requireSchema?: boolean;
  requireRouter?: boolean;
  checkDatabase?: boolean;
  checkDependencies?: boolean;
  checkEnvironment?: boolean;
  autoFix?: boolean;
}

/**
 * Validates the Lorm project configuration
 */
export async function validateConfig(
  options: ConfigValidationOptions = {}
): Promise<ValidationResult> {
  const {
    requireConfig = true,
    requireSchema = true,
    requireRouter = false,
    checkDatabase = false,
    checkDependencies = true,
    checkEnvironment = true,
    autoFix = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const cwd = process.cwd();

  if (requireConfig) {
    const configPath = resolve(cwd, "lorm.config.js");
    if (!exists(configPath)) {
      errors.push(
        "lorm.config.js not found. Run `npx @lorm/cli init` to create it."
      );
    } else {
      try {
        const config = await import(configPath);
        if (!config.default && !config.lormConfig) {
          warnings.push(
            "lorm.config.js exists but may not export a valid configuration."
          );
        }
      } catch (error) {
        errors.push(
          `Invalid lorm.config.js: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  if (requireSchema) {
    const schemaPath = resolve(cwd, "lorm.schema.js");
    if (!exists(schemaPath)) {
      errors.push(
        "lorm.schema.js not found. Run `npx @lorm/cli init` to create it."
      );
    }
  }

  if (requireRouter) {
    const routerPath = resolve(cwd, "lorm.router.js");
    if (!exists(routerPath)) {
      warnings.push(
        "lorm.router.js not found. Some features may not work correctly."
      );
    }
  }

  const lormDir = resolve(cwd, ".lorm");
  if (!exists(lormDir)) {
    warnings.push(".lorm directory not found. Type generation may not work.");
  }

  const packageJsonPath = resolve(cwd, "package.json");
  if (!exists(packageJsonPath)) {
    warnings.push(
      "package.json not found. This may not be a valid Node.js project."
    );
  } else if (checkDependencies) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const requiredDeps = ["@lorm/core", "drizzle-orm"];
      const missingDeps = requiredDeps.filter(
        (dep) =>
          !packageJson.dependencies?.[dep] &&
          !packageJson.devDependencies?.[dep]
      );

      if (missingDeps.length > 0) {
        errors.push(`Missing required dependencies: ${missingDeps.join(", ")}`);
        suggestions.push(`Run: npm install ${missingDeps.join(" ")}`);
      }
    } catch (error) {
      warnings.push("Could not parse package.json");
    }
  }

  if (checkEnvironment) {
    const envFile = resolve(cwd, ".env");
    if (!exists(envFile)) {
      warnings.push(
        ".env file not found. Environment variables may not be configured."
      );
      suggestions.push(
        "Create a .env file with your database connection string"
      );
    } else {
      try {
        const envContent = readFileSync(envFile, "utf-8");
        if (!envContent.includes("DATABASE_URL")) {
          warnings.push("DATABASE_URL not found in .env file");
          suggestions.push("Add DATABASE_URL to your .env file");
        }

        const envSecurityResult =
          SecurityValidator.validateEnvironmentVariables();
        errors.push(...envSecurityResult.errors);
        warnings.push(...envSecurityResult.warnings);
        suggestions.push(...envSecurityResult.suggestions);
      } catch (error) {
        warnings.push("Could not read .env file");
      }
    }
  }

  if (checkDatabase) {
    try {
      if (!process.env.DATABASE_URL) {
        warnings.push("DATABASE_URL environment variable not set");
        suggestions.push("Set DATABASE_URL in your environment or .env file");
      } else {
        const dbSecurityResult = SecurityValidator.validateDatabaseUrl(
          process.env.DATABASE_URL
        );
        errors.push(...dbSecurityResult.errors);
        warnings.push(...dbSecurityResult.warnings);
        suggestions.push(...dbSecurityResult.suggestions);

        await SecurityAuditLogger.logSecurityEvent("database_validation", {
          isValid: dbSecurityResult.isValid,
          isLocal: dbSecurityResult.urlInfo?.isLocal,
          protocol: dbSecurityResult.urlInfo?.protocol,
        });
      }
    } catch (error) {
      warnings.push("Database connection check failed");
      await SecurityAuditLogger.logSecurityEvent(
        "database_validation_error",
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "error"
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Displays validation results to the console
 */
export function displayValidationResults(result: ValidationResult): void {
  if (result.errors.length > 0) {
    console.error(chalk.red("\n❌ Configuration Errors:"));
    result.errors.forEach((error) => {
      console.error(chalk.red(`  • ${error}`));
    });
  }

  if (result.warnings.length > 0) {
    console.warn(chalk.yellow("\n⚠️  Configuration Warnings:"));
    result.warnings.forEach((warning) => {
      console.warn(chalk.yellow(`  • ${warning}`));
    });
  }

  if (result.suggestions && result.suggestions.length > 0) {
    console.log(chalk.blue("\n💡 Suggestions:"));
    result.suggestions.forEach((suggestion) => {
      console.log(chalk.blue(`  • ${suggestion}`));
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log(chalk.green("\n✅ Configuration is valid!"));
  }
}

/**
 * Validates configuration and exits if invalid
 */
export async function validateConfigOrExit(
  options: ConfigValidationOptions = {}
): Promise<void> {
  const result = await validateConfig(options);

  if (!result.isValid) {
    displayValidationResults(result);
    console.error(
      chalk.red("\nPlease fix the configuration errors before proceeding.")
    );
    throw new Error(result.errors[0] || "Configuration validation failed");
  }

  if (result.warnings.length > 0) {
    displayValidationResults(result);
  }
}
