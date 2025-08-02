/**
 * Configuration Validation for @lorm/core cache system
 * Comprehensive validation with detailed error messages and suggestions
 */

import type { CacheOptions } from '../types/index.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  expectedType?: string;
  allowedValues?: any[];
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
  recommendation?: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  strict?: boolean; // Enable strict validation
  environment?: 'development' | 'production' | 'testing';
  allowExperimental?: boolean; // Allow experimental features
  performanceChecks?: boolean; // Enable performance-related warnings
}

/**
 * Main validation function
 */
export function validateCacheConfig(
  config: Partial<CacheOptions>,
  options: ValidationOptions = {}
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Validate basic properties
  validateBasicProperties(config, result, options);
  
  // Validate compression settings
  validateCompressionConfig(config.compression, result, options);
  
  // Validate circuit breaker settings
  validateCircuitBreakerConfig(config.circuitBreaker, result, options);
  
  // Validate scalability enhancements
  validateScalabilityConfig(config.scalabilityEnhancements, result, options);
  
  // Validate configuration consistency
  validateConfigConsistency(config, result, options);
  
  // Add performance suggestions
  addPerformanceSuggestions(config, result, options);
  
  // Add environment-specific suggestions
  addEnvironmentSuggestions(config, result, options);
  
  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validate basic cache properties
 */
function validateBasicProperties(
  config: Partial<CacheOptions>,
  result: ValidationResult,
  options: ValidationOptions
): void {
  // TTL validation
  if (config.ttl !== undefined) {
    if (typeof config.ttl !== 'number') {
      result.errors.push({
        field: 'ttl',
        message: 'TTL must be a number',
        value: config.ttl,
        expectedType: 'number'
      });
    } else if (config.ttl < 0) {
      result.errors.push({
        field: 'ttl',
        message: 'TTL cannot be negative',
        value: config.ttl
      });
    } else if (config.ttl < 1000) {
      result.warnings.push({
        field: 'ttl',
        message: 'Very short TTL may cause frequent cache misses',
        value: config.ttl,
        recommendation: 'Consider using at least 1000ms (1 second)'
      });
    } else if (config.ttl > 86400000) { // 24 hours
      result.warnings.push({
        field: 'ttl',
        message: 'Very long TTL may cause stale data issues',
        value: config.ttl,
        recommendation: 'Consider using shorter TTL for better data freshness'
      });
    }
  }

  // Max size validation
  if (config.maxSize !== undefined) {
    if (typeof config.maxSize !== 'number') {
      result.errors.push({
        field: 'maxSize',
        message: 'maxSize must be a number',
        value: config.maxSize,
        expectedType: 'number'
      });
    } else if (config.maxSize <= 0) {
      result.errors.push({
        field: 'maxSize',
        message: 'maxSize must be positive',
        value: config.maxSize
      });
    } else if (config.maxSize > 100000) {
      result.warnings.push({
        field: 'maxSize',
        message: 'Very large cache size may impact performance',
        value: config.maxSize,
        recommendation: 'Consider using partitioned storage for large caches'
      });
    }
  }

  // Max memory entries validation
  if (config.maxMemoryEntries !== undefined) {
    if (typeof config.maxMemoryEntries !== 'number') {
      result.errors.push({
        field: 'maxMemoryEntries',
        message: 'maxMemoryEntries must be a number',
        value: config.maxMemoryEntries,
        expectedType: 'number'
      });
    } else if (config.maxMemoryEntries < 0) {
      result.errors.push({
        field: 'maxMemoryEntries',
        message: 'maxMemoryEntries cannot be negative',
        value: config.maxMemoryEntries
      });
    } else if (config.maxMemoryEntries > 10000) {
      result.warnings.push({
        field: 'maxMemoryEntries',
        message: 'Large memory cache may cause memory pressure',
        value: config.maxMemoryEntries,
        recommendation: 'Consider enabling memory pressure detection'
      });
    }
  }

  // Cache directory validation
  if (config.cacheDirectory !== undefined) {
    if (typeof config.cacheDirectory !== 'string') {
      result.errors.push({
        field: 'cacheDirectory',
        message: 'cacheDirectory must be a string',
        value: config.cacheDirectory,
        expectedType: 'string'
      });
    } else if (config.cacheDirectory.length === 0) {
      result.errors.push({
        field: 'cacheDirectory',
        message: 'cacheDirectory cannot be empty',
        value: config.cacheDirectory
      });
    }
  }

  // Enabled validation
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    result.errors.push({
      field: 'enabled',
      message: 'enabled must be a boolean',
      value: config.enabled,
      expectedType: 'boolean'
    });
  }

  // Auto cleanup validation
  if (config.autoCleanup !== undefined && typeof config.autoCleanup !== 'boolean') {
    result.errors.push({
      field: 'autoCleanup',
      message: 'autoCleanup must be a boolean',
      value: config.autoCleanup,
      expectedType: 'boolean'
    });
  }

  // Checksum validation
  if (config.checksumValidation !== undefined && typeof config.checksumValidation !== 'boolean') {
    result.errors.push({
      field: 'checksumValidation',
      message: 'checksumValidation must be a boolean',
      value: config.checksumValidation,
      expectedType: 'boolean'
    });
  }

  // Atomic operations validation
  if (config.atomicOperations !== undefined && typeof config.atomicOperations !== 'boolean') {
    result.errors.push({
      field: 'atomicOperations',
      message: 'atomicOperations must be a boolean',
      value: config.atomicOperations,
      expectedType: 'boolean'
    });
  }
}

/**
 * Validate compression configuration
 */
function validateCompressionConfig(
  compression: CacheOptions['compression'],
  result: ValidationResult,
  options: ValidationOptions
): void {
  if (!compression) return;

  // If compression is just a boolean, no further validation needed
  if (typeof compression === 'boolean') return;

  // Enabled validation
  if (compression.enabled !== undefined && typeof compression.enabled !== 'boolean') {
    result.errors.push({
      field: 'compression.enabled',
      message: 'compression.enabled must be a boolean',
      value: compression.enabled,
      expectedType: 'boolean'
    });
  }

  // Level validation
  if (compression.level !== undefined) {
    if (typeof compression.level !== 'number') {
      result.errors.push({
        field: 'compression.level',
        message: 'compression.level must be a number',
        value: compression.level,
        expectedType: 'number'
      });
    } else if (compression.level < 1 || compression.level > 9) {
      result.errors.push({
        field: 'compression.level',
        message: 'compression.level must be between 1 and 9',
        value: compression.level,
        allowedValues: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      });
    } else if (compression.level > 6 && options.performanceChecks) {
      result.warnings.push({
        field: 'compression.level',
        message: 'High compression levels may impact performance',
        value: compression.level,
        recommendation: 'Consider using level 6 or lower for better performance'
      });
    }
  }

  // Use workers validation
  if (compression.useWorkers !== undefined && typeof compression.useWorkers !== 'boolean') {
    result.errors.push({
      field: 'compression.useWorkers',
      message: 'compression.useWorkers must be a boolean',
      value: compression.useWorkers,
      expectedType: 'boolean'
    });
  }

  // Max workers validation
  if (compression.maxWorkers !== undefined) {
    if (typeof compression.maxWorkers !== 'number') {
      result.errors.push({
        field: 'compression.maxWorkers',
        message: 'compression.maxWorkers must be a number',
        value: compression.maxWorkers,
        expectedType: 'number'
      });
    } else if (compression.maxWorkers <= 0) {
      result.errors.push({
        field: 'compression.maxWorkers',
        message: 'compression.maxWorkers must be positive',
        value: compression.maxWorkers
      });
    } else if (compression.maxWorkers > 8) {
      result.warnings.push({
        field: 'compression.maxWorkers',
        message: 'Too many compression workers may cause overhead',
        value: compression.maxWorkers,
        recommendation: 'Consider using 4-8 workers maximum'
      });
    }
  }

  // Worker threshold validation
  if (compression.workerThreshold !== undefined) {
    if (typeof compression.workerThreshold !== 'number') {
      result.errors.push({
        field: 'compression.workerThreshold',
        message: 'compression.workerThreshold must be a number',
        value: compression.workerThreshold,
        expectedType: 'number'
      });
    } else if (compression.workerThreshold < 0) {
      result.errors.push({
        field: 'compression.workerThreshold',
        message: 'compression.workerThreshold cannot be negative',
        value: compression.workerThreshold
      });
    }
  }
}

/**
 * Validate circuit breaker configuration
 */
function validateCircuitBreakerConfig(
  circuitBreaker: CacheOptions['circuitBreaker'],
  result: ValidationResult,
  options: ValidationOptions
): void {
  if (!circuitBreaker) return;

  // If circuitBreaker is just a boolean, no further validation needed
  if (typeof circuitBreaker === 'boolean') return;

  // Enabled validation
  if (circuitBreaker.enabled !== undefined && typeof circuitBreaker.enabled !== 'boolean') {
    result.errors.push({
      field: 'circuitBreaker.enabled',
      message: 'circuitBreaker.enabled must be a boolean',
      value: circuitBreaker.enabled,
      expectedType: 'boolean'
    });
  }

  // Failure threshold validation
  if (circuitBreaker.failureThreshold !== undefined) {
    if (typeof circuitBreaker.failureThreshold !== 'number') {
      result.errors.push({
        field: 'circuitBreaker.failureThreshold',
        message: 'circuitBreaker.failureThreshold must be a number',
        value: circuitBreaker.failureThreshold,
        expectedType: 'number'
      });
    } else if (circuitBreaker.failureThreshold <= 0) {
      result.errors.push({
        field: 'circuitBreaker.failureThreshold',
        message: 'circuitBreaker.failureThreshold must be positive',
        value: circuitBreaker.failureThreshold
      });
    } else if (circuitBreaker.failureThreshold === 1) {
      result.warnings.push({
        field: 'circuitBreaker.failureThreshold',
        message: 'Very low failure threshold may cause frequent circuit opening',
        value: circuitBreaker.failureThreshold,
        recommendation: 'Consider using threshold of 3 or higher'
      });
    }
  }

  // Success threshold validation
  if (circuitBreaker.successThreshold !== undefined) {
    if (typeof circuitBreaker.successThreshold !== 'number') {
      result.errors.push({
        field: 'circuitBreaker.successThreshold',
        message: 'circuitBreaker.successThreshold must be a number',
        value: circuitBreaker.successThreshold,
        expectedType: 'number'
      });
    } else if (circuitBreaker.successThreshold <= 0) {
      result.errors.push({
        field: 'circuitBreaker.successThreshold',
        message: 'circuitBreaker.successThreshold must be positive',
        value: circuitBreaker.successThreshold
      });
    }
  }

  // Timeout validation
  if (circuitBreaker.timeout !== undefined) {
    if (typeof circuitBreaker.timeout !== 'number') {
      result.errors.push({
        field: 'circuitBreaker.timeout',
        message: 'circuitBreaker.timeout must be a number',
        value: circuitBreaker.timeout,
        expectedType: 'number'
      });
    } else if (circuitBreaker.timeout <= 0) {
      result.errors.push({
        field: 'circuitBreaker.timeout',
        message: 'circuitBreaker.timeout must be positive',
        value: circuitBreaker.timeout
      });
    } else if (circuitBreaker.timeout < 1000) {
      result.warnings.push({
        field: 'circuitBreaker.timeout',
        message: 'Very short timeout may not allow proper recovery',
        value: circuitBreaker.timeout,
        recommendation: 'Consider using at least 1000ms timeout'
      });
    }
  }

  // Monitoring window validation
  if (circuitBreaker.monitoringWindow !== undefined) {
    if (typeof circuitBreaker.monitoringWindow !== 'number') {
      result.errors.push({
        field: 'circuitBreaker.monitoringWindow',
        message: 'circuitBreaker.monitoringWindow must be a number',
        value: circuitBreaker.monitoringWindow,
        expectedType: 'number'
      });
    } else if (circuitBreaker.monitoringWindow <= 0) {
      result.errors.push({
        field: 'circuitBreaker.monitoringWindow',
        message: 'circuitBreaker.monitoringWindow must be positive',
        value: circuitBreaker.monitoringWindow
      });
    }
  }
}

/**
 * Validate scalability configuration
 */
function validateScalabilityConfig(
  scalability: CacheOptions['scalabilityEnhancements'],
  result: ValidationResult,
  options: ValidationOptions
): void {
  if (!scalability) return;

  // Validate partitioned storage
  if (scalability.partitionedStorage) {
    const ps = scalability.partitionedStorage;
    
    if (ps.enabled !== undefined && typeof ps.enabled !== 'boolean') {
      result.errors.push({
        field: 'scalabilityEnhancements.partitionedStorage.enabled',
        message: 'partitionedStorage.enabled must be a boolean',
        value: ps.enabled,
        expectedType: 'boolean'
      });
    }

    if (ps.partitions !== undefined) {
      if (typeof ps.partitions !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.partitionedStorage.partitions',
          message: 'partitionedStorage.partitions must be a number',
          value: ps.partitions,
          expectedType: 'number'
        });
      } else if (ps.partitions <= 0) {
        result.errors.push({
          field: 'scalabilityEnhancements.partitionedStorage.partitions',
          message: 'partitionedStorage.partitions must be positive',
          value: ps.partitions
        });
      } else if (ps.partitions > 32) {
        result.warnings.push({
          field: 'scalabilityEnhancements.partitionedStorage.partitions',
          message: 'Too many partitions may cause overhead',
          value: ps.partitions,
          recommendation: 'Consider using 16 partitions or fewer'
        });
      }
    }
  }

  // Validate background workers
  if (scalability.backgroundWorkers) {
    const bw = scalability.backgroundWorkers;
    
    if (bw.enabled !== undefined && typeof bw.enabled !== 'boolean') {
      result.errors.push({
        field: 'scalabilityEnhancements.backgroundWorkers.enabled',
        message: 'backgroundWorkers.enabled must be a boolean',
        value: bw.enabled,
        expectedType: 'boolean'
      });
    }

    if (bw.maxWorkers !== undefined) {
      if (typeof bw.maxWorkers !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.backgroundWorkers.maxWorkers',
          message: 'backgroundWorkers.maxWorkers must be a number',
          value: bw.maxWorkers,
          expectedType: 'number'
        });
      } else if (bw.maxWorkers <= 0) {
        result.errors.push({
          field: 'scalabilityEnhancements.backgroundWorkers.maxWorkers',
          message: 'backgroundWorkers.maxWorkers must be positive',
          value: bw.maxWorkers
        });
      }
    }

    if (bw.batchSize !== undefined) {
      if (typeof bw.batchSize !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.backgroundWorkers.batchSize',
          message: 'backgroundWorkers.batchSize must be a number',
          value: bw.batchSize,
          expectedType: 'number'
        });
      } else if (bw.batchSize <= 0) {
        result.errors.push({
          field: 'scalabilityEnhancements.backgroundWorkers.batchSize',
          message: 'backgroundWorkers.batchSize must be positive',
          value: bw.batchSize
        });
      }
    }

    if (bw.flushInterval !== undefined) {
      if (typeof bw.flushInterval !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.backgroundWorkers.flushInterval',
          message: 'backgroundWorkers.flushInterval must be a number',
          value: bw.flushInterval,
          expectedType: 'number'
        });
      } else if (bw.flushInterval <= 0) {
        result.errors.push({
          field: 'scalabilityEnhancements.backgroundWorkers.flushInterval',
          message: 'backgroundWorkers.flushInterval must be positive',
          value: bw.flushInterval
        });
      }
    }
  }

  // Validate memory pressure detection
  if (scalability.memoryPressureDetection) {
    const mpd = scalability.memoryPressureDetection;
    
    if (mpd.enabled !== undefined && typeof mpd.enabled !== 'boolean') {
      result.errors.push({
        field: 'scalabilityEnhancements.memoryPressureDetection.enabled',
        message: 'memoryPressureDetection.enabled must be a boolean',
        value: mpd.enabled,
        expectedType: 'boolean'
      });
    }

    if (mpd.warningThreshold !== undefined) {
      if (typeof mpd.warningThreshold !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection.warningThreshold',
          message: 'memoryPressureDetection.warningThreshold must be a number',
          value: mpd.warningThreshold,
          expectedType: 'number'
        });
      } else if (mpd.warningThreshold <= 0 || mpd.warningThreshold >= 1) {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection.warningThreshold',
          message: 'memoryPressureDetection.warningThreshold must be between 0 and 1',
          value: mpd.warningThreshold
        });
      }
    }

    if (mpd.criticalThreshold !== undefined) {
      if (typeof mpd.criticalThreshold !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection.criticalThreshold',
          message: 'memoryPressureDetection.criticalThreshold must be a number',
          value: mpd.criticalThreshold,
          expectedType: 'number'
        });
      } else if (mpd.criticalThreshold <= 0 || mpd.criticalThreshold >= 1) {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection.criticalThreshold',
          message: 'memoryPressureDetection.criticalThreshold must be between 0 and 1',
          value: mpd.criticalThreshold
        });
      }
    }

    // Check threshold relationship
    if (mpd.warningThreshold !== undefined && mpd.criticalThreshold !== undefined) {
      if (mpd.warningThreshold >= mpd.criticalThreshold) {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection',
          message: 'warningThreshold must be less than criticalThreshold',
          value: { warning: mpd.warningThreshold, critical: mpd.criticalThreshold }
        });
      }
    }

    if (mpd.monitoringInterval !== undefined) {
      if (typeof mpd.monitoringInterval !== 'number') {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection.monitoringInterval',
          message: 'memoryPressureDetection.monitoringInterval must be a number',
          value: mpd.monitoringInterval,
          expectedType: 'number'
        });
      } else if (mpd.monitoringInterval <= 0) {
        result.errors.push({
          field: 'scalabilityEnhancements.memoryPressureDetection.monitoringInterval',
          message: 'memoryPressureDetection.monitoringInterval must be positive',
          value: mpd.monitoringInterval
        });
      }
    }

    if (mpd.autoEviction !== undefined && typeof mpd.autoEviction !== 'boolean') {
      result.errors.push({
        field: 'scalabilityEnhancements.memoryPressureDetection.autoEviction',
        message: 'memoryPressureDetection.autoEviction must be a boolean',
        value: mpd.autoEviction,
        expectedType: 'boolean'
      });
    }
  }
}

/**
 * Validate configuration consistency
 */
function validateConfigConsistency(
  config: Partial<CacheOptions>,
  result: ValidationResult,
  options: ValidationOptions
): void {
  // Check maxSize vs maxMemoryEntries relationship
  if (config.maxSize !== undefined && config.maxMemoryEntries !== undefined) {
    if (config.maxMemoryEntries > config.maxSize) {
      result.warnings.push({
        field: 'maxMemoryEntries',
        message: 'maxMemoryEntries is larger than maxSize',
        value: { maxMemoryEntries: config.maxMemoryEntries, maxSize: config.maxSize },
        recommendation: 'Consider setting maxMemoryEntries <= maxSize'
      });
    }
  }

  // Check compression workers vs background workers
  if (typeof config.compression === 'object' && config.compression?.maxWorkers !== undefined && 
      config.scalabilityEnhancements?.backgroundWorkers?.maxWorkers !== undefined) {
    const totalWorkers = config.compression.maxWorkers + 
                        config.scalabilityEnhancements.backgroundWorkers.maxWorkers;
    if (totalWorkers > 8) {
      result.warnings.push({
        field: 'workers',
        message: 'Total worker count may be excessive',
        value: { compression: config.compression.maxWorkers, background: config.scalabilityEnhancements.backgroundWorkers.maxWorkers },
        recommendation: 'Consider reducing total worker count to avoid overhead'
      });
    }
  }

  // Check circuit breaker timeout vs TTL
  if (typeof config.circuitBreaker === 'object' && config.circuitBreaker?.timeout !== undefined && config.ttl !== undefined) {
    if (config.circuitBreaker.timeout > config.ttl) {
      result.warnings.push({
        field: 'circuitBreaker.timeout',
        message: 'Circuit breaker timeout is longer than cache TTL',
        value: { timeout: config.circuitBreaker.timeout, ttl: config.ttl },
        recommendation: 'Consider setting timeout < TTL for better cache behavior'
      });
    }
  }
}

/**
 * Add performance-related suggestions
 */
function addPerformanceSuggestions(
  config: Partial<CacheOptions>,
  result: ValidationResult,
  options: ValidationOptions
): void {
  if (!options.performanceChecks) return;

  // Suggest compression for large caches
  if (config.maxSize !== undefined && config.maxSize > 5000 && 
      (!config.compression || (typeof config.compression === 'object' && !config.compression.enabled))) {
    result.suggestions.push('Consider enabling compression for large caches to reduce memory usage');
  }

  // Suggest partitioned storage for very large caches
  if (config.maxSize !== undefined && config.maxSize > 10000 && 
      (!config.scalabilityEnhancements?.partitionedStorage?.enabled)) {
    result.suggestions.push('Consider enabling partitioned storage for very large caches');
  }

  // Suggest memory pressure detection for large memory caches
  if (config.maxMemoryEntries !== undefined && config.maxMemoryEntries > 1000 && 
      (!config.scalabilityEnhancements?.memoryPressureDetection?.enabled)) {
    result.suggestions.push('Consider enabling memory pressure detection for large memory caches');
  }

  // Suggest background workers for write-heavy workloads
  if (config.maxSize !== undefined && config.maxSize > 1000 && 
      (!config.scalabilityEnhancements?.backgroundWorkers?.enabled)) {
    result.suggestions.push('Consider enabling background workers for better write performance');
  }
}

/**
 * Add environment-specific suggestions
 */
function addEnvironmentSuggestions(
  config: Partial<CacheOptions>,
  result: ValidationResult,
  options: ValidationOptions
): void {
  if (!options.environment) return;

  switch (options.environment) {
    case 'development':
      if (typeof config.compression === 'object' && config.compression?.enabled) {
        result.suggestions.push('Consider disabling compression in development for faster builds');
      }
      if (!config.checksumValidation) {
        result.suggestions.push('Consider enabling checksum validation in development for debugging');
      }
      break;

    case 'production':
      if ((!config.compression || (typeof config.compression === 'object' && !config.compression.enabled)) && config.maxSize && config.maxSize > 1000) {
        result.suggestions.push('Consider enabling compression in production to reduce memory usage');
      }
      if (!config.circuitBreaker || (typeof config.circuitBreaker === 'object' && !config.circuitBreaker.enabled)) {
        result.suggestions.push('Consider enabling circuit breaker in production for better reliability');
      }
      if (!config.scalabilityEnhancements?.memoryPressureDetection?.enabled) {
        result.suggestions.push('Consider enabling memory pressure detection in production');
      }
      break;

    case 'testing':
      if (typeof config.compression === 'object' && config.compression?.enabled) {
        result.suggestions.push('Consider disabling compression in tests for faster execution');
      }
      if (typeof config.circuitBreaker === 'object' && config.circuitBreaker?.enabled) {
        result.suggestions.push('Consider disabling circuit breaker in tests for predictable behavior');
      }
      if (config.scalabilityEnhancements?.backgroundWorkers?.enabled) {
        result.suggestions.push('Consider disabling background workers in tests for synchronous behavior');
      }
      break;
  }
}

/**
 * Quick validation function for basic checks
 */
export function quickValidate(config: Partial<CacheOptions>): boolean {
  const result = validateCacheConfig(config, { strict: false });
  return result.isValid;
}

/**
 * Strict validation function with all checks enabled
 */
export function strictValidate(
  config: Partial<CacheOptions>,
  environment?: 'development' | 'production' | 'testing'
): ValidationResult {
  return validateCacheConfig(config, {
    strict: true,
    environment,
    performanceChecks: true,
    allowExperimental: false
  });
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  
  if (result.isValid) {
    lines.push('✅ Configuration is valid');
  } else {
    lines.push('❌ Configuration has errors');
  }
  
  if (result.errors.length > 0) {
    lines.push('\n🚨 Errors:');
    result.errors.forEach(error => {
      lines.push(`  • ${error.field}: ${error.message}`);
      if (error.value !== undefined) {
        lines.push(`    Current value: ${JSON.stringify(error.value)}`);
      }
      if (error.expectedType) {
        lines.push(`    Expected type: ${error.expectedType}`);
      }
      if (error.allowedValues) {
        lines.push(`    Allowed values: ${error.allowedValues.join(', ')}`);
      }
    });
  }
  
  if (result.warnings.length > 0) {
    lines.push('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      lines.push(`  • ${warning.field}: ${warning.message}`);
      if (warning.recommendation) {
        lines.push(`    Recommendation: ${warning.recommendation}`);
      }
    });
  }
  
  if (result.suggestions.length > 0) {
    lines.push('\n💡 Suggestions:');
    result.suggestions.forEach(suggestion => {
      lines.push(`  • ${suggestion}`);
    });
  }
  
  return lines.join('\n');
}