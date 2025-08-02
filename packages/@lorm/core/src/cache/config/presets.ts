/**
 * Configuration Presets for @lorm/core cache system
 * Predefined configurations for common use cases
 */

import type { CacheOptions } from '../types/index.js';

/**
 * Preset configurations for different use cases
 */
export const CACHE_PRESETS = {
  /**
   * Development preset - optimized for development with debugging features
   */
  DEVELOPMENT: {
    name: 'development',
    description: 'Development configuration with debugging and monitoring',
    config: {
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      maxMemoryEntries: 500,
      enabled: true,
      cacheDirectory: '.cache/dev',
      autoCleanup: true,
      compression: {
        enabled: false // Disabled for faster development
      },
      checksumValidation: true, // Enabled for debugging
      atomicOperations: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 5000,
        monitoringWindow: 10000
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: false // Simplified for development
        },
        backgroundWorkers: {
          enabled: true,
          maxWorkers: 1,
          batchSize: 5,
          flushInterval: 2000
        },
        memoryPressureDetection: {
          enabled: true,
          warningThreshold: 0.7,
          criticalThreshold: 0.9,
          monitoringInterval: 5000,
          autoEviction: true
        }
      }
    } as CacheOptions
  },

  /**
   * Production preset - optimized for production performance and reliability
   */
  PRODUCTION: {
    name: 'production',
    description: 'Production configuration optimized for performance and reliability',
    config: {
      ttl: 3600000, // 1 hour
      maxSize: 10000,
      maxMemoryEntries: 2000,
      enabled: true,
      cacheDirectory: '.cache/prod',
      autoCleanup: true,
      compression: {
        enabled: true,
        level: 6,
        useWorkers: true,
        maxWorkers: 4,
        workerThreshold: 1024
      },
      checksumValidation: true,
      atomicOperations: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 10000,
        monitoringWindow: 30000
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: true,
          partitions: 8
        },
        backgroundWorkers: {
          enabled: true,
          maxWorkers: 3,
          batchSize: 20,
          flushInterval: 1000
        },
        memoryPressureDetection: {
          enabled: true,
          warningThreshold: 0.8,
          criticalThreshold: 0.95,
          monitoringInterval: 10000,
          autoEviction: true
        }
      }
    } as CacheOptions
  },

  /**
   * High performance preset - maximum speed with minimal overhead
   */
  HIGH_PERFORMANCE: {
    name: 'high-performance',
    description: 'Maximum performance configuration with optimized settings',
    config: {
      ttl: 1800000, // 30 minutes
      maxSize: 20000,
      maxMemoryEntries: 5000,
      enabled: true,
      cacheDirectory: '.cache/perf',
      autoCleanup: true,
      compression: {
        enabled: true,
        level: 3, // Lower compression for speed
        useWorkers: true,
        maxWorkers: 6,
        workerThreshold: 512
      },
      checksumValidation: false, // Disabled for performance
      atomicOperations: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 5000,
        monitoringWindow: 15000
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: true,
          partitions: 16 // More partitions for better concurrency
        },
        backgroundWorkers: {
          enabled: true,
          maxWorkers: 4,
          batchSize: 50, // Larger batches for efficiency
          flushInterval: 500
        },
        memoryPressureDetection: {
          enabled: true,
          warningThreshold: 0.85,
          criticalThreshold: 0.98,
          monitoringInterval: 5000,
          autoEviction: true
        }
      }
    } as CacheOptions
  },

  /**
   * Memory optimized preset - minimal memory usage
   */
  MEMORY_OPTIMIZED: {
    name: 'memory-optimized',
    description: 'Memory-efficient configuration with aggressive compression',
    config: {
      ttl: 600000, // 10 minutes
      maxSize: 5000,
      maxMemoryEntries: 200, // Very limited memory cache
      enabled: true,
      cacheDirectory: '.cache/memory',
      autoCleanup: true,
      compression: {
        enabled: true,
        level: 9, // Maximum compression
        useWorkers: true,
        maxWorkers: 2,
        workerThreshold: 256 // Compress even small items
      },
      checksumValidation: true,
      atomicOperations: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 8000,
        monitoringWindow: 20000
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: true,
          partitions: 4
        },
        backgroundWorkers: {
          enabled: true,
          maxWorkers: 1,
          batchSize: 10,
          flushInterval: 3000
        },
        memoryPressureDetection: {
          enabled: true,
          warningThreshold: 0.6, // Aggressive memory management
          criticalThreshold: 0.8,
          monitoringInterval: 2000,
          autoEviction: true
        }
      }
    } as CacheOptions
  },

  /**
   * Reliability focused preset - maximum data integrity
   */
  RELIABILITY_FOCUSED: {
    name: 'reliability-focused',
    description: 'Maximum reliability with comprehensive error handling',
    config: {
      ttl: 7200000, // 2 hours
      maxSize: 5000,
      maxMemoryEntries: 1000,
      enabled: true,
      cacheDirectory: '.cache/reliable',
      autoCleanup: true,
      compression: {
        enabled: true,
        level: 6,
        useWorkers: true,
        maxWorkers: 2,
        workerThreshold: 1024
      },
      checksumValidation: true, // Always enabled for reliability
      atomicOperations: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 2, // Very sensitive to failures
        successThreshold: 5, // Requires more successes to recover
        timeout: 15000, // Longer timeout for recovery
        monitoringWindow: 60000
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: true,
          partitions: 4
        },
        backgroundWorkers: {
          enabled: true,
          maxWorkers: 2,
          batchSize: 5, // Smaller batches for reliability
          flushInterval: 5000
        },
        memoryPressureDetection: {
          enabled: true,
          warningThreshold: 0.7,
          criticalThreshold: 0.85,
          monitoringInterval: 3000,
          autoEviction: true
        }
      }
    } as CacheOptions
  },

  /**
   * Testing preset - optimized for unit and integration tests
   */
  TESTING: {
    name: 'testing',
    description: 'Testing configuration with fast operations and cleanup',
    config: {
      ttl: 60000, // 1 minute
      maxSize: 100,
      maxMemoryEntries: 100,
      enabled: true,
      cacheDirectory: '.cache/test',
      autoCleanup: true,
      compression: {
        enabled: false // Disabled for test speed
      },
      checksumValidation: false, // Disabled for test speed
      atomicOperations: false, // Simplified for tests
      circuitBreaker: {
        enabled: false // Disabled to avoid interference with tests
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: false
        },
        backgroundWorkers: {
          enabled: false // Synchronous operations for predictable tests
        },
        memoryPressureDetection: {
          enabled: false
        }
      }
    } as CacheOptions
  },

  /**
   * Minimal preset - basic caching with minimal features
   */
  MINIMAL: {
    name: 'minimal',
    description: 'Minimal configuration with basic caching only',
    config: {
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      maxMemoryEntries: 1000,
      enabled: true,
      compression: {
        enabled: false
      },
      checksumValidation: false,
      atomicOperations: false,
      circuitBreaker: {
        enabled: false
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: false
        },
        backgroundWorkers: {
          enabled: false
        },
        memoryPressureDetection: {
          enabled: false
        }
      }
    } as CacheOptions
  },

  /**
   * Large data preset - optimized for handling large objects
   */
  LARGE_DATA: {
    name: 'large-data',
    description: 'Optimized for large data objects with streaming compression',
    config: {
      ttl: 3600000, // 1 hour
      maxSize: 1000, // Fewer items due to large size
      maxMemoryEntries: 50, // Very limited memory cache
      enabled: true,
      cacheDirectory: '.cache/large',
      autoCleanup: true,
      compression: {
        enabled: true,
        level: 9, // Maximum compression for large data
        useWorkers: true,
        maxWorkers: 6,
        workerThreshold: 512 // Compress most items
      },
      checksumValidation: true, // Important for large data integrity
      atomicOperations: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000, // Longer timeout for large data
        monitoringWindow: 60000
      },
      scalabilityEnhancements: {
        partitionedStorage: {
          enabled: true,
          partitions: 16 // More partitions for large data distribution
        },
        backgroundWorkers: {
          enabled: true,
          maxWorkers: 3,
          batchSize: 3, // Smaller batches for large items
          flushInterval: 2000
        },
        memoryPressureDetection: {
          enabled: true,
          warningThreshold: 0.6, // Aggressive for large data
          criticalThreshold: 0.8,
          monitoringInterval: 1000,
          autoEviction: true
        }
      }
    } as CacheOptions
  }
};

/**
 * Get a preset configuration by name
 */
export function getPreset(name: keyof typeof CACHE_PRESETS): CacheOptions {
  const preset = CACHE_PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown preset: ${name}`);
  }
  return JSON.parse(JSON.stringify(preset.config)); // Deep clone
}

/**
 * Get all available presets
 */
export function getAllPresets(): Array<{
  name: string;
  description: string;
  config: CacheOptions;
}> {
  return Object.values(CACHE_PRESETS).map(preset => ({
    name: preset.name,
    description: preset.description,
    config: JSON.parse(JSON.stringify(preset.config))
  }));
}

/**
 * Create a custom configuration based on a preset with overrides
 */
export function createCustomConfig(
  baseName: keyof typeof CACHE_PRESETS,
  overrides: Partial<CacheOptions>
): CacheOptions {
  const baseConfig = getPreset(baseName);
  return mergeConfigs(baseConfig, overrides);
}

/**
 * Merge two cache configurations with deep merging
 */
export function mergeConfigs(
  base: CacheOptions,
  overrides: Partial<CacheOptions>
): CacheOptions {
  const merged = JSON.parse(JSON.stringify(base)); // Deep clone base
  
  // Simple properties
  Object.keys(overrides).forEach(key => {
    const value = overrides[key as keyof CacheOptions];
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Deep merge objects
        merged[key as keyof CacheOptions] = {
          ...merged[key as keyof CacheOptions],
          ...value
        };
      } else {
        // Direct assignment for primitives and arrays
        merged[key as keyof CacheOptions] = value;
      }
    }
  });
  
  return merged;
}

/**
 * Get recommended preset based on use case
 */
export function getRecommendedPreset(useCase: {
  environment?: 'development' | 'production' | 'testing';
  priority?: 'performance' | 'memory' | 'reliability';
  dataSize?: 'small' | 'medium' | 'large';
  features?: 'minimal' | 'standard' | 'full';
}): keyof typeof CACHE_PRESETS {
  // Environment takes precedence
  if (useCase.environment === 'testing') {
    return 'TESTING';
  }
  
  if (useCase.environment === 'development') {
    return 'DEVELOPMENT';
  }
  
  // For production, consider other factors
  if (useCase.environment === 'production') {
    if (useCase.dataSize === 'large') {
      return 'LARGE_DATA';
    }
    
    if (useCase.priority === 'performance') {
      return 'HIGH_PERFORMANCE';
    }
    
    if (useCase.priority === 'memory') {
      return 'MEMORY_OPTIMIZED';
    }
    
    if (useCase.priority === 'reliability') {
      return 'RELIABILITY_FOCUSED';
    }
    
    return 'PRODUCTION';
  }
  
  // Default recommendations based on other factors
  if (useCase.features === 'minimal') {
    return 'MINIMAL';
  }
  
  if (useCase.dataSize === 'large') {
    return 'LARGE_DATA';
  }
  
  if (useCase.priority === 'performance') {
    return 'HIGH_PERFORMANCE';
  }
  
  if (useCase.priority === 'memory') {
    return 'MEMORY_OPTIMIZED';
  }
  
  if (useCase.priority === 'reliability') {
    return 'RELIABILITY_FOCUSED';
  }
  
  // Default fallback
  return 'PRODUCTION';
}

/**
 * Get preset recommendations with explanations
 */
export function getPresetRecommendations(useCase: {
  environment?: 'development' | 'production' | 'testing';
  priority?: 'performance' | 'memory' | 'reliability';
  dataSize?: 'small' | 'medium' | 'large';
  features?: 'minimal' | 'standard' | 'full';
}): Array<{
  preset: keyof typeof CACHE_PRESETS;
  score: number;
  reasons: string[];
}> {
  const recommendations: Array<{
    preset: keyof typeof CACHE_PRESETS;
    score: number;
    reasons: string[];
  }> = [];
  
  Object.keys(CACHE_PRESETS).forEach(presetKey => {
    const preset = presetKey as keyof typeof CACHE_PRESETS;
    const score = calculatePresetScore(preset, useCase);
    const reasons = getPresetReasons(preset, useCase);
    
    recommendations.push({ preset, score, reasons });
  });
  
  return recommendations.sort((a, b) => b.score - a.score);
}

function calculatePresetScore(
  preset: keyof typeof CACHE_PRESETS,
  useCase: {
    environment?: 'development' | 'production' | 'testing';
    priority?: 'performance' | 'memory' | 'reliability';
    dataSize?: 'small' | 'medium' | 'large';
    features?: 'minimal' | 'standard' | 'full';
  }
): number {
  let score = 0;
  
  // Environment matching
  if (useCase.environment === 'testing' && preset === 'TESTING') score += 50;
  if (useCase.environment === 'development' && preset === 'DEVELOPMENT') score += 50;
  if (useCase.environment === 'production' && 
      ['PRODUCTION', 'HIGH_PERFORMANCE', 'MEMORY_OPTIMIZED', 'RELIABILITY_FOCUSED', 'LARGE_DATA'].includes(preset)) {
    score += 30;
  }
  
  // Priority matching
  if (useCase.priority === 'performance' && preset === 'HIGH_PERFORMANCE') score += 40;
  if (useCase.priority === 'memory' && preset === 'MEMORY_OPTIMIZED') score += 40;
  if (useCase.priority === 'reliability' && preset === 'RELIABILITY_FOCUSED') score += 40;
  
  // Data size matching
  if (useCase.dataSize === 'large' && preset === 'LARGE_DATA') score += 30;
  if (useCase.dataSize === 'small' && ['MINIMAL', 'MEMORY_OPTIMIZED'].includes(preset)) score += 20;
  
  // Features matching
  if (useCase.features === 'minimal' && preset === 'MINIMAL') score += 30;
  if (useCase.features === 'full' && 
      ['PRODUCTION', 'HIGH_PERFORMANCE', 'RELIABILITY_FOCUSED'].includes(preset)) {
    score += 20;
  }
  
  return score;
}

function getPresetReasons(
  preset: keyof typeof CACHE_PRESETS,
  useCase: {
    environment?: 'development' | 'production' | 'testing';
    priority?: 'performance' | 'memory' | 'reliability';
    dataSize?: 'small' | 'medium' | 'large';
    features?: 'minimal' | 'standard' | 'full';
  }
): string[] {
  const reasons: string[] = [];
  const presetInfo = CACHE_PRESETS[preset];
  
  // Add general description
  reasons.push(presetInfo.description);
  
  // Add specific matching reasons
  if (useCase.environment === 'testing' && preset === 'TESTING') {
    reasons.push('Optimized for test environments with fast operations');
  }
  
  if (useCase.environment === 'development' && preset === 'DEVELOPMENT') {
    reasons.push('Includes debugging features and monitoring for development');
  }
  
  if (useCase.priority === 'performance' && preset === 'HIGH_PERFORMANCE') {
    reasons.push('Maximizes throughput with optimized settings');
  }
  
  if (useCase.priority === 'memory' && preset === 'MEMORY_OPTIMIZED') {
    reasons.push('Minimizes memory usage with aggressive compression');
  }
  
  if (useCase.priority === 'reliability' && preset === 'RELIABILITY_FOCUSED') {
    reasons.push('Provides maximum data integrity and error handling');
  }
  
  if (useCase.dataSize === 'large' && preset === 'LARGE_DATA') {
    reasons.push('Optimized for large data objects with streaming compression');
  }
  
  if (useCase.features === 'minimal' && preset === 'MINIMAL') {
    reasons.push('Provides basic caching with minimal overhead');
  }
  
  return reasons;
}