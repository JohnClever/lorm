/**
 * Base Monitor - Base implementation for performance monitors
 */

import type {
  PerformanceMonitor,
  MonitoringConfig,
  GlobalMonitoringConfig,
  MonitorableComponent,
  ComponentHealth,
  MonitoringStats,
  Metric,
  MetricCollection,
  MetricQuery,
  Alert,
  AlertQuery,
  PerformanceEventType
} from '../types/index.js';
import { MetricType, HealthStatus } from '../types/index.js';

/**
 * Monitor status enumeration
 */
export enum MonitorStatus {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * Base performance monitor implementation
 */
/**
 * Internal monitoring statistics
 */
interface InternalMonitoringStats {
  totalCollections: number;
  totalMetrics: number;
  totalAlerts: number;
  activeAlerts: number;
  collectionErrors: number;
  errors: number;
  componentsRegistered: number;
  componentsUnregistered: number;
  lastCollection: number;
  averageCollectionTime: number;
  maxCollectionTime: number;
  minCollectionTime: number;
}

export abstract class BasePerformanceMonitor implements PerformanceMonitor {
  protected _config: MonitoringConfig & { id: string };
  protected _status: MonitorStatus = MonitorStatus.IDLE;
  protected _components: Map<string, MonitorableComponent> = new Map();
  protected _stats: InternalMonitoringStats;
  protected _startTime: number = 0;
  protected _intervalId: NodeJS.Timeout | null = null;
  protected _eventListeners: Map<string, ((event: any) => void)[]> = new Map();

  constructor(config: MonitoringConfig & { id: string }) {
    this._config = { ...config };
    this._stats = this.initializeStats();
  }

  get config(): MonitoringConfig {
    return { ...this._config };
  }

  get status(): string {
    return this._status;
  }

  isRunning(): boolean {
    return this._status === MonitorStatus.RUNNING;
  }

  async start(): Promise<void> {
    if (this._status === MonitorStatus.RUNNING) {
      return;
    }

    this._status = MonitorStatus.STARTING;
    this._startTime = Date.now();

    try {
      await this.onStart();
      
      if (this._config.collectionInterval && this._config.collectionInterval > 0) {
        this._intervalId = setInterval(
          () => this.collectMetrics().catch(error => this.handleError(error)),
          this._config.collectionInterval
        );
      }

      this._status = MonitorStatus.RUNNING;
      this.emitEvent({
        type: 'monitoring:started',
        timestamp: Date.now(),
        componentId: this._config.id,
        payload: {
          monitorId: this._config.id,
          config: this._config
        }
      });
    } catch (error) {
      this._status = MonitorStatus.ERROR;
      this.handleError(error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._status === MonitorStatus.STOPPED || this._status === MonitorStatus.IDLE) {
      return;
    }

    this._status = MonitorStatus.STOPPING;

    try {
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }

      await this.onStop();
      this._status = MonitorStatus.STOPPED;
      
      this.emitEvent({
        type: 'monitoring:stopped',
        timestamp: Date.now(),
        componentId: this._config.id,
        payload: {
          monitorId: this._config.id,
          uptime: Date.now() - this._startTime
        }
      });
    } catch (error) {
      this._status = MonitorStatus.ERROR;
      this.handleError(error as Error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async registerComponent(component: MonitorableComponent): Promise<void> {
    this._components.set(component.componentId, component);
    this._stats.componentsRegistered++;
    
    this.emitEvent({
      type: 'component:registered',
      timestamp: Date.now(),
      componentId: component.componentId,
      payload: {
        componentId: component.componentId,
        componentType: component.componentName
      }
    });
  }

  async unregisterComponent(componentId: string): Promise<void> {
    const removed = this._components.delete(componentId);
    if (removed) {
      this._stats.componentsUnregistered++;
      
      this.emitEvent({
        type: 'component:unregistered',
        timestamp: Date.now(),
        componentId,
        payload: {
          componentId
        }
      });
    }
  }

  async getRegisteredComponents(): Promise<MonitorableComponent[]> {
    return Array.from(this._components.values());
  }

  getComponents(): MonitorableComponent[] {
    return Array.from(this._components.values());
  }

  getComponent(componentId: string): MonitorableComponent | null {
    return this._components.get(componentId) || null;
  }

  async getComponentHealth(componentId: string): Promise<ComponentHealth | null> {
    const component = this._components.get(componentId);
    if (!component) {
      return null;
    }

    try {
      return await this.collectComponentHealth(component);
    } catch (error) {
      this.handleError(error as Error);
      return {
        status: HealthStatus.UNHEALTHY,
        score: 0,
        checks: [{
          id: 'error_check',
          name: 'Error Check',
          status: HealthStatus.UNHEALTHY,
          message: (error as Error).message,
          duration: 0
        }],
        lastChecked: Date.now()
      };
    }
  }

  async getAllHealth(): Promise<Record<string, ComponentHealth>> {
    const health: Record<string, ComponentHealth> = {};
    
    for (const [componentId, component] of this._components) {
      try {
        health[componentId] = await this.collectComponentHealth(component);
      } catch (error) {
        this.handleError(error as Error);
        health[componentId] = {
          status: HealthStatus.UNHEALTHY,
          score: 0,
          checks: [{
            id: 'error_check',
            name: 'Error Check',
            status: HealthStatus.UNHEALTHY,
            message: (error as Error).message,
            duration: 0
          }],
          lastChecked: Date.now()
        };
      }
    }
    
    return health;
  }

  async collectMetrics(): Promise<MetricCollection> {
    const startTime = Date.now();
    const metrics: Metric[] = [];
    
    try {
      for (const [componentId, component] of this._components) {
        try {
          const componentMetrics = await this.collectComponentMetrics(component);
          metrics.push(...componentMetrics.metrics);
        } catch (error) {
          this.handleError(error as Error);
          this._stats.collectionErrors++;
        }
      }

      const collection: MetricCollection = {
        id: `collection_${Date.now()}`,
        name: 'component_metrics',
        component: this._config.id,
        timestamp: Date.now(),
        metrics,
        metadata: {
          collectionDuration: Date.now() - startTime,
          componentsCount: this._components.size
        }
      };

      this._stats.totalCollections++;
      this._stats.totalMetrics += metrics.length;
      this._stats.lastCollection = Date.now();
      this._stats.averageCollectionTime = this.updateAverage(
        this._stats.averageCollectionTime,
        Date.now() - startTime,
        this._stats.totalCollections
      );

      this.emitEvent({
        type: 'metrics:collected',
        timestamp: Date.now(),
        componentId: this._config.id,
        payload: {
          collection,
          duration: Date.now() - startTime
        }
      });

      return collection;
    } catch (error) {
      this._stats.collectionErrors++;
      this.handleError(error as Error);
      throw error;
    }
  }

  async getStats(): Promise<MonitoringStats> {
    return {
      registeredComponents: this._components.size,
      totalMetrics: this._stats.totalMetrics,
      totalAlerts: this._stats.totalAlerts,
      activeAlerts: this._stats.activeAlerts,
      uptime: this._startTime > 0 ? Date.now() - this._startTime : 0,
      lastCollection: this._stats.lastCollection,
      collectionPerformance: {
        averageDuration: this._stats.averageCollectionTime,
        maxDuration: this._stats.maxCollectionTime,
        minDuration: this._stats.minCollectionTime,
        totalCollections: this._stats.totalCollections
      },
      storage: {
        metricsSize: 0,
        alertsSize: 0,
        totalSize: 0
      }
    };
  }

  async updateConfig(config: Partial<GlobalMonitoringConfig>): Promise<void> {
    const oldConfig = { ...this._config };
    // Map global config to local config
    if (config.enabled !== undefined) this._config.enabled = config.enabled;
    if (config.defaultCollectionInterval !== undefined) this._config.collectionInterval = config.defaultCollectionInterval;
    if (config.defaultHealthCheckInterval !== undefined) this._config.healthCheckInterval = config.defaultHealthCheckInterval;
    if (config.defaultRetentionPeriod !== undefined) this._config.retentionPeriod = config.defaultRetentionPeriod;
    if (config.globalTags !== undefined) this._config.tags = { ...this._config.tags, ...config.globalTags };
    
    this.emitEvent({
      type: 'config:updated',
      timestamp: Date.now(),
      componentId: this._config.id,
      payload: {
        oldConfig,
        newConfig: this._config
      }
    });
    
    this.onConfigUpdate(oldConfig, this._config);
  }

  on(event: string, listener: (event: any) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: (event: any) => void): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  protected emitEvent(event: any): void {
    const listeners = this._eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
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
          listener(event);
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }
  }

  protected handleError(error: Error): void {
    this._stats.errors++;
    
    this.emitEvent({
      type: 'error:occurred',
      timestamp: Date.now(),
      componentId: this._config.id,
      payload: {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }
    });

    // Log error if logger is available
    if (console && console.error) {
      console.error(`[PerformanceMonitor:${this._config.id}] Error:`, error);
    }
  }

  protected updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  protected initializeStats(): InternalMonitoringStats {
    return {
      totalCollections: 0,
      totalMetrics: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      collectionErrors: 0,
      errors: 0,
      componentsRegistered: 0,
      componentsUnregistered: 0,
      lastCollection: 0,
      averageCollectionTime: 0,
      maxCollectionTime: 0,
      minCollectionTime: 0
    };
  }

  async recordMetric(metric: Metric): Promise<void> {
    // Default implementation - subclasses should override
    this._stats.totalMetrics++;
  }

  async recordMetrics(metrics: Metric[]): Promise<void> {
    // Default implementation - subclasses should override
    this._stats.totalMetrics += metrics.length;
  }

  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    // Default implementation - subclasses should override
    return [];
  }

  async queryAlerts(query: AlertQuery): Promise<Alert[]> {
    // Default implementation - subclasses should override
    return [];
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract collectComponentMetrics(component: MonitorableComponent): Promise<MetricCollection>;
  protected abstract collectComponentHealth(component: MonitorableComponent): Promise<ComponentHealth>;
  
  // Optional hook methods
  protected onConfigUpdate(oldConfig: MonitoringConfig, newConfig: MonitoringConfig): void {
    // Default implementation does nothing
    // Subclasses can override to handle config updates
  }
}

/**
 * Simple performance monitor implementation
 */
export class SimplePerformanceMonitor extends BasePerformanceMonitor {
  protected async onStart(): Promise<void> {
    // Simple implementation - no additional startup logic
  }

  protected async onStop(): Promise<void> {
    // Simple implementation - no additional shutdown logic
  }

  protected async collectComponentMetrics(component: MonitorableComponent): Promise<MetricCollection> {
    // Simple implementation - collect basic metrics
    const timestamp = Date.now();
    const metrics: Metric[] = [];

    // Add a basic health metric
    metrics.push({
      id: `${component.componentId}_health_${timestamp}`,
      name: 'component.health',
      description: 'Component health status',
      type: MetricType.GAUGE,
      value: 1, // Assume healthy if we can collect metrics
      timestamp,
      component: component.componentId,
      tags: {
        component: component.componentId,
        name: component.componentName
      }
    });

    return {
      id: `collection_${component.componentId}_${timestamp}`,
      name: 'component_metrics',
      component: component.componentId,
      timestamp,
      metrics,
      metadata: {
        componentType: component.componentName
      }
    };
  }

  protected async collectComponentHealth(component: MonitorableComponent): Promise<ComponentHealth> {
    // Simple implementation - assume healthy
    return {
      status: HealthStatus.HEALTHY,
      score: 100,
      checks: [{
        id: 'basic_health',
        name: 'Basic Health Check',
        status: HealthStatus.HEALTHY,
        duration: 0
      }],
      lastChecked: Date.now()
    };
  }
}