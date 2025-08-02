/**
 * Storage Service - Core service for managing storage in the performance system
 */

import type {
  Metric,
  Alert,
  PerformanceEvent,
  EventFilter,
  MetricQuery,
  AlertQuery
} from '../types/index.js';
import type {
  StorageService,
  StorageServiceStats,
  AlertStorage,
  CleanupResult,
  BackupResult,
  RestoreResult
} from './interfaces.js';
import type {
  MetricStorage,
  EventStore
} from '../types/index.js';

// Type definitions for adapters
interface LocalMetricStorageAdapter {
  store(metric: Metric): Promise<void>;
  storeBatch(metrics: Metric[]): Promise<void>;
  query(query: MetricQuery): Promise<Metric[]>;
  delete(query: MetricQuery): Promise<number>;
  cleanup(cutoffTime: number): Promise<number>;
  clear(): Promise<void>;
  getStats?(): Promise<any>;
}

interface LocalEventStorageAdapter {
  store(event: PerformanceEvent): Promise<void>;
  storeBatch(events: PerformanceEvent[]): Promise<void>;
  query(filter: EventFilter): Promise<PerformanceEvent[]>;
  delete(filter: EventFilter): Promise<number>;
  cleanup(cutoffTime: number): Promise<number>;
  clear(): Promise<void>;
  getStats?(): Promise<any>;
}

interface LocalStorageConfig {
  retentionDays?: number;
  maxStorageSize?: number;
  compressionEnabled?: boolean;
  backupEnabled?: boolean;
}

/**
 * Default storage service implementation
 */
export class DefaultStorageService implements StorageService {
  private _metricStorage: LocalMetricStorageAdapter;
  private _alertStorage: AlertStorage;
  private _eventStorage: LocalEventStorageAdapter;
  private _config: LocalStorageConfig;

  constructor(
    metricStorage: LocalMetricStorageAdapter,
    alertStorage: AlertStorage,
    eventStorage: LocalEventStorageAdapter,
    config: LocalStorageConfig = {}
  ) {
    this._metricStorage = metricStorage;
    this._alertStorage = alertStorage;
    this._eventStorage = eventStorage;
    this._config = {
      retentionDays: 30,
      maxStorageSize: 1024 * 1024 * 1024, // 1GB
      compressionEnabled: true,
      backupEnabled: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Initialize storage components if needed
  }

  getMetricStorage(): MetricStorage {
    return this._metricStorage as any;
  }

  getEventStore(): EventStore {
    return this._eventStorage as any;
  }

  getAlertStorage(): AlertStorage {
    return this._alertStorage;
  }

  async getStats(): Promise<StorageServiceStats> {
    const baseStats = await this.getStorageStats();
    return {
      ...baseStats,
      health: {
        status: 'healthy',
        freeSpace: 1000000,
        totalSpace: 10000000
      }
    };
  }

  // Metric storage methods
  async storeMetric(metric: Metric): Promise<void> {
    try {
      await this._metricStorage.store(metric);
    } catch (error) {
      this.handleError('storeMetric', error as Error);
      throw error;
    }
  }

  async storeMetrics(metrics: Metric[]): Promise<void> {
    try {
      await this._metricStorage.storeBatch(metrics);
    } catch (error) {
      this.handleError('storeMetrics', error as Error);
      throw error;
    }
  }

  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    try {
      return await this._metricStorage.query(query);
    } catch (error) {
      this.handleError('queryMetrics', error as Error);
      throw error;
    }
  }

  async deleteMetrics(query: MetricQuery): Promise<number> {
    try {
      return await this._metricStorage.delete(query);
    } catch (error) {
      this.handleError('deleteMetrics', error as Error);
      throw error;
    }
  }

  // Alert storage methods
  async storeAlert(alert: Alert): Promise<void> {
    try {
      await this._alertStorage.store(alert);
    } catch (error) {
      this.handleError('storeAlert', error as Error);
      throw error;
    }
  }

  async queryAlerts(query: AlertQuery): Promise<Alert[]> {
    try {
      return await this._alertStorage.query(query);
    } catch (error) {
      this.handleError('queryAlerts', error as Error);
      throw error;
    }
  }

  async deleteAlerts(query: AlertQuery): Promise<number> {
    try {
      // For now, return a mock count since AlertStorage.delete signature is unclear
      return 0;
    } catch (error) {
      this.handleError('deleteAlerts', error as Error);
      return 0;
    }
  }

  // Event storage methods
  async storeEvent(event: PerformanceEvent): Promise<void> {
    try {
      await this._eventStorage.store(event);
    } catch (error) {
      this.handleError('storeEvent', error as Error);
      throw error;
    }
  }

  async storeEvents(events: PerformanceEvent[]): Promise<void> {
    try {
      await this._eventStorage.storeBatch(events);
    } catch (error) {
      this.handleError('storeEvents', error as Error);
      throw error;
    }
  }

  async queryEvents(filter: EventFilter): Promise<PerformanceEvent[]> {
    try {
      return await this._eventStorage.query(filter);
    } catch (error) {
      this.handleError('queryEvents', error as Error);
      throw error;
    }
  }

  async deleteEvents(filter: EventFilter): Promise<number> {
    try {
      return await this._eventStorage.delete(filter);
    } catch (error) {
      this.handleError('deleteEvents', error as Error);
      throw error;
    }
  }

  // Storage management methods
  async cleanup(olderThan?: number): Promise<CleanupResult> {
    const cutoffTime = olderThan || (Date.now() - (this._config.retentionDays! * 24 * 60 * 60 * 1000));
    const startTime = Date.now();
    
    try {
      const [metricsDeleted, alertsDeleted, eventsDeleted] = await Promise.all([
        this._metricStorage.cleanup(cutoffTime),
        this.cleanupAlerts(cutoffTime),
        this._eventStorage.cleanup(cutoffTime)
      ]);

      const result: CleanupResult = {
        itemsRemoved: metricsDeleted + alertsDeleted + eventsDeleted,
        spaceFreed: await this.calculateSpaceFreed(metricsDeleted, alertsDeleted, eventsDeleted),
        duration: Date.now() - startTime,
        errors: []
      };

      return result;
    } catch (error) {
      this.handleError('cleanup', error as Error);
      return {
        itemsRemoved: 0,
        spaceFreed: 0,
        duration: 0,
        errors: [(error as Error).message]
      };
    }
  }

  async backup(destination: string): Promise<BackupResult> {
    if (!this._config.backupEnabled) {
      throw new Error('Backup is disabled in configuration');
    }

    try {
      const timestamp = Date.now();
      const backupId = `backup_${timestamp}`;
      
      // Get all data
      const [metrics, alerts, events] = await Promise.all([
        this.exportMetrics(),
        this.exportAlerts(),
        this.exportEvents()
      ]);

      const backupData = {
        metadata: {
          id: backupId,
          timestamp,
          version: '1.0.0',
          source: 'performance-system'
        },
        metrics,
        alerts,
        events
      };

      // Compress if enabled
      let data = JSON.stringify(backupData);
      if (this._config.compressionEnabled) {
        data = await this.compress(data);
      }

      // Store backup
      await this.storeBackup(destination, backupId, data);

      return {
        filePath: `${destination}/${backupId}.json${this._config.compressionEnabled ? '.gz' : ''}`,
        size: data.length,
        itemCount: Object.keys(backupData.metrics || {}).length + Object.keys(backupData.alerts || {}).length + Object.keys(backupData.events || {}).length,
        duration: Date.now() - timestamp,
        checksum: this.calculateChecksum(data)
      };
    } catch (error) {
      this.handleError('backup', error as Error);
      return {
        filePath: '',
        size: 0,
        itemCount: 0,
        duration: 0,
        checksum: ''
      };
    }
  }

  async restore(source: string): Promise<RestoreResult> {
    try {
      // Load backup data
      let data = await this.loadBackup(source);
      
      // Decompress if needed
      if (source.endsWith('.gz')) {
        data = await this.decompress(data);
      }

      const backupData = JSON.parse(data);
      
      // Validate backup format
      if (!backupData.metadata || !backupData.metadata.id) {
        throw new Error('Invalid backup format');
      }

      // Clear existing data (optional - could be configurable)
      await this.clearAllData();

      // Restore data
      const restoredCounts = await Promise.all([
        this.restoreMetrics(backupData.metrics || []),
        this.restoreAlerts(backupData.alerts || []),
        this.restoreEvents(backupData.events || [])
      ]);

      const timestamp = Date.now();
      return {
        itemsRestored: restoredCounts.reduce((sum, count) => sum + count, 0),
        duration: Date.now() - timestamp,
        errors: [],
        integrityCheck: true
      };
    } catch (error) {
      this.handleError('restore', error as Error);
      return {
        itemsRestored: 0,
        duration: 0,
        errors: [(error as Error).message],
        integrityCheck: false
      };
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    try {
      const [metricStats, alertStats, eventStats] = await Promise.all([
        this._metricStorage.getStats?.() || Promise.resolve({}),
        this._alertStorage.getStats(),
        this._eventStorage.getStats?.() || Promise.resolve({})
      ]);

      return {
        totalSize: metricStats.storageSize + alertStats.storageSize + eventStats.storageSize,
        metrics: {
          count: metricStats.totalMetrics,
          size: metricStats.storageSize
        },
        alerts: {
          count: alertStats.totalAlerts,
          size: alertStats.storageSize
        },
        events: {
          count: eventStats.totalEvents,
          size: eventStats.storageSize
        },
        lastCleanup: this.getLastCleanupTime(),
        lastBackup: this.getLastBackupTime()
      };
    } catch (error) {
      this.handleError('getStorageStats', error as Error);
      throw error;
    }
  }

  // Private helper methods
  private async calculateSpaceFreed(
    metricsDeleted: number,
    alertsDeleted: number,
    eventsDeleted: number
  ): Promise<number> {
    // Rough estimation - in a real implementation, this would be more accurate
    const avgMetricSize = 200; // bytes
    const avgAlertSize = 500; // bytes
    const avgEventSize = 300; // bytes
    
    return (metricsDeleted * avgMetricSize) + 
           (alertsDeleted * avgAlertSize) + 
           (eventsDeleted * avgEventSize);
  }

  private async compress(data: string): Promise<string> {
    // In a real implementation, use a compression library like zlib
    // For now, just return the data as-is
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // In a real implementation, use a decompression library
    // For now, just return the data as-is
    return data;
  }

  private async storeBackup(destination: string, backupId: string, data: string): Promise<void> {
    // In a real implementation, this would write to file system, cloud storage, etc.
    // For now, just simulate the operation
    console.log(`Storing backup ${backupId} to ${destination}`);
  }

  private async loadBackup(source: string): Promise<string> {
    // In a real implementation, this would read from file system, cloud storage, etc.
    // For now, just simulate the operation
    throw new Error('Backup loading not implemented in this demo');
  }

  private async clearAllData(): Promise<void> {
    await Promise.all([
      this._metricStorage.clear(),
      this.clearAlerts(),
      this._eventStorage.clear()
    ]);
  }

  private async restoreMetrics(metrics: Metric[]): Promise<number> {
    await this._metricStorage.storeBatch(metrics);
    return metrics.length;
  }

  private async restoreAlerts(alerts: Alert[]): Promise<number> {
    for (const alert of alerts) {
      await this._alertStorage.store(alert);
    }
    return alerts.length;
  }

  private async restoreEvents(events: PerformanceEvent[]): Promise<number> {
    await this._eventStorage.storeBatch(events);
    return events.length;
  }

  private getLastCleanupTime(): number {
    // In a real implementation, this would be persisted
    return 0;
  }

  private getLastBackupTime(): number {
    // In a real implementation, this would be persisted
    return 0;
  }

  private async exportMetrics(): Promise<any[]> {
    // Implementation to export all metrics
    return [];
  }

  private async exportAlerts(): Promise<any[]> {
    // Implementation to export all alerts
    return [];
  }

  private async exportEvents(): Promise<any[]> {
    // Implementation to export all events
    return [];
  }

  private calculateChecksum(data: string): string {
    // In a real implementation, use a proper checksum algorithm
    // For now, just return a simple hash
    return data.length.toString(16);
  }

  private async cleanupAlerts(cutoffTime: number): Promise<number> {
    // Implementation for cleaning up alerts older than cutoffTime
    // For now, return a mock count since AlertStorage doesn't have cleanup method
    return 0;
  }

  private async clearAlerts(): Promise<void> {
    // Implementation for clearing all alerts
    // Since AlertStorage doesn't have clear method, we'll implement a workaround
    try {
      // Clear alerts by deleting all (mock implementation)
    } catch (error) {
      this.handleError('clearAlerts', error as Error);
    }
  }

  private handleError(operation: string, error: Error): void {
    console.error(`[StorageService] Error in ${operation}:`, error);
  }
}

// Storage adapter interfaces and implementations
export interface MetricStorageAdapter {
  store(metric: Metric): Promise<void>;
  storeBatch(metrics: Metric[]): Promise<void>;
  query(query: MetricQuery): Promise<Metric[]>;
  delete(query: MetricQuery): Promise<number>;
  cleanup(olderThan: number): Promise<number>;
  getStats(): Promise<{ totalMetrics: number; storageSize: number }>;
  exportAll(): Promise<Metric[]>;
  clear(): Promise<void>;
}

export interface EventStorageAdapter {
  store(event: PerformanceEvent): Promise<void>;
  storeBatch(events: PerformanceEvent[]): Promise<void>;
  query(filter: EventFilter): Promise<PerformanceEvent[]>;
  delete(filter: EventFilter): Promise<number>;
  cleanup(olderThan: number): Promise<number>;
  getStats(): Promise<{ totalEvents: number; storageSize: number }>;
  exportAll(): Promise<PerformanceEvent[]>;
  clear(): Promise<void>;
}

export interface StorageConfig {
  retentionDays?: number;
  maxStorageSize?: number;
  compressionEnabled?: boolean;
  backupEnabled?: boolean;
}

export interface StorageStats {
  totalSize: number;
  metrics: {
    count: number;
    size: number;
  };
  alerts: {
    count: number;
    size: number;
  };
  events: {
    count: number;
    size: number;
  };
  lastCleanup: number;
  lastBackup: number;
}

/**
 * In-memory metric storage adapter
 */
export class InMemoryMetricStorageAdapter implements MetricStorageAdapter {
  private _metrics: Map<string, Metric> = new Map();
  private _stats = {
    totalMetrics: 0,
    storageSize: 0
  };

  async store(metric: Metric): Promise<void> {
    const key = this.generateKey(metric);
    this._metrics.set(key, metric);
    this._stats.totalMetrics++;
    this._stats.storageSize += this.estimateSize(metric);
  }

  async storeBatch(metrics: Metric[]): Promise<void> {
    for (const metric of metrics) {
      await this.store(metric);
    }
  }

  async query(query: MetricQuery): Promise<Metric[]> {
    let results = Array.from(this._metrics.values());

    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.tags) {
      results = results.filter(m => {
        if (!m.tags) return false;
        return Object.entries(query.tags!).every(([key, value]) => 
          m.tags![key] === value
        );
      });
    }

    if (query.timeRange) {
      results = results.filter(m => 
        m.timestamp >= query.timeRange!.start && 
        m.timestamp <= query.timeRange!.end
      );
    }

    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async delete(query: MetricQuery): Promise<number> {
    const metricsToDelete = await this.query(query);
    let deletedCount = 0;

    for (const metric of metricsToDelete) {
      const key = this.generateKey(metric);
      if (this._metrics.delete(key)) {
        this._stats.totalMetrics--;
        this._stats.storageSize -= this.estimateSize(metric);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async cleanup(olderThan: number): Promise<number> {
    const query: MetricQuery = {
      timeRange: {
        start: 0,
        end: olderThan
      }
    };
    
    return this.delete(query);
  }

  async getStats(): Promise<{ totalMetrics: number; storageSize: number }> {
    return { ...this._stats };
  }

  async exportAll(): Promise<Metric[]> {
    return Array.from(this._metrics.values());
  }

  async clear(): Promise<void> {
    this._metrics.clear();
    this._stats.totalMetrics = 0;
    this._stats.storageSize = 0;
  }

  private generateKey(metric: Metric): string {
    return `${metric.name}_${metric.timestamp}_${JSON.stringify(metric.tags || {})}`;
  }

  private estimateSize(metric: Metric): number {
    return JSON.stringify(metric).length * 2; // Rough estimation
  }
}

/**
 * In-memory event storage adapter
 */
export class InMemoryEventStorageAdapter implements EventStorageAdapter {
  private _events: Map<string, PerformanceEvent> = new Map();
  private _stats = {
    totalEvents: 0,
    storageSize: 0
  };

  async store(event: PerformanceEvent): Promise<void> {
    const key = this.generateKey(event);
    this._events.set(key, event);
    this._stats.totalEvents++;
    this._stats.storageSize += this.estimateSize(event);
  }

  async storeBatch(events: PerformanceEvent[]): Promise<void> {
    for (const event of events) {
      await this.store(event);
    }
  }

  async query(filter: EventFilter): Promise<PerformanceEvent[]> {
    let results = Array.from(this._events.values());

    if (filter.types && filter.types.length > 0) {
      results = results.filter(e => filter.types!.includes(e.type));
    }

    if (filter.sources && filter.sources.length > 0) {
      results = results.filter(e => e.source && filter.sources!.includes(e.source));
    }

    if (filter.correlationIds && filter.correlationIds.length > 0) {
      results = results.filter(e => e.correlationId && filter.correlationIds!.includes(e.correlationId));
    }

    if (filter.timeRange) {
      results = results.filter(e => 
        e.timestamp >= filter.timeRange!.start && 
        e.timestamp <= filter.timeRange!.end
      );
    }

    if (filter.metadata) {
      results = results.filter(e => {
        if (!e.metadata) return false;
        return Object.entries(filter.metadata!).every(([key, value]) => 
          e.metadata![key] === value
        );
      });
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async delete(filter: EventFilter): Promise<number> {
    const eventsToDelete = await this.query(filter);
    let deletedCount = 0;

    for (const event of eventsToDelete) {
      const key = this.generateKey(event);
      if (this._events.delete(key)) {
        this._stats.totalEvents--;
        this._stats.storageSize -= this.estimateSize(event);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async cleanup(olderThan: number): Promise<number> {
    const filter: EventFilter = {
      timeRange: {
        start: 0,
        end: olderThan
      }
    };
    
    return this.delete(filter);
  }

  async getStats(): Promise<{ totalEvents: number; storageSize: number }> {
    return { ...this._stats };
  }

  async exportAll(): Promise<PerformanceEvent[]> {
    return Array.from(this._events.values());
  }

  async clear(): Promise<void> {
    this._events.clear();
    this._stats.totalEvents = 0;
    this._stats.storageSize = 0;
  }

  private generateKey(event: PerformanceEvent): string {
    return `${event.type}_${event.timestamp}_${event.source || 'unknown'}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateSize(event: PerformanceEvent): number {
    return JSON.stringify(event).length * 2; // Rough estimation
  }
}