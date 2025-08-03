/**
 * Cache Monitoring System
 * 
 * This module provides comprehensive monitoring, metrics collection,
 * and health checking for the unified cache system.
 */

import type {
  CacheMonitorInterface,
  CacheStats,
  CacheHealth,
  CachePerformanceMetrics,
  CacheLayerInterface,
  CacheNamespace,
  CacheLayer
} from '../core/types.js';
import { EventEmitter } from 'node:events';

/**
 * Monitoring configuration
 */
interface MonitoringConfig {
  metricsInterval: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  alertThresholds: AlertThresholds;
  retentionPeriod: number; // milliseconds
  enableDetailedMetrics: boolean;
}

/**
 * Alert thresholds
 */
interface AlertThresholds {
  hitRatio: number;
  memoryUsage: number;
  diskUsage: number;
  errorRate: number;
  responseTime: number;
  evictionRate: number;
}

/**
 * Metric data point
 */
interface MetricDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Time series data
 */
interface TimeSeries {
  name: string;
  dataPoints: MetricDataPoint[];
  aggregations: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
  };
}

/**
 * Alert event
 */
interface AlertEvent {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  layer?: CacheLayer;
  namespace?: CacheNamespace;
  message: string;
}

/**
 * Performance snapshot
 */
interface PerformanceSnapshot {
  timestamp: number;
  overall: CachePerformanceMetrics;
  byLayer: Map<CacheLayer, CachePerformanceMetrics>;
  byNamespace: Map<CacheNamespace, CachePerformanceMetrics>;
  alerts: AlertEvent[];
}

/**
 * Cache monitoring implementation
 */
export class CacheMonitor extends EventEmitter implements CacheMonitorInterface {
  private readonly config: MonitoringConfig;
  private readonly layers = new Map<CacheLayer, CacheLayerInterface>();
  private readonly timeSeries = new Map<string, TimeSeries>();
  private readonly activeAlerts = new Map<string, AlertEvent>();
  
  // Monitoring timers
  private metricsTimer?: NodeJS.Timeout;
  private healthTimer?: NodeJS.Timeout;
  
  // Performance tracking
  private operationTimes = new Map<string, number[]>();
  private errorCounts = new Map<string, number>();
  private lastSnapshot?: PerformanceSnapshot;
  
  private isInitialized = false;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = {
      metricsInterval: 30 * 1000, // 30 seconds
      healthCheckInterval: 60 * 1000, // 1 minute
      alertThresholds: {
        hitRatio: 0.5,
        memoryUsage: 0.8,
        diskUsage: 0.8,
        errorRate: 0.05,
        responseTime: 1000, // 1 second
        evictionRate: 0.1
      },
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableDetailedMetrics: true,
      ...config
    };
  }

  /**
   * Initialize the monitoring system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Start metrics collection
    this.metricsTimer = setInterval(() => {
      this._collectMetrics().catch(error => {
        this.emit('error', { operation: 'collectMetrics', error });
      });
    }, this.config.metricsInterval);

    // Start health checks
    this.healthTimer = setInterval(() => {
      this._performHealthCheck().catch(error => {
        this.emit('error', { operation: 'healthCheck', error });
      });
    }, this.config.healthCheckInterval);

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Start monitoring (CacheMonitorInterface method)
   */
  async start(): Promise<void> {
    return this.initialize();
  }

  /**
   * Stop monitoring (CacheMonitorInterface method)
   */
  async stop(): Promise<void> {
    return this.shutdown();
  }

  /**
   * Record operation (CacheMonitorInterface method)
   */
  recordOperation(
    operation: string,
    key: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    // Extract layer from metadata or use default
    const layer = (metadata?.layer as CacheLayer) || 'memory';
    this.recordOperationTime(operation, layer, duration);
    
    if (!success) {
      const errorKey = `${operation}:${layer}`;
      const currentCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, currentCount + 1);
    }
  }

  /**
   * Shutdown the monitoring system
   */
  async shutdown(): Promise<void> {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }

    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = undefined;
    }

    this.layers.clear();
    this.timeSeries.clear();
    this.activeAlerts.clear();
    this.operationTimes.clear();
    this.errorCounts.clear();

    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Register a cache layer for monitoring
   */
  registerLayer(layer: CacheLayerInterface): void {
    this.layers.set(layer.name, layer);
    
    // Listen to layer events
    layer.on('set', (event) => this._recordOperation('set', layer.name, event));
    layer.on('get', (event) => this._recordOperation('get', layer.name, event));
    layer.on('delete', (event) => this._recordOperation('delete', layer.name, event));
    layer.on('eviction', (event) => this._recordEviction(layer.name, event));
    layer.on('error', (event) => this._recordError(layer.name, event));
    
    this.emit('layerRegistered', { layer: layer.name });
  }

  /**
   * Unregister a cache layer
   */
  unregisterLayer(layerName: CacheLayer): void {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.removeAllListeners();
      this.layers.delete(layerName);
      this.emit('layerUnregistered', { layer: layerName });
    }
  }

  /**
   * Record operation timing
   */
  recordOperationTime(operation: string, layer: CacheLayer, duration: number): void {
    const key = `${operation}:${layer}`;
    
    if (!this.operationTimes.has(key)) {
      this.operationTimes.set(key, []);
    }
    
    const times = this.operationTimes.get(key)!;
    times.push(duration);
    
    // Keep only recent measurements (last 1000)
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }
    
    // Record in time series
    this._addMetricDataPoint(`operation_time_${key}`, duration);
    
    // Check for performance alerts
    if (duration > this.config.alertThresholds.responseTime) {
      this._triggerAlert({
        type: 'warning',
        metric: 'responseTime',
        threshold: this.config.alertThresholds.responseTime,
        currentValue: duration,
        layer,
        message: `Slow ${operation} operation on ${layer}: ${duration}ms`
      });
    }
  }

  /**
   * Get current performance metrics
   */
  async getMetrics(): Promise<CachePerformanceMetrics> {
    const overall = await this._calculateOverallMetrics();
    return overall;
  }

  /**
   * Get performance metrics by layer
   */
  async getLayerMetrics(layer: CacheLayer): Promise<CachePerformanceMetrics | null> {
    const layerInstance = this.layers.get(layer);
    if (!layerInstance) {
      return null;
    }
    
    return this._calculateLayerMetrics(layer);
  }

  /**
   * Get performance metrics by namespace
   */
  async getNamespaceMetrics(namespace: CacheNamespace): Promise<CachePerformanceMetrics> {
    return this._calculateNamespaceMetrics(namespace);
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<CacheHealth> {
    const layerHealths = new Map<CacheLayer, Partial<CacheHealth>>();
    
    // Collect health from all layers
    for (const [name, layer] of this.layers) {
      try {
        const health = await layer.health();
        layerHealths.set(name, health);
      } catch (error) {
        layerHealths.set(name, {
          status: 'critical',
          messages: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }
    
    // Aggregate overall health
    const overallStatus = this._aggregateHealthStatus(layerHealths);
    const allMessages: string[] = [];
    const allChecks: Record<string, 'ok' | 'warning' | 'critical'> = {};
    
    for (const [layer, health] of layerHealths) {
      if (health.messages) {
        allMessages.push(...health.messages.map(msg => `[${layer}] ${msg}`));
      }
      if (health.checks) {
        Object.entries(health.checks).forEach(([check, status]) => {
          allChecks[`${layer}_${check}`] = status;
        });
      }
    }
    
    // Add monitoring-specific checks
    const activeAlertCount = this.activeAlerts.size;
    if (activeAlertCount > 0) {
      allMessages.push(`${activeAlertCount} active alerts`);
      allChecks.monitoring_alerts = activeAlertCount > 5 ? 'critical' : 'warning';
    }
    
    return {
      status: overallStatus,
      checks: allChecks,
      messages: allMessages,
      lastCheck: new Date(),
      layers: Object.fromEntries(layerHealths)
    };
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(metricName: string, timeRange?: { start: number; end: number }): TimeSeries | null {
    const series = this.timeSeries.get(metricName);
    if (!series) {
      return null;
    }
    
    if (!timeRange) {
      return series;
    }
    
    // Filter data points by time range
    const filteredPoints = series.dataPoints.filter(
      point => point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
    );
    
    return {
      ...series,
      dataPoints: filteredPoints,
      aggregations: this._calculateAggregations(filteredPoints)
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance snapshot
   */
  async getSnapshot(): Promise<PerformanceSnapshot> {
    const timestamp = Date.now();
    const overall = await this._calculateOverallMetrics();
    
    const byLayer = new Map<CacheLayer, CachePerformanceMetrics>();
    for (const layer of this.layers.keys()) {
      const metrics = await this._calculateLayerMetrics(layer);
      byLayer.set(layer, metrics);
    }
    
    const byNamespace = new Map<CacheNamespace, CachePerformanceMetrics>();
    const namespaces: CacheNamespace[] = ['config', 'plugin', 'schema', 'custom'];
    for (const namespace of namespaces) {
      const metrics = await this._calculateNamespaceMetrics(namespace);
      byNamespace.set(namespace, metrics);
    }
    
    const snapshot: PerformanceSnapshot = {
      timestamp,
      overall,
      byLayer,
      byNamespace,
      alerts: this.getActiveAlerts()
    };
    
    this.lastSnapshot = snapshot;
    this.emit('snapshot', snapshot);
    
    return snapshot;
  }

  /**
   * Clear all metrics and alerts
   */
  clearMetrics(): void {
    this.timeSeries.clear();
    this.activeAlerts.clear();
    this.operationTimes.clear();
    this.errorCounts.clear();
    this.lastSnapshot = undefined;
    
    this.emit('metricsCleared');
  }

  // Private helper methods

  private async _collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Collect metrics from all layers
      for (const [name, layer] of this.layers) {
        try {
          const stats = await layer.stats();
          
          if (stats.hitRatio !== undefined) {
            this._addMetricDataPoint(`hit_ratio_${name}`, stats.hitRatio);
          }
          
          if (stats.memoryUsage !== undefined) {
            this._addMetricDataPoint(`memory_usage_${name}`, stats.memoryUsage);
          }
          
          if (stats.diskUsage !== undefined) {
            this._addMetricDataPoint(`disk_usage_${name}`, stats.diskUsage);
          }
          
          if (stats.evictions !== undefined) {
            this._addMetricDataPoint(`evictions_${name}`, stats.evictions);
          }
          
          // Check for alerts
          this._checkStatsForAlerts(name, stats);
        } catch (error) {
          this._recordError(name, { error });
        }
      }
      
      // Clean up old data
      this._cleanupOldData();
      
      this.emit('metricsCollected', { timestamp });
    } catch (error) {
      this.emit('error', { operation: 'collectMetrics', error });
    }
  }

  private async _performHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealth();
      
      // Trigger alerts for critical health issues
      if (health.status === 'critical') {
        this._triggerAlert({
          type: 'critical',
          metric: 'health',
          threshold: 0,
          currentValue: 1,
          message: `Cache system health is critical: ${health.messages?.join(', ')}`
        });
      }
      
      this.emit('healthCheck', health);
    } catch (error) {
      this.emit('error', { operation: 'healthCheck', error });
    }
  }

  private _recordOperation(operation: string, layer: CacheLayer, event: any): void {
    if (this.config.enableDetailedMetrics) {
      this._addMetricDataPoint(`operations_${operation}_${layer}`, 1);
      
      if (event.namespace) {
        this._addMetricDataPoint(`operations_${operation}_${event.namespace}`, 1);
      }
    }
  }

  private _recordEviction(layer: CacheLayer, event: any): void {
    this._addMetricDataPoint(`evictions_${layer}`, 1);
    
    if (event.reason) {
      this._addMetricDataPoint(`evictions_${layer}_${event.reason}`, 1);
    }
  }

  private _recordError(layer: CacheLayer, event: any): void {
    const key = `errors_${layer}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    
    this._addMetricDataPoint(key, 1);
    
    // Check error rate
    const totalOps = this._getTotalOperations(layer);
    if (totalOps > 0) {
      const errorRate = count / totalOps;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this._triggerAlert({
          type: 'warning',
          metric: 'errorRate',
          threshold: this.config.alertThresholds.errorRate,
          currentValue: errorRate,
          layer,
          message: `High error rate on ${layer}: ${(errorRate * 100).toFixed(2)}%`
        });
      }
    }
  }

  private _addMetricDataPoint(metricName: string, value: number, metadata?: Record<string, unknown>): void {
    const timestamp = Date.now();
    
    if (!this.timeSeries.has(metricName)) {
      this.timeSeries.set(metricName, {
        name: metricName,
        dataPoints: [],
        aggregations: { min: value, max: value, avg: value, sum: value, count: 1 }
      });
    }
    
    const series = this.timeSeries.get(metricName)!;
    series.dataPoints.push({ timestamp, value, metadata });
    
    // Update aggregations
    series.aggregations = this._calculateAggregations(series.dataPoints);
    
    // Limit data points to prevent memory issues
    if (series.dataPoints.length > 10000) {
      series.dataPoints.splice(0, series.dataPoints.length - 8000);
      series.aggregations = this._calculateAggregations(series.dataPoints);
    }
  }

  private _calculateAggregations(dataPoints: MetricDataPoint[]): TimeSeries['aggregations'] {
    if (dataPoints.length === 0) {
      return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
    }
    
    const values = dataPoints.map(p => p.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum,
      count: values.length
    };
  }

  private async _calculateOverallMetrics(): Promise<CachePerformanceMetrics> {
    const layerMetrics = new Map<CacheLayer, CachePerformanceMetrics>();
    
    for (const layer of this.layers.keys()) {
      layerMetrics.set(layer, await this._calculateLayerMetrics(layer));
    }
    
    // Aggregate metrics
    const metrics = Array.from(layerMetrics.values());
    
    return {
      hitRatio: this._average(metrics.map(m => m.hitRatio)),
      averageResponseTime: this._average(metrics.map(m => m.averageResponseTime)),
      operationsPerSecond: metrics.reduce((sum, m) => sum + m.operationsPerSecond, 0),
      errorRate: this._average(metrics.map(m => m.errorRate)),
      memoryUsage: metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0),
      diskUsage: metrics.reduce((sum, m) => sum + (m.diskUsage || 0), 0),
      evictionRate: this._average(metrics.map(m => m.evictionRate)),
      compressionRatio: this._average(metrics.map(m => m.compressionRatio || 0)),
      lastUpdated: new Date()
    };
  }

  private async _calculateLayerMetrics(layer: CacheLayer): Promise<CachePerformanceMetrics> {
    const layerInstance = this.layers.get(layer);
    if (!layerInstance) {
      return this._getEmptyMetrics();
    }
    
    try {
      const stats = await layerInstance.stats();
      const operationTimes = this._getOperationTimes(layer);
      const errorCount = this.errorCounts.get(`errors_${layer}`) || 0;
      
      return {
        hitRatio: stats.hitRatio || 0,
        averageResponseTime: this._average(operationTimes),
        operationsPerSecond: this._calculateOpsPerSecond(layer),
        errorRate: this._calculateErrorRate(layer),
        memoryUsage: stats.memoryUsage,
        diskUsage: stats.diskUsage,
        evictionRate: this._calculateEvictionRate(layer),
        compressionRatio: stats.compressionRatio,
        lastUpdated: new Date()
      };
    } catch {
      return this._getEmptyMetrics();
    }
  }

  private async _calculateNamespaceMetrics(namespace: CacheNamespace): Promise<CachePerformanceMetrics> {
    // This would require tracking operations by namespace
    // For now, return empty metrics
    return this._getEmptyMetrics();
  }

  private _getEmptyMetrics(): CachePerformanceMetrics {
    return {
      hitRatio: 0,
      averageResponseTime: 0,
      operationsPerSecond: 0,
      errorRate: 0,
      evictionRate: 0,
      lastUpdated: new Date()
    };
  }

  private _getOperationTimes(layer: CacheLayer): number[] {
    const allTimes: number[] = [];
    
    for (const [key, times] of this.operationTimes) {
      if (key.endsWith(`:${layer}`)) {
        allTimes.push(...times);
      }
    }
    
    return allTimes;
  }

  private _getTotalOperations(layer: CacheLayer): number {
    let total = 0;
    
    for (const [metricName, series] of this.timeSeries) {
      if (metricName.startsWith('operations_') && metricName.endsWith(`_${layer}`)) {
        total += series.aggregations.sum;
      }
    }
    
    return total;
  }

  private _calculateOpsPerSecond(layer: CacheLayer): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    let operations = 0;
    
    for (const [metricName, series] of this.timeSeries) {
      if (metricName.startsWith('operations_') && metricName.endsWith(`_${layer}`)) {
        operations += series.dataPoints
          .filter(p => p.timestamp >= oneMinuteAgo)
          .reduce((sum, p) => sum + p.value, 0);
      }
    }
    
    return operations / 60; // per second
  }

  private _calculateErrorRate(layer: CacheLayer): number {
    const errors = this.errorCounts.get(`errors_${layer}`) || 0;
    const total = this._getTotalOperations(layer);
    
    return total > 0 ? errors / total : 0;
  }

  private _calculateEvictionRate(layer: CacheLayer): number {
    const evictionSeries = this.timeSeries.get(`evictions_${layer}`);
    if (!evictionSeries) {
      return 0;
    }
    
    const total = this._getTotalOperations(layer);
    return total > 0 ? evictionSeries.aggregations.sum / total : 0;
  }

  private _average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private _aggregateHealthStatus(healths: Map<CacheLayer, Partial<CacheHealth>>): 'ok' | 'warning' | 'critical' {
    let hasCritical = false;
    let hasWarning = false;
    
    for (const health of healths.values()) {
      if (health.status === 'critical') {
        hasCritical = true;
      } else if (health.status === 'warning') {
        hasWarning = true;
      }
    }
    
    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'ok';
  }

  private _checkStatsForAlerts(layer: CacheLayer, stats: Partial<CacheStats>): void {
    // Check hit ratio
    if (stats.hitRatio !== undefined && stats.hitRatio < this.config.alertThresholds.hitRatio) {
      this._triggerAlert({
        type: 'warning',
        metric: 'hitRatio',
        threshold: this.config.alertThresholds.hitRatio,
        currentValue: stats.hitRatio,
        layer,
        message: `Low hit ratio on ${layer}: ${(stats.hitRatio * 100).toFixed(2)}%`
      });
    }
    
    // Check memory usage
    if (stats.memoryUsage !== undefined) {
      const memoryRatio = stats.memoryUsage / (100 * 1024 * 1024); // Assume 100MB limit
      if (memoryRatio > this.config.alertThresholds.memoryUsage) {
        this._triggerAlert({
          type: memoryRatio > 0.9 ? 'critical' : 'warning',
          metric: 'memoryUsage',
          threshold: this.config.alertThresholds.memoryUsage,
          currentValue: memoryRatio,
          layer,
          message: `High memory usage on ${layer}: ${(memoryRatio * 100).toFixed(2)}%`
        });
      }
    }
  }

  private _triggerAlert(alert: Omit<AlertEvent, 'id' | 'timestamp'>): void {
    const alertEvent: AlertEvent = {
      ...alert,
      id: `${alert.metric}_${alert.layer || 'global'}_${Date.now()}`,
      timestamp: Date.now()
    };
    
    // Avoid duplicate alerts
    const existingKey = `${alert.metric}_${alert.layer || 'global'}`;
    if (this.activeAlerts.has(existingKey)) {
      return;
    }
    
    this.activeAlerts.set(existingKey, alertEvent);
    
    // Auto-resolve alerts after 5 minutes
    setTimeout(() => {
      this.activeAlerts.delete(existingKey);
      this.emit('alertResolved', alertEvent);
    }, 5 * 60 * 1000);
    
    this.emit('alert', alertEvent);
  }

  private _cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    for (const series of this.timeSeries.values()) {
      const originalLength = series.dataPoints.length;
      series.dataPoints = series.dataPoints.filter(p => p.timestamp >= cutoff);
      
      if (series.dataPoints.length !== originalLength) {
        series.aggregations = this._calculateAggregations(series.dataPoints);
      }
    }
  }
}