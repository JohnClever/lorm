/**
 * Performance Configuration - Provides configuration builders and validation
 */

import type {
  PerformanceConfig,
  GlobalConfig,
  MetricsConfig,
  AlertsConfig,
  StorageConfig,
  ExportConfig,
  PluginsConfig
} from './types/index.js';

/**
 * Performance configuration builder with fluent API
 */
export class PerformanceConfigBuilder {
  private _config: Partial<PerformanceConfig> = {};
  
  static create(): PerformanceConfigBuilder {
    return new PerformanceConfigBuilder();
  }
  
  // Global settings
  enabled(enabled = true): PerformanceConfigBuilder {
    if (!this._config.global) this._config.global = {} as GlobalConfig;
    this._config.global.enabled = enabled;
    return this;
  }
  
  debug(debug = true): PerformanceConfigBuilder {
    if (!this._config.global) this._config.global = {} as GlobalConfig;
    // Note: debug is not part of GlobalConfig interface
    return this;
  }
  
  environment(env: string): PerformanceConfigBuilder {
    if (!this._config.global) this._config.global = {} as GlobalConfig;
    this._config.global.environment = env;
    return this;
  }
  
  serviceName(name: string): PerformanceConfigBuilder {
    if (!this._config.global) this._config.global = {} as GlobalConfig;
    this._config.global.serviceName = name;
    return this;
  }
  
  serviceVersion(version: string): PerformanceConfigBuilder {
    if (!this._config.global) this._config.global = {} as GlobalConfig;
    this._config.global.serviceVersion = version;
    return this;
  }
  
  tags(tags: Record<string, string>): PerformanceConfigBuilder {
    if (!this._config.global) this._config.global = {} as GlobalConfig;
    this._config.global.tags = { ...this._config.global.tags, ...tags };
    return this;
  }
  
  // Metrics configuration
  metrics(config: Partial<MetricsConfig>): PerformanceConfigBuilder {
    this._config.metrics = { ...this._config.metrics, ...config } as MetricsConfig;
    return this;
  }
  
  metricsEnabled(enabled = true): PerformanceConfigBuilder {
    if (!this._config.metrics) this._config.metrics = {
      defaultCollectionInterval: 5000,
      defaultRetentionPeriod: 86400000,
      maxMetrics: 1000,
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
        enabled: false,
        interval: 60000,
        functions: ['avg', 'min', 'max', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    };
    // MetricsConfig doesn't have an enabled property - metrics are controlled by individual metric configs
    return this;
  }

  metricsBuffer(maxMetrics: number, collectionInterval?: number): PerformanceConfigBuilder {
    if (!this._config.metrics) this._config.metrics = {
      defaultCollectionInterval: 5000,
      defaultRetentionPeriod: 86400000,
      maxMetrics: 1000,
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
        enabled: false,
        interval: 60000,
        functions: ['avg', 'min', 'max', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    };
    this._config.metrics.maxMetrics = maxMetrics;
    if (collectionInterval !== undefined) {
      this._config.metrics.defaultCollectionInterval = collectionInterval;
    }
    return this;
  }
  
  metricsRetention(retentionPeriod: number, maxMetrics?: number): PerformanceConfigBuilder {
    if (!this._config.metrics) this._config.metrics = {
      defaultCollectionInterval: 5000,
      defaultRetentionPeriod: 86400000,
      maxMetrics: 1000,
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
        enabled: false,
        interval: 60000,
        functions: ['avg', 'min', 'max', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    };
    this._config.metrics.defaultRetentionPeriod = retentionPeriod;
    if (maxMetrics !== undefined) {
      this._config.metrics.maxMetrics = maxMetrics;
    }
    return this;
  }
  
  metricsAggregation(enabled = true, interval?: number, functions?: ('avg' | 'min' | 'max' | 'count' | 'sum' | 'percentile')[]): PerformanceConfigBuilder {
    if (!this._config.metrics) this._config.metrics = {
      defaultCollectionInterval: 5000,
      defaultRetentionPeriod: 86400000,
      maxMetrics: 1000,
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
        enabled: false,
        interval: 60000,
        functions: ['avg', 'min', 'max', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    };
    if (!this._config.metrics.aggregation) this._config.metrics.aggregation = {
      enabled: false,
      interval: 60000,
      functions: ['avg', 'min', 'max', 'count'],
      percentiles: [50, 95, 99],
      windowSize: 100
    };
    this._config.metrics.aggregation.enabled = enabled;
    if (interval !== undefined) {
      this._config.metrics.aggregation.interval = interval;
    }
    if (functions) {
      this._config.metrics.aggregation.functions = functions;
    }
    return this;
  }
  
  // Alerts configuration
  alerts(config: Partial<AlertsConfig>): PerformanceConfigBuilder {
    this._config.alerts = { ...this._config.alerts, ...config } as AlertsConfig;
    return this;
  }
  
  alertsEnabled(enabled = true): PerformanceConfigBuilder {
    if (!this._config.alerts) this._config.alerts = {
      enabled: true,
      defaultEvaluationInterval: 30000,
      maxAlerts: 1000,
      retentionPeriod: 604800000,
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
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
    };
    this._config.alerts.enabled = enabled;
    return this;
  }
  
  alertsBuffer(maxAlerts: number, evaluationInterval?: number): PerformanceConfigBuilder {
    if (!this._config.alerts) this._config.alerts = {
      enabled: true,
      defaultEvaluationInterval: 30000,
      maxAlerts: 1000,
      retentionPeriod: 604800000,
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
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
    };
    this._config.alerts.maxAlerts = maxAlerts;
    if (evaluationInterval !== undefined) {
      this._config.alerts.defaultEvaluationInterval = evaluationInterval;
    }
    return this;
  }
  
  alertsRetention(retentionPeriod: number, maxAlerts?: number): PerformanceConfigBuilder {
    if (!this._config.alerts) this._config.alerts = {
      enabled: true,
      defaultEvaluationInterval: 30000,
      maxAlerts: 1000,
      retentionPeriod: 604800000,
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
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
    };
    this._config.alerts.retentionPeriod = retentionPeriod;
    if (maxAlerts !== undefined) {
      this._config.alerts.maxAlerts = maxAlerts;
    }
    return this;
  }
  
  alertsEscalation(enabled = true, maxLevels?: number, timeout?: number): PerformanceConfigBuilder {
    if (!this._config.alerts) this._config.alerts = {
      enabled: true,
      defaultEvaluationInterval: 30000,
      maxAlerts: 1000,
      retentionPeriod: 604800000,
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
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
    };
    if (!this._config.alerts.escalation) this._config.alerts.escalation = {
      enabled: false,
      defaultPolicy: 'default',
      timeout: 300000,
      maxLevels: 3
    };
    this._config.alerts.escalation.enabled = enabled;
    if (maxLevels !== undefined) {
      this._config.alerts.escalation.maxLevels = maxLevels;
    }
    if (timeout !== undefined) {
      this._config.alerts.escalation.timeout = timeout;
    }
    return this;
  }
  

  
  // Storage configuration
  storage(config: Partial<StorageConfig>): PerformanceConfigBuilder {
    this._config.storage = { ...this._config.storage, ...config } as StorageConfig;
    return this;
  }
  
  storageType(type: 'memory' | 'file' | 'database'): PerformanceConfigBuilder {
    if (!this._config.storage) this._config.storage = {
      type: 'memory',
      config: {
        maxMemory: 100 * 1024 * 1024,
        evictionPolicy: 'lru'
      },
      cleanup: {
        enabled: true,
        interval: 300000,
        batchSize: 1000,
        timeout: 30000
      },
      compression: {
        enabled: false,
        algorithm: 'gzip',
        level: 6,
        threshold: 1024
      }
    };
    this._config.storage.type = type;
    return this;
  }
  
  storageConfig(config: any): PerformanceConfigBuilder {
    if (!this._config.storage) this._config.storage = {
      type: 'memory',
      config: {
        maxMemory: 100 * 1024 * 1024,
        evictionPolicy: 'lru'
      },
      cleanup: {
        enabled: true,
        interval: 300000,
        batchSize: 1000,
        timeout: 30000
      },
      compression: {
        enabled: false,
        algorithm: 'gzip',
        level: 6,
        threshold: 1024
      }
    };
    this._config.storage.config = config;
    return this;
  }
  
  // Note: Storage backup is not part of StorageConfig interface
  // This method has been removed to match the interface definition
  
  // Export configuration
  export(config: Partial<ExportConfig>): PerformanceConfigBuilder {
    this._config.export = { ...this._config.export, ...config } as ExportConfig;
    return this;
  }
  
  exportEnabled(enabled = true): PerformanceConfigBuilder {
    if (!this._config.export) this._config.export = {
      enabled: false,
      defaultFormat: 'json',
      destinations: [],
      schedule: { enabled: false, interval: 60000 },
      filters: []
    };
    this._config.export.enabled = enabled;
    return this;
  }
  
  exportFormat(format: 'json' | 'csv' | 'prometheus' | 'influxdb'): PerformanceConfigBuilder {
    if (!this._config.export) this._config.export = {
      enabled: false,
      defaultFormat: 'json',
      destinations: [],
      schedule: { enabled: false, interval: 60000 },
      filters: []
    };
    this._config.export.defaultFormat = format;
    return this;
  }
  
  exportInterval(interval: number): PerformanceConfigBuilder {
    if (!this._config.export) this._config.export = {
      enabled: false,
      defaultFormat: 'json',
      destinations: [],
      schedule: { enabled: false, interval: 60000 },
      filters: []
    };
    if (!this._config.export.schedule) this._config.export.schedule = { enabled: false, interval: 60000 };
    this._config.export.schedule.enabled = true;
    this._config.export.schedule.interval = interval;
    return this;
  }
  
  exportDestination(destination: string): PerformanceConfigBuilder {
    if (!this._config.export) this._config.export = {
      enabled: false,
      defaultFormat: 'json',
      destinations: [],
      schedule: { enabled: false, interval: 60000 },
      filters: []
    };
    this._config.export.destinations.push({
      id: `dest-${Date.now()}`,
      name: `File destination: ${destination}`,
      type: 'file',
      config: { path: destination },
      enabled: true
    });
    return this;
  }
  
  // Plugin configuration
  plugins(config: Partial<PluginsConfig>): PerformanceConfigBuilder {
    this._config.plugins = { ...this._config.plugins, ...config } as PluginsConfig;
    return this;
  }
  
  plugin(name: string, config: any): PerformanceConfigBuilder {
    if (!this._config.plugins) this._config.plugins = {
      enabled: true,
      directories: ['./plugins'],
      autoLoad: false,
      configs: {},
      loadOrder: []
    };
    this._config.plugins.configs[name] = config;
    if (!this._config.plugins.loadOrder.includes(name)) {
      this._config.plugins.loadOrder.push(name);
    }
    return this;
  }
  
  pluginsEnabled(enabled = true): PerformanceConfigBuilder {
    if (!this._config.plugins) this._config.plugins = {
      enabled: true,
      directories: ['./plugins'],
      autoLoad: false,
      configs: {},
      loadOrder: []
    };
    this._config.plugins.enabled = enabled;
    return this;
  }
  

  
  // Build the configuration
  build(): PerformanceConfig {
    return validateConfig(this._config as PerformanceConfig);
  }
  
  // Get current configuration (without validation)
  get(): Partial<PerformanceConfig> {
    return { ...this._config };
  }
}

/**
 * Create default configuration
 */
export function createDefaultConfig(): PerformanceConfig {
  return {
    global: {
      enabled: true,
      environment: 'development',
      serviceName: 'lorm-service',
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
      defaultCollectionInterval: 5000,
      defaultRetentionPeriod: 3600000, // 1 hour
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
        enabled: false,
        interval: 60000,
        functions: ['avg', 'min', 'max', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    },
    alerts: {
      enabled: true,
      defaultEvaluationInterval: 3000,
      maxAlerts: 5000,
      retentionPeriod: 86400000, // 24 hours
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
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
        maxMemory: 104857600, // 100MB
        evictionPolicy: 'lru'
      },
      cleanup: {
        enabled: true,
        interval: 3600000, // 1 hour
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
        interval: 60000
      },
      filters: []
    },
    plugins: {
      enabled: false,
      directories: ['./plugins'],
      autoLoad: false,
      configs: {},
      loadOrder: []
    },
    environments: {}
  };
}

/**
 * Create production configuration
 */
export function createProductionConfig(): PerformanceConfig {
  return PerformanceConfigBuilder.create()
    .enabled(true)
    .environment('production')
    .serviceName('lorm-service')
    .serviceVersion('1.0.0')
    .metricsBuffer(1000, 10000)
    .metricsRetention(86400000, 100000) // 24 hours, 100k metrics
    .metricsAggregation(true, 60000, ['avg', 'min', 'max', 'count', 'sum'])
    .alertsBuffer(500, 5000)
    .alertsRetention(604800000, 10000) // 7 days, 10k alerts
    .alertsEscalation(true, 3, 300000)
    .storageType('memory')
    .storageConfig({ compression: true, encryption: false })
    // Storage backup removed - not part of StorageConfig interface
    .exportEnabled(true)
    .exportFormat('prometheus')
    .exportInterval(30000)
    .build();
}

/**
 * Create development configuration
 */
export function createDevelopmentConfig(): PerformanceConfig {
  return PerformanceConfigBuilder.create()
    .enabled(true)
    .environment('development')
    .serviceName('lorm-service')
    .serviceVersion('1.0.0')
    .metricsBuffer(200, 2000)
    .metricsRetention(1800000, 5000) // 30 minutes, 5k metrics
    .metricsAggregation(false)
    .alertsBuffer(100, 1000)
    .alertsRetention(3600000, 1000) // 1 hour, 1k alerts
    .alertsEscalation(false)
    .storageType('memory')
    .storageConfig({ compression: false, encryption: false })
    // Storage backup removed - not part of StorageConfig interface
    .exportEnabled(false)
    .build();
}

/**
 * Create test configuration
 */
export function createTestConfig(): PerformanceConfig {
  return PerformanceConfigBuilder.create()
    .enabled(true)
    .environment('test')
    .serviceName('lorm-service')
    .serviceVersion('1.0.0')
    .metricsBuffer(50, 500)
    .metricsRetention(300000, 1000) // 5 minutes, 1k metrics
    .metricsAggregation(false)
    .alertsBuffer(25, 250)
    .alertsRetention(600000, 500) // 10 minutes, 500 alerts
    .alertsEscalation(false)
    .storageType('memory')
    .storageConfig({ compression: false, encryption: false })
    // Storage backup removed - not part of StorageConfig interface
    .exportEnabled(false)
    .build();
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<PerformanceConfig>): PerformanceConfig {
  const errors: string[] = [];
  
  // Validate metrics configuration
  if (config.metrics) {
    if (config.metrics.maxMetrics !== undefined && config.metrics.maxMetrics < 1) {
      errors.push('Max metrics must be positive');
    }
    if (config.metrics.defaultCollectionInterval !== undefined && config.metrics.defaultCollectionInterval < 100) {
      errors.push('Default collection interval must be at least 100ms');
    }
    if (config.metrics.defaultRetentionPeriod !== undefined && config.metrics.defaultRetentionPeriod < 1000) {
      errors.push('Default retention period must be at least 1000ms');
    }
  }
  
  // Validate alerts configuration
  if (config.alerts) {
    if (config.alerts.maxAlerts !== undefined && config.alerts.maxAlerts < 1) {
      errors.push('Max alerts must be positive');
    }
    if (config.alerts.defaultEvaluationInterval !== undefined && config.alerts.defaultEvaluationInterval < 100) {
      errors.push('Default evaluation interval must be at least 100ms');
    }
    if (config.alerts.retentionPeriod !== undefined && config.alerts.retentionPeriod < 1000) {
      errors.push('Alert retention period must be at least 1000ms');
    }
  }
  
  
  // Validate storage configuration
  if (config.storage) {
    const validStorageTypes = ['memory', 'file', 'database'];
    if (config.storage.type && !validStorageTypes.includes(config.storage.type)) {
      errors.push(`Invalid storage type. Must be one of: ${validStorageTypes.join(', ')}`);
    }
  }
  
  // Validate export configuration
  if (config.export) {
    const validFormats = ['json', 'csv', 'prometheus', 'influxdb'];
    if (config.export.defaultFormat && !validFormats.includes(config.export.defaultFormat)) {
      errors.push(`Invalid export format. Must be one of: ${validFormats.join(', ')}`);
    }
    if (config.export.schedule?.interval !== undefined && config.export.schedule.interval < 1000) {
      errors.push('Export interval must be at least 1000ms');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
  
  // Merge with defaults
  const defaultConfig = createDefaultConfig();
  return deepMerge(defaultConfig, config);
}

/**
 * Deep merge utility function
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Configuration presets
 */
export class ConfigPresets {
  static minimal(): PerformanceConfig {
    return PerformanceConfigBuilder.create()
      .enabled(true)
      .metricsEnabled(true)
      .alertsEnabled(false)
      .metricsBuffer(100, 5000)
      .storageType('memory')
      .build();
  }
  
  static standard(): PerformanceConfig {
    return createDefaultConfig();
  }
  
  static performance(): PerformanceConfig {
    return PerformanceConfigBuilder.create()
      .enabled(true)
      .metricsBuffer(1000, 5000)
      .metricsAggregation(true, 30000)
      .alertsBuffer(500, 2000)
      .storageType('memory')
      .storageConfig({ compression: true })
      .build();
  }
  
  static monitoring(): PerformanceConfig {
    return PerformanceConfigBuilder.create()
      .enabled(true)
      .metricsBuffer(2000, 10000)
      .metricsAggregation(true, 60000, ['avg', 'min', 'max', 'count', 'sum', 'percentile'])
      .alertsBuffer(1000, 5000)
      .alertsEscalation(true, 5, 180000)
      .storageType('memory')
      // Storage backup removed - not part of StorageConfig interface
      .exportEnabled(true)
      .exportFormat('prometheus')
      .exportInterval(15000)
      .build();
  }
}

// Convenience exports
export const configBuilder = PerformanceConfigBuilder.create;
export const defaultConfig = createDefaultConfig;
export const productionConfig = createProductionConfig;
export const developmentConfig = createDevelopmentConfig;
export const testConfig = createTestConfig;