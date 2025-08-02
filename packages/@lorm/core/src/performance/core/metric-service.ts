/**
 * Metric Service - Core service for managing metrics in the performance system
 */

import type {
  Metric,
  MetricQuery,
  MetricStorage,
  AggregatedMetric
} from '../types/index.js';
import {
  AggregationType
} from '../types/index.js';
import type {
  MetricService,
  MetricServiceStats
} from './interfaces.js';

/**
 * Default metric service implementation
 */
export class DefaultMetricService implements MetricService {
  private _storage: MetricStorage;
  private _stats: MetricServiceStats;
  private _eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

  constructor(storage: MetricStorage) {
    this._storage = storage;
    this._stats = this.initializeStats();
  }

  async record(metric: Metric): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this._storage.store(metric);
      
      this._stats.totalMetrics++;
      this._stats.metricsByType[metric.type] = (this._stats.metricsByType[metric.type] || 0) + 1;
      this._stats.metricsByComponent[metric.component] = (this._stats.metricsByComponent[metric.component] || 0) + 1;
      
      const recordingTime = Date.now() - startTime;
      this._stats.averageRecordingTime = this.updateAverage(
        this._stats.averageRecordingTime,
        recordingTime,
        this._stats.totalMetrics
      );
      
      this.emitEvent('metric:recorded', {
        metric,
        recordingTime
      });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async recordBatch(metrics: Metric[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this._storage.storeBatch(metrics);
      
      // Update statistics
      this._stats.totalMetrics += metrics.length;
      
      for (const metric of metrics) {
        this._stats.metricsByType[metric.type] = (this._stats.metricsByType[metric.type] || 0) + 1;
        this._stats.metricsByComponent[metric.component] = (this._stats.metricsByComponent[metric.component] || 0) + 1;
      }
      
      const recordingTime = Date.now() - startTime;
      this._stats.averageRecordingTime = this.updateAverage(
        this._stats.averageRecordingTime,
        recordingTime,
        this._stats.totalMetrics
      );
      
      this.emitEvent('metrics:recorded:batch', {
        metricsCount: metrics.length,
        recordingTime
      });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async query(query: MetricQuery): Promise<Metric[]> {
    const startTime = Date.now();
    
    try {
      const results = await this._storage.query(query);
      
      this._stats.queryCount++;
      const queryTime = Date.now() - startTime;
      this._stats.averageQueryTime = this.updateAverage(
        this._stats.averageQueryTime,
        queryTime,
        this._stats.queryCount
      );
      
      this.emitEvent('metrics:queried', {
        query,
        resultsCount: results.length,
        queryTime
      });
      
      return results;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getById(metricId: string): Promise<Metric | null> {
    try {
      return await this._storage.getById(metricId);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getLatest(componentId: string, limit: number = 10): Promise<Metric[]> {
    const query: MetricQuery = {
      component: componentId,
      limit
    };
    
    return this.query(query);
  }

  async aggregate(query: MetricQuery): Promise<AggregatedMetric[]> {
    const startTime = Date.now();
    
    try {
      const results = await this._storage.aggregate(query);
      
      this._stats.queryCount++;
      const queryTime = Date.now() - startTime;
      this._stats.averageQueryTime = this.updateAverage(
        this._stats.averageQueryTime,
        queryTime,
        this._stats.queryCount
      );
      
      this.emitEvent('metrics:aggregated', {
        query,
        resultsCount: results.length,
        queryTime
      });
      
      return results;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getStats(): Promise<MetricServiceStats> {
    try {
      const storageStats = await this._storage.getStats();
      
      return {
        ...this._stats,
        storageSize: storageStats.storageSize
      };
    } catch (error) {
      this.handleError(error as Error);
      return this._stats;
    }
  }

  async cleanup(olderThan: number): Promise<number> {
    try {
      const deletedCount = await this._storage.cleanup(olderThan);
      
      this.emitEvent('metrics:cleanup', {
        deletedCount,
        olderThan
      });
      
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  // Event handling
  on(event: string, listener: (data: unknown) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: unknown) => void): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: unknown): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }

    // Also emit to 'all' listeners
    const allListeners = this._eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener({ event, data });
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }
  }

  private handleError(error: Error): void {
    this.emitEvent('service:error', {
      service: 'metric',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });

    // Log error if logger is available
    if (console && console.error) {
      console.error('[MetricService] Error:', error);
    }
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private initializeStats(): MetricServiceStats {
    return {
      totalMetrics: 0,
      metricsByType: {},
      metricsByComponent: {},
      averageRecordingTime: 0,
      storageSize: 0,
      queryCount: 0,
      averageQueryTime: 0
    };
  }
}

/**
 * In-memory metric storage implementation
 */
export class InMemoryMetricStorage implements MetricStorage {
  private _metrics: Map<string, Metric> = new Map();
  private _stats = {
    totalMetrics: 0,
    storageSize: 0
  };

  async store(metric: Metric): Promise<void> {
    this._metrics.set(metric.id, metric);
    this._stats.totalMetrics++;
    this._stats.storageSize += this.estimateMetricSize(metric);
  }

  async storeBatch(metrics: Metric[]): Promise<void> {
    for (const metric of metrics) {
      this._metrics.set(metric.id, metric);
      this._stats.storageSize += this.estimateMetricSize(metric);
    }
    this._stats.totalMetrics += metrics.length;
  }

  async getById(metricId: string): Promise<Metric | null> {
    return this._metrics.get(metricId) || null;
  }

  async query(query: MetricQuery): Promise<Metric[]> {
    let results = Array.from(this._metrics.values());

    // Apply filters
    if (query.component) {
      results = results.filter(m => m.component === query.component);
    }

    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.timeRange) {
      results = results.filter(m => 
        m.timestamp >= query.timeRange!.start && 
        m.timestamp <= query.timeRange!.end
      );
    }

    if (query.tags) {
      results = results.filter(m => {
        if (!m.tags) return false;
        return Object.entries(query.tags!).every(([key, value]) => 
          m.tags![key] === value
        );
      });
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async aggregate(query: MetricQuery): Promise<AggregatedMetric[]> {
    const baseResults = await this.query(query);
    
    if (!query.aggregation) {
      return [];
    }

    // Group metrics by component
    const groups = new Map<string, Metric[]>();
    
    for (const metric of baseResults) {
      const groupKey = metric.component;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(metric);
    }

    // Aggregate each group
    const aggregatedResults: AggregatedMetric[] = [];
    
    for (const [groupKey, groupMetrics] of Array.from(groups.entries())) {
      const aggregated = this.aggregateGroupToResult(groupMetrics, query.aggregation.type, query.aggregation.window);
      if (aggregated) {
        aggregatedResults.push(aggregated);
      }
    }

    return aggregatedResults;
  }

  async delete(metricId: string): Promise<boolean> {
    const metric = this._metrics.get(metricId);
    if (metric) {
      this._metrics.delete(metricId);
      this._stats.totalMetrics--;
      this._stats.storageSize -= this.estimateMetricSize(metric);
      return true;
    }
    return false;
  }

  async cleanup(olderThan: number): Promise<number> {
    let deletedCount = 0;
    
    for (const [id, metric] of Array.from(this._metrics.entries())) {
      if (metric.timestamp < olderThan) {
        this._metrics.delete(id);
        this._stats.storageSize -= this.estimateMetricSize(metric);
        deletedCount++;
      }
    }
    
    this._stats.totalMetrics -= deletedCount;
    return deletedCount;
  }

  async getStats(): Promise<{ totalMetrics: number; oldestMetric: number; newestMetric: number; storageSize: number }> {
    const metrics = Array.from(this._metrics.values());
    const timestamps = metrics.map(m => m.timestamp);
    
    return {
      ...this._stats,
      oldestMetric: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestMetric: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  private estimateMetricSize(metric: Metric): number {
    // Rough estimation of metric size in bytes
    return JSON.stringify(metric).length * 2; // Assuming UTF-16 encoding
  }

  private getMetricValue(metric: Metric, field: string = 'value'): number {
    switch (field) {
      case 'timestamp':
        return metric.timestamp;
      case 'value':
        // Handle different metric types
        if ('value' in metric) {
          return (metric as any).value;
        } else if ('count' in metric) {
          return (metric as any).count;
        } else if ('duration' in metric) {
          return (metric as any).duration;
        } else if ('buckets' in metric) {
          // For histogram metrics, return total count
          return (metric as any).buckets.reduce((sum: number, bucket: any) => sum + bucket.count, 0);
        }
        return 0;
      default:
        return 0;
    }
  }

  private getGroupKey(metric: Metric, groupBy?: string[]): string {
    if (!groupBy || groupBy.length === 0) {
      return 'default';
    }
    
    const keyParts: string[] = [];
    
    for (const field of groupBy) {
      switch (field) {
        case 'name':
          keyParts.push(metric.name);
          break;
        case 'type':
          keyParts.push(metric.type);
          break;
        case 'componentId':
        case 'component':
          keyParts.push(metric.component);
          break;
        default:
          if (metric.tags && metric.tags[field]) {
            keyParts.push(metric.tags[field]);
          }
          break;
      }
    }
    
    return keyParts.join('|');
  }

  private aggregateGroupToResult(metrics: Metric[], aggregationType: AggregationType, window: number): AggregatedMetric | null {
    if (metrics.length === 0) {
      return null;
    }

    const firstMetric = metrics[0];
    let aggregatedValue: number;
    
    switch (aggregationType) {
      case AggregationType.SUM:
        aggregatedValue = metrics.reduce((sum, m) => sum + this.getMetricValue(m), 0);
        break;
      case AggregationType.AVERAGE:
        aggregatedValue = metrics.reduce((sum, m) => sum + this.getMetricValue(m), 0) / metrics.length;
        break;
      case AggregationType.MIN:
        aggregatedValue = Math.min(...metrics.map(m => this.getMetricValue(m)));
        break;
      case AggregationType.MAX:
        aggregatedValue = Math.max(...metrics.map(m => this.getMetricValue(m)));
        break;
      case AggregationType.COUNT:
        aggregatedValue = metrics.length;
        break;
      default:
        aggregatedValue = this.getMetricValue(firstMetric);
        break;
    }

    const timestamps = metrics.map(m => m.timestamp);
    return {
      metricId: firstMetric.id,
      aggregationType,
      value: aggregatedValue,
      timeWindow: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps)
      },
      dataPoints: metrics.length
    };
  }
}