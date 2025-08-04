import { ProjectScopedCache, CacheConfig } from '@lorm/core';
import { getCacheManager, getProjectCache } from './cli-cache-manager.js';
import { Logger } from './logger.js';

/**
 * Safe cache operation result
 */
export interface SafeCacheResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
}

/**
 * Safe cache operation options
 */
export interface SafeCacheOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackValue?: any;
  logErrors?: boolean;
  configOverrides?: Partial<CacheConfig>;
}

/**
 * Safe cache operations utility
 * Provides error-safe cache operations with retry logic and fallbacks
 */
export class SafeCacheOperations {
  private static readonly DEFAULT_OPTIONS: Required<Omit<SafeCacheOptions, 'fallbackValue' | 'configOverrides'>> = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 5000,
    logErrors: true
  };

  /**
   * Safely get value from cache
   */
  static async safeGet<T>(
    key: string,
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<T | null>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      const result = await this.withTimeout(
        cache.get<T>(key),
        opts.timeout
      );
      return result;
    }, opts, 'get', key);
  }

  /**
   * Safely set value in cache
   */
  static async safeSet<T>(
    key: string,
    value: T,
    ttl?: number,
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<void>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      await this.withTimeout(
        cache.set(key, value, ttl),
        opts.timeout
      );
    }, opts, 'set', key);
  }

  /**
   * Safely check if key exists in cache
   */
  static async safeHas(
    key: string,
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<boolean>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      const result = await this.withTimeout(
        cache.has(key),
        opts.timeout
      );
      return result;
    }, opts, 'has', key);
  }

  /**
   * Safely delete value from cache
   */
  static async safeDelete(
    key: string,
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<boolean>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      const result = await this.withTimeout(
        cache.delete(key),
        opts.timeout
      );
      return result;
    }, opts, 'delete', key);
  }

  /**
   * Safely clear cache
   */
  static async safeClear(
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<void>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      await this.withTimeout(
        cache.clear(),
        opts.timeout
      );
    }, opts, 'clear');
  }

  /**
   * Safely get cache statistics
   */
  static async safeGetStats(
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<any>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      const result = await this.withTimeout(
        cache.getStats(),
        opts.timeout
      );
      return result;
    }, opts, 'getStats');
  }

  /**
   * Safely execute cached operation
   */
  static async safeCached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      // Try to get from cache first
      const cached = await this.safeGet<T>(key, { ...options, maxRetries: 0 });
      
      if (cached.success && cached.data !== null && cached.data !== undefined) {
        return cached.data;
      }
      
      // Execute function and cache result
      const result = await fn();
      
      // Cache the result (fire and forget)
      this.safeSet(key, result, ttl, { ...options, maxRetries: 0 }).catch(() => {
        // Ignore cache set errors in cached operation
      });
      
      return result;
    }, opts, 'cached', key);
  }

  /**
   * Safely perform cache cleanup
   */
  static async safeCleanup(
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<void>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      await this.withTimeout(
        cache.cleanup(),
        opts.timeout
      );
    }, opts, 'cleanup');
  }

  /**
   * Safely perform health check
   */
  static async safeHealthCheck(
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<boolean>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const cache = getProjectCache(options.configOverrides);
      const result = await this.withTimeout(
        cache.isHealthy(),
        opts.timeout
      );
      return result;
    }, opts, 'healthCheck');
  }

  /**
   * Batch operations with error isolation
   */
  static async safeBatch<T>(
    operations: Array<() => Promise<T>>,
    options: SafeCacheOptions = {}
  ): Promise<Array<SafeCacheResult<T>>> {
    const results: Array<SafeCacheResult<T>> = [];
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const operation = operations[i];
        const result = await this.executeWithRetry(
          operation,
          { ...this.DEFAULT_OPTIONS, ...options },
          'batch',
          `operation-${i}`
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Get cache manager statistics safely
   */
  static async safeGetManagerStats(
    options: SafeCacheOptions = {}
  ): Promise<SafeCacheResult<any>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return this.executeWithRetry(async () => {
      const manager = getCacheManager();
      const result = await this.withTimeout(
        manager.getAllCacheStats(),
        opts.timeout
      );
      return result;
    }, opts, 'getManagerStats');
  }

  /**
   * Execute operation with retry logic
   */
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Required<Omit<SafeCacheOptions, 'fallbackValue' | 'configOverrides'>>,
    operationType: string,
    key?: string
  ): Promise<SafeCacheResult<T>> {
    let lastError: Error | null = null;
    let retries = 0;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          retries
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries = attempt;
        
        if (options.logErrors && attempt < options.maxRetries) {
          Logger.warning(
            `Cache operation '${operationType}' failed (attempt ${attempt + 1}/${options.maxRetries + 1})${key ? ` for key '${key}'` : ''}: ${lastError.message}`
          );
        }
        
        // Don't retry on the last attempt
        if (attempt < options.maxRetries) {
          await this.delay(options.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // All retries failed
    if (options.logErrors) {
      Logger.error(
        `Cache operation '${operationType}' failed after ${options.maxRetries + 1} attempts${key ? ` for key '${key}'` : ''}: ${lastError?.message || 'Unknown error'}`
      );
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retries
    };
  }

  /**
   * Execute operation with timeout
   */
  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Utility functions for common safe cache operations
 */

/**
 * Safe cache get with fallback
 */
export async function safeGet<T>(
  key: string,
  fallback?: T,
  options?: SafeCacheOptions
): Promise<T | null> {
  const result = await SafeCacheOperations.safeGet<T>(key, { ...options, fallbackValue: fallback });
  
  if (result.success && result.data !== null && result.data !== undefined) {
    return result.data;
  }
  
  return fallback ?? null;
}

/**
 * Safe cache set
 */
export async function safeSet<T>(
  key: string,
  value: T,
  ttl?: number,
  options?: SafeCacheOptions
): Promise<boolean> {
  const result = await SafeCacheOperations.safeSet(key, value, ttl, options);
  return result.success;
}

/**
 * Safe cache delete
 */
export async function safeDelete(
  key: string,
  options?: SafeCacheOptions
): Promise<boolean> {
  const result = await SafeCacheOperations.safeDelete(key, options);
  return result.success && (result.data ?? false);
}

/**
 * Safe cache clear
 */
export async function safeClear(options?: SafeCacheOptions): Promise<boolean> {
  const result = await SafeCacheOperations.safeClear(options);
  return result.success;
}

/**
 * Safe cached operation with fallback
 */
export async function safeCached<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number,
  fallback?: T,
  options?: SafeCacheOptions
): Promise<T> {
  const result = await SafeCacheOperations.safeCached(key, fn, ttl, options);
  
  if (result.success && result.data !== undefined) {
    return result.data;
  }
  
  // If cache failed, try to execute function directly
  try {
    return await fn();
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}