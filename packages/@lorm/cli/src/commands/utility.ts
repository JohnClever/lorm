import chalk from "chalk";
import {
  createCommand,
  HealthChecker,
  LegacyPerformanceMonitor,
  initializeCommand,
} from "@/utils";
import type { CommonCommandOptions } from "@/types";
interface UtilityCommandOptions extends CommonCommandOptions {
  clear?: boolean;
  export?: string;
  system?: boolean;
  json?: boolean;
}
async function showPerformanceMetrics(
  options: UtilityCommandOptions
): Promise<void> {
  const { clear, export: exportFile, verbose } = options;
  console.log(chalk.blue("📊 Performance Metrics"));
  try {
    const performanceMonitor = new LegacyPerformanceMonitor();
    if (clear) {
      performanceMonitor.clearMetrics();
      console.log(chalk.green("✅ Performance history cleared"));
      return;
    }
    const report = performanceMonitor.generateReport();
    if (exportFile) {
      console.log(chalk.green(`✅ Metrics exported to ${exportFile}`));
      return;
    }
    performanceMonitor.displayReport();
  } catch (error) {
    console.error(chalk.red("❌ Failed to get performance metrics:"), error);
    process.exit(1);
  }
}
async function runHealthCheck(options: UtilityCommandOptions): Promise<void> {
  const { system, json, verbose } = options;
  console.log(chalk.blue("🏥 Running Health Checks"));
  try {
    const healthChecker = new HealthChecker();
    if (system) {
      const systemInfo = await healthChecker.getSystemInfo();
      healthChecker.displaySystemInfo(systemInfo);
    }
    const results = await healthChecker.runAllChecks();
    if (json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    healthChecker.displayResults(results);
    const hasFailures = results.some((r) => r.status === "fail");
    if (hasFailures) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("❌ Health check failed:"), error);
    process.exit(1);
  }
}
export const perfCommand = createCommand({
  name: "perf",
  description: "Show performance metrics and diagnostics",
  category: "utility",
  requiresConfig: false,
  options: [
    { flag: "--clear", description: "Clear performance history" },
    { flag: "--export <file>", description: "Export metrics to file" },
    { flag: "--verbose", description: "Show detailed metrics" },
  ],
  examples: [
    "npx @lorm/cli perf",
    "npx @lorm/cli perf --clear",
    "npx @lorm/cli perf --export metrics.json",
    "npx @lorm/cli perf --verbose",
  ],
  action: async (options: UtilityCommandOptions) => {
    await showPerformanceMetrics(options);
  },
});
export const healthCommand = createCommand({
  name: "health",
  description: "Run health checks and system diagnostics",
  category: "utility",
  aliases: ["doctor"],
  requiresConfig: false,
  options: [
    { flag: "--system", description: "Show system information" },
    { flag: "--json", description: "Output results in JSON format" },
    { flag: "--verbose", description: "Show detailed check information" },
  ],
  examples: [
    "npx @lorm/cli health",
    "npx @lorm/cli doctor",
    "npx @lorm/cli health --system",
    "npx @lorm/cli health --json",
    "npx @lorm/cli health --verbose",
  ],
  action: async (options: UtilityCommandOptions) => {
    await runHealthCheck(options);
  },
});
export const doctorCommand = createCommand({
  name: "doctor",
  description: "Alias for health command - run comprehensive diagnostics",
  category: "utility",
  requiresConfig: false,
  action: async (options: UtilityCommandOptions) => {
    await runHealthCheck(options);
  },
});
export const allUtilityCommands = [perfCommand, healthCommand, doctorCommand];
