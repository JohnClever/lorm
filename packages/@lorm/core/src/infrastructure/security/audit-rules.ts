import * as fs from "fs";
import * as path from "path";
import {
  SecurityConfig,
  AuditResult,
  AuditCategory,
  FixResult,
  FixChange,
  IPluginSandbox,
} from "./types.js";

/**
 * Audit rules engine for comprehensive security scanning
 */
export class AuditRulesEngine {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Audit environment variables for sensitive data
   */
  async auditEnvironmentVariables(projectPath: string): Promise<AuditResult> {
    const issues: string[] = [];
    const { environment } = this.config.auditRules;

    if (!environment.enabled) {
      return this.createPassResult("environment", "Environment audit disabled");
    }

    // Check environment variables
    Object.keys(process.env).forEach((key) => {
      const value = process.env[key] || "";
      if (
        this.isSensitiveVariable(
          key,
          value,
          environment.sensitivePatterns,
          environment.excludePatterns
        )
      ) {
        issues.push(`Environment variable ${key} may contain sensitive data`);
      }
    });

    // Check for .env files with hardcoded secrets
    if (environment.checkHardcodedSecrets) {
      const envFiles = [
        ".env",
        ".env.local",
        ".env.production",
        ".env.staging",
      ];
      for (const envFile of envFiles) {
        const envPath = path.join(projectPath, envFile);
        if (fs.existsSync(envPath)) {
          try {
            const content = fs.readFileSync(envPath, "utf-8");
            const secrets = this.scanForHardcodedSecrets(
              content,
              environment.sensitivePatterns
            );
            issues.push(
              ...secrets.map(
                (secret) =>
                  `Potential hardcoded secret in ${envFile}: ${secret}`
              )
            );
          } catch (error) {
            issues.push(`Failed to read ${envFile}: ${error}`);
          }
        }
      }
    }

    return {
      category: "environment",
      status: issues.length === 0 ? "pass" : "warning",
      message:
        issues.length === 0
          ? "Environment variables appear secure"
          : "Environment variable issues detected",
      details: issues.length > 0 ? issues : ["No hardcoded secrets detected"],
      fixable: false,
      severity: issues.length > 0 ? "medium" : "low",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Audit database configuration
   */
  async auditDatabaseConfiguration(projectPath: string): Promise<AuditResult> {
    const issues: string[] = [];
    const { database } = this.config.auditRules;

    if (!database.enabled) {
      return this.createPassResult("database", "Database audit disabled");
    }

    // Check DATABASE_URL environment variable
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && database.checkCredentials) {
      if (this.hasInsecureCredentials(databaseUrl)) {
        issues.push("DATABASE_URL contains potentially insecure credentials");
      }

      if (
        database.requireSSL &&
        !databaseUrl.includes("ssl=true") &&
        !databaseUrl.includes("sslmode=require")
      ) {
        issues.push("DATABASE_URL does not enforce SSL connection");
      }

      // Check if host is allowed
      const host = this.extractHostFromUrl(databaseUrl);
      if (
        host &&
        !database.allowedHosts.includes(host) &&
        !this.isLocalHost(host)
      ) {
        issues.push(`Database host ${host} is not in allowed hosts list`);
      }
    }

    // Check for database config files
    if (database.checkConnectionStrings) {
      const configFiles = [
        "config/database.yml",
        "database.json",
        "knexfile.js",
      ];
      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        if (fs.existsSync(configPath)) {
          try {
            const content = fs.readFileSync(configPath, "utf-8");
            if (this.containsHardcodedCredentials(content)) {
              issues.push(`Hardcoded credentials found in ${configFile}`);
            }
          } catch (error) {
            issues.push(`Failed to read ${configFile}: ${error}`);
          }
        }
      }
    }

    return {
      category: "database",
      status: issues.length === 0 ? "pass" : "warning",
      message:
        issues.length === 0
          ? "Database configuration appears secure"
          : "Database configuration issues detected",
      details:
        issues.length > 0 ? issues : ["No database security issues found"],
      fixable: true,
      severity: issues.length > 0 ? "high" : "low",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Audit file system security
   */
  async auditFileSystemSecurity(projectPath: string): Promise<AuditResult> {
    const issues: string[] = [];
    const { filesystem } = this.config.auditRules;

    if (!filesystem.enabled) {
      return this.createPassResult("filesystem", "Filesystem audit disabled");
    }

    // Check sensitive files
    for (const sensitiveFile of filesystem.sensitiveFiles) {
      const filePath = path.join(projectPath, sensitiveFile);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);

          // Check file permissions
          if (
            filesystem.checkPermissions &&
            this.hasInsecurePermissions(stats)
          ) {
            issues.push(`File ${sensitiveFile} has insecure permissions`);
          }

          // Scan for secrets if enabled
          if (filesystem.scanForSecrets) {
            const content = fs.readFileSync(filePath, "utf-8");
            const secrets = this.scanForHardcodedSecrets(
              content,
              this.config.auditRules.environment.sensitivePatterns
            );
            if (secrets.length > 0) {
              issues.push(
                `Potential secrets found in ${sensitiveFile}: ${secrets.join(
                  ", "
                )}`
              );
            }
          }
        } catch (error) {
          issues.push(`Failed to audit ${sensitiveFile}: ${error}`);
        }
      }
    }

    // Check for accidentally committed sensitive files
    const gitIgnorePath = path.join(projectPath, ".gitignore");
    if (fs.existsSync(gitIgnorePath)) {
      try {
        const gitIgnoreContent = fs.readFileSync(gitIgnorePath, "utf-8");
        const missingEntries = filesystem.sensitiveFiles.filter(
          (file) =>
            !gitIgnoreContent.includes(file) &&
            fs.existsSync(path.join(projectPath, file))
        );

        if (missingEntries.length > 0) {
          issues.push(
            `Sensitive files not in .gitignore: ${missingEntries.join(", ")}`
          );
        }
      } catch (error) {
        issues.push(`Failed to read .gitignore: ${error}`);
      }
    }

    return {
      category: "filesystem",
      status: issues.length === 0 ? "pass" : "warning",
      message:
        issues.length === 0
          ? "File system security appears good"
          : "File system security issues detected",
      details:
        issues.length > 0 ? issues : ["No file system security issues found"],
      fixable: true,
      severity: issues.length > 0 ? "medium" : "low",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Audit dependency vulnerabilities
   */
  async auditDependencyVulnerabilities(
    projectPath: string
  ): Promise<AuditResult> {
    const issues: string[] = [];
    const { dependencies } = this.config.auditRules;

    if (!dependencies.enabled) {
      return this.createPassResult("dependencies", "Dependency audit disabled");
    }

    // Check package.json for dependency count
    const packageJsonPath = path.join(projectPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8")
        );
        const allDeps = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };

        const depCount = Object.keys(allDeps).length;
        if (depCount > 100) {
          issues.push(
            `Large number of dependencies (${depCount}). Consider reducing dependency count.`
          );
        }

        // Check for packages with known security concerns or better alternatives
        const packageRecommendations = {
          lodash:
            "Consider using native ES6+ methods or more specific utility libraries",
          moment:
            "Consider using date-fns, dayjs, or native Date API for better performance",
          request:
            "Package is deprecated, use axios, fetch, or node-fetch instead",
          "node-uuid": "Package is deprecated, use uuid package instead",
          colors: "Consider using chalk or kleur for better performance",
        };

        for (const [pkg, recommendation] of Object.entries(
          packageRecommendations
        )) {
          if (allDeps[pkg] && !dependencies.excludePackages.includes(pkg)) {
            issues.push(`${pkg}: ${recommendation}`);
          }
        }

        // Check for outdated major versions (simplified check)
        for (const [pkg, version] of Object.entries(allDeps)) {
          if (
            typeof version === "string" &&
            (version.startsWith("^0.") || version.startsWith("~0."))
          ) {
            issues.push(
              `Package ${pkg} is on major version 0, consider stability`
            );
          }
        }
      } catch (error) {
        issues.push(`Failed to read package.json: ${error}`);
      }
    }

    // Check for lock files
    const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
    const hasLockFile = lockFiles.some((file) =>
      fs.existsSync(path.join(projectPath, file))
    );
    if (!hasLockFile) {
      issues.push(
        "No lock file found. This can lead to inconsistent dependency versions."
      );
    }

    return {
      category: "dependencies",
      status: issues.length === 0 ? "pass" : "warning",
      message:
        issues.length === 0
          ? "Dependencies appear secure"
          : "Dependency issues detected",
      details: issues.length > 0 ? issues : ["No dependency issues found"],
      fixable: false,
      severity: issues.length > 0 ? "medium" : "low",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Audit sandbox functionality
   */
  async auditSandboxFunctionality(
    sandbox: IPluginSandbox
  ): Promise<AuditResult> {
    const issues: string[] = [];

    try {
      // Test basic sandbox functionality
      const violations = sandbox.getViolations();
      if (violations.length > 0) {
        issues.push(
          `${violations.length} security violations detected in sandbox`
        );
      }

      // Test permission validation with dynamic context
      const currentWorkingDir = process.cwd();
      const tempDir = require("os").tmpdir();

      const auditContext = {
        pluginId: "security-audit-test",
        pluginName: "Security Audit Test",
        version: "1.0.0",
        permissions: {
          filesystem: {
            read: [currentWorkingDir, tempDir],
            write: [tempDir],
            execute: [],
          },
          network: { hosts: ["localhost", "127.0.0.1"], ports: [3000, 8080] },
          process: { spawn: false, env: [] },
          system: { exit: false, signals: false },
        },
        workingDirectory: currentWorkingDir,
        tempDirectory: tempDir,
        configDirectory: path.join(currentWorkingDir, ".lorm"),
        cacheDirectory: path.join(tempDir, "lorm-cache"),
      };

      // Test filesystem permission validation with realistic paths
      const allowedPath = path.join(tempDir, "test-file.txt");
      const restrictedPath = "/etc/passwd";

      const canReadAllowed = sandbox.validatePermissions(
        auditContext,
        "filesystem_read",
        allowedPath
      );
      const cannotReadRestricted = sandbox.validatePermissions(
        auditContext,
        "filesystem_read",
        restrictedPath
      );

      if (!canReadAllowed) {
        issues.push(
          "Sandbox failed to allow permitted filesystem read operation"
        );
      }

      if (cannotReadRestricted) {
        issues.push(
          "Sandbox failed to block unpermitted filesystem read operation"
        );
      }

      // Test network permission validation
      const canAccessLocalhost = sandbox.validatePermissions(
        auditContext,
        "network_connect",
        "localhost:3000"
      );
      const cannotAccessExternal = sandbox.validatePermissions(
        auditContext,
        "network_connect",
        "external-site.com:443"
      );

      if (!canAccessLocalhost) {
        issues.push("Sandbox failed to allow permitted network access");
      }

      if (cannotAccessExternal) {
        issues.push("Sandbox failed to block unpermitted network access");
      }
    } catch (error) {
      issues.push(`Sandbox audit failed: ${error}`);
    }

    return {
      category: "sandbox",
      status: issues.length === 0 ? "pass" : "error",
      message:
        issues.length === 0
          ? "Sandbox functionality working correctly"
          : "Sandbox issues detected",
      details: issues.length > 0 ? issues : ["Sandbox is functioning properly"],
      fixable: false,
      severity: issues.length > 0 ? "high" : "low",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Apply security fixes based on audit results
   */
  async applyFix(result: AuditResult, projectPath: string): Promise<FixResult> {
    const changes: FixChange[] = [];

    try {
      switch (result.category) {
        case "filesystem":
          return await this.applyFileSystemFixes(result, projectPath, changes);
        case "database":
          return await this.applyDatabaseFixes(result, projectPath, changes);
        case "environment":
          return await this.applyEnvironmentFixes(result, projectPath, changes);
        case "dependencies":
          return await this.applyDependencyFixes(result, projectPath, changes);
        default:
          throw new Error(
            `Fixes not implemented for category: ${result.category}`
          );
      }
    } catch (error) {
      return {
        category: result.category,
        success: false,
        message: `Failed to apply fixes for ${result.category}`,
        error: error instanceof Error ? error.message : String(error),
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    }
  }

  // Private helper methods

  private createPassResult(
    category: AuditCategory,
    message: string
  ): AuditResult {
    return {
      category,
      status: "pass",
      message,
      details: [],
      fixable: false,
      severity: "low",
      timestamp: new Date().toISOString(),
    };
  }

  private isSensitiveVariable(
    key: string,
    value: string,
    sensitivePatterns: RegExp[],
    excludePatterns: RegExp[]
  ): boolean {
    if (!value || value.length === 0) return false;

    // Skip if matches exclude patterns
    if (
      excludePatterns.some(
        (pattern) => pattern.test(key) || pattern.test(value)
      )
    ) {
      return false;
    }

    // Only skip values that are clearly template placeholders
    if (value.includes("${") || value.includes("<%")) {
      return false;
    }

    // Flag localhost and test values as potentially sensitive in production
    // These should be reviewed even if they appear to be development values
    const isDevelopmentValue =
      value.includes("localhost") ||
      value.includes("127.0.0.1") ||
      value.startsWith("test_") ||
      value.startsWith("dev_");

    if (isDevelopmentValue && process.env.NODE_ENV === "production") {
      // In production, flag these as potential issues
      return true;
    }

    return sensitivePatterns.some((pattern) => pattern.test(key));
  }

  private scanForHardcodedSecrets(
    content: string,
    patterns: RegExp[]
  ): string[] {
    const secrets: string[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        if (
          pattern.test(line) &&
          !line.trim().startsWith("#") &&
          !line.trim().startsWith("//")
        ) {
          secrets.push(`Line ${i + 1}: ${line.trim().substring(0, 50)}...`);
        }
      }
    }

    return secrets;
  }

  private hasInsecureCredentials(url: string): boolean {
    // Check for common insecure patterns using regex for more robust detection
    const insecurePatterns = [
      /password=(?:123|admin|password|test|demo|root|guest|user)/i,
      /user=(?:admin|root|test|demo|guest)/i,
      /username=(?:admin|root|test|demo|guest)/i,
      /pwd=(?:123|admin|password|test|demo|root|guest|user)/i,
      /pass=(?:123|admin|password|test|demo|root|guest|user)/i,
      // Check for sequential or repeated characters
      /password=(?:1234|abcd|qwerty|letmein)/i,
      // Check for empty or single character passwords
      /password=(?:"|'|\s*$|.{1}(?:"|'|&|$))/,
      // Check for common weak passwords
      /password=(?:changeme|default|welcome|secret)/i,
    ];

    return insecurePatterns.some((pattern) => pattern.test(url));
  }

  private extractHostFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      // Try to extract host from connection string format
      const hostMatch = url.match(/@([^:]+)/);
      return hostMatch ? hostMatch[1] : null;
    }
  }

  private isLocalHost(host: string): boolean {
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  private containsHardcodedCredentials(content: string): boolean {
    const credentialPatterns = [
      /password\s*[:=]\s*["'](?!\$|<%)[^"']+["']/i,
      /secret\s*[:=]\s*["'](?!\$|<%)[^"']+["']/i,
      /key\s*[:=]\s*["'](?!\$|<%)[^"']+["']/i,
    ];

    return credentialPatterns.some((pattern) => pattern.test(content));
  }

  private hasInsecurePermissions(stats: fs.Stats): boolean {
    // Check if file is world-readable or world-writable
    const mode = stats.mode;
    return (mode & 0o044) !== 0 || (mode & 0o022) !== 0;
  }

  private async applyFileSystemFixes(
    result: AuditResult,
    projectPath: string,
    changes: FixChange[]
  ): Promise<FixResult> {
    // Add sensitive files to .gitignore
    const gitIgnorePath = path.join(projectPath, ".gitignore");
    const sensitiveFiles = [".env", ".env.local", ".env.production"];

    if (fs.existsSync(gitIgnorePath)) {
      const content = fs.readFileSync(gitIgnorePath, "utf-8");
      const missingFiles = sensitiveFiles.filter(
        (file) => !content.includes(file)
      );

      if (missingFiles.length > 0) {
        const newContent = content + "\n" + missingFiles.join("\n") + "\n";
        fs.writeFileSync(gitIgnorePath, newContent, "utf-8");

        changes.push({
          type: "file_modify",
          target: ".gitignore",
          description: `Added sensitive files to .gitignore: ${missingFiles.join(
            ", "
          )}`,
          oldValue: content,
          newValue: newContent,
        });
      }
    }

    return {
      category: "filesystem",
      success: true,
      message: `Applied ${changes.length} filesystem fixes`,
      appliedAt: new Date().toISOString(),
      changesApplied: changes,
    };
  }

  private async applyDatabaseFixes(
    result: AuditResult,
    projectPath: string,
    changes: FixChange[]
  ): Promise<FixResult> {
    try {
      // Check for .env files with insecure database URLs
      const envFiles = [
        ".env",
        ".env.local",
        ".env.production",
        ".env.staging",
      ];

      for (const envFile of envFiles) {
        const envPath = path.join(projectPath, envFile);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          let updatedContent = content;
          let hasChanges = false;

          // Fix insecure database URLs by adding comments and warnings
          const lines = content.split("\n");
          const updatedLines = lines.map((line, index) => {
            if (
              line.includes("DATABASE_URL") &&
              this.hasInsecureCredentials(line)
            ) {
              hasChanges = true;
              changes.push({
                type: "file_modify",
                target: envFile,
                description: `Added security warning for insecure database URL on line ${
                  index + 1
                }`,
                oldValue: line,
                newValue: `# WARNING: Insecure database credentials detected. Please use secure credentials.\n${line}`,
              });
              return `# WARNING: Insecure database credentials detected. Please use secure credentials.\n${line}`;
            }
            return line;
          });

          if (hasChanges) {
            updatedContent = updatedLines.join("\n");
            fs.writeFileSync(envPath, updatedContent, "utf-8");
          }
        }
      }

      // Create a database security checklist file
      const securityChecklistPath = path.join(
        projectPath,
        ".lorm",
        "database-security-checklist.md"
      );
      const checklistContent =
        `# Database Security Checklist\n\n` +
        `- [ ] Use strong, unique passwords for database connections\n` +
        `- [ ] Enable SSL/TLS encryption for database connections\n` +
        `- [ ] Restrict database access to specific IP addresses\n` +
        `- [ ] Use environment variables for sensitive database credentials\n` +
        `- [ ] Regularly rotate database passwords\n` +
        `- [ ] Enable database audit logging\n` +
        `- [ ] Use least privilege principle for database users\n` +
        `\nGenerated on: ${new Date().toISOString()}\n`;

      // Ensure .lorm directory exists
      const lormDir = path.join(projectPath, ".lorm");
      if (!fs.existsSync(lormDir)) {
        fs.mkdirSync(lormDir, { recursive: true });
      }

      fs.writeFileSync(securityChecklistPath, checklistContent, "utf-8");

      changes.push({
        type: "file_create",
        target: ".lorm/database-security-checklist.md",
        description: "Created database security checklist",
        oldValue: "",
        newValue: checklistContent,
      });

      return {
        category: "database",
        success: true,
        message: `Applied ${changes.length} database security fixes`,
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    } catch (error) {
      return {
        category: "database",
        success: false,
        message: "Failed to apply database fixes",
        error: error instanceof Error ? error.message : String(error),
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    }
  }

  /**
   * Apply environment security fixes
   */
  private async applyEnvironmentFixes(
    result: AuditResult,
    projectPath: string,
    changes: FixChange[]
  ): Promise<FixResult> {
    try {
      // Create .env.example file with safe placeholder values
      const envExamplePath = path.join(projectPath, ".env.example");
      const envExampleContent =
        `# Environment Variables Template\n` +
        `# Copy this file to .env and fill in your actual values\n\n` +
        `# Database Configuration\n` +
        `DATABASE_URL="postgresql://username:password@localhost:5432/database_name"\n\n` +
        `# API Keys (replace with your actual keys)\n` +
        `API_KEY="your_api_key_here"\n` +
        `SECRET_KEY="your_secret_key_here"\n\n` +
        `# Application Settings\n` +
        `NODE_ENV="development"\n` +
        `PORT="3000"\n`;

      if (!fs.existsSync(envExamplePath)) {
        fs.writeFileSync(envExamplePath, envExampleContent, "utf-8");
        changes.push({
          type: "file_create",
          target: ".env.example",
          description:
            "Created .env.example template with safe placeholder values",
          oldValue: "",
          newValue: envExampleContent,
        });
      }

      // Add .env files to .gitignore if not already present
      const gitIgnorePath = path.join(projectPath, ".gitignore");
      const envFiles = [
        ".env",
        ".env.local",
        ".env.production",
        ".env.staging",
      ];

      if (fs.existsSync(gitIgnorePath)) {
        const content = fs.readFileSync(gitIgnorePath, "utf-8");
        const missingFiles = envFiles.filter((file) => !content.includes(file));

        if (missingFiles.length > 0) {
          const newContent =
            content +
            "\n# Environment files\n" +
            missingFiles.join("\n") +
            "\n";
          fs.writeFileSync(gitIgnorePath, newContent, "utf-8");

          changes.push({
            type: "file_modify",
            target: ".gitignore",
            description: `Added environment files to .gitignore: ${missingFiles.join(
              ", "
            )}`,
            oldValue: content,
            newValue: newContent,
          });
        }
      }

      return {
        category: "environment",
        success: true,
        message: `Applied ${changes.length} environment security fixes`,
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    } catch (error) {
      return {
        category: "environment",
        success: false,
        message: "Failed to apply environment fixes",
        error: error instanceof Error ? error.message : String(error),
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    }
  }

  /**
   * Apply dependency security fixes
   */
  private async applyDependencyFixes(
    result: AuditResult,
    projectPath: string,
    changes: FixChange[]
  ): Promise<FixResult> {
    try {
      // Create security audit script
      const auditScriptPath = path.join(
        projectPath,
        "scripts",
        "security-audit.js"
      );
      const scriptsDir = path.join(projectPath, "scripts");

      // Ensure scripts directory exists
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }

      const auditScriptContent =
        `#!/usr/bin/env node\n` +
        `// Security audit script for dependencies\n` +
        `const { execSync } = require('child_process');\n\n` +
        `console.log('Running security audit...');\n` +
        `try {\n` +
        `  execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });\n` +
        `  console.log('Security audit completed successfully.');\n` +
        `} catch (error) {\n` +
        `  console.error('Security vulnerabilities found. Run \'npm audit fix\' to resolve.');\n` +
        `  process.exit(1);\n` +
        `}\n`;

      fs.writeFileSync(auditScriptPath, auditScriptContent, "utf-8");

      changes.push({
        type: "file_create",
        target: "scripts/security-audit.js",
        description: "Created security audit script for dependency checking",
        oldValue: "",
        newValue: auditScriptContent,
      });

      // Update package.json to include security script
      const packageJsonPath = path.join(projectPath, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8")
          );

          if (!packageJson.scripts) {
            packageJson.scripts = {};
          }

          if (!packageJson.scripts["security:audit"]) {
            packageJson.scripts["security:audit"] =
              "node scripts/security-audit.js";

            const newPackageJson = JSON.stringify(packageJson, null, 2);
            fs.writeFileSync(packageJsonPath, newPackageJson, "utf-8");

            changes.push({
              type: "file_modify",
              target: "package.json",
              description: "Added security:audit script to package.json",
              oldValue: "scripts section",
              newValue: "scripts section with security:audit",
            });
          }
        } catch (error) {
          console.warn("Failed to update package.json:", error);
        }
      }

      return {
        category: "dependencies",
        success: true,
        message: `Applied ${changes.length} dependency security fixes`,
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    } catch (error) {
      return {
        category: "dependencies",
        success: false,
        message: "Failed to apply dependency fixes",
        error: error instanceof Error ? error.message : String(error),
        appliedAt: new Date().toISOString(),
        changesApplied: changes,
      };
    }
  }
}
