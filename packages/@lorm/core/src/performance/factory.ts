/**
 * Performance System Factory - Provides convenient creation functions for performance systems
 */

import type {
  PerformanceConfig,
  MetricsConfig,
  AlertsConfig,
  StorageConfig
} from './types/index.js';
import type { PerformanceSystem } from './core/interfaces.js';

import {
  DefaultPerformanceSystem,
  DefaultPerformanceSystemFactory,
  DefaultPerformanceSystemBuilder
} from './core/index.js';

/**
 * Create a basic performance system with default configuration
 */
export function createPerformanceSystem(config?: Partial<PerformanceConfig>): DefaultPerformanceSystemBuilder {
  const builder = new DefaultPerformanceSystemBuilder();
  const finalConfig = mergeWithDefaults(config);
  
  return builder
    .withGlobalConfig(finalConfig.global)
    .withMetrics(finalConfig.metrics)
    .withAlerts(finalConfig.alerts)
    .withStorage(finalConfig.storage)
    .withExport(finalConfig.export)
    .withPlugins(finalConfig.plugins);
}

/**
 * Create a default performance system with common adapters
 */
export async function createDefaultPerformanceSystem(config?: Partial<PerformanceConfig>): Promise<PerformanceSystem> {
  const builder = new DefaultPerformanceSystemBuilder();
  
  // Configure with defaults
  const finalConfig = mergeWithDefaults(config);
  
  const system = await builder
    .withGlobalConfig(finalConfig.global)
    .withMetrics(finalConfig.metrics)
    .withAlerts(finalConfig.alerts)
    .withStorage(finalConfig.storage)
    .withExport(finalConfig.export)
    .withPlugins(finalConfig.plugins)
    .build();
  
  // Initialize the system
  await system.initialize();
  
  return system;
}

/**
 * Create a minimal performance system with only essential components
 */
export async function createMinimalPerformanceSystem(config?: Partial<PerformanceConfig>): Promise<PerformanceSystem> {
  const builder = new DefaultPerformanceSystemBuilder();
  
  const minimalConfig: PerformanceConfig = {
    global: {
      enabled: true,
      environment: 'development',
      serviceName: 'lorm-cache',
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
        cpu: { enabled: false, sampleInterval: 1000 },
        memory: { enabled: false, sampleInterval: 1000, trackAllocations: false },
        gc: { enabled: false, trackAll: false }
      }
    },
    metrics: {
      defaultCollectionInterval: 5000,
      defaultRetentionPeriod: 3600000, // 1 hour
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
        functions: ['avg', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    },
    alerts: {
      enabled: false,
      defaultEvaluationInterval: 60000,
      maxAlerts: 100,
      retentionPeriod: 86400000,
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
          maxNotifications: 10,
          windowMs: 3600000
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
        maxMemory: 1000000,
        evictionPolicy: 'lru'
      },
      cleanup: {
        enabled: false,
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
        interval: 60000
      },
      filters: []
    },
    plugins: {
      enabled: false,
      directories: [],
      autoLoad: false,
      configs: {},
      loadOrder: []
    },
    environments: {},
    ...config
  };
  
  const system = await builder
    .withGlobalConfig(minimalConfig.global)
    .withMetrics(minimalConfig.metrics)
    .withAlerts(minimalConfig.alerts)
    .withStorage(minimalConfig.storage)
    .withExport(minimalConfig.export)
    .withPlugins(minimalConfig.plugins)
    .build();
  
  await system.initialize();
  
  return system;
}

/**
 * Create a production-ready performance system with optimized settings
 */
export async function createProductionPerformanceSystem(config?: Partial<PerformanceConfig>): Promise<PerformanceSystem> {
  const builder = new DefaultPerformanceSystemBuilder();
  
  const productionConfig: PerformanceConfig = {
    global: {
      enabled: true,
      environment: 'production',
      serviceName: 'lorm-cache',
      tags: {},
      logging: {
        level: 'warn',
        console: false,
        file: true,
        format: 'json',
        includeStackTrace: true
      },
      profiling: {
        enabled: true,
        cpu: { enabled: true, sampleInterval: 5000 },
        memory: { enabled: true, sampleInterval: 5000, trackAllocations: true },
        gc: { enabled: true, trackAll: false }
      }
    },
    metrics: {
      defaultCollectionInterval: 10000,
      defaultRetentionPeriod: 86400000, // 24 hours
      maxMetrics: 100000,
      sampling: {
        defaultRate: 1.0,
        strategy: 'adaptive',
        adaptive: {
          enabled: true,
          minRate: 0.1,
          maxRate: 1.0,
          errorThreshold: 0.01,
          latencyThreshold: 500,
          adjustmentInterval: 30000
        }
      },
      aggregation: {
        enabled: true,
        interval: 60000, // 1 minute
        functions: ['avg', 'min', 'max', 'count', 'sum', 'percentile'],
        percentiles: [50, 90, 95, 99],
        windowSize: 1000
      },
      metricConfigs: {}
    },
    alerts: {
      enabled: true,
      defaultEvaluationInterval: 30000,
      maxAlerts: 10000,
      retentionPeriod: 604800000, // 7 days
      defaultThresholds: [],
      notifications: {
         enabled: true,
         defaultChannels: [],
         rateLimit: {
           enabled: true,
           maxNotifications: 50,
           windowMs: 3600000
         },
         templates: {}
       },
       escalation: {
         enabled: true,
         defaultPolicy: 'production',
         timeout: 300000, // 5 minutes
         maxLevels: 5
       }
    },
    storage: {
       type: 'memory',
       config: {
         maxMemory: 10000000,
         evictionPolicy: 'lru'
       },
       cleanup: {
         enabled: true,
         interval: 3600000, // 1 hour
         batchSize: 5000,
         timeout: 60000
       },
       compression: {
         enabled: true,
         algorithm: 'gzip',
         level: 6,
         threshold: 1024
       }
     },
    export: {
       enabled: true,
       defaultFormat: 'json',
       destinations: [],
       schedule: {
         enabled: true,
         interval: 60000
       },
       filters: []
     },
     plugins: {
       enabled: true,
       directories: ['./plugins'],
       autoLoad: true,
       configs: {},
       loadOrder: []
     },
    environments: {},
    ...config
  };
  
  const finalConfig = mergeWithDefaults(productionConfig);
  
  const system = await builder
    .withGlobalConfig(finalConfig.global)
    .withMetrics(finalConfig.metrics)
    .withAlerts(finalConfig.alerts)
    .withStorage(finalConfig.storage)
    .withExport(finalConfig.export)
    .withPlugins(finalConfig.plugins)
    .build();
  
  await system.initialize();
  
  return system;
}

/**
 * Create a development-friendly performance system with debugging features
 */
export async function createDevelopmentPerformanceSystem(config?: Partial<PerformanceConfig>): Promise<PerformanceSystem> {
  const builder = new DefaultPerformanceSystemBuilder();
  
  const developmentConfig: PerformanceConfig = {
    global: {
      enabled: true,
      environment: 'development',
      serviceName: 'lorm-cache',
      tags: { debug: 'true' },
      logging: {
        level: 'debug',
        console: true,
        file: true,
        format: 'text',
        includeStackTrace: true
      },
      profiling: {
        enabled: true,
        cpu: { enabled: true, sampleInterval: 1000 },
        memory: { enabled: true, sampleInterval: 1000, trackAllocations: true },
        gc: { enabled: true, trackAll: true }
      }
    },
    metrics: {
      defaultCollectionInterval: 2000,
      defaultRetentionPeriod: 1800000, // 30 minutes
      maxMetrics: 5000,
      sampling: {
        defaultRate: 1.0,
        strategy: 'random',
        adaptive: {
          enabled: false,
          minRate: 0.5,
          maxRate: 1.0,
          errorThreshold: 0.1,
          latencyThreshold: 2000,
          adjustmentInterval: 10000
        }
      },
      aggregation: {
        enabled: true,
        interval: 30000,
        functions: ['avg', 'min', 'max', 'count'],
        percentiles: [50, 95],
        windowSize: 200
      },
      metricConfigs: {}
    },
    alerts: {
      enabled: true,
      defaultEvaluationInterval: 10000,
      maxAlerts: 1000,
      retentionPeriod: 3600000, // 1 hour
      defaultThresholds: [],
      notifications: {
         enabled: true,
         defaultChannels: [],
         rateLimit: {
           enabled: false,
           maxNotifications: 100,
           windowMs: 3600000
         },
         templates: {}
       },
       escalation: {
         enabled: false,
         defaultPolicy: 'development',
         timeout: 60000,
         maxLevels: 2
       }
    },
    storage: {
       type: 'memory',
       config: {
         maxMemory: 100000,
         evictionPolicy: 'lru'
       },
       cleanup: {
         enabled: false,
         interval: 1800000,
         batchSize: 500,
         timeout: 15000
       },
       compression: {
         enabled: false,
         algorithm: 'gzip',
         level: 1,
         threshold: 1024
       }
     },
    export: {
       enabled: false,
       defaultFormat: 'json',
       destinations: [],
       schedule: {
         enabled: false,
         interval: 30000
       },
       filters: []
     },
     plugins: {
       enabled: true,
       directories: ['./dev-plugins'],
       autoLoad: false,
       configs: {},
       loadOrder: []
     },
    environments: {},
    ...config
  };
  
  const finalConfig = mergeWithDefaults(developmentConfig);
  
  const system = await builder
    .withGlobalConfig(finalConfig.global)
    .withMetrics(finalConfig.metrics)
    .withAlerts(finalConfig.alerts)
    .withStorage(finalConfig.storage)
    .withExport(finalConfig.export)
    .withPlugins(finalConfig.plugins)
    .build();
  
  await system.initialize();
  
  return system;
}



/**
 * Merge user config with default configuration
 */
function mergeWithDefaults(config?: Partial<PerformanceConfig>): PerformanceConfig {
  const defaultConfig: PerformanceConfig = {
    global: {
      enabled: true,
      environment: 'development',
      serviceName: 'lorm-cache',
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
        cpu: { enabled: false, sampleInterval: 1000 },
        memory: { enabled: false, sampleInterval: 1000, trackAllocations: false },
        gc: { enabled: false, trackAll: false }
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
        functions: ['avg', 'count'],
        percentiles: [50, 95, 99],
        windowSize: 100
      },
      metricConfigs: {}
    },
    alerts: {
      enabled: true,
      defaultEvaluationInterval: 60000,
      maxAlerts: 5000,
      retentionPeriod: 86400000, // 24 hours
      defaultThresholds: [],
      notifications: {
        enabled: false,
        defaultChannels: [],
        rateLimit: {
          enabled: false,
          maxNotifications: 10,
          windowMs: 3600000
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
        maxMemory: 1000000,
        evictionPolicy: 'lru'
      },
      cleanup: {
        enabled: false,
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
        interval: 60000
      },
      filters: []
    },
    plugins: {
      enabled: false,
      directories: [],
      autoLoad: false,
      configs: {},
      loadOrder: []
    },
    environments: {}
  };
  
  return deepMerge(defaultConfig, config || {});
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

// Convenience exports
export const builder = () => new DefaultPerformanceSystemBuilder();
export const createSystem = createPerformanceSystem;
export const createDefault = createDefaultPerformanceSystem;
export const createMinimal = createMinimalPerformanceSystem;
export const createProduction = createProductionPerformanceSystem;
export const createDevelopment = createDevelopmentPerformanceSystem;