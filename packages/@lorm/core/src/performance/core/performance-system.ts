/**
 * Performance System - Main orchestrator for the performance monitoring framework
 */

import type {
  PerformanceConfig,
  PerformanceAdapter,
  PerformancePlugin,
  BasePerformanceEvent,
  PerformanceEvent,
  SystemEvent,
  ComponentEvent,
  MonitorableComponent,
  PluginContext,
  MetricProcessor,
  AlertHandler,
  ExportHandler,
  AdapterManager
} from '../types/index.js';
import type { PerformanceCollector } from '../types/monitoring.js';
import {
  PerformanceSystem,
  SystemStatus,
  type SystemHealth,
  type SystemStats,
  type MetricService,
  type AlertService,
  type EventService,
  type StorageService,
  type PerformanceSystemFactory,
  type PerformanceSystemBuilder
} from './interfaces.js';
import { DefaultMetricService, InMemoryMetricStorage } from './metric-service.js';
import { DefaultAlertService, InMemoryAlertStorage } from './alert-service.js';
import { DefaultEventService, InMemoryEventStore, DefaultEventPipeline } from './event-service.js';
import {
  DefaultStorageService,
  InMemoryMetricStorageAdapter,
  InMemoryEventStorageAdapter
} from './storage-service.js';

/**
 * Default performance system implementation
 */
export class DefaultPerformanceSystem implements PerformanceSystem {
  private _config: PerformanceConfig;
  private _status: SystemStatus = SystemStatus.STOPPED;
  private _adapters: Map<string, PerformanceAdapter> = new Map();
  private _plugins: Map<string, PerformancePlugin> = new Map();
  private _services: {
    metric: MetricService;
    alert: AlertService;
    event: EventService;
    storage: StorageService;
  };
  private _startTime = 0;
  private _stats: SystemStats;
  private _healthCheckInterval?: NodeJS.Timeout;
  private _cleanupInterval?: NodeJS.Timeout;
  private _components: Map<string, MonitorableComponent> = new Map();
  private _version = '1.0.0';

  // Readonly properties required by interface
  get config(): PerformanceConfig {
    return this._config;
  }

  get status(): SystemStatus {
    return this._status;
  }

  get version(): string {
    return this._version;
  }

  constructor(config: PerformanceConfig) {
    this._config = config;
    this._stats = this.initializeStats();
    this._services = this.initializeServices();
  }

  async initialize(): Promise<void> {
    if (this._status !== SystemStatus.STOPPED) {
      throw new Error(`Cannot initialize system in ${this._status} state`);
    }

    try {
      this._status = SystemStatus.INITIALIZING;
      
      // Emit initialization event
      this.emitSystemEvent('SYSTEM_INITIALIZING', {
        config: this._config
      });

      // Initialize services
      await this.initializeAllServices();

      // Load and initialize plugins
      await this.loadPlugins();

      // Initialize adapters
      await this.initializeAdapters();

      this._status = SystemStatus.INITIALIZED;
      
      this.emitSystemEvent('SYSTEM_INITIALIZED', {
        adaptersCount: this._adapters.size,
        pluginsCount: this._plugins.size
      });
    } catch (error) {
      this._status = SystemStatus.ERROR;
      this.emitSystemEvent('SYSTEM_ERROR', {
        error: (error as Error).message,
        phase: 'initialization'
      });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this._status !== SystemStatus.INITIALIZED) {
      throw new Error(`Cannot start system in ${this._status} state`);
    }

    try {
      this._status = SystemStatus.STARTING;
      this._startTime = Date.now();
      
      this.emitSystemEvent('SYSTEM_STARTING');

      // Start all adapters
      await this.startAdapters();

      // Start plugins
      await this.startPlugins();

      // Start periodic tasks
      this.startPeriodicTasks();

      this._status = SystemStatus.RUNNING;
      
      this.emitSystemEvent('SYSTEM_STARTED', {
        startTime: this._startTime,
        adaptersCount: this._adapters.size,
        pluginsCount: this._plugins.size
      });
    } catch (error) {
      this._status = SystemStatus.ERROR;
      this.emitSystemEvent('SYSTEM_ERROR', {
        error: (error as Error).message,
        phase: 'startup'
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._status === SystemStatus.STOPPED) {
      return;
    }

    try {
      this._status = SystemStatus.STOPPING;
      
      this.emitSystemEvent('SYSTEM_STOPPING');

      // Stop periodic tasks
      this.stopPeriodicTasks();

      // Stop plugins
      await this.stopPlugins();

      // Stop adapters
      await this.stopAdapters();

      // Shutdown services
      await this.shutdownServices();

      this._status = SystemStatus.STOPPED;
      
      this.emitSystemEvent('SYSTEM_STOPPED', {
        uptime: Date.now() - this._startTime
      });
    } catch (error) {
      this._status = SystemStatus.ERROR;
      this.emitSystemEvent('SYSTEM_ERROR', {
        error: (error as Error).message,
        phase: 'shutdown'
      });
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.initialize();
    await this.start();
  }

  getStatus(): SystemStatus {
    return this._status;
  }

  async getHealth(): Promise<SystemHealth> {
    const services = {
      metric: await this.getServiceHealth('metric'),
      alert: await this.getServiceHealth('alert'),
      event: await this.getServiceHealth('event'),
      storage: await this.getServiceHealth('storage')
    };

    const adapters: Record<string, any> = {};
    for (const [name, adapter] of this._adapters) {
      try {
        adapters[name] = await adapter.getHealth();
      } catch (error) {
        adapters[name] = {
          status: 'unhealthy',
          error: (error as Error).message
        };
      }
    }

    const plugins: Record<string, any> = {};
    for (const [name, plugin] of this._plugins) {
      plugins[name] = {
        status: plugin.isEnabled() ? 'healthy' : 'disabled'
      };
    }

    const overallStatus = this.calculateOverallHealth(services, adapters, plugins);

    return {
      status: overallStatus as 'healthy' | 'degraded' | 'unhealthy',
      score: this.calculateHealthScore(services, adapters, plugins),
      components: {},
      services,
      uptime: this._status === SystemStatus.RUNNING ? Date.now() - this._startTime : 0,
      lastCheck: Date.now()
    };
  }

  async getStats(): Promise<SystemStats> {
    const currentStats: SystemStats = {
      ...this._stats,
      uptime: this._status === SystemStatus.RUNNING ? Date.now() - this._startTime : 0,
      totalComponents: this._components.size,
      activeComponents: this._components.size
    };

    // Update service stats if available
    try {
      if (this._services?.metric && typeof this._services.metric.getStats === 'function') {
        const metricStats = await this._services.metric.getStats();
        currentStats.totalMetrics = metricStats.totalMetrics || 0;
      }
      
      if (this._services?.alert && typeof this._services.alert.getStats === 'function') {
        const alertStats = await this._services.alert.getStats();
        currentStats.totalAlerts = alertStats.totalAlerts || 0;
        currentStats.activeAlerts = alertStats.activeAlerts || 0;
      }
      
      if (this._services?.event && typeof this._services.event.getStats === 'function') {
        const eventStats = await this._services.event.getStats();
        currentStats.totalEvents = eventStats.totalEvents || 0;
      }
    } catch (error) {
      console.error('[PerformanceSystem] Error getting service stats:', error);
    }

    return currentStats;
  }

  getConfig(): PerformanceConfig {
    return { ...this._config };
  }

  async updateConfig(config: Partial<PerformanceConfig>): Promise<void> {
    const oldConfig = { ...this._config };
    this._config = { ...this._config, ...config };
    
    this.emitSystemEvent('CONFIG_UPDATED', {
      oldConfig,
      newConfig: this._config
    });

    // Notify adapters and plugins of config change
    await this.notifyConfigChange();
  }

  // Service accessors
  getMetricService(): MetricService {
    return this._services.metric;
  }

  getAlertService(): AlertService {
    return this._services.alert;
  }

  getEventService(): EventService {
    return this._services.event;
  }

  getStorageService(): StorageService {
    return this._services.storage;
  }

  // Missing interface methods
  async shutdown(): Promise<void> {
    await this.stop();
  }

  // Plugin context methods
  async registerCollector(collector: PerformanceCollector): Promise<void> {
    // Implementation would register the collector with the metric service
    console.log(`[PerformanceSystem] Registering collector: ${collector.collectorName}`);
  }

  async unregisterCollector(collectorId: string): Promise<boolean> {
    // Implementation would unregister the collector from the metric service
    console.log(`[PerformanceSystem] Unregistering collector: ${collectorId}`);
    return true;
  }

  async registerMetricProcessor(processor: MetricProcessor): Promise<void> {
    // Implementation would register the processor with the metric service
    console.log(`[PerformanceSystem] Registering metric processor: ${processor.name}`);
  }

  async registerAlertHandler(handler: AlertHandler): Promise<void> {
    // Implementation would register the handler with the alert service
    console.log(`[PerformanceSystem] Registering alert handler: ${handler.name}`);
  }

  async registerExportHandler(handler: ExportHandler): Promise<void> {
    // Implementation would register the handler with the export service
    console.log(`[PerformanceSystem] Registering export handler: ${handler.name}`);
  }

  onSystemEvent(event: string, handler: (data: any) => void): void {
    // Implementation would register event handler with the event service
    console.log(`[PerformanceSystem] Registering event handler for: ${event}`);
  }

  getAdapterManager(): any {
    // Return a simple adapter manager interface
    return {
      register: this.registerAdapter.bind(this),
      unregister: this.unregisterAdapter.bind(this),
      get: this.getAdapter.bind(this),
      getAll: this.getAdapters.bind(this)
    };
  }

  getConfigManager(): any {
    // Return a simple config manager interface
    return {
      get: () => this._config,
      update: this.updateConfig.bind(this)
    };
  }

  async registerComponent(component: MonitorableComponent): Promise<void> {
    this._components.set(component.componentId, component);
    this.emitSystemEvent('COMPONENT_REGISTERED', { component });
  }

  async unregisterComponent(componentId: string): Promise<boolean> {
    const component = this._components.get(componentId);
    if (!component) {
      return false;
    }
    this._components.delete(componentId);
    this.emitSystemEvent('COMPONENT_UNREGISTERED', { componentId });
    return true;
  }

  getComponents(): MonitorableComponent[] {
    return Array.from(this._components.values());
  }

  // Adapter management
  async registerAdapter(name: string, adapter: PerformanceAdapter): Promise<void> {
    if (this._adapters.has(name)) {
      throw new Error(`Adapter '${name}' is already registered`);
    }

    this._adapters.set(name, adapter);
    
    this.emitSystemEvent('ADAPTER_REGISTERED', {
      adapterName: name,
      adapterType: adapter.type || 'unknown'
    });

    // Initialize and start adapter if system is running
    if (this._status === SystemStatus.RUNNING) {
      try {
        await adapter.initialize();
        await adapter.start();
      } catch (error) {
        console.error(`[PerformanceSystem] Error starting adapter ${name}:`, error);
      }
    }
  }

  async unregisterAdapter(name: string): Promise<boolean> {
    const adapter = this._adapters.get(name);
    if (!adapter) {
      return false;
    }

    try {
      await adapter.stop();
      await adapter.dispose();
    } catch (error) {
      console.error(`[PerformanceSystem] Error stopping adapter ${name}:`, error);
    }

    this._adapters.delete(name);
    
    this.emitSystemEvent('ADAPTER_UNREGISTERED', {
      adapterName: name
    });

    return true;
  }

  getAdapter(name: string): PerformanceAdapter | undefined {
    return this._adapters.get(name);
  }

  getAdapters(): PerformanceAdapter[] {
    return Array.from(this._adapters.values());
  }

  // Plugin management
  async registerPlugin(name: string, plugin: PerformancePlugin): Promise<void> {
    if (this._plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

    this._plugins.set(name, plugin);
    
    this.emitSystemEvent('PLUGIN_REGISTERED', {
      pluginName: name,
      pluginVersion: plugin.version || '1.0.0'
    });

    // Initialize and start plugin if system is running
    if (this._status === SystemStatus.RUNNING) {
      try {
        const pluginContext: PluginContext = {
          registerCollector: (collector) => this.registerCollector(collector),
          unregisterCollector: (collectorId) => this.unregisterCollector(collectorId),
          registerMetricProcessor: (processor) => this.registerMetricProcessor(processor),
          registerAlertHandler: (handler) => this.registerAlertHandler(handler),
          registerExportHandler: (handler) => this.registerExportHandler(handler),
          getSystemConfig: () => this._config as unknown as Record<string, unknown>,
          emitEvent: (event, data) => this.emitSystemEvent(event, data),
          onEvent: (event, handler) => this.onSystemEvent(event, handler),
          getLogger: () => this.createPluginLogger(name)
        };
        await plugin.initialize(pluginContext);
      } catch (error) {
        console.error(`[PerformanceSystem] Error starting plugin ${name}:`, error);
      }
    }
  }

  async unregisterPlugin(name: string): Promise<boolean> {
    const plugin = this._plugins.get(name);
    if (!plugin) {
      return false;
    }

    try {
      await plugin.cleanup();
    } catch (error) {
      console.error(`[PerformanceSystem] Error stopping plugin ${name}:`, error);
    }

    this._plugins.delete(name);
    
    this.emitSystemEvent('PLUGIN_UNREGISTERED', {
      pluginName: name
    });

    return true;
  }

  getPlugin(name: string): PerformancePlugin | undefined {
    return this._plugins.get(name);
  }

  getPlugins(): PerformancePlugin[] {
    return Array.from(this._plugins.values());
  }

  // Private methods
  private initializeServices() {
    // Create storage adapters
    const metricStorage = new InMemoryMetricStorage();
    const alertStorage = new InMemoryAlertStorage();
    const eventStore = new InMemoryEventStore();
    const eventPipeline = new DefaultEventPipeline();
    
    const metricStorageAdapter = new InMemoryMetricStorageAdapter();
    const eventStorageAdapter = new InMemoryEventStorageAdapter();

    // Create services
    const eventService = new DefaultEventService(eventStore, eventPipeline);
    const metricService = new DefaultMetricService(metricStorage);
    const alertService = new DefaultAlertService(alertStorage);
    const storageService = new DefaultStorageService(
      metricStorageAdapter,
      alertStorage,
      eventStorageAdapter,
      (this._config.storage || {}) as any
    );

    return {
      metric: metricService,
      alert: alertService,
      event: eventService,
      storage: storageService
    };
  }

  private async initializeAllServices(): Promise<void> {
    // Services are already initialized in constructor
    // This method can be used for any additional async initialization
  }

  private async loadPlugins(): Promise<void> {
    if (!this._config.plugins) {
      return;
    }

    for (const [name, pluginConfig] of Object.entries(this._config.plugins)) {
      if (pluginConfig.enabled !== false) {
        try {
          // In a real implementation, this would dynamically load plugins
          // For now, we'll just log that plugins would be loaded
          console.log(`[PerformanceSystem] Would load plugin: ${name}`);
        } catch (error) {
          console.error(`[PerformanceSystem] Error loading plugin ${name}:`, error);
        }
      }
    }
  }

  private async initializeAdapters(): Promise<void> {
    for (const [name, adapter] of this._adapters) {
      try {
        await adapter.initialize();
      } catch (error) {
        console.error(`[PerformanceSystem] Error initializing adapter ${name}:`, error);
      }
    }
  }

  private async startAdapters(): Promise<void> {
    for (const [name, adapter] of this._adapters) {
      try {
        await adapter.start();
      } catch (error) {
        console.error(`[PerformanceSystem] Error starting adapter ${name}:`, error);
      }
    }
  }

  private async stopAdapters(): Promise<void> {
    for (const [name, adapter] of this._adapters) {
      try {
        await adapter.stop();
        await adapter.dispose();
      } catch (error) {
        console.error(`[PerformanceSystem] Error stopping adapter ${name}:`, error);
      }
    }
  }

  private async startPlugins(): Promise<void> {
    for (const [name, plugin] of this._plugins) {
      try {
        const pluginContext: PluginContext = {
          registerCollector: (collector) => this.registerCollector(collector),
          unregisterCollector: (collectorId) => this.unregisterCollector(collectorId),
          registerMetricProcessor: (processor) => this.registerMetricProcessor(processor),
          registerAlertHandler: (handler) => this.registerAlertHandler(handler),
          registerExportHandler: (handler) => this.registerExportHandler(handler),
          getSystemConfig: () => this._config as unknown as Record<string, unknown>,
          emitEvent: (event, data) => this.emitSystemEvent(event, data),
          onEvent: (event, handler) => this.onSystemEvent(event, handler),
          getLogger: () => this.createPluginLogger(name)
        };
        await plugin.initialize(pluginContext);
      } catch (error) {
        console.error(`[PerformanceSystem] Error starting plugin ${name}:`, error);
      }
    }
  }

  private async stopPlugins(): Promise<void> {
    for (const [name, plugin] of this._plugins) {
      try {
        await plugin.cleanup();
      } catch (error) {
        console.error(`[PerformanceSystem] Error stopping plugin ${name}:`, error);
      }
    }
  }

  private startPeriodicTasks(): void {
    // Health check interval - use a default of 30 seconds
    const healthCheckInterval = 30000;
    this._healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('[PerformanceSystem] Health check error:', error);
      });
    }, healthCheckInterval);

    // Cleanup interval
    if (this._config.storage?.cleanup?.enabled) {
      this._cleanupInterval = setInterval(() => {
        this.performCleanup().catch(error => {
          console.error('[PerformanceSystem] Cleanup error:', error);
        });
      }, 24 * 60 * 60 * 1000); // Daily cleanup
    }
  }

  private stopPeriodicTasks(): void {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = undefined;
    }

    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = undefined;
    }
  }

  private async shutdownServices(): Promise<void> {
    try {
      // Event service shutdown if available
      if (typeof (this._services.event as any).shutdown === 'function') {
        await (this._services.event as any).shutdown();
      }
    } catch (error) {
      console.error('[PerformanceSystem] Error shutting down event service:', error);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealth();
      
      this.emitSystemEvent('HEALTH_CHECK_COMPLETED', {
        status: health.status,
        timestamp: health.lastCheck
      });
    } catch (error) {
      this.emitSystemEvent('HEALTH_CHECK_FAILED', {
        error: (error as Error).message
      });
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      const result = await this._services.storage.cleanup(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      
      this.emitSystemEvent('CLEANUP_COMPLETED', {
          itemsDeleted: result.itemsRemoved,
          spaceFreed: result.spaceFreed
        });
    } catch (error) {
      this.emitSystemEvent('CLEANUP_FAILED', {
        error: (error as Error).message
      });
    }
  }

  private async notifyConfigChange(): Promise<void> {
    // Notify adapters
    for (const [name, adapter] of this._adapters) {
      try {
        if (typeof (adapter as any).updateConfig === 'function') {
          await (adapter as any).updateConfig({});
        }
      } catch (error) {
        console.error(`[PerformanceSystem] Error updating adapter ${name} config:`, error);
      }
    }

    // Notify plugins
    for (const [name, plugin] of this._plugins) {
      try {
        if (typeof plugin.updateConfig === 'function') {
          await plugin.updateConfig((this._config.plugins as any)?.[name] || {});
        }
      } catch (error) {
        console.error(`[PerformanceSystem] Error updating plugin ${name} config:`, error);
      }
    }
  }

  private async getServiceHealth(serviceName: string): Promise<any> {
    try {
      // In a real implementation, services would have health check methods
      return {
        status: 'healthy',
        lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
        lastCheck: Date.now()
      };
    }
  }

  private calculateOverallHealth(services: any, adapters: any, plugins: any): string {
    const allComponents = [
      ...Object.values(services),
      ...Object.values(adapters),
      ...Object.values(plugins)
    ];

    const unhealthyCount = allComponents.filter((c: any) => c.status !== 'healthy').length;
    
    if (unhealthyCount === 0) {
      return 'healthy';
    } else if (unhealthyCount < allComponents.length / 2) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  private calculateHealthScore(services: any, adapters: any, plugins: any): number {
    const allComponents = [
      ...Object.values(services),
      ...Object.values(adapters),
      ...Object.values(plugins)
    ];

    if (allComponents.length === 0) return 100;

    const healthyCount = allComponents.filter((c: any) => c.status === 'healthy').length;
    return Math.round((healthyCount / allComponents.length) * 100);
  }

  private emitSystemEvent(type: string, data?: any): void {
    const event: BasePerformanceEvent = {
      type: type as any,
      timestamp: Date.now(),
      source: 'performance-system',
      metadata: data
    };

    // Only emit if event service is available
    if (this._services?.event) {
      try {
        this._services.event.emit(event as unknown as PerformanceEvent);
      } catch (error) {
        console.error('[PerformanceSystem] Error emitting event:', error);
      }
    }
  }

  private createPluginLogger(pluginName: string) {
    return {
      debug: (message: string, ...args: any[]) => console.debug(`[Plugin:${pluginName}]`, message, ...args),
      info: (message: string, ...args: any[]) => console.info(`[Plugin:${pluginName}]`, message, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[Plugin:${pluginName}]`, message, ...args),
      error: (message: string, ...args: any[]) => console.error(`[Plugin:${pluginName}]`, message, ...args)
    };
  }

  private initializeStats(): SystemStats {
    return {
      uptime: 0,
      totalComponents: 0,
      activeComponents: 0,
      totalMetrics: 0,
      metricsPerSecond: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      totalEvents: 0,
      eventsPerSecond: 0,
      memoryUsage: {
        used: 0,
        allocated: 0,
        peak: 0
      },
      storage: {
        totalSize: 0,
        metricsCount: 0,
        eventsCount: 0,
        alertsCount: 0
      }
    };
  }
}

/**
 * Performance system factory
 */
export class DefaultPerformanceSystemFactory implements PerformanceSystemFactory {
  async create(config: PerformanceConfig): Promise<PerformanceSystem> {
    return new DefaultPerformanceSystem(config);
  }

  getDefaultConfig(): PerformanceConfig {
    return this.getDefaultConfigInternal();
  }

  async validateConfig(config: PerformanceConfig): Promise<boolean> {
    // Basic validation - in a real implementation this would be more comprehensive
    return !!(config.global && config.metrics && config.alerts && config.storage);
  }

  createWithDefaults(): PerformanceSystem {
    return new DefaultPerformanceSystem(this.getDefaultConfig());
  }

  private getDefaultConfigInternal(): PerformanceConfig {
    const defaultConfig: PerformanceConfig = {
      global: {
        enabled: true,
        environment: 'development',
        serviceName: 'performance-system',
        serviceVersion: '1.0.0',
        tags: {},
        logging: {
          level: 'info',
          console: true,
          file: false,
          format: 'text',
          includeStackTrace: false
        },
        profiling: {
          enabled: false,
          cpu: {
            enabled: false,
            sampleInterval: 1000
          },
          memory: {
            enabled: false,
            sampleInterval: 1000,
            trackAllocations: false
          },
          gc: {
            enabled: false,
            trackAll: false
          }
        }
      },
      metrics: {
        defaultCollectionInterval: 60000,
        defaultRetentionPeriod: 86400000,
        maxMetrics: 10000,
        sampling: {
          defaultRate: 1.0,
          strategy: 'random',
          adaptive: {
            enabled: false,
            minRate: 0.1,
            maxRate: 1.0,
            errorThreshold: 0.05,
            latencyThreshold: 1000,
            adjustmentInterval: 60000
          }
        },
        aggregation: {
          enabled: true,
          interval: 60000,
          functions: ['avg', 'max', 'min'],
          percentiles: [50, 95, 99],
          windowSize: 100
        },
        metricConfigs: {}
      },
      alerts: {
        enabled: true,
        defaultEvaluationInterval: 60000,
        maxAlerts: 1000,
        retentionPeriod: 604800000,
        defaultThresholds: [],
        notifications: {
          enabled: true,
          defaultChannels: [],
          rateLimit: {
            enabled: true,
            maxNotifications: 100,
            windowMs: 60000
          },
          templates: {}
        },
        escalation: {
          enabled: false,
          defaultPolicy: 'default',
          timeout: 300000,
          maxLevels: 3
        }
      },
      storage: {
        type: 'memory',
        config: {
          maxMemory: 104857600,
          evictionPolicy: 'lru'
        },
        cleanup: {
          enabled: true,
          interval: 3600000,
          batchSize: 1000,
          timeout: 30000
        },
        compression: {
          enabled: false,
          algorithm: 'gzip',
          level: 6,
          threshold: 1024
        }
      },
      export: {
        enabled: false,
        defaultFormat: 'json',
        destinations: [],
        schedule: {
          enabled: false,
          interval: 3600000
        },
        filters: []
      },
      plugins: {
        enabled: true,
        directories: [],
        autoLoad: false,
        configs: {},
        loadOrder: []
      },
      environments: {}
    };

    return defaultConfig;
  }
}

/**
 * Performance system builder
 */
export class DefaultPerformanceSystemBuilder implements PerformanceSystemBuilder {
  private _config: Partial<PerformanceConfig> = {};

  withGlobalConfig(config: PerformanceConfig['global']): this {
    this._config.global = config;
    return this;
  }

  // Note: Monitoring configuration is handled through other config sections

  withMetrics(config: PerformanceConfig['metrics']): this {
    this._config.metrics = config;
    return this;
  }

  withAlerts(config: PerformanceConfig['alerts']): this {
    this._config.alerts = config;
    return this;
  }

  withStorage(config: PerformanceConfig['storage']): this {
    this._config.storage = config;
    return this;
  }

  withExport(config: PerformanceConfig['export']): this {
    this._config.export = config;
    return this;
  }

  withPlugins(config: PerformanceConfig['plugins']): this {
    this._config.plugins = config;
    return this;
  }

  // Note: Adapters are managed separately, not part of PerformanceConfig

  withConfig(config: PerformanceConfig): PerformanceSystemBuilder {
    this._config = config;
    return this;
  }

  withMetricService(service: MetricService): PerformanceSystemBuilder {
    // In a real implementation, this would configure the metric service
    return this;
  }

  withAlertService(service: AlertService): PerformanceSystemBuilder {
    // In a real implementation, this would configure the alert service
    return this;
  }

  withEventService(service: EventService): PerformanceSystemBuilder {
    // In a real implementation, this would configure the event service
    return this;
  }

  withStorageService(service: StorageService): PerformanceSystemBuilder {
    // In a real implementation, this would configure the storage service
    return this;
  }

  withAdapterManager(manager: AdapterManager): PerformanceSystemBuilder {
    // In a real implementation, this would configure the adapter manager
    return this;
  }

  async build(): Promise<PerformanceSystem> {
    const factory = new DefaultPerformanceSystemFactory();
    const defaultConfig = factory.getDefaultConfig();
    
    const finalConfig: PerformanceConfig = {
      ...defaultConfig,
      ...this._config
    } as PerformanceConfig;

    return await factory.create(finalConfig);
  }
}