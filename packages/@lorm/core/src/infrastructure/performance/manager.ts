import { randomUUID } from 'crypto';
import { CLIPerformanceMonitor } from './monitor.js';
import { PerformanceAnalytics } from './analytics.js';
import { PerformanceStorage } from './storage.js';
import type {
  PerformanceSummary,
  PerformanceSession,
  OperationContext,
  PerformanceReport,
  PerformanceTrends,
  PerformanceHealth,
  PerformanceConfiguration,
  PerformanceThresholds,
  ReportOptions,
  OptimizationSuggestion,
  PerformanceOperation,
  PerformanceMetrics,
  PerformanceIssue
} from './types.js';

/**
 * Centralized performance management singleton
 * Orchestrates all performance monitoring, analytics, and storage
 */
export class PerformanceManager {
  private static instance: PerformanceManager | null = null;
  private monitor: CLIPerformanceMonitor;
  private analytics: PerformanceAnalytics;
  private storage: PerformanceStorage;
  private currentSession: PerformanceSession | null = null;
  private config: PerformanceConfiguration;

  private constructor() {
    this.config = this.getDefaultConfiguration();
    this.monitor = new CLIPerformanceMonitor();
    this.analytics = new PerformanceAnalytics();
    this.storage = new PerformanceStorage(this.config.storage);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    PerformanceManager.instance = null;
  }

  /**
   * Start a new performance session
   */
  startSession(sessionId?: string, context?: OperationContext): void {
    const id = sessionId || randomUUID();
    
    // End current session if one exists
    if (this.currentSession) {
      this.endSession();
    }

    this.currentSession = {
      id,
      startTime: Date.now(),
      context: context || {},
      operations: [],
      metrics: this.monitor.getMetrics()
    };
    
    this.monitor.reset();
    
    // Log session start in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 Performance session started: ${id}`);
    }
  }

  /**
   * End the current performance session
   */
  endSession(): PerformanceSummary {
    if (!this.currentSession) {
      throw new Error('No active session to end');
    }

    const summary = this.monitor.generateSummary();
    this.currentSession.endTime = Date.now();
    this.currentSession.operations = summary.operations;
    this.currentSession.metrics = summary.metrics;

    // Save session asynchronously if storage is enabled
    if (this.config.storage.enabled) {
      this.storage.saveSession(summary).catch(error => {
        console.warn('Failed to save performance session:', error);
      });
    }

    // Log session end in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Performance session ended: ${this.currentSession.id} (${summary.totalDuration}ms)`);
    }

    const result = summary;
    this.currentSession = null;
    return result;
  }

  /**
   * Get current active session
   */
  getCurrentSession(): PerformanceSession | null {
    return this.currentSession;
  }

  /**
   * Start tracking an operation
   */
  startOperation(name: string, context?: OperationContext): void {
    this.monitor.start(name, context);
  }

  /**
   * End tracking an operation
   */
  endOperation(name: string): void {
    this.monitor.end(name);
  }

  /**
   * Track an operation with automatic timing
   */
  async trackOperation<T>(
    name: string,
    fn: () => Promise<T>,
    context?: OperationContext
  ): Promise<T> {
    this.monitor.start(name, context);
    try {
      const result = await fn();
      this.monitor.end(name);
      return result;
    } catch (error) {
      this.monitor.recordError(error instanceof Error ? error : new Error(String(error)));
      this.monitor.end(name);
      throw error;
    }
  }

  /**
   * Track a synchronous operation
   */
  trackOperationSync<T>(
    name: string,
    fn: () => T,
    context?: OperationContext
  ): T {
    this.monitor.start(name, context);
    try {
      const result = fn();
      this.monitor.end(name);
      return result;
    } catch (error) {
      this.monitor.recordError(error instanceof Error ? error : new Error(String(error)));
      this.monitor.end(name);
      throw error;
    }
  }

  /**
   * Record an error
   */
  recordError(error: Error): void {
    this.monitor.recordError(error);
  }

  /**
   * Record a warning
   */
  recordWarning(message: string): void {
    this.monitor.recordWarning(message);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.monitor.getMetrics();
  }

  /**
   * Get active operations
   */
  getActiveOperations(): PerformanceOperation[] {
    const summary = this.monitor.generateSummary();
    return summary.operations.filter(op => !op.endTime);
  }

  /**
   * Generate comprehensive performance report
   */
  async getPerformanceReport(options?: ReportOptions): Promise<PerformanceReport> {
    const currentSummary = this.monitor.generateSummary();
    
    // Load historical sessions if storage is enabled
    let historicalSessions: PerformanceSummary[] = [];
    if (this.config.storage.enabled) {
      try {
        historicalSessions = await this.storage.loadSessions(options?.historyLimit || 10);
      } catch (error) {
        console.warn('Failed to load historical sessions:', error);
      }
    }

    const allSessions = [currentSummary, ...historicalSessions];
    
    // Generate analytics if enabled
    let trends: PerformanceTrends;
    let suggestions: OptimizationSuggestion[] = [];
    
    if (this.config.analytics.enabled) {
      trends = this.config.analytics.trendAnalysis 
        ? this.analytics.analyzeTrends(allSessions)
        : this.getEmptyTrends();
        
      suggestions = this.config.analytics.optimizationSuggestions
        ? this.analytics.generateOptimizations(allSessions)
        : [];
    } else {
      trends = this.getEmptyTrends();
    }

    const health = this.getHealthStatus();
    const comparisons = historicalSessions.length > 0 
      ? [this.analytics.comparePerformance(currentSummary, historicalSessions[0])]
      : [];

    return {
      summary: currentSummary,
      trends,
      comparisons,
      suggestions,
      health
    };
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(): Promise<PerformanceTrends> {
    if (!this.config.analytics.enabled || !this.config.analytics.trendAnalysis) {
      return this.getEmptyTrends();
    }

    const currentSummary = this.monitor.generateSummary();
    const historicalSessions = this.config.storage.enabled
      ? await this.storage.loadSessions(10)
      : [];

    return this.analytics.analyzeTrends([currentSummary, ...historicalSessions]);
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    if (!this.config.analytics.enabled || !this.config.analytics.optimizationSuggestions) {
      return [];
    }

    const currentSummary = this.monitor.generateSummary();
    const historicalSessions = this.config.storage.enabled
      ? await this.storage.loadSessions(5)
      : [];

    return this.analytics.generateOptimizations([currentSummary, ...historicalSessions]);
  }

  /**
   * Check if performance is healthy
   */
  isHealthy(): boolean {
    return this.monitor.isHealthy();
  }

  /**
   * Get detailed health status
   */
  getHealthStatus(): PerformanceHealth {
    const summary = this.monitor.generateSummary();
    const score = this.analytics.calculateHealthScore(summary);
    
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    const issues: PerformanceIssue[] = [
      ...summary.warnings.map(warning => ({
        type: 'warning' as const,
        message: warning,
        timestamp: Date.now()
      })),
      ...summary.errors.map(error => ({
        type: 'error' as const,
        message: error.message,
        timestamp: Date.now()
      }))
    ];

    // Add critical issues based on thresholds
    if (summary.totalDuration > this.config.thresholds.totalDurationMs) {
      issues.push({
        type: 'critical',
        message: `Total execution time (${summary.totalDuration}ms) exceeds threshold (${this.config.thresholds.totalDurationMs}ms)`,
        timestamp: Date.now()
      });
    }

    if (summary.metrics.memoryUsage.peak > this.config.thresholds.memoryUsageMB * 1024 * 1024) {
      issues.push({
        type: 'critical',
        message: `Peak memory usage exceeds threshold`,
        timestamp: Date.now()
      });
    }

    const recommendations = this.generateHealthRecommendations(summary, issues);

    return {
      status,
      score,
      issues,
      recommendations
    };
  }

  /**
   * Load session history
   */
  async loadSessionHistory(limit?: number): Promise<PerformanceSummary[]> {
    if (!this.config.storage.enabled) {
      return [];
    }
    return this.storage.loadSessions(limit);
  }

  /**
   * Clear performance history
   */
  async clearHistory(): Promise<void> {
    if (!this.config.storage.enabled) {
      return;
    }
    await this.storage.clearSessions();
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<PerformanceConfiguration>): void {
    this.config = { ...this.config, ...config };
    
    // Update storage configuration
    if (config.storage) {
      this.storage.updateConfig(config.storage);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): PerformanceConfiguration {
    return { ...this.config };
  }

  /**
   * Reset performance monitor
   */
  reset(): void {
    this.monitor.reset();
    this.currentSession = null;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    if (!this.config.storage.enabled) {
      return null;
    }
    return this.storage.getStorageStats();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): PerformanceConfiguration {
    return {
      thresholds: {
        slowOperationMs: 1000,
        memoryUsageMB: 512,
        totalDurationMs: 10000
      },
      storage: {
        enabled: true,
        maxSessions: 100,
        retentionDays: 30
      },
      analytics: {
        enabled: true,
        trendAnalysis: true,
        optimizationSuggestions: true
      }
    };
  }

  /**
   * Get empty trends structure
   */
  private getEmptyTrends(): PerformanceTrends {
    const emptyTrend = {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: 'stable' as const
    };

    return {
      averageExecutionTime: emptyTrend,
      memoryUsage: emptyTrend,
      operationCounts: emptyTrend,
      errorRates: emptyTrend
    };
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    summary: PerformanceSummary,
    issues: PerformanceIssue[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.errors.length > 0) {
      recommendations.push('Investigate and resolve errors to improve stability');
    }

    if (summary.warnings.length > 0) {
      recommendations.push('Address performance warnings to prevent future issues');
    }

    const slowOperations = summary.operations.filter(
      op => op.duration && op.duration > this.config.thresholds.slowOperationMs
    );
    
    if (slowOperations.length > 0) {
      recommendations.push(`Optimize ${slowOperations.length} slow operations`);
    }

    if (summary.metrics.memoryUsage.peak > this.config.thresholds.memoryUsageMB * 1024 * 1024) {
      recommendations.push('Consider memory optimization strategies');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is healthy - continue monitoring');
    }

    return recommendations;
  }
}

// Export singleton instance for convenience
export const performanceManager = PerformanceManager.getInstance();