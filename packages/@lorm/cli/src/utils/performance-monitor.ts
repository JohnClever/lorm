import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { 
  IPerformanceTracker, 
  PerformanceMetric, 
  LegacyPerformanceMetric, 
  PerformanceStats, 
  PerformanceReport, 
  PerformanceConfig 
} from '../types.js';

export type { 
  IPerformanceTracker, 
  PerformanceMetric, 
  LegacyPerformanceMetric, 
  PerformanceStats, 
  PerformanceReport, 
  PerformanceConfig 
};
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private logPath: string;
  private sessionId: string;
  private startCpuUsage: NodeJS.CpuUsage;
  constructor(config: PerformanceConfig) {
    this.config = config;
    this.logPath = path.resolve(config.logPath);
    this.sessionId = this.generateSessionId();
    this.startCpuUsage = process.cpuUsage();
    this.ensureLogDirectory();
    this.cleanupOldLogs();
  }
  startCommand(command: string, args: string[]): IPerformanceTracker {
    if (!this.config.enabled) {
      return new NoOpTracker();
    }
    return new PerformanceTracker({
      command,
      args,
      sessionId: this.sessionId,
      monitor: this
    });
  }
  async logMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    try {
      const logLine = JSON.stringify(metric) + '\n';
      await fs.promises.appendFile(this.logPath, logLine, 'utf8');
      await this.rotateLogIfNeeded();
      this.checkPerformanceWarnings(metric);
    } catch (error) {
      console.warn('Failed to log performance metric:', error);
    }
  }
  async getStats(timeRange?: { start: Date; end: Date }): Promise<PerformanceStats> {
    const metrics = await this.getMetrics(timeRange);
    if (metrics.length === 0) {
      return this.getEmptyStats();
    }
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulCommands = metrics.filter(m => m.success);
    const failedCommands = metrics.filter(m => !m.success);
    const commandFrequency: Record<string, number> = {};
    metrics.forEach(metric => {
      commandFrequency[metric.command] = (commandFrequency[metric.command] || 0) + 1;
    });
    const memoryUsages = metrics.map(m => m.memoryUsage.heapUsed);
    const memoryTrend = this.calculateMemoryTrend(memoryUsages);
    return {
      totalCommands: metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      slowestCommand: metrics.reduce((prev, current) => 
        (prev.duration > current.duration) ? prev : current
      ),
      fastestCommand: metrics.reduce((prev, current) => 
        (prev.duration < current.duration) ? prev : current
      ),
      memoryTrend,
      commandFrequency,
      errorRate: failedCommands.length / metrics.length
    };
  }
  async getSlowCommands(limit: number = 10): Promise<PerformanceMetric[]> {
    const metrics = await this.getMetrics();
    return metrics
      .filter(m => m.duration > this.config.slowCommandThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }
  async getMemoryTrend(timeRange?: { start: Date; end: Date }): Promise<{
    timestamps: string[];
    heapUsed: number[];
    heapTotal: number[];
    rss: number[];
  }> {
    const metrics = await this.getMetrics(timeRange);
    return {
      timestamps: metrics.map(m => m.timestamp),
      heapUsed: metrics.map(m => m.memoryUsage.heapUsed),
      heapTotal: metrics.map(m => m.memoryUsage.heapTotal),
      rss: metrics.map(m => m.memoryUsage.rss)
    };
  }
  async clearLogs(): Promise<void> {
    try {
      if (fs.existsSync(this.logPath)) {
        await fs.promises.unlink(this.logPath);
      }
    } catch (error) {
      console.warn('Failed to clear performance logs:', error);
    }
  }
  private async getMetrics(timeRange?: { start: Date; end: Date }): Promise<PerformanceMetric[]> {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }
      const content = await fs.promises.readFile(this.logPath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      let metrics = lines.map(line => JSON.parse(line) as PerformanceMetric);
      if (timeRange) {
        metrics = metrics.filter(metric => {
          const timestamp = new Date(metric.timestamp);
          return timestamp >= timeRange.start && timestamp <= timeRange.end;
        });
      }
      return metrics.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.warn('Failed to read performance metrics:', error);
      return [];
    }
  }
  private calculateMemoryTrend(memoryUsages: number[]): {
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (memoryUsages.length === 0) {
      return { average: 0, peak: 0, trend: 'stable' };
    }
    const average = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const peak = Math.max(...memoryUsages);
    const trend = this.calculateTrend(memoryUsages);
    return { average, peak, trend };
  }
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) {
      return 'stable';
    }
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = values.reduce((sum, _, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    if (Math.abs(slope) < 0.01) {
      return 'stable';
    }
    return slope > 0 ? 'increasing' : 'decreasing';
  }
  private checkPerformanceWarnings(metric: PerformanceMetric): void {
    if (metric.duration > this.config.slowCommandThreshold) {
      console.warn(`⚠️  Slow command detected: ${metric.command} took ${metric.duration}ms`);
    }
    if (metric.memoryUsage.heapUsed > this.config.memoryWarningThreshold) {
      const memoryMB = Math.round(metric.memoryUsage.heapUsed / 1024 / 1024);
      console.warn(`⚠️  High memory usage: ${memoryMB}MB heap used`);
    }
  }
  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const stats = await fs.promises.stat(this.logPath);
      if (stats.size > this.config.maxLogSize) {
        const backupPath = `${this.logPath}.${Date.now()}.bak`;
        await fs.promises.rename(this.logPath, backupPath);
      }
    } catch (error) {
    }
  }
  private async cleanupOldLogs(): Promise<void> {
    try {
      const logDir = path.dirname(this.logPath);
      const files = await fs.promises.readdir(logDir);
      const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      for (const file of files) {
        if (file.endsWith('.bak')) {
          const filePath = path.join(logDir, file);
          const stats = await fs.promises.stat(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.promises.unlink(filePath);
          }
        }
      }
    } catch (error) {
    }
  }
  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  private getEmptyStats(): PerformanceStats {
    return {
      totalCommands: 0,
      averageDuration: 0,
      medianDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      slowestCommand: null,
      fastestCommand: null,
      memoryTrend: { average: 0, peak: 0, trend: 'stable' },
      commandFrequency: {},
      errorRate: 0
    };
  }
}
export class PerformanceTracker implements IPerformanceTracker {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private startCpu: NodeJS.CpuUsage;
  private command: string;
  private args: string[];
  private sessionId: string;
  private monitor: PerformanceMonitor;
  constructor(options: {
    command: string;
    args: string[];
    sessionId: string;
    monitor: PerformanceMonitor;
  }) {
    this.command = options.command;
    this.args = options.args;
    this.sessionId = options.sessionId;
    this.monitor = options.monitor;
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.startCpu = process.cpuUsage();
  }
  async end(success: boolean = true, errorType?: string): Promise<void> {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(this.startCpu);
    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      command: this.command,
      args: this.args,
      duration: endTime - this.startTime,
      memoryUsage: {
        rss: endMemory.rss,
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external
      },
      cpuUsage: {
        user: endCpu.user / 1000,
        system: endCpu.system / 1000
      },
      sessionId: this.sessionId,
      success,
      errorType
    };
    await this.monitor.logMetric(metric);
  }
}
class NoOpTracker implements IPerformanceTracker {
  async end(): Promise<void> {
  }
}
export class PerformanceUtils {
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
  static formatMemory(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
  static getSystemInfo(): {
    platform: string;
    arch: string;
    nodeVersion: string;
    memoryTotal: number;
    cpuCount: number;
  } {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memoryTotal: os.totalmem(),
      cpuCount: os.cpus().length
    };
  }
}
export class LegacyPerformanceMonitor {
  private metricsFile: string;
  private maxMetrics = 1000;
  constructor() {
    const lormDir = path.join(process.cwd(), ".lorm");
    if (!fs.existsSync(lormDir)) {
      fs.mkdirSync(lormDir, { recursive: true });
    }
    this.metricsFile = path.join(lormDir, "performance-metrics.json");
  }
  startTracking(command: string): LegacyPerformanceTracker {
    return new LegacyPerformanceTracker(command, this);
  }
  recordMetric(metric: LegacyPerformanceMetric): void {
    try {
      const metrics = this.loadMetrics();
      metrics.push(metric);
      if (metrics.length > this.maxMetrics) {
        metrics.splice(0, metrics.length - this.maxMetrics);
      }
      this.saveMetrics(metrics);
    } catch (error) {
    }
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
          peakHeapUsed: 0
        }
      };
    }
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / metrics.length;
    const sortedByDuration = [...metrics].sort((a, b) => a.duration - b.duration);
    const slowestCommand = sortedByDuration[sortedByDuration.length - 1];
    const fastestCommand = sortedByDuration[0];
    const heapUsages = metrics.map(m => m.memoryUsage.heapUsed);
    const averageHeapUsed = heapUsages.reduce((sum, h) => sum + h, 0) / heapUsages.length;
    const peakHeapUsed = Math.max(...heapUsages);
    return {
      totalCommands: metrics.length,
      averageDuration,
      slowestCommand,
      fastestCommand,
      memoryTrends: {
        averageHeapUsed,
        peakHeapUsed
      }
    };
  }
  displayReport(): void {
    const report = this.generateReport();
    if (report.totalCommands === 0) {
      console.log('No performance data available.');
      return;
    }
    console.log('\n📊 Performance Report:');
    console.log(`Total Commands: ${report.totalCommands}`);
    console.log(`Average Duration: ${PerformanceUtils.formatDuration(report.averageDuration)}`);
    if (report.slowestCommand) {
      console.log(`Slowest Command: ${report.slowestCommand.command} (${PerformanceUtils.formatDuration(report.slowestCommand.duration)})`);
    }
    if (report.fastestCommand) {
      console.log(`Fastest Command: ${report.fastestCommand.command} (${PerformanceUtils.formatDuration(report.fastestCommand.duration)})`);
    }
    console.log(`Average Memory: ${PerformanceUtils.formatMemory(report.memoryTrends.averageHeapUsed)}`);
    console.log(`Peak Memory: ${PerformanceUtils.formatMemory(report.memoryTrends.peakHeapUsed)}`);
  }
  clearMetrics(): void {
    this.saveMetrics([]);
  }
  private loadMetrics(): LegacyPerformanceMetric[] {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readFileSync(this.metricsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
    }
    return [];
  }
  private saveMetrics(metrics: LegacyPerformanceMetric[]): void {
    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
  }
}
export class LegacyPerformanceTracker {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private moduleLoadTimes: Record<string, number> = {};
  private errorCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  constructor(private command: string, private monitor: LegacyPerformanceMonitor) {
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
  end(options?: Record<string, string | number | boolean>, success: boolean = true): void {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const metric: LegacyPerformanceMetric = {
      command: this.command,
      duration,
      timestamp: new Date().toISOString(),
      memoryUsage,
      options: options ? this.sanitizeOptions(options) : undefined,
      cacheStats: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        size: this.cacheHits + this.cacheMisses
      },
      moduleLoadTimes: this.moduleLoadTimes,
      errorCount: this.errorCount,
      success,
      args: options ? Object.keys(options) : [],
      cpuUsage,
      sessionId: process.pid.toString(),
      severity: duration > 5000 ? 'high' : duration > 1000 ? 'medium' : 'low'
    };
    this.monitor.recordMetric(metric);
  }
  private sanitizeOptions(options: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(options)) {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}