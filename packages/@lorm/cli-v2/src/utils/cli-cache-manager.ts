import { ProjectScopedCache, CacheConfig } from '@lorm/core';
import { CacheConfigResolver } from './cache-config-resolver.js';
import { Logger } from './logger.js';

/**
 * CLI Cache Manager - Singleton for managing cache instances
 * Provides centralized cache instance management with proper cleanup
 */
export class CLICacheManager {
  private static instance: CLICacheManager | null = null;
  private cacheInstances = new Map<string, ProjectScopedCache>();
  private isShuttingDown = false;
  private cleanupHandlers = new Set<() => Promise<void>>();

  private constructor() {
    // Register cleanup handlers for graceful shutdown
    this.registerCleanupHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CLICacheManager {
    if (!CLICacheManager.instance) {
      CLICacheManager.instance = new CLICacheManager();
    }
    return CLICacheManager.instance;
  }

  /**
   * Get or create cache instance for a project
   */
  getCache(
    projectRoot: string,
    configOverrides?: Partial<CacheConfig>
  ): ProjectScopedCache {
    if (this.isShuttingDown) {
      throw new Error('Cache manager is shutting down');
    }

    const cacheKey = this.generateCacheKey(projectRoot, configOverrides);
    
    // Return existing instance if available
    if (this.cacheInstances.has(cacheKey)) {
      const existingCache = this.cacheInstances.get(cacheKey)!;
      // Verify cache is still healthy
      if (this.isCacheHealthy(existingCache)) {
        return existingCache;
      } else {
        // Remove unhealthy cache
        this.removeCache(cacheKey);
      }
    }

    // Create new cache instance
    try {
      const config = CacheConfigResolver.resolveConfig(projectRoot, configOverrides);
      const cache = new ProjectScopedCache(projectRoot, config);
      
      this.cacheInstances.set(cacheKey, cache);
      
      Logger.debug(`Created cache instance for project: ${projectRoot}`);
      return cache;
    } catch (error) {
      Logger.error(`Failed to create cache instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get cache instance if it exists
   */
  getCacheIfExists(projectRoot: string, configOverrides?: Partial<CacheConfig>): ProjectScopedCache | null {
    const cacheKey = this.generateCacheKey(projectRoot, configOverrides);
    return this.cacheInstances.get(cacheKey) || null;
  }

  /**
   * Remove cache instance
   */
  async removeCache(projectRootOrKey: string): Promise<void> {
    let cacheKey: string;
    
    if (this.cacheInstances.has(projectRootOrKey)) {
      cacheKey = projectRootOrKey;
    } else {
      // Find by project root
      cacheKey = Array.from(this.cacheInstances.keys())
        .find(key => key.startsWith(projectRootOrKey)) || '';
    }

    if (cacheKey && this.cacheInstances.has(cacheKey)) {
      const cache = this.cacheInstances.get(cacheKey)!;
      
      try {
        await cache.destroy();
        this.cacheInstances.delete(cacheKey);
        Logger.debug(`Removed cache instance: ${cacheKey}`);
      } catch (error) {
        Logger.warning(`Failed to destroy cache instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Remove from map even if destruction failed
        this.cacheInstances.delete(cacheKey);
      }
    }
  }

  /**
   * Clear all cache instances
   */
  async clearAllCaches(): Promise<void> {
    const keys = Array.from(this.cacheInstances.keys());
    const promises = keys.map(key => this.removeCache(key));
    
    await Promise.allSettled(promises);
    this.cacheInstances.clear();
    
    Logger.debug('Cleared all cache instances');
  }

  /**
   * Get cache statistics for all instances
   */
  async getAllCacheStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [key, cache] of this.cacheInstances) {
      try {
        const cacheStats = await cache.getStats();
        const isHealthy = await cache.isHealthy();
        
        stats[key] = {
          ...cacheStats,
          healthy: isHealthy,
          projectRoot: cache.getProjectRoot()
        };
      } catch (error) {
        stats[key] = {
          error: error instanceof Error ? error.message : 'Unknown error',
          healthy: false
        };
      }
    }
    
    return stats;
  }

  /**
   * Perform health check on all cache instances
   */
  async performHealthCheck(): Promise<{ healthy: number; unhealthy: number; total: number }> {
    let healthy = 0;
    let unhealthy = 0;
    const total = this.cacheInstances.size;
    
    for (const [key, cache] of this.cacheInstances) {
      try {
        const isHealthy = await cache.isHealthy();
        if (isHealthy) {
          healthy++;
        } else {
          unhealthy++;
          Logger.warning(`Unhealthy cache instance detected: ${key}`);
        }
      } catch (error) {
        unhealthy++;
        Logger.warning(`Cache health check failed for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { healthy, unhealthy, total };
  }

  /**
   * Register cleanup handler
   */
  registerCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.add(handler);
  }

  /**
   * Unregister cleanup handler
   */
  unregisterCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.delete(handler);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    Logger.debug('Cache manager shutting down...');
    
    try {
      // Run custom cleanup handlers
      const cleanupPromises = Array.from(this.cleanupHandlers).map(handler => 
        handler().catch(error => 
          Logger.warning(`Cleanup handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        )
      );
      
      await Promise.allSettled(cleanupPromises);
      
      // Clear all cache instances
      await this.clearAllCaches();
      
      Logger.debug('Cache manager shutdown complete');
    } catch (error) {
      Logger.error(`Cache manager shutdown error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get manager statistics
   */
  getManagerStats(): {
    totalInstances: number;
    isShuttingDown: boolean;
    cleanupHandlers: number;
  } {
    return {
      totalInstances: this.cacheInstances.size,
      isShuttingDown: this.isShuttingDown,
      cleanupHandlers: this.cleanupHandlers.size
    };
  }

  /**
   * Generate cache key from project root and config
   */
  private generateCacheKey(projectRoot: string, configOverrides?: Partial<CacheConfig>): string {
    const configHash = configOverrides ? 
      JSON.stringify(configOverrides, Object.keys(configOverrides).sort()) : 
      '';
    return `${projectRoot}:${configHash}`;
  }

  /**
   * Check if cache instance is healthy
   */
  private isCacheHealthy(cache: ProjectScopedCache): boolean {
    try {
      // Basic health check - ensure cache is not destroyed
      cache.getProjectRoot(); // This will throw if cache is destroyed
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Register process cleanup handlers
   */
  private registerCleanupHandlers(): void {
    const cleanup = async () => {
      await this.shutdown();
    };

    // Handle different exit scenarios
    process.on('exit', () => {
      // Synchronous cleanup only
      this.isShuttingDown = true;
    });

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      Logger.error(`Uncaught exception: ${error.message}`);
      await cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      Logger.error(`Unhandled rejection: ${reason}`);
      await cleanup();
      process.exit(1);
    });
  }
}

/**
 * Utility function to get cache manager instance
 */
export function getCacheManager(): CLICacheManager {
  return CLICacheManager.getInstance();
}

/**
 * Utility function to get cache for current project
 */
export function getProjectCache(configOverrides?: Partial<CacheConfig>): ProjectScopedCache {
  const projectRoot = process.cwd();
  return getCacheManager().getCache(projectRoot, configOverrides);
}

/**
 * Utility function for safe cache operations
 */
export async function withCache<T>(
  operation: (cache: ProjectScopedCache) => Promise<T>,
  configOverrides?: Partial<CacheConfig>
): Promise<T> {
  const cache = getProjectCache(configOverrides);
  return await operation(cache);
}