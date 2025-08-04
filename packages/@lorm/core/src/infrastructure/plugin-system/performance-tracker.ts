import type {
  PluginPerformanceReport,
  PluginOperationContext,
  IPlugin
} from './types.js';

interface PluginMetrics {
  operationCount: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  lastOperation: Date;
  memoryUsage: {
    peak: number;
    average: number;
    current: number;
  };
}

interface OperationRecord {
  id: string;
  plugin: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  error?: string;
  memoryBefore: number;
  memoryAfter?: number;
  context?: any;
}

/**
 * Plugin Performance Tracker for monitoring plugin operations
 */
export class PluginPerformanceTracker {
  private metrics = new Map<string, PluginMetrics>();
  private operations = new Map<string, OperationRecord>();
  private operationHistory: OperationRecord[] = [];
  private maxHistorySize = 1000;
  private performanceThresholds = {
    slowOperation: 1000, // ms
    memoryLeak: 50 * 1024 * 1024, // 50MB
    errorRate: 0.1 // 10%
  };

  /**
   * Initialize the performance tracker
   */
  async initialize(): Promise<void> {
    // Initialize performance tracking
    this.metrics.clear();
    this.operations.clear();
    this.operationHistory = [];
  }
  
  /**
   * Start tracking a plugin operation
   */
  startOperation(
    plugin: IPlugin | string,
    operation: { type: string; context?: any }
  ): string {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.metadata.name;
    const operationId = this.generateOperationId();
    
    const record: OperationRecord = {
      id: operationId,
      plugin: pluginName,
      operation: operation.type,
      startTime: new Date(),
      success: false,
      memoryBefore: this.getCurrentMemoryUsage(),
      context: operation.context
    };
    
    this.operations.set(operationId, record);
    
    return operationId;
  }
  
  /**
   * End tracking a plugin operation
   */
  endOperation(
    operationId: string,
    success = true,
    error?: Error
  ): void {
    const record = this.operations.get(operationId);
    if (!record) {
      console.warn(`Operation ${operationId} not found`);
      return;
    }
    
    const endTime = new Date();
    const duration = endTime.getTime() - record.startTime.getTime();
    const memoryAfter = this.getCurrentMemoryUsage();
    
    // Update record
    record.endTime = endTime;
    record.duration = duration;
    record.success = success;
    record.memoryAfter = memoryAfter;
    
    if (error) {
      record.error = error.message;
    }
    
    // Update plugin metrics
    this.updatePluginMetrics(record);
    
    // Add to history
    this.addToHistory(record);
    
    // Check for performance issues
    this.checkPerformanceIssues(record);
    
    // Remove from active operations
    this.operations.delete(operationId);
  }
  
  /**
   * Get performance report for a plugin
   */
  getPluginReport(pluginName: string) {
    const metrics = this.metrics.get(pluginName);
    const recentOperations = this.getRecentOperations(pluginName, 10);
    
    if (!metrics) {
      return {
        pluginName,
        totalOperations: 0,
        successRate: 0,
        averageExecutionTime: 0,
        memoryUsage: {
          peak: 0,
          average: 0,
          current: 0
        },
        recentOperations: [],
        issues: [],
        recommendations: []
      };
    }
    
    const successRate = metrics.operationCount > 0 
      ? (metrics.operationCount - metrics.errorCount) / metrics.operationCount 
      : 0;
    
    const issues = this.identifyPerformanceIssues(pluginName, metrics);
    const recommendations = this.generateRecommendations(pluginName, metrics, issues);
    
    return {
      pluginName,
      totalOperations: metrics.operationCount,
      successRate,
      averageExecutionTime: metrics.averageDuration,
      memoryUsage: metrics.memoryUsage,
      recentOperations: recentOperations.map(op => ({
        operation: op.operation,
        duration: op.duration || 0,
        success: op.success,
        timestamp: op.startTime,
        memoryDelta: (op.memoryAfter || 0) - op.memoryBefore
      })),
      issues,
      recommendations
    };
  }
  
  /**
   * Get overall performance summary
   */
  getOverallSummary() {
    const allPlugins = Array.from(this.metrics.keys());
    const totalOperations = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.operationCount, 0);
    const totalErrors = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.errorCount, 0);
    
    const slowestPlugins = allPlugins
      .map(plugin => ({
        plugin,
        averageDuration: this.metrics.get(plugin)!.averageDuration
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5);
    
    const mostActivePlugins = allPlugins
      .map(plugin => ({
        plugin,
        operationCount: this.metrics.get(plugin)!.operationCount
      }))
      .sort((a, b) => b.operationCount - a.operationCount)
      .slice(0, 5);
    
    const errorPronePlugins = allPlugins
      .map(plugin => {
        const metrics = this.metrics.get(plugin)!;
        return {
          plugin,
          errorRate: metrics.operationCount > 0 ? metrics.errorCount / metrics.operationCount : 0
        };
      })
      .filter(p => p.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
    
    return {
      totalPlugins: allPlugins.length,
      totalOperations,
      overallSuccessRate: totalOperations > 0 ? (totalOperations - totalErrors) / totalOperations : 0,
      activeOperations: this.operations.size,
      slowestPlugins,
      mostActivePlugins,
      errorPronePlugins,
      memoryUsage: {
        current: this.getCurrentMemoryUsage(),
        trend: this.getMemoryTrend()
      }
    };
  }
  
  /**
   * Get performance trends over time
   */
  getPerformanceTrends(pluginName?: string, timeframe?: { start: Date; end: Date }) {
    let operations = this.operationHistory;
    
    if (pluginName) {
      operations = operations.filter(op => op.plugin === pluginName);
    }
    
    if (timeframe) {
      operations = operations.filter(op => 
        op.startTime >= timeframe.start && op.startTime <= timeframe.end
      );
    }
    
    // Group by time intervals (hourly)
    const trends = new Map<string, {
      timestamp: Date;
      operationCount: number;
      averageDuration: number;
      errorCount: number;
      memoryUsage: number;
    }>();
    
    operations.forEach(op => {
      const hour = new Date(op.startTime);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      
      if (!trends.has(key)) {
        trends.set(key, {
          timestamp: hour,
          operationCount: 0,
          averageDuration: 0,
          errorCount: 0,
          memoryUsage: 0
        });
      }
      
      const trend = trends.get(key)!;
      trend.operationCount++;
      trend.averageDuration = (trend.averageDuration * (trend.operationCount - 1) + (op.duration || 0)) / trend.operationCount;
      
      if (!op.success) {
        trend.errorCount++;
      }
      
      if (op.memoryAfter) {
        trend.memoryUsage = Math.max(trend.memoryUsage, op.memoryAfter);
      }
    });
    
    return Array.from(trends.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  /**
   * Clear performance data
   */
  clearData(filter?: {
    plugin?: string;
    olderThan?: Date;
  }): void {
    if (!filter) {
      this.metrics.clear();
      this.operationHistory = [];
      return;
    }
    
    if (filter.plugin) {
      this.metrics.delete(filter.plugin);
      this.operationHistory = this.operationHistory.filter(op => op.plugin !== filter.plugin);
    }
    
    if (filter.olderThan) {
      this.operationHistory = this.operationHistory.filter(op => op.startTime >= filter.olderThan!);
    }
  }
  
  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<typeof this.performanceThresholds>): void {
    this.performanceThresholds = { ...this.performanceThresholds, ...thresholds };
  }
  
  /**
   * Get current active operations
   */
  getActiveOperations(): Array<{
    id: string;
    plugin: string;
    operation: string;
    duration: number;
    memoryUsage: number;
  }> {
    const now = Date.now();
    
    return Array.from(this.operations.values()).map(op => ({
      id: op.id,
      plugin: op.plugin,
      operation: op.operation,
      duration: now - op.startTime.getTime(),
      memoryUsage: this.getCurrentMemoryUsage() - op.memoryBefore
    }));
  }
  
  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
  
  /**
   * Update plugin metrics
   */
  private updatePluginMetrics(record: OperationRecord): void {
    const pluginName = record.plugin;
    let metrics = this.metrics.get(pluginName);
    
    if (!metrics) {
      metrics = {
        operationCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        lastOperation: record.startTime,
        memoryUsage: {
          peak: 0,
          average: 0,
          current: 0
        }
      };
      this.metrics.set(pluginName, metrics);
    }
    
    // Update operation metrics
    metrics.operationCount++;
    metrics.lastOperation = record.startTime;
    
    if (record.duration !== undefined) {
      metrics.totalDuration += record.duration;
      metrics.averageDuration = metrics.totalDuration / metrics.operationCount;
      metrics.minDuration = Math.min(metrics.minDuration, record.duration);
      metrics.maxDuration = Math.max(metrics.maxDuration, record.duration);
    }
    
    if (!record.success) {
      metrics.errorCount++;
    }
    
    // Update memory metrics
    if (record.memoryAfter !== undefined) {
      metrics.memoryUsage.current = record.memoryAfter;
      metrics.memoryUsage.peak = Math.max(metrics.memoryUsage.peak, record.memoryAfter);
      
      // Calculate average memory usage
      const memoryDelta = record.memoryAfter - record.memoryBefore;
      metrics.memoryUsage.average = (metrics.memoryUsage.average * (metrics.operationCount - 1) + memoryDelta) / metrics.operationCount;
    }
  }
  
  /**
   * Add operation to history
   */
  private addToHistory(record: OperationRecord): void {
    this.operationHistory.unshift(record);
    
    // Maintain history size limit
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(0, this.maxHistorySize);
    }
  }
  
  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(record: OperationRecord): void {
    const issues: string[] = [];
    
    // Check for slow operations
    if (record.duration && record.duration > this.performanceThresholds.slowOperation) {
      issues.push(`Slow operation detected: ${record.operation} took ${record.duration}ms`);
    }
    
    // Check for memory leaks
    if (record.memoryAfter && record.memoryBefore) {
      const memoryDelta = record.memoryAfter - record.memoryBefore;
      if (memoryDelta > this.performanceThresholds.memoryLeak) {
        issues.push(`Potential memory leak: ${Math.round(memoryDelta / 1024 / 1024)}MB increase`);
      }
    }
    
    // Log issues
    if (issues.length > 0) {
      console.warn(`Performance issues detected for plugin ${record.plugin}:`, issues);
    }
  }
  
  /**
   * Get recent operations for a plugin
   */
  private getRecentOperations(pluginName: string, limit = 10): OperationRecord[] {
    return this.operationHistory
      .filter(op => op.plugin === pluginName)
      .slice(0, limit);
  }
  
  /**
   * Identify performance issues
   */
  private identifyPerformanceIssues(pluginName: string, metrics: PluginMetrics): string[] {
    const issues: string[] = [];
    
    // Check error rate
    const errorRate = metrics.operationCount > 0 ? metrics.errorCount / metrics.operationCount : 0;
    if (errorRate > this.performanceThresholds.errorRate) {
      issues.push(`High error rate: ${Math.round(errorRate * 100)}%`);
    }
    
    // Check average duration
    if (metrics.averageDuration > this.performanceThresholds.slowOperation) {
      issues.push(`Slow average execution time: ${Math.round(metrics.averageDuration)}ms`);
    }
    
    // Check memory usage
    if (metrics.memoryUsage.peak > this.performanceThresholds.memoryLeak) {
      issues.push(`High memory usage: ${Math.round(metrics.memoryUsage.peak / 1024 / 1024)}MB peak`);
    }
    
    return issues;
  }
  
  /**
   * Generate performance recommendations
   */
  private generateRecommendations(pluginName: string, metrics: PluginMetrics, issues: string[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(issue => issue.includes('error rate'))) {
      recommendations.push('Review plugin error handling and input validation');
      recommendations.push('Check plugin dependencies and compatibility');
    }
    
    if (issues.some(issue => issue.includes('execution time'))) {
      recommendations.push('Optimize plugin algorithms and reduce complexity');
      recommendations.push('Consider caching frequently computed results');
      recommendations.push('Profile plugin code to identify bottlenecks');
    }
    
    if (issues.some(issue => issue.includes('memory usage'))) {
      recommendations.push('Review memory allocation and cleanup in plugin');
      recommendations.push('Implement proper resource disposal');
      recommendations.push('Consider using streaming for large data processing');
    }
    
    if (metrics.operationCount > 1000) {
      recommendations.push('Consider implementing operation batching for high-frequency operations');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Plugin performance is within acceptable limits');
    }
    
    return recommendations;
  }
  
  /**
   * Get memory usage trend
   */
  private getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    const recentOperations = this.operationHistory.slice(0, 10);
    
    if (recentOperations.length < 2) {
      return 'stable';
    }
    
    const memoryDeltas = recentOperations
      .filter(op => op.memoryAfter !== undefined)
      .map(op => (op.memoryAfter! - op.memoryBefore));
    
    if (memoryDeltas.length < 2) {
      return 'stable';
    }
    
    const averageDelta = memoryDeltas.reduce((sum, delta) => sum + delta, 0) / memoryDeltas.length;
    
    if (averageDelta > 1024 * 1024) { // 1MB threshold
      return 'increasing';
    } else if (averageDelta < -1024 * 1024) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }
}