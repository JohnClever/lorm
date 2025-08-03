/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  monitoring: boolean;
  profiling: boolean;
  sampleRate?: number; // 0-1, for sampling profiling data
  maxOperations?: number; // Maximum operations to track
}

/**
 * Performance operation tracking
 */
export interface PerformanceOperation {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart: number;
  memoryEnd?: number;
  memoryDelta?: number;
  metadata?: Record<string, unknown>;
  children?: PerformanceOperation[];
  parent?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalDuration: number;
  memoryUsage: {
    start: number;
    end: number;
    peak: number;
    delta: number;
  };
  operationCount: number;
  averageOperationTime: number;
  slowestOperation?: PerformanceOperation;
  fastestOperation?: PerformanceOperation;
}

/**
 * Performance summary for CLI execution
 */
export interface PerformanceSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  operations: PerformanceOperation[];
  metrics: PerformanceMetrics;
  errors: Error[];
  warnings: string[];
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Performance profiler interface
 */
export interface IPerformanceProfiler {
  start(operationName: string, metadata?: Record<string, unknown>): void;
  end(operationName: string): void;
  recordError(error: Error): void;
  recordWarning(message: string): void;
  getMetrics(): PerformanceMetrics;
  generateSummary(): PerformanceSummary;
  reset(): void;
}

/**
 * Performance monitoring events
 */
export interface PerformanceEvents {
  operationStart: (operation: PerformanceOperation) => void;
  operationEnd: (operation: PerformanceOperation) => void;
  memoryThreshold: (usage: MemorySnapshot) => void;
  slowOperation: (operation: PerformanceOperation, threshold: number) => void;
}

/**
 * Performance thresholds for warnings
 */
export interface PerformanceThresholds {
  slowOperationMs: number;
  memoryUsageMB: number;
  totalDurationMs: number;
}