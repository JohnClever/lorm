import { randomUUID } from 'crypto';
import type {
  IPerformanceProfiler,
  PerformanceOperation,
  PerformanceMetrics,
  PerformanceSummary,
  MemorySnapshot,
  PerformanceThresholds
} from './types.js';

/**
 * Ephemeral performance monitor for CLI v2
 * Tracks performance during CLI execution without persistence
 */
export class CLIPerformanceMonitor implements IPerformanceProfiler {
  private sessionId: string;
  private startTime: number;
  private operations = new Map<string, PerformanceOperation>();
  private completedOperations: PerformanceOperation[] = [];
  private errors: Error[] = [];
  private warnings: string[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.sessionId = randomUUID();
    this.startTime = Date.now();
    this.thresholds = {
      slowOperationMs: 1000, // 1 second
      memoryUsageMB: 100, // 100MB
      totalDurationMs: 10000, // 10 seconds
      ...thresholds
    };

    // Take initial memory snapshot
    this.takeMemorySnapshot();
  }

  start(operationName: string, metadata?: Record<string, unknown>): void {
    const now = Date.now();
    const memoryUsage = process.memoryUsage();

    const operation: PerformanceOperation = {
      name: operationName,
      startTime: now,
      memoryStart: memoryUsage.heapUsed,
      ...(metadata && { metadata }),
      children: []
    };

    this.operations.set(operationName, operation);
    this.takeMemorySnapshot();
  }

  end(operationName: string): void {
    const operation = this.operations.get(operationName);
    if (!operation) {
      this.recordWarning(`Attempted to end unknown operation: ${operationName}`);
      return;
    }

    const now = Date.now();
    const memoryUsage = process.memoryUsage();

    operation.endTime = now;
    operation.duration = now - operation.startTime;
    operation.memoryEnd = memoryUsage.heapUsed;
    operation.memoryDelta = operation.memoryEnd - operation.memoryStart;

    // Check for slow operations
    if (operation.duration > this.thresholds.slowOperationMs) {
      this.recordWarning(
        `Slow operation detected: ${operationName} took ${operation.duration}ms`
      );
    }

    this.completedOperations.push(operation);
    this.operations.delete(operationName);
    this.takeMemorySnapshot();
  }

  recordError(error: Error): void {
    this.errors.push(error);
  }

  recordWarning(message: string): void {
    this.warnings.push(message);
  }

  getMetrics(): PerformanceMetrics {
    const allOperations = [...this.completedOperations];
    const totalDuration = Date.now() - this.startTime;
    
    if (allOperations.length === 0) {
      return {
        totalDuration,
        memoryUsage: this.getMemoryMetrics(),
        operationCount: 0,
        averageOperationTime: 0
      };
    }

    const durations = allOperations
      .filter(op => op.duration !== undefined)
      .map(op => op.duration!);
    
    const averageOperationTime = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    const slowestOperation = allOperations
      .filter(op => op.duration !== undefined)
      .reduce((slowest, current) => 
        !slowest || (current.duration! > slowest.duration!) ? current : slowest
      , undefined as PerformanceOperation | undefined);

    const fastestOperation = allOperations
      .filter(op => op.duration !== undefined)
      .reduce((fastest, current) => 
        !fastest || (current.duration! < fastest.duration!) ? current : fastest
      , undefined as PerformanceOperation | undefined);

    return {
      totalDuration,
      memoryUsage: this.getMemoryMetrics(),
      operationCount: allOperations.length,
      averageOperationTime,
      ...(slowestOperation && { slowestOperation }),
      ...(fastestOperation && { fastestOperation })
    };
  }

  generateSummary(): PerformanceSummary {
    const endTime = Date.now();
    const metrics = this.getMetrics();

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      totalDuration: endTime - this.startTime,
      operations: [...this.completedOperations],
      metrics,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  reset(): void {
    this.sessionId = randomUUID();
    this.startTime = Date.now();
    this.operations.clear();
    this.completedOperations = [];
    this.errors = [];
    this.warnings = [];
    this.memorySnapshots = [];
    this.takeMemorySnapshot();
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemorySnapshot {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };
  }

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Get active operations (still running)
   */
  getActiveOperations(): PerformanceOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get completed operations
   */
  getCompletedOperations(): PerformanceOperation[] {
    return [...this.completedOperations];
  }

  /**
   * Check if monitoring is healthy (no major issues)
   */
  isHealthy(): boolean {
    const metrics = this.getMetrics();
    const currentMemoryMB = metrics.memoryUsage.end / (1024 * 1024);
    
    return (
      this.errors.length === 0 &&
      metrics.totalDuration < this.thresholds.totalDurationMs &&
      currentMemoryMB < this.thresholds.memoryUsageMB
    );
  }

  /**
   * Take a memory snapshot
   */
  private takeMemorySnapshot(): void {
    const snapshot = this.getCurrentMemoryUsage();
    this.memorySnapshots.push(snapshot);

    // Check memory threshold
    const memoryMB = snapshot.heapUsed / (1024 * 1024);
    if (memoryMB > this.thresholds.memoryUsageMB) {
      this.recordWarning(
        `High memory usage detected: ${memoryMB.toFixed(2)}MB`
      );
    }

    // Keep only recent snapshots (last 100)
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }
  }

  /**
   * Calculate memory metrics from snapshots
   */
  private getMemoryMetrics() {
    if (this.memorySnapshots.length === 0) {
      const current = process.memoryUsage().heapUsed;
      return {
        start: current,
        end: current,
        peak: current,
        delta: 0
      };
    }

    const start = this.memorySnapshots[0]?.heapUsed ?? 0;
    const end = this.memorySnapshots[this.memorySnapshots.length - 1]?.heapUsed ?? 0;
    const peak = Math.max(...this.memorySnapshots.map(s => s.heapUsed));
    const delta = end - start;

    return { start, end, peak, delta };
  }
}