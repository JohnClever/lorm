import { createSimplePlugin, SimplePlugin, SimplePluginBuilder } from "@lorm/core";
import chalk from "chalk";
import {
  HealthChecker,
  LegacyPerformanceMonitor,
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

export const createUtilityPlugins = async (): Promise<SimplePlugin[]> => {
  const perfPlugin = new SimplePluginBuilder("utility-perf", "1.0.0")
    .description("Performance metrics plugin")
    .addCommand({
      name: "perf",
      description: "Show performance metrics and diagnostics",
      options: [
        { flag: "--clear", description: "Clear performance history" },
        { flag: "--export <file>", description: "Export metrics to file" },
        { flag: "--verbose", description: "Show detailed metrics" },
      ],
      action: async (args: Record<string, unknown>) => {
        await showPerformanceMetrics(args as UtilityCommandOptions);
      },
    })
    .build();

  const healthPlugin = new SimplePluginBuilder("utility-health", "1.0.0")
    .description("Health check plugin")
    .addCommand({
      name: "health",
      description: "Run health checks and system diagnostics",
      options: [
        { flag: "--system", description: "Show system information" },
        { flag: "--json", description: "Output results in JSON format" },
        { flag: "--verbose", description: "Show detailed check information" },
      ],
      action: async (args: Record<string, unknown>) => {
        await runHealthCheck(args as UtilityCommandOptions);
      },
    })
    .addCommand({
      name: "doctor",
      description: "Alias for health command - run comprehensive diagnostics",
      options: [
        { flag: "--system", description: "Show system information" },
        { flag: "--json", description: "Output results in JSON format" },
        { flag: "--verbose", description: "Show detailed check information" },
      ],
      action: async (args: Record<string, unknown>) => {
        await runHealthCheck(args as UtilityCommandOptions);
      },
    })
    .build();

  return [perfPlugin, healthPlugin];
};