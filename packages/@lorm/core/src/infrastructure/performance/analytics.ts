import type {
  PerformanceSummary,
  PerformanceTrends,
  TrendData,
  OptimizationSuggestion,
  PerformanceComparison,
  Bottleneck,
  PerformanceInsight,
  PerformanceOperation,
  PerformanceMetrics
} from './types.js';

/**
 * Performance analytics engine
 * Provides trend analysis, optimization suggestions, and performance insights
 */
export class PerformanceAnalytics {
  /**
   * Analyze performance trends from historical sessions
   */
  analyzeTrends(sessions: PerformanceSummary[]): PerformanceTrends {
    if (sessions.length < 2) {
      return this.getEmptyTrends();
    }

    const current = sessions[0]; // Most recent session
    const previous = sessions[1]; // Previous session
    const historical = sessions.slice(1); // All previous sessions

    return {
      averageExecutionTime: this.calculateTrendData(
        current.totalDuration,
        this.calculateAverage(historical.map(s => s.totalDuration))
      ),
      memoryUsage: this.calculateTrendData(
        current.metrics.memoryUsage.peak,
        this.calculateAverage(historical.map(s => s.metrics.memoryUsage.peak))
      ),
      operationCounts: this.calculateTrendData(
        current.operations.length,
        this.calculateAverage(historical.map(s => s.operations.length))
      ),
      errorRates: this.calculateTrendData(
        current.errors.length,
        this.calculateAverage(historical.map(s => s.errors.length))
      )
    };
  }

  /**
   * Generate optimization suggestions based on performance data
   */
  generateOptimizations(sessions: PerformanceSummary[]): OptimizationSuggestion[] {
    if (sessions.length === 0) {
      return [];
    }

    const suggestions: OptimizationSuggestion[] = [];
    const current = sessions[0];
    const bottlenecks = this.identifyBottlenecks(sessions);

    // Memory optimization suggestions
    if (current.metrics.memoryUsage.peak > 500 * 1024 * 1024) { // 500MB
      suggestions.push({
        category: 'memory',
        severity: 'high',
        description: 'High memory usage detected',
        recommendation: 'Consider implementing memory pooling or reducing object allocations',
        estimatedImpact: 'Could reduce memory usage by 20-40%'
      });
    }

    // Speed optimization suggestions
    const slowOperations = current.operations.filter(op => op.duration && op.duration > 1000);
    if (slowOperations.length > 0) {
      suggestions.push({
        category: 'speed',
        severity: 'medium',
        description: `${slowOperations.length} slow operations detected (>1s)`,
        recommendation: 'Profile slow operations and consider caching or optimization',
        estimatedImpact: 'Could improve response time by 30-50%'
      });
    }

    // Error rate suggestions
    if (current.errors.length > 0) {
      suggestions.push({
        category: 'efficiency',
        severity: 'high',
        description: `${current.errors.length} errors occurred during execution`,
        recommendation: 'Investigate and fix error sources to improve reliability',
        estimatedImpact: 'Could eliminate performance overhead from error handling'
      });
    }

    // Bottleneck-based suggestions
    for (const bottleneck of bottlenecks) {
      if (bottleneck.impact === 'high') {
        suggestions.push({
          category: 'speed',
          severity: 'high',
          description: `Bottleneck detected in ${bottleneck.operation}`,
          recommendation: bottleneck.suggestions[0] || 'Optimize this operation',
          estimatedImpact: 'Could improve overall performance by 15-25%'
        });
      }
    }

    // Efficiency suggestions based on operation patterns
    const operationCounts = this.countOperationTypes(current.operations);
    const duplicateOperations = Object.entries(operationCounts)
      .filter(([_, count]) => count > 5)
      .map(([name]) => name);

    if (duplicateOperations.length > 0) {
      suggestions.push({
        category: 'efficiency',
        severity: 'medium',
        description: 'Repeated operations detected',
        recommendation: 'Consider caching results or batching similar operations',
        estimatedImpact: 'Could reduce execution time by 10-20%'
      });
    }

    return suggestions.slice(0, 10); // Limit to top 10 suggestions
  }

  /**
   * Calculate health score based on performance metrics
   */
  calculateHealthScore(current: PerformanceSummary): number {
    let score = 100;

    // Deduct points for errors (20 points per error, max 60 points)
    score -= Math.min(current.errors.length * 20, 60);

    // Deduct points for warnings (5 points per warning, max 20 points)
    score -= Math.min(current.warnings.length * 5, 20);

    // Deduct points for slow operations (5 points per slow op, max 15 points)
    const slowOps = current.operations.filter(op => op.duration && op.duration > 2000).length;
    score -= Math.min(slowOps * 5, 15);

    // Deduct points for high memory usage (max 10 points)
    if (current.metrics.memoryUsage.peak > 1024 * 1024 * 1024) { // 1GB
      score -= 10;
    } else if (current.metrics.memoryUsage.peak > 512 * 1024 * 1024) { // 512MB
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * Compare performance between two sessions
   */
  comparePerformance(current: PerformanceSummary, baseline: PerformanceSummary): PerformanceComparison {
    const improvements: string[] = [];
    const regressions: string[] = [];

    // Compare execution time
    if (current.totalDuration < baseline.totalDuration) {
      const improvement = ((baseline.totalDuration - current.totalDuration) / baseline.totalDuration * 100).toFixed(1);
      improvements.push(`Execution time improved by ${improvement}%`);
    } else if (current.totalDuration > baseline.totalDuration) {
      const regression = ((current.totalDuration - baseline.totalDuration) / baseline.totalDuration * 100).toFixed(1);
      regressions.push(`Execution time regressed by ${regression}%`);
    }

    // Compare memory usage
    if (current.metrics.memoryUsage.peak < baseline.metrics.memoryUsage.peak) {
      const improvement = ((baseline.metrics.memoryUsage.peak - current.metrics.memoryUsage.peak) / baseline.metrics.memoryUsage.peak * 100).toFixed(1);
      improvements.push(`Memory usage improved by ${improvement}%`);
    } else if (current.metrics.memoryUsage.peak > baseline.metrics.memoryUsage.peak) {
      const regression = ((current.metrics.memoryUsage.peak - baseline.metrics.memoryUsage.peak) / baseline.metrics.memoryUsage.peak * 100).toFixed(1);
      regressions.push(`Memory usage regressed by ${regression}%`);
    }

    // Compare error rates
    if (current.errors.length < baseline.errors.length) {
      improvements.push(`Error count reduced from ${baseline.errors.length} to ${current.errors.length}`);
    } else if (current.errors.length > baseline.errors.length) {
      regressions.push(`Error count increased from ${baseline.errors.length} to ${current.errors.length}`);
    }

    // Calculate overall score
    const currentScore = this.calculateHealthScore(current);
    const baselineScore = this.calculateHealthScore(baseline);
    const overallScore = currentScore - baselineScore;

    return {
      baseline,
      current,
      improvements,
      regressions,
      overallScore
    };
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(sessions: PerformanceSummary[]): Bottleneck[] {
    if (sessions.length === 0) {
      return [];
    }

    const operationStats = new Map<string, {
      totalDuration: number;
      count: number;
      maxDuration: number;
    }>();

    // Aggregate operation statistics across all sessions
    for (const session of sessions) {
      for (const operation of session.operations) {
        if (!operation.duration) continue;

        const stats = operationStats.get(operation.name) || {
          totalDuration: 0,
          count: 0,
          maxDuration: 0
        };

        stats.totalDuration += operation.duration;
        stats.count += 1;
        stats.maxDuration = Math.max(stats.maxDuration, operation.duration);

        operationStats.set(operation.name, stats);
      }
    }

    // Identify bottlenecks
    const bottlenecks: Bottleneck[] = [];
    for (const [operationName, stats] of operationStats) {
      const averageDuration = stats.totalDuration / stats.count;
      
      // Consider an operation a bottleneck if:
      // 1. Average duration > 500ms
      // 2. Frequency > 2 (appears multiple times)
      // 3. Max duration > 2000ms
      if (averageDuration > 500 || stats.maxDuration > 2000) {
        const impact = this.calculateBottleneckImpact(averageDuration, stats.count, stats.maxDuration);
        const suggestions = this.generateBottleneckSuggestions(operationName, averageDuration, stats.maxDuration);

        bottlenecks.push({
          operation: operationName,
          averageDuration,
          frequency: stats.count,
          impact,
          suggestions
        });
      }
    }

    // Sort by impact (high impact first)
    return bottlenecks.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Generate performance insights
   */
  generateInsights(sessions: PerformanceSummary[]): PerformanceInsight[] {
    if (sessions.length === 0) {
      return [];
    }

    const insights: PerformanceInsight[] = [];
    const trends = this.analyzeTrends(sessions);

    // Trend insights
    if (trends.averageExecutionTime.trend === 'degrading') {
      insights.push({
        category: 'trend',
        title: 'Performance Degradation Detected',
        description: `Execution time has increased by ${trends.averageExecutionTime.changePercent.toFixed(1)}%`,
        impact: 'high',
        actionable: true
      });
    }

    if (trends.memoryUsage.trend === 'improving') {
      insights.push({
        category: 'optimization',
        title: 'Memory Usage Improvement',
        description: `Memory usage has decreased by ${Math.abs(trends.memoryUsage.changePercent).toFixed(1)}%`,
        impact: 'medium',
        actionable: false
      });
    }

    // Error pattern insights
    const current = sessions[0];
    if (current.errors.length > 0) {
      const errorTypes = this.categorizeErrors(current.errors);
      insights.push({
        category: 'warning',
        title: 'Error Patterns Detected',
        description: `Most common error type: ${errorTypes[0]?.type || 'Unknown'}`,
        impact: 'high',
        actionable: true
      });
    }

    return insights;
  }

  /**
   * Calculate trend data between current and previous values
   */
  private calculateTrendData(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous === 0 ? 0 : (change / previous) * 100;
    
    let trend: 'improving' | 'degrading' | 'stable';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (changePercent < 0) {
      trend = 'improving'; // Lower values are generally better
    } else {
      trend = 'degrading';
    }

    return {
      current,
      previous,
      change,
      changePercent,
      trend
    };
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Get empty trends structure
   */
  private getEmptyTrends(): PerformanceTrends {
    const emptyTrend: TrendData = {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: 'stable'
    };

    return {
      averageExecutionTime: emptyTrend,
      memoryUsage: emptyTrend,
      operationCounts: emptyTrend,
      errorRates: emptyTrend
    };
  }

  /**
   * Count operation types
   */
  private countOperationTypes(operations: PerformanceOperation[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const operation of operations) {
      counts[operation.name] = (counts[operation.name] || 0) + 1;
    }
    return counts;
  }

  /**
   * Calculate bottleneck impact
   */
  private calculateBottleneckImpact(
    averageDuration: number,
    frequency: number,
    maxDuration: number
  ): 'low' | 'medium' | 'high' {
    const totalImpact = averageDuration * frequency;
    
    if (totalImpact > 5000 || maxDuration > 5000) {
      return 'high';
    } else if (totalImpact > 2000 || maxDuration > 2000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate bottleneck-specific suggestions
   */
  private generateBottleneckSuggestions(
    operationName: string,
    averageDuration: number,
    maxDuration: number
  ): string[] {
    const suggestions: string[] = [];

    if (operationName.includes('file') || operationName.includes('read') || operationName.includes('write')) {
      suggestions.push('Consider implementing file caching or using streaming for large files');
    }

    if (operationName.includes('network') || operationName.includes('http') || operationName.includes('api')) {
      suggestions.push('Implement request caching, connection pooling, or parallel requests');
    }

    if (operationName.includes('database') || operationName.includes('query')) {
      suggestions.push('Optimize database queries, add indexes, or implement query caching');
    }

    if (averageDuration > 2000) {
      suggestions.push('Consider breaking this operation into smaller, parallelizable tasks');
    }

    if (suggestions.length === 0) {
      suggestions.push('Profile this operation to identify specific optimization opportunities');
    }

    return suggestions;
  }

  /**
   * Categorize errors by type
   */
  private categorizeErrors(errors: Error[]): Array<{ type: string; count: number }> {
    const errorTypes: Record<string, number> = {};
    
    for (const error of errors) {
      const type = error.constructor.name || 'Error';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    }

    return Object.entries(errorTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}