import { CacheConfig } from '@lorm/core';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { Logger } from './logger.js';

/**
 * Cache configuration resolver for CLI-v2
 * Provides centralized cache configuration management
 */
export class CacheConfigResolver {
  private static readonly DEFAULT_CONFIG: CacheConfig = {
    enabled: true,
    strategy: 'hybrid' as const,
    ttl: 300000, // 5 minutes
    maxSize: 100 * 1024 * 1024, // 100MB
    compression: false
  };

  private static readonly CONFIG_CACHE = new Map<string, CacheConfig>();

  /**
   * Resolve cache configuration for a project
   */
  static resolveConfig(projectRoot: string, overrides?: Partial<CacheConfig>): CacheConfig {
    const cacheKey = `${projectRoot}:${JSON.stringify(overrides || {})}`;
    
    // Check cache first
    if (this.CONFIG_CACHE.has(cacheKey)) {
      return this.CONFIG_CACHE.get(cacheKey)!;
    }

    try {
      const config = this.buildConfig(projectRoot, overrides);
      this.CONFIG_CACHE.set(cacheKey, config);
      return config;
    } catch (error) {
      Logger.warning(`Failed to resolve cache config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { ...this.DEFAULT_CONFIG, ...overrides };
    }
  }

  /**
   * Get default cache configuration
   */
  static getDefaultConfig(): CacheConfig {
    return { ...this.DEFAULT_CONFIG };
  }

  /**
   * Validate cache configuration
   */
  static validateConfig(config: Partial<CacheConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.ttl !== undefined && (config.ttl < 0 || config.ttl > 86400000)) {
      errors.push('TTL must be between 0 and 86400000ms (24 hours)');
    }

    if (config.maxSize !== undefined && config.maxSize < 1024) {
      errors.push('Max size must be at least 1KB');
    }



    if (config.strategy !== undefined && !['memory', 'disk', 'hybrid'].includes(config.strategy)) {
      errors.push('Strategy must be one of: memory, disk, hybrid');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear configuration cache
   */
  static clearConfigCache(): void {
    this.CONFIG_CACHE.clear();
  }

  /**
   * Get configuration for different environments
   */
  static getEnvironmentConfig(env: 'development' | 'production' | 'test'): Partial<CacheConfig> {
    switch (env) {
      case 'development':
        return {
          enabled: true,
          strategy: 'hybrid',
          ttl: 300000 // 5 minutes
        };
      case 'production':
        return {
          enabled: true,
          strategy: 'hybrid',
          ttl: 3600000 // 1 hour
        };
      case 'test':
        return {
          enabled: false,
          strategy: 'memory'
        };
      default:
        return {};
    }
  }

  /**
   * Build configuration from multiple sources
   */
  private static buildConfig(projectRoot: string, overrides?: Partial<CacheConfig>): CacheConfig {
    let config = { ...this.DEFAULT_CONFIG };

    // 1. Load from project config file
    const projectConfig = this.loadProjectConfig(projectRoot);
    if (projectConfig) {
      config = { ...config, ...projectConfig };
    }

    // 2. Apply environment-specific config
    const env = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
    const envConfig = this.getEnvironmentConfig(env);
    config = { ...config, ...envConfig };

    // 3. Apply environment variables
    const envVarConfig = this.loadFromEnvironmentVariables();
    config = { ...config, ...envVarConfig };

    // 4. Apply overrides
    if (overrides) {
      config = { ...config, ...overrides };
    }

    // 5. Validate final config
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      Logger.warning(`Invalid cache configuration: ${validation.errors.join(', ')}`);
      // Use defaults for invalid values
      config = { ...this.DEFAULT_CONFIG, ...this.filterValidConfig(config) };
    }

    return config;
  }

  /**
   * Load cache configuration from project config file
   */
  private static loadProjectConfig(projectRoot: string): Partial<CacheConfig> | null {
    const configPaths = [
      join(projectRoot, '.lormrc.json'),
      join(projectRoot, 'lorm.config.json'),
      join(projectRoot, 'package.json')
    ];

    for (const configPath of configPaths) {
      try {
        if (existsSync(configPath)) {
          const content = readFileSync(configPath, 'utf-8');
          const config = JSON.parse(content);
          
          // Extract cache config from different sources
          if (configPath.endsWith('package.json')) {
            return config.lorm?.cache || null;
          } else {
            return config.cache || null;
          }
        }
      } catch (error) {
        // Continue to next config file
        continue;
      }
    }

    return null;
  }

  /**
   * Load cache configuration from environment variables
   */
  private static loadFromEnvironmentVariables(): Partial<CacheConfig> {
    const config: Partial<CacheConfig> = {};

    if (process.env.LORM_CACHE_ENABLED !== undefined) {
      config.enabled = process.env.LORM_CACHE_ENABLED === 'true';
    }

    if (process.env.LORM_CACHE_STRATEGY) {
      config.strategy = process.env.LORM_CACHE_STRATEGY as CacheConfig['strategy'];
    }

    if (process.env.LORM_CACHE_TTL) {
      const ttl = parseInt(process.env.LORM_CACHE_TTL, 10);
      if (!isNaN(ttl)) {
        config.ttl = ttl;
      }
    }

    if (process.env.LORM_CACHE_MAX_SIZE) {
      const maxSize = parseInt(process.env.LORM_CACHE_MAX_SIZE, 10);
      if (!isNaN(maxSize)) {
        config.maxSize = maxSize;
      }
    }



    if (process.env.LORM_CACHE_COMPRESSION !== undefined) {
      config.compression = process.env.LORM_CACHE_COMPRESSION === 'true';
    }

    return config;
  }

  /**
   * Filter out invalid configuration values
   */
  private static filterValidConfig(config: Partial<CacheConfig>): Partial<CacheConfig> {
    const filtered: Partial<CacheConfig> = {};

    if (config.enabled !== undefined) {
      filtered.enabled = config.enabled;
    }

    if (config.strategy && ['memory', 'disk', 'hybrid'].includes(config.strategy)) {
      filtered.strategy = config.strategy;
    }

    if (config.ttl !== undefined && config.ttl >= 0 && config.ttl <= 86400000) {
      filtered.ttl = config.ttl;
    }

    if (config.maxSize !== undefined && config.maxSize >= 1024) {
      filtered.maxSize = config.maxSize;
    }



    if (config.compression !== undefined) {
      filtered.compression = config.compression;
    }

    return filtered;
  }
}

/**
 * Utility function to create cache configuration
 */
export function createCacheConfig(
  projectRoot: string,
  overrides?: Partial<CacheConfig>
): CacheConfig {
  return CacheConfigResolver.resolveConfig(projectRoot, overrides);
}

/**
 * Utility function to validate cache configuration
 */
export function validateCacheConfig(config: Partial<CacheConfig>): { valid: boolean; errors: string[] } {
  return CacheConfigResolver.validateConfig(config);
}