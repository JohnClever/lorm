import { cliPerformanceService } from '../services/performance.js';
import type { IPerformanceProfiler, PerformanceMetrics, PerformanceSummary } from '@lorm/core';

/**
 * Performance Monitor Adapter
 * Bridges the legacy IPerformanceProfiler interface with CLIPerformanceService
 */
export class PerformanceMonitorAdapter implements IPerformanceProfiler {
  /**
   * Start tracking an operation
   */
  start(operationName: string, metadata?: Record<string, unknown>): void {
    cliPerformanceService.startOperation(operationName, metadata);
  }

  /**
   * End tracking an operation
   */
  end(operationName: string): void {
    cliPerformanceService.endOperation(operationName);
  }

  /**
   * Record an error
   */
  recordError(error: Error): void {
    cliPerformanceService.recordError(error);
  }

  /**
   * Record a warning
   */
  recordWarning(message: string): void {
    cliPerformanceService.recordWarning(message);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const session = cliPerformanceService.getCurrentSession();
    
    // Return real metrics from the performance service
    return {
      totalDuration: session ? Date.now() - session.startTime : 0,
      memoryUsage: {
        start: process.memoryUsage().heapUsed,
        end: process.memoryUsage().heapUsed,
        peak: process.memoryUsage().heapTotal,
        delta: 0
      },
      operationCount: 0, // This would need to be tracked by the service
      averageOperationTime: 0
    };
  }

  /**
   * Generate performance summary
   */
  generateSummary(): PerformanceSummary {
    const session = cliPerformanceService.getCurrentSession();
    const metrics = this.getMetrics();
    
    return {
      sessionId: session?.id || 'unknown',
      startTime: session?.startTime || Date.now(),
      endTime: Date.now(),
      totalDuration: metrics.totalDuration,
      operations: [], // Operations would be tracked by the service
      metrics,
      errors: [],
      warnings: []
    };
  }

  /**
   * Reset performance tracking
   */
  reset(): void {
    // The CLIPerformanceService handles session management
    // This is a no-op for backward compatibility
  }
}

/**
 * Create a performance monitor adapter instance
 */
export function createPerformanceMonitor(): IPerformanceProfiler {
  return new PerformanceMonitorAdapter();
}