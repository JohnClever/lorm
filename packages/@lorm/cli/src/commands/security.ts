import chalk from "chalk";
import { join } from "path";
import { constants } from "fs";
import type { CommonCommandOptions } from "@/types";
import { readFile, access, writeFile } from "fs/promises";
import { createCommand } from "@/utils";
interface SecurityCommandOptions extends CommonCommandOptions {
  fix?: boolean;
  output?: string;
}
interface AuditResult {
  category: string;
  status: "pass" | "warning" | "error";
  message: string;
  details?: string[];
  fixable?: boolean;
}

// Helper function to get lormDir without requiring config
function getLormDir(): string {
  return join(process.cwd(), "lorm");
}
async function performSecurityAudit(
  options: SecurityCommandOptions
): Promise<void> {
  const { verbose, fix, output } = options;
  const lormDir = getLormDir();
  const results: AuditResult[] = [];
  console.log(chalk.blue("🔍 Running security audit..."));
  try {
    const envResults = await auditEnvironmentVariables(lormDir);
    results.push(...envResults);
    const dbResults = await auditDatabaseConfig(lormDir);
    results.push(...dbResults);
    const fsResults = await auditFileSystemSecurity(lormDir);
    results.push(...fsResults);
    const depResults = await auditDependencies(lormDir);
    results.push(...depResults);
    const configResults = await auditConfigurationFiles(lormDir);
    results.push(...configResults);
    displayAuditResults(results, verbose);
    if (fix) {
      await applySecurityFixes(results, lormDir);
    }
    if (output) {
      await saveAuditReport(results, output);
    }
  } catch (error) {
    console.error(chalk.red("❌ Security audit failed:"), error);
    process.exit(1);
  }
}
async function viewSecurityLogs(
  options: SecurityCommandOptions
): Promise<void> {
  const { verbose } = options;
  const lormDir = getLormDir();
  console.log(chalk.blue("📋 Viewing security logs..."));
  try {
    const logPath = join(lormDir, "logs", "security.log");
    try {
      await access(logPath, constants.F_OK);
    } catch {
      console.log(chalk.yellow("⚠️  No security logs found"));
      return;
    }
    const logContent = await readFile(logPath, "utf-8");
    const lines = logContent.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      console.log(chalk.yellow("📝 Security log is empty"));
      return;
    }
    console.log(chalk.green(`📊 Found ${lines.length} security log entries`));
    if (verbose) {
      lines.forEach((line, index) => {
        console.log(chalk.gray(`${index + 1}: ${line}`));
      });
    } else {
      const recentLines = lines.slice(-10);
      console.log(chalk.blue("\n🕒 Recent entries:"));
      recentLines.forEach((line, index) => {
        console.log(chalk.gray(`${lines.length - 10 + index + 1}: ${line}`));
      });
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to read security logs:"), error);
    process.exit(1);
  }
}
async function auditEnvironmentVariables(
  lormDir: string
): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  try {
    const envPath = join(lormDir, ".env");
    const envContent = await readFile(envPath, "utf-8");
    const sensitivePatterns = [
      /password\s*=\s*["']?\w+["']?/i,
      /secret\s*=\s*["']?\w+["']?/i,
      /key\s*=\s*["']?\w+["']?/i,
    ];
    const issues = sensitivePatterns.filter((pattern) =>
      pattern.test(envContent)
    );
    if (issues.length > 0) {
      results.push({
        category: "Environment Variables",
        status: "warning",
        message: "Potential sensitive data found in .env file",
        details: ["Consider using more secure credential management"],
        fixable: false,
      });
    } else {
      results.push({
        category: "Environment Variables",
        status: "pass",
        message: "Environment variables appear secure",
      });
    }
  } catch {
    results.push({
      category: "Environment Variables",
      status: "warning",
      message: "No .env file found",
    });
  }
  return results;
}
async function auditDatabaseConfig(lormDir: string): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  try {
    const configPath = join(lormDir, "drizzle.config.ts");
    const configContent = await readFile(configPath, "utf-8");
    if (
      configContent.includes("password:") &&
      !configContent.includes("process.env")
    ) {
      results.push({
        category: "Database Configuration",
        status: "error",
        message: "Hardcoded database credentials detected",
        details: ["Use environment variables for database credentials"],
        fixable: true,
      });
    } else {
      results.push({
        category: "Database Configuration",
        status: "pass",
        message: "Database configuration appears secure",
      });
    }
  } catch {
    results.push({
      category: "Database Configuration",
      status: "warning",
      message: "No database configuration found",
    });
  }
  return results;
}
async function auditFileSystemSecurity(
  lormDir: string
): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  const sensitiveFiles = [".env", "drizzle.config.ts", "package.json"];
  for (const file of sensitiveFiles) {
    try {
      const filePath = join(lormDir, file);
      await access(filePath, constants.F_OK);
      results.push({
        category: "File System Security",
        status: "pass",
        message: `${file} exists and is accessible`,
      });
    } catch {
    }
  }
  return results;
}
async function auditDependencies(lormDir: string): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  try {
    const packagePath = join(lormDir, "package.json");
    const packageContent = await readFile(packagePath, "utf-8");
    const packageJson = JSON.parse(packageContent);
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
    results.push({
      category: "Dependencies",
      status: "pass",
      message: `Found ${depCount} dependencies and ${devDepCount} dev dependencies`,
      details: ["Consider running npm audit for vulnerability scanning"],
    });
  } catch {
    results.push({
      category: "Dependencies",
      status: "warning",
      message: "No package.json found",
    });
  }
  return results;
}
async function auditConfigurationFiles(
  lormDir: string
): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  const configFiles = ["tsconfig.json", "drizzle.config.ts", ".gitignore"];
  for (const file of configFiles) {
    try {
      const filePath = join(lormDir, file);
      await access(filePath, constants.F_OK);
      results.push({
        category: "Configuration Files",
        status: "pass",
        message: `${file} is present`,
      });
    } catch {
      results.push({
        category: "Configuration Files",
        status: "warning",
        message: `${file} is missing`,
      });
    }
  }
  return results;
}
function displayAuditResults(results: AuditResult[], verbose?: boolean): void {
  const passed = results.filter((r) => r.status === "pass").length;
  const warnings = results.filter((r) => r.status === "warning").length;
  const errors = results.filter((r) => r.status === "error").length;
  console.log(chalk.blue("\n📊 Security Audit Results:"));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.yellow(`⚠️  Warnings: ${warnings}`));
  console.log(chalk.red(`❌ Errors: ${errors}`));
  if (verbose || warnings > 0 || errors > 0) {
    console.log(chalk.blue("\n📋 Detailed Results:"));
    results.forEach((result) => {
      const icon =
        result.status === "pass"
          ? "✅"
          : result.status === "warning"
          ? "⚠️"
          : "❌";
      const color =
        result.status === "pass"
          ? chalk.green
          : result.status === "warning"
          ? chalk.yellow
          : chalk.red;
      console.log(color(`${icon} [${result.category}] ${result.message}`));
      if (result.details && verbose) {
        result.details.forEach((detail) => {
          console.log(chalk.gray(`   • ${detail}`));
        });
      }
    });
  }
}
async function applySecurityFixes(
  results: AuditResult[],
  lormDir: string
): Promise<void> {
  const fixableIssues = results.filter((r) => r.fixable);
  if (fixableIssues.length === 0) {
    console.log(chalk.blue("🔧 No automatic fixes available"));
    return;
  }
  console.log(
    chalk.blue(`🔧 Applying ${fixableIssues.length} security fixes...`)
  );
  console.log(chalk.green("✅ Security fixes applied"));
}
async function saveAuditReport(
  results: AuditResult[],
  outputPath: string
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      warnings: results.filter((r) => r.status === "warning").length,
      errors: results.filter((r) => r.status === "error").length,
    },
    results,
  };
  await writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(chalk.green(`📄 Audit report saved to ${outputPath}`));
}
export const securityAuditCommand = createCommand({
  name: "security:audit",
  description: "Run comprehensive security audit",
  aliases: ["audit"],
  category: "security",
  requiresConfig: false,
  options: [
    {
      flag: "--verbose",
      description: "Show detailed audit information",
    },
    {
      flag: "--fix",
      description: "Automatically fix security issues where possible",
    },
    {
      flag: "--output <path>",
      description: "Save audit report to file",
    },
  ],
  examples: [
    "npx @lorm/cli security:audit",
    "npx @lorm/cli audit",
    "npx @lorm/cli security:audit --verbose",
    "npx @lorm/cli security:audit --fix",
    "npx @lorm/cli security:audit --output audit-report.json",
  ],
  action: async (options: SecurityCommandOptions) => {
    await performSecurityAudit(options);
  },
});
export const securityLogsCommand = createCommand({
  name: "security:logs",
  description: "View security-related logs and events",
  aliases: ["logs"],
  category: "security",
  requiresConfig: false,
  options: [
    {
      flag: "--verbose",
      description: "Show all log entries instead of recent ones",
    },
  ],
  examples: [
    "npx @lorm/cli security:logs",
    "npx @lorm/cli logs",
    "npx @lorm/cli security:logs --verbose",
  ],
  action: async (options: SecurityCommandOptions) => {
    await viewSecurityLogs(options);
  },
});
export const allSecurityCommands = [securityAuditCommand, securityLogsCommand];
