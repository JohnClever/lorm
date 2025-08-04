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

/**
 * Operation context for enhanced tracking
 */
export interface OperationContext {
  command?: string;
  plugin?: string;
  user?: string;
  project?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Performance session with enhanced context
 */
export interface PerformanceSession {
  id: string;
  startTime: number;
  endTime?: number;
  context: OperationContext;
  operations: PerformanceOperation[];
  metrics: PerformanceMetrics;
}

/**
 * Trend data for analytics
 */
export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'degrading' | 'stable';
}

/**
 * Performance trends analysis
 */
export interface PerformanceTrends {
  averageExecutionTime: TrendData;
  memoryUsage: TrendData;
  operationCounts: TrendData;
  errorRates: TrendData;
}

/**
 * Performance comparison between sessions
 */
export interface PerformanceComparison {
  baseline: PerformanceSummary;
  current: PerformanceSummary;
  improvements: string[];
  regressions: string[];
  overallScore: number;
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  category: 'memory' | 'speed' | 'efficiency';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  estimatedImpact: string;
}

/**
 * Performance issue
 */
export interface PerformanceIssue {
  type: 'warning' | 'error' | 'critical';
  message: string;
  operation?: string;
  timestamp?: number;
}

/**
 * Performance health status
 */
export interface PerformanceHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  issues: PerformanceIssue[];
  recommendations: string[];
}

/**
 * Comprehensive performance report
 */
export interface PerformanceReport {
  summary: PerformanceSummary;
  trends: PerformanceTrends;
  comparisons: PerformanceComparison[];
  suggestions: OptimizationSuggestion[];
  health: PerformanceHealth;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  includeTrends?: boolean;
  includeOptimizations?: boolean;
  historyLimit?: number;
  timeframe?: 'day' | 'week' | 'month';
}

/**
 * Performance configuration for manager
 */
export interface PerformanceConfiguration {
  thresholds: PerformanceThresholds;
  storage: {
    enabled: boolean;
    maxSessions: number;
    retentionDays: number;
  };
  analytics: {
    enabled: boolean;
    trendAnalysis: boolean;
    optimizationSuggestions: boolean;
  };
}

/**
 * Bottleneck analysis
 */
export interface Bottleneck {
  operation: string;
  averageDuration: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  suggestions: string[];
}

/**
 * Real-time metrics
 */
export interface RealtimeMetrics {
  activeOperations: number;
  memoryUsage: MemorySnapshot;
  operationsPerSecond: number;
  averageResponseTime: number;
}

/**
 * Performance event callback
 */
export type PerformanceEventCallback = (event: {
  type: 'operation_start' | 'operation_end' | 'threshold_exceeded' | 'anomaly_detected';
  data: unknown;
  timestamp: number;
}) => void;

/**
 * Performance anomaly
 */
export interface PerformanceAnomaly {
  type: 'memory_spike' | 'slow_operation' | 'error_burst';
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
  affectedOperations: string[];
}

/**
 * Prediction result
 */
export interface PredictionResult {
  type: 'memory_exhaustion' | 'performance_degradation' | 'error_increase';
  probability: number; // 0-1
  timeframe: string;
  recommendation: string;
}

/**
 * Performance insight
 */
export interface PerformanceInsight {
  category: 'optimization' | 'warning' | 'trend';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
}

/**
 * Architectural recommendation
 */
export interface ArchitecturalRecommendation {
  area: 'caching' | 'concurrency' | 'memory_management' | 'algorithm';
  current: string;
  recommended: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
}

/**
 * Performance data aggregate
 */
export interface PerformanceData {
  sessions: PerformanceSummary[];
  trends: PerformanceTrends;
  bottlenecks: Bottleneck[];
  insights: PerformanceInsight[];
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  suggestion: OptimizationSuggestion;
  applied: boolean;
  result?: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
    improvement: number;
  };
  error?: string;
}

/**
 * Auto-optimization result
 */
export interface AutoOptimizationResult {
  optimizations: OptimizationResult[];
  totalImprovements: number;
  summary: string;
}