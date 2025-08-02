/**
 * ConfigCache - Specialized cache for configuration validation
 * Provides hash-based invalidation for config files and validation result caching
 */

import { createHash } from 'crypto';
import { statSync } from 'fs';
import { resolve } from 'path';
import { BaseCache } from './base-cache.js';
import type {
  ConfigCacheEntry,
  ValidationResult,
  ConfigValidationOptions,
  CacheOptions,
  CacheStats,
  IConfigCache
} from '../types/types.js';

export class ConfigCache implements IConfigCache {
  private cache: BaseCache;
  private static instance: ConfigCache;

  constructor(options?: CacheOptions) {
    this.cache = new BaseCache({
      ttl: 2 * 60 * 1000, // 2 minutes for config validation
      maxSize: 1024 * 1024, // 1MB
      enabled: process.env.LORM_CONFIG_CACHE !== 'false',
      maxMemoryEntries: 50,
      ...options
    });
  }

  static getInstance(options?: CacheOptions): ConfigCache {
    if (!ConfigCache.instance) {
      ConfigCache.instance = new ConfigCache(options);
    }
    return ConfigCache.instance;
  }

  async get(
    options: ConfigValidationOptions,
    cwd: string = process.cwd()
  ): Promise<ValidationResult | null> {
    const cacheKey = this.createCacheKey(options, cwd);
    const cached = await this.cache.get<ConfigCacheEntry>(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    // Check if any config files have changed
    const currentHashes = await this.getFileHashes(cwd);
    const hasChanges = Object.keys(cached.fileHashes).some(
      (file) => currentHashes[file] !== cached.fileHashes[file]
    );
    
    if (hasChanges) {
      await this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.result;
  }

  async set(
    options: ConfigValidationOptions,
    result: ValidationResult,
    cwd: string = process.cwd()
  ): Promise<void> {
    const cacheKey = this.createCacheKey(options, cwd);
    const fileHashes = await this.getFileHashes(cwd);
    
    const entry: ConfigCacheEntry = {
      result,
      fileHashes,
      timestamp: Date.now(),
      options
    };
    
    await this.cache.set(cacheKey, entry);
  }

  async invalidate(cwd: string = process.cwd()): Promise<void> {
    // Get all cache keys and remove those matching the directory
    const stats = this.cache.getStats();
    // For now, clear all cache - in a real implementation, we'd track keys by directory
    await this.cache.clear();
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  private createCacheKey(options: ConfigValidationOptions, cwd: string): string {
    const key = {
      cwd: resolve(cwd),
      options: {
        requireConfig: options.requireConfig ?? true,
        requireSchema: options.requireSchema ?? false,
        requireRouter: options.requireRouter ?? false,
        checkDatabase: options.checkDatabase ?? false,
        checkDependencies: options.checkDependencies ?? false,
        checkEnvironment: options.checkEnvironment ?? false,
        autoFix: options.autoFix ?? false
      }
    };
    
    return createHash('sha256').update(JSON.stringify(key)).digest('hex');
  }

  private async getFileHashes(cwd: string): Promise<Record<string, string>> {
    const hashes: Record<string, string> = {};
    const configFiles = [
      'lorm.config.js',
      'lorm.config.ts',
      'lorm.config.json',
      'package.json',
      '.env',
      '.env.local'
    ];
    
    for (const file of configFiles) {
      try {
        const filePath = resolve(cwd, file);
        const stats = statSync(filePath);
        hashes[file] = createHash('sha256')
          .update(`${stats.mtime.getTime()}-${stats.size}`)
          .digest('hex');
      } catch {
        // File doesn't exist, skip
      }
    }
    
    return hashes;
  }
}