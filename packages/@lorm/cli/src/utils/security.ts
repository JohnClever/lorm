import { URL } from "url";
import { resolve, normalize, isAbsolute } from "path";
import chalk from "chalk";

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface DatabaseUrlInfo {
  protocol: string;
  hostname: string;
  port: string | null;
  database: string;
  isLocal: boolean;
  isSecure: boolean;
}

export class SecurityValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /[;&|`$(){}\[\]]/,
    /<script[^>]*>/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
  ];

  private static readonly LOCAL_HOSTS = [
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
  ];

  private static readonly SECURE_PROTOCOLS = [
    "https:",
    "postgresql:",
    "mysql:",
    "file:",
  ];

  static validateInput(
    input: string,
    context: string = "input"
  ): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        errors.push(`Potentially dangerous characters detected in ${context}`);
        suggestions.push(
          "Remove special characters and use only alphanumeric values"
        );
        break;
      }
    }

    if (input.length > 1000) {
      warnings.push(
        `${context} is unusually long (${input.length} characters)`
      );
      suggestions.push("Consider using shorter input values");
    }

    if (input.includes("\0")) {
      errors.push(`Null byte detected in ${context}`);
      suggestions.push("Remove null bytes from input");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  static validateFilePath(
    filePath: string,
    allowedBasePath?: string
  ): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const normalizedPath = normalize(filePath);

    if (normalizedPath.includes("..")) {
      errors.push("Directory traversal detected in file path");
      suggestions.push("Use absolute paths or paths relative to project root");
    }

    if (allowedBasePath && isAbsolute(normalizedPath)) {
      const resolvedPath = resolve(normalizedPath);
      const resolvedBase = resolve(allowedBasePath);

      if (!resolvedPath.startsWith(resolvedBase)) {
        errors.push("File path is outside allowed directory");
        suggestions.push(`Ensure file path is within ${allowedBasePath}`);
      }
    }

    const suspiciousExtensions = [".exe", ".bat", ".cmd", ".sh", ".ps1"];
    const extension = normalizedPath.toLowerCase().split(".").pop();
    if (extension && suspiciousExtensions.includes(`.${extension}`)) {
      warnings.push("Potentially executable file detected");
      suggestions.push("Verify file type and purpose");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  static validateDatabaseUrl(
    databaseUrl: string
  ): SecurityValidationResult & { urlInfo?: DatabaseUrlInfo } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let urlInfo: DatabaseUrlInfo | undefined;

    try {
      const url = new URL(databaseUrl);

      urlInfo = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        database: url.pathname.slice(1),
        isLocal: this.LOCAL_HOSTS.includes(url.hostname.toLowerCase()),
        isSecure: this.SECURE_PROTOCOLS.includes(url.protocol),
      };

      if (url.username || url.password) {
        warnings.push("Database credentials found in URL");
        suggestions.push(
          "Consider using environment variables for credentials"
        );
      }

      if (!urlInfo.isSecure && !urlInfo.isLocal) {
        warnings.push("Insecure database connection detected");
        suggestions.push("Use SSL/TLS for remote database connections");
      }

      const defaultPorts: Record<string, string> = {
        "5432": "PostgreSQL",
        "3306": "MySQL",
        "1433": "SQL Server",
      };
      if (url.port && defaultPorts[url.port]) {
        warnings.push(`Using default port for ${defaultPorts[url.port]}`);
        suggestions.push(
          "Consider using non-default ports for better security"
        );
      }
    } catch (error) {
      errors.push("Invalid database URL format");
      suggestions.push(
        "Ensure URL follows format: protocol://user:pass@host:port/database"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      urlInfo,
    };
  }

  static validateEnvironmentVariables(): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const requiredVars = ["DATABASE_URL"];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        warnings.push(`${varName} environment variable not set`);
        suggestions.push(`Set ${varName} in your .env file or environment`);
      } else {
        if (varName === "DATABASE_URL") {
          const dbValidation = this.validateDatabaseUrl(process.env[varName]!);
          errors.push(...dbValidation.errors);
          warnings.push(...dbValidation.warnings);
          suggestions.push(...dbValidation.suggestions);
        }
      }
    }

    const sensitivePatterns = [
      {
        pattern: /password/i,
        message: "Password found in environment variable name",
      },
      {
        pattern: /secret/i,
        message: "Secret found in environment variable name",
      },
      { pattern: /key/i, message: "Key found in environment variable name" },
      {
        pattern: /token/i,
        message: "Token found in environment variable name",
      },
    ];

    for (const [key, value] of Object.entries(process.env)) {
      for (const { pattern, message } of sensitivePatterns) {
        if (pattern.test(key) && value) {
          warnings.push(`${message}: ${key}`);
          suggestions.push(
            "Ensure sensitive environment variables are properly secured"
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  static sanitizeOutput(input: string): string {
    return input
      .replace(/[<>&"']/g, (char) => {
        const entities: Record<string, string> = {
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&#x27;",
        };
        return entities[char] || char;
      })
      .replace(/\x00/g, "");
  }

  static validateProductionSafety(
    operation: string,
    databaseUrl?: string
  ): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.ENVIRONMENT === "production" ||
      process.env.ENV === "production";

    if (isProduction) {
      const dangerousOperations = ["drop", "delete", "truncate", "reset"];
      if (
        dangerousOperations.some((op) => operation.toLowerCase().includes(op))
      ) {
        errors.push(
          `Dangerous operation '${operation}' detected in production environment`
        );
        suggestions.push(
          "Use a development or staging environment for destructive operations"
        );
      }
    }

    const prodIndicators = ["PROD", "PRODUCTION", "LIVE", "STAGING"];
    for (const [key, value] of Object.entries(process.env)) {
      if (
        typeof value === "string" &&
        prodIndicators.some(
          (indicator) =>
            key.toUpperCase().includes(indicator) ||
            value.toUpperCase().includes(indicator)
        )
      ) {
        warnings.push(`Production indicator detected in ${key}`);
        suggestions.push(
          "Verify environment configuration before running destructive operations"
        );
      }
    }

    if (databaseUrl) {
      const dbValidation = this.validateDatabaseUrl(databaseUrl);
      if (dbValidation.urlInfo?.isLocal && isProduction) {
        warnings.push("Local database detected in production environment");
        suggestions.push("Use a proper database server for production");
      }

      try {
        const parsed = new URL(databaseUrl);
        const hostname = parsed.hostname?.toLowerCase() || "";
        const cloudProviders = [
          "amazonaws.com",
          "rds.amazonaws.com",
          "azure.com",
          "googleusercontent.com",
          "planetscale.com",
          "railway.app",
          "supabase.com",
          "neon.tech",
        ];

        if (cloudProviders.some((provider) => hostname.includes(provider))) {
          const dangerousOps = ["drop", "delete", "truncate", "reset"];
          if (dangerousOps.some((op) => operation.toLowerCase().includes(op))) {
            errors.push(
              `${operation} blocked: Cloud database detected (${hostname})`
            );
            suggestions.push(
              "Use extreme caution with cloud databases - consider using a backup first"
            );
          }
        }
      } catch {
        // URL parsing failed, but we'll let other validators handle it
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  static displaySecurityResults(
    result: SecurityValidationResult,
    context: string = "Security check"
  ): void {
    if (result.errors.length > 0) {
      console.error(chalk.red(`\n🚨 ${context} - Security Errors:`));
      result.errors.forEach((error) => {
        console.error(chalk.red(`  • ${error}`));
      });
    }

    if (result.warnings.length > 0) {
      console.warn(chalk.yellow(`\n⚠️  ${context} - Security Warnings:`));
      result.warnings.forEach((warning) => {
        console.warn(chalk.yellow(`  • ${warning}`));
      });
    }

    if (result.suggestions.length > 0) {
      console.log(chalk.blue(`\n💡 ${context} - Security Suggestions:`));
      result.suggestions.forEach((suggestion) => {
        console.log(chalk.blue(`  • ${suggestion}`));
      });
    }

    if (result.isValid && result.warnings.length === 0) {
      console.log(chalk.green(`\n✅ ${context} passed security validation`));
    }
  }

  static displayValidationResults(
    result: SecurityValidationResult,
    title: string
  ): void {
    console.log(`\n🔍 ${title}:`);

    if (result.errors.length > 0) {
      console.log("❌ Errors:");
      result.errors.forEach((error) => console.log(`   • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log("⚠️  Warnings:");
      result.warnings.forEach((warning) => console.log(`   • ${warning}`));
    }

    if (result.suggestions.length > 0) {
      console.log("💡 Suggestions:");
      result.suggestions.forEach((suggestion) =>
        console.log(`   • ${suggestion}`)
      );
    }

    if (
      result.isValid &&
      result.errors.length === 0 &&
      result.warnings.length === 0
    ) {
      console.log("✅ All checks passed");
    }
  }
}

export class SecurityAuditLogger {
  private static logFile = ".lorm/security.log";

  static async logSecurityEvent(
    event: string,
    details: Record<string, any> = {},
    level: "info" | "warn" | "error" = "info"
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      event,
      details,
      pid: process.pid,
      user: process.env.USER || process.env.USERNAME || "unknown",
    };

    try {
      const { appendFile, ensureDir } = await import("./file-utils");
      await ensureDir(".lorm");
      await appendFile(this.logFile, JSON.stringify(logEntry) + "\n");
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Failed to write security log"));
    }
  }

  static async logCommandExecution(
    command: string,
    args: string[] = [],
    success: boolean = true
  ): Promise<void> {
    await this.logSecurityEvent(
      "command_execution",
      {
        command,
        args: args.map((arg) => this.sanitizeLogData(arg)),
        success,
        cwd: process.cwd(),
      },
      success ? "info" : "error"
    );
  }

  static async logDangerousOperation(
    operation: string,
    target: string,
    confirmed: boolean
  ): Promise<void> {
    await this.logSecurityEvent(
      "dangerous_operation",
      {
        operation,
        target: this.sanitizeLogData(target),
        confirmed,
        environment: process.env.NODE_ENV || "unknown",
      },
      "warn"
    );
  }

  private static sanitizeLogData(data: string): string {
    return data
      .replace(/password=[^&\s]+/gi, "password=***")
      .replace(/token=[^&\s]+/gi, "token=***")
      .replace(/key=[^&\s]+/gi, "key=***")
      .replace(/secret=[^&\s]+/gi, "secret=***")
      .replace(/:([^:@]+)@/g, ":***@");
  }
}
