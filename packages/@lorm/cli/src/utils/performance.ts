import chalk from "chalk";
import { join } from "path";
import { performance } from "perf_hooks";
import { FileUtils } from "./file-utils";

export interface PerformanceMetric {
  command: string;
  duration: number;
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  options?: Record<string, any>;
  cacheStats?: {
    hits: number;
    misses: number;
    size: number;
  };
  moduleLoadTimes?: Record<string, number>;
  errorCount?: number;
  success: boolean;
}

export interface PerformanceReport {
  totalCommands: number;
  averageDuration: number;
  slowestCommand: PerformanceMetric | null;
  fastestCommand: PerformanceMetric | null;
  memoryTrends: {
    averageHeapUsed: number;
    peakHeapUsed: number;
  };
}

export class PerformanceMonitor {
  private metricsFile: string;
  private maxMetrics = 1000;

  constructor() {
    const lormDir = join(process.cwd(), ".lorm");
    if (!FileUtils.exists(lormDir)) {
      FileUtils.ensureDirSync(lormDir);
    }
    this.metricsFile = join(lormDir, "performance-metrics.json");
  }

  startTracking(command: string): PerformanceTracker {
    return new PerformanceTracker(command, this);
  }

  recordMetric(metric: PerformanceMetric): void {
    try {
      const metrics = this.loadMetrics();
      metrics.push(metric);

      if (metrics.length > this.maxMetrics) {
        metrics.splice(0, metrics.length - this.maxMetrics);
      }

      this.saveMetrics(metrics);
    } catch (error) {}
  }

  generateReport(): PerformanceReport {
    const metrics = this.loadMetrics();

    if (metrics.length === 0) {
      return {
        totalCommands: 0,
        averageDuration: 0,
        slowestCommand: null,
        fastestCommand: null,
        memoryTrends: {
          averageHeapUsed: 0,
          peakHeapUsed: 0,
        },
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / metrics.length;

    const slowestCommand = metrics.reduce((slowest, current) =>
      current.duration > slowest.duration ? current : slowest
    );

    const fastestCommand = metrics.reduce((fastest, current) =>
      current.duration < fastest.duration ? current : fastest
    );

    const totalHeapUsed = metrics.reduce(
      (sum, m) => sum + m.memoryUsage.heapUsed,
      0
    );
    const averageHeapUsed = totalHeapUsed / metrics.length;
    const peakHeapUsed = Math.max(
      ...metrics.map((m) => m.memoryUsage.heapUsed)
    );

    return {
      totalCommands: metrics.length,
      averageDuration,
      slowestCommand,
      fastestCommand,
      memoryTrends: {
        averageHeapUsed,
        peakHeapUsed,
      },
    };
  }

  displayReport(): void {
    const report = this.generateReport();

    if (report.totalCommands === 0) {
      console.log(chalk.yellow("No performance data available."));
      return;
    }

    console.log(chalk.blue("\n📊 Performance Report"));
    console.log(chalk.gray("─".repeat(50)));

    console.log(
      `Total commands executed: ${chalk.green(report.totalCommands)}`
    );
    console.log(
      `Average duration: ${chalk.cyan(report.averageDuration.toFixed(2))}ms`
    );

    if (report.slowestCommand) {
      console.log(
        `Slowest command: ${chalk.red(
          report.slowestCommand.command
        )} (${report.slowestCommand.duration.toFixed(2)}ms)`
      );
    }

    if (report.fastestCommand) {
      console.log(
        `Fastest command: ${chalk.green(
          report.fastestCommand.command
        )} (${report.fastestCommand.duration.toFixed(2)}ms)`
      );
    }

    console.log(
      `Average memory usage: ${chalk.cyan(
        (report.memoryTrends.averageHeapUsed / 1024 / 1024).toFixed(2)
      )}MB`
    );
    console.log(
      `Peak memory usage: ${chalk.yellow(
        (report.memoryTrends.peakHeapUsed / 1024 / 1024).toFixed(2)
      )}MB`
    );

    console.log(chalk.gray("─".repeat(50)));
  }

  clearMetrics(): void {
    try {
      this.saveMetrics([]);
    } catch (error) {}
  }

  private loadMetrics(): PerformanceMetric[] {
    try {
      if (!FileUtils.exists(this.metricsFile)) {
        return [];
      }
      return FileUtils.readJsonSync<PerformanceMetric[]>(this.metricsFile);
    } catch (error) {
      return [];
    }
  }

  private saveMetrics(metrics: PerformanceMetric[]): void {
    FileUtils.writeJsonSync(this.metricsFile, metrics);
  }
}

export class PerformanceTracker {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private moduleLoadTimes: Record<string, number> = {};
  private errorCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private command: string, private monitor: PerformanceMonitor) {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }

  trackModuleLoad(moduleName: string, loadTime: number): void {
    this.moduleLoadTimes[moduleName] = loadTime;
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  recordError(): void {
    this.errorCount++;
  }

  end(options?: Record<string, any>, success: boolean = true): void {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const metric: PerformanceMetric = {
      command: this.command,
      duration: endTime - this.startTime,
      timestamp: Date.now(),
      memoryUsage: endMemory,
      options: options ? this.sanitizeOptions(options) : undefined,
      cacheStats: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        size: this.cacheHits + this.cacheMisses,
      },
      moduleLoadTimes:
        Object.keys(this.moduleLoadTimes).length > 0
          ? this.moduleLoadTimes
          : undefined,
      errorCount: this.errorCount,
      success,
    };

    this.monitor.recordMetric(metric);
  }

  private sanitizeOptions(options: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(options)) {
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("token")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
