import { resolve } from "path";
import { readFileSync } from "fs";
import chalk from "chalk";
import { exists } from "./file-utils";
import { SecurityValidator, SecurityAuditLogger } from "./security";
import { loadConfig } from "@lorm/core";
import { configValidationCache } from "./config-cache";
import { ValidationResult, ConfigValidationOptions } from '../types.js';

export type { ValidationResult, ConfigValidationOptions };
export async function validateConfig(
  options: ConfigValidationOptions = {}
): Promise<ValidationResult> {
  const cachedResult = await configValidationCache.get(options);
  if (cachedResult) {
    return cachedResult;
  }
  const {
    requireConfig = false,
    requireSchema = false,
    requireRouter = false,
    checkDatabase = false,
    checkDependencies = false,
    checkEnvironment = false,
    autoFix = false,
  } = options;
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const cwd = process.cwd();
  if (requireConfig) {
    const configTsPath = resolve(cwd, "lorm.config.ts");
    const configJsPath = resolve(cwd, "lorm.config.js");
    const configMjsPath = resolve(cwd, "lorm.config.mjs");
    if (!exists(configTsPath) && !exists(configJsPath) && !exists(configMjsPath)) {
      errors.push(
        "lorm.config.js, lorm.config.mjs, or lorm.config.ts not found. Run `npx @lorm/cli init` to create it."
      );
    } else {
      try {
        const config = await loadConfig();
        if (!config) {
          const configPath = exists(configTsPath) ? configTsPath : exists(configJsPath) ? configJsPath : configMjsPath;
        const configType = configPath.endsWith('.ts') ? 'lorm.config.ts' : configPath.endsWith('.mjs') ? 'lorm.config.mjs' : 'lorm.config.js';
        warnings.push(
          `${configType} exists but may not export a valid configuration.`
        );
        }
      } catch (error) {
        const configPath = exists(configTsPath) ? configTsPath : exists(configJsPath) ? configJsPath : configMjsPath;
        const configType = configPath.endsWith('.ts') ? 'lorm.config.ts' : configPath.endsWith('.mjs') ? 'lorm.config.mjs' : 'lorm.config.js';
        errors.push(
          `Invalid ${configType}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }
  if (requireSchema) {
    const newTsSchemaPath = resolve(cwd, "lorm/schema/index.ts");
    const newJsSchemaPath = resolve(cwd, "lorm/schema/index.js");
    const newMjsSchemaPath = resolve(cwd, "lorm/schema/index.mjs");
    const legacySchemaPath = resolve(cwd, "lorm.schema.js");
    if (!exists(newTsSchemaPath) && !exists(newJsSchemaPath) && !exists(newMjsSchemaPath) && !exists(legacySchemaPath)) {
      errors.push(
        "Schema file not found. Expected lorm/schema/index.ts, lorm/schema/index.js, lorm/schema/index.mjs, or lorm.schema.js"
      );
    } else if (exists(legacySchemaPath) && !exists(newTsSchemaPath) && !exists(newJsSchemaPath) && !exists(newMjsSchemaPath)) {
      suggestions.push(
        "Consider migrating to new structure: lorm/schema/index.ts"
      );
    } else if ((exists(newJsSchemaPath) || exists(newMjsSchemaPath)) && !exists(newTsSchemaPath)) {
      suggestions.push(
        "Consider using TypeScript: lorm/schema/index.ts"
      );
    }
  }
  if (requireRouter) {
    const newTsRouterPath = resolve(cwd, "lorm/router/index.ts");
    const newJsRouterPath = resolve(cwd, "lorm/router/index.js");
    const newMjsRouterPath = resolve(cwd, "lorm/router/index.mjs");
    const legacyRouterPath = resolve(cwd, "lorm.router.js");
    if (!exists(newTsRouterPath) && !exists(newJsRouterPath) && !exists(newMjsRouterPath) && !exists(legacyRouterPath)) {
      warnings.push(
        "Router file not found. Some features may not work correctly."
      );
    } else if (exists(legacyRouterPath) && !exists(newTsRouterPath) && !exists(newJsRouterPath) && !exists(newMjsRouterPath)) {
      suggestions.push(
        "Consider migrating to new structure: lorm/router/index.ts"
      );
    } else if ((exists(newJsRouterPath) || exists(newMjsRouterPath)) && !exists(newTsRouterPath)) {
      suggestions.push(
        "Consider using TypeScript: lorm/router/index.ts"
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
      const requiredDeps = ["@lorm/core"];
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
          isLocal: dbSecurityResult.urlInfo?.isLocal ?? false,
          protocol: dbSecurityResult.urlInfo?.protocol ?? "unknown",
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
  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
  await configValidationCache.set(options, result);
  return result;
}
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
