import { 
  PerformanceManager,
  type PerformanceReport,
  type PerformanceSummary,
  type PerformanceHealth,
  type PerformanceTrends,
  type OptimizationSuggestion,
  type OperationContext,
  type PerformanceConfiguration
} from '@lorm/core';
import { Logger, ICONS } from '../utils/logger.js';
import { writeFileSync } from 'fs';

/**
 * CLI Performance Service
 * Clean interface to core PerformanceManager for CLI-specific operations
 */
export class CLIPerformanceService {
  private performanceManager: PerformanceManager;
  private sessionStarted: boolean = false;

  constructor() {
    this.performanceManager = PerformanceManager.getInstance();
  }

  /**
   * Start a new performance session for CLI operations
   */
  startSession(sessionId?: string, context?: OperationContext): void {
    this.performanceManager.startSession(sessionId, {
      ...context,
      source: 'cli',
      environment: process.env.NODE_ENV || 'development'
    });
    this.sessionStarted = true;

    if (process.env.LORM_PERFORMANCE === 'true') {
      Logger.withIcon(ICONS.chart, 'Performance monitoring started', 'dim');
    }
  }

  /**
   * End the current performance session
   */
  endSession(): PerformanceSummary | null {
    if (!this.sessionStarted) {
      return null;
    }

    const summary = this.performanceManager.endSession();
    this.sessionStarted = false;

    if (process.env.LORM_PERFORMANCE === 'true') {
      this.displaySessionSummary(summary);
    }

    return summary;
  }

  /**
   * Track an operation with automatic timing
   */
  async trackOperation<T>(
    name: string,
    fn: () => Promise<T>,
    context?: OperationContext
  ): Promise<T> {
    return this.performanceManager.trackOperation(name, fn, context);
  }

  /**
   * Track a synchronous operation
   */
  trackOperationSync<T>(
    name: string,
    fn: () => T,
    context?: OperationContext
  ): T {
    return this.performanceManager.trackOperationSync(name, fn, context);
  }

  /**
   * Start tracking an operation manually
   */
  startOperation(name: string, context?: OperationContext): void {
    this.performanceManager.startOperation(name, context);
  }

  /**
   * End tracking an operation manually
   */
  endOperation(name: string): void {
    this.performanceManager.endOperation(name);
  }

  /**
   * Record an error
   */
  recordError(error: Error): void {
    this.performanceManager.recordError(error);
  }

  /**
   * Record a warning
   */
  recordWarning(message: string): void {
    this.performanceManager.recordWarning(message);
  }

  /**
   * Display performance metrics in CLI format
   */
  async displayMetrics(options: {
    clear?: boolean;
    export?: string | boolean;
    verbose?: boolean;
  } = {}): Promise<void> {
    const { clear, export: exportFile, verbose } = options;

    Logger.withIcon(ICONS.chart, 'Performance Metrics');

    try {
      if (clear) {
        await this.performanceManager.clearHistory();
        Logger.success('Performance history cleared');
        return;
      }

      const report = await this.performanceManager.getPerformanceReport({
        historyLimit: verbose ? 20 : 10
      });

      if (exportFile) {
        const exportData = {
          ...report,
          timestamp: new Date().toISOString(),
          exportedBy: 'lorm-cli-v2'
        };
        const filePath = typeof exportFile === 'string' ? exportFile : 'performance-metrics.json';
        writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        Logger.success(`Metrics exported to ${filePath}`);
        return;
      }

      this.displayPerformanceReport(report, verbose);
    } catch (error) {
      Logger.error(`Failed to get performance metrics: ${error}`);
      throw error;
    }
  }

  /**
   * Display health status in CLI format
   */
  async displayHealth(): Promise<void> {
    try {
      const health = this.performanceManager.getHealthStatus();
      this.displayHealthStatus(health);
    } catch (error) {
      Logger.error(`Failed to get health status: ${error}`);
      throw error;
    }
  }

  /**
   * Get optimization suggestions for CLI display
   */
  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    return this.performanceManager.getOptimizationSuggestions();
  }

  /**
   * Check if performance is healthy
   */
  isHealthy(): boolean {
    return this.performanceManager.isHealthy();
  }

  /**
   * Update performance configuration
   */
  updateConfiguration(config: Partial<PerformanceConfiguration>): void {
    this.performanceManager.updateConfiguration(config);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): PerformanceConfiguration {
    return this.performanceManager.getConfiguration();
  }

  /**
   * Get current session information
   */
  getCurrentSession(): { id: string; startTime: number } | null {
    const session = this.performanceManager.getCurrentSession();
    return session ? { id: session.id, startTime: session.startTime } : null;
  }

  /**
   * Clear performance history
   */
  async clearHistory(): Promise<void> {
    return this.performanceManager.clearHistory();
  }

  /**
   * Display performance report in CLI format
   */
  private displayPerformanceReport(report: PerformanceReport, verbose: boolean = false): void {
    const { summary, trends, suggestions, health } = report;

    // Current session metrics
    Logger.withIcon('📈', 'Current Session:');
    Logger.dim(`   Session ID: ${summary.sessionId}`);
    Logger.dim(`   Total duration: ${summary.totalDuration}ms`);
    Logger.dim(`   Operations: ${summary.operations.length}`);
    
    if (summary.operations.length > 0) {
      const avgDuration = summary.operations.reduce((sum, op) => sum + (op.duration || 0), 0) / summary.operations.length;
      Logger.dim(`   Average operation time: ${Math.round(avgDuration)}ms`);
    }

    // Memory usage
    const memoryUsage = summary.metrics.memoryUsage;
    Logger.withIcon(ICONS.search, 'Memory Usage:');
    Logger.dim(`   Start: ${Math.round(memoryUsage.start / 1024 / 1024)}MB`);
    Logger.dim(`   End: ${Math.round(memoryUsage.end / 1024 / 1024)}MB`);
    Logger.dim(`   Peak: ${Math.round(memoryUsage.peak / 1024 / 1024)}MB`);
    Logger.dim(`   Delta: ${Math.round(memoryUsage.delta / 1024 / 1024)}MB`);

    // Recent operations
    if (summary.operations.length > 0) {
      Logger.withIcon('⚡', 'Recent Operations:');
      const recentOps = verbose ? summary.operations.slice(-10) : summary.operations.slice(-5);
      recentOps.forEach(op => {
        const duration = op.duration ? `${op.duration}ms` : 'ongoing';
        Logger.dim(`   ${op.name}: ${duration}`);
      });
    }

    // Trends (if available)
    if (trends.averageExecutionTime.current > 0) {
      Logger.withIcon('📊', 'Performance Trends:');
      this.displayTrend('Execution Time', trends.averageExecutionTime, 'ms');
      this.displayTrend('Memory Usage', trends.memoryUsage, 'MB');
      this.displayTrend('Operation Count', trends.operationCounts, '');
    }

    // Health status
    Logger.withIcon('🏥', 'Health Status:');
    const statusIcon = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '❌';
    Logger.dim(`   Status: ${statusIcon} ${health.status.toUpperCase()} (Score: ${health.score}/100)`);

    // Issues
    if (health.issues.length > 0) {
      Logger.withIcon(ICONS.warning, 'Issues:');
      health.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        Logger.dim(`   ${icon} ${issue.message}`);
      });
    }

    // Recommendations
    if (health.recommendations.length > 0) {
      Logger.withIcon('💡', 'Recommendations:');
      health.recommendations.forEach(rec => {
        Logger.dim(`   • ${rec}`);
      });
    }

    // Optimization suggestions
    if (suggestions.length > 0) {
      Logger.withIcon('🚀', 'Optimization Suggestions:');
      suggestions.slice(0, verbose ? 10 : 5).forEach(suggestion => {
        Logger.dim(`   • ${suggestion.category}: ${suggestion.description}`);
        if (verbose && suggestion.estimatedImpact) {
          Logger.dim(`     Impact: ${suggestion.estimatedImpact}`);
        }
        Logger.dim(`     Recommendation: ${suggestion.recommendation}`);
      });
    }

    // Warnings and errors
    if (summary.warnings.length > 0) {
      Logger.withIcon(ICONS.warning, 'Warnings:');
      summary.warnings.forEach(warning => Logger.dim(`   - ${warning}`));
    }

    if (summary.errors.length > 0) {
      Logger.withIcon(ICONS.error, 'Errors:');
      summary.errors.forEach(error => Logger.dim(`   - ${error.message}`));
    }
  }

  /**
   * Display a performance trend
   */
  private displayTrend(name: string, trend: any, unit: string): void {
    const arrow = trend.trend === 'improving' ? '📈' : trend.trend === 'degrading' ? '📉' : '➡️';
    const change = trend.changePercent > 0 ? `+${trend.changePercent.toFixed(1)}%` : `${trend.changePercent.toFixed(1)}%`;
    Logger.dim(`   ${arrow} ${name}: ${trend.current.toFixed(1)}${unit} (${change})`);
  }

  /**
   * Display health status
   */
  private displayHealthStatus(health: PerformanceHealth): void {
    Logger.withIcon('🏥', 'Performance Health Check');
    
    const statusIcon = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '❌';
    const statusColor = health.status === 'healthy' ? 'success' : health.status === 'warning' ? 'warning' : 'error';
    
    Logger.withIcon(statusIcon, `Status: ${health.status.toUpperCase()}`, statusColor as any);
    Logger.dim(`Health Score: ${health.score}/100`);

    if (health.issues.length > 0) {
      Logger.withIcon(ICONS.warning, 'Issues Found:');
      health.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        Logger.dim(`   ${icon} ${issue.message}`);
      });
    }

    if (health.recommendations.length > 0) {
      Logger.withIcon('💡', 'Recommendations:');
      health.recommendations.forEach(rec => {
        Logger.dim(`   • ${rec}`);
      });
    }
  }

  /**
   * Display session summary
   */
  private displaySessionSummary(summary: PerformanceSummary): void {
    Logger.withIcon(ICONS.chart, 'Performance Session Summary:', 'dim');
    Logger.performance('Total execution time', `${summary.totalDuration}ms`);
    Logger.performance('Memory peak', `${Math.round(summary.metrics.memoryUsage.peak / 1024 / 1024)}MB`);
    Logger.performance('Operations', `${summary.operations.length}`);

    if (summary.operations.length > 0) {
      Logger.dim('Key operations:');
      summary.operations
        .filter(op => op.duration && op.duration > 100) // Show operations > 100ms
        .slice(0, 5)
        .forEach(op => {
          Logger.performance(`  ${op.name}`, `${op.duration}ms`);
        });
    }
  }
}

// Export singleton instance for convenience
export const cliPerformanceService = new CLIPerformanceService();