/**
 * Cache Operations - High-level cache operations for @lorm/core
 * Provides convenient functions for common cache operations
 */

import { resolve } from "path";
import { existsSync } from "fs";
import { readdir, stat, unlink } from "fs/promises";
import { cacheManager } from "../core/cache-manager.js";
import type { CacheStats } from "../types/types.js";

/**
 * Clear all caches
 */
export async function clearCache(cacheDir?: string): Promise<{
  success: boolean;
  message: string;
  clearedCaches: string[];
}> {
  try {
    const cacheNames = cacheManager.getCacheNames();
    await cacheManager.clearAll();

    // Also clear file system cache if directory is provided
    if (cacheDir && existsSync(cacheDir)) {
      await clearFileSystemCache(cacheDir);
    }

    return {
      success: true,
      message: `Successfully cleared ${cacheNames.length + 1} caches`,
      clearedCaches: ["config", ...cacheNames],
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to clear cache: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      clearedCaches: [],
    };
  }
}

/**
 * Get comprehensive cache statistics
 */
export function getCacheStats(): {
  global: ReturnType<typeof cacheManager.getGlobalStatsSummary>;
  individual: Record<string, CacheStats>;
  fileSystem?: {
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  };
} {
  const globalStats = cacheManager.getGlobalStatsSummary();
  const individualStats = cacheManager.getGlobalStats();

  return {
    global: globalStats,
    individual: individualStats,
  };
}

/**
 * Get cache statistics with file system information
 */
export async function getCacheStatsWithFileSystem(cacheDir?: string): Promise<{
  global: ReturnType<typeof cacheManager.getGlobalStatsSummary>;
  individual: Record<string, CacheStats>;
  fileSystem?: {
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  };
}> {
  const stats = getCacheStats();

  if (cacheDir && existsSync(cacheDir)) {
    const fsStats = await getFileSystemCacheStats(cacheDir);
    stats.fileSystem = fsStats;
  }

  return stats;
}

/**
 * Warmup cache by pre-loading common operations
 */
export async function warmupCache(
  options: {
    configValidation?: boolean;
    preloadKeys?: string[];
    cwd?: string;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  warmedItems: string[];
}> {
  const warmedItems: string[] = [];

  try {
    const {
      configValidation = true,
      preloadKeys = [],
      cwd = process.cwd(),
    } = options;

    // Warmup config validation cache
    if (configValidation) {
      const configCache = cacheManager.getConfigCache();
      // Pre-validate common config scenarios
      const commonOptions = [
        { requireConfig: true },
        { requireConfig: true, requireSchema: true },
        { requireConfig: true, checkDatabase: true },
      ];

      for (const opts of commonOptions) {
        // This will trigger validation and cache the result
        await configCache.get(opts, cwd);
        warmedItems.push(`config-validation-${JSON.stringify(opts)}`);
      }
    }

    // Preload specific cache keys if provided
    if (preloadKeys.length > 0) {
      const defaultCache = cacheManager.getCache("default");
      for (const key of preloadKeys) {
        // Check if key exists and access it to warm up
        if (await defaultCache.has(key)) {
          await defaultCache.get(key);
          warmedItems.push(key);
        }
      }
    }

    return {
      success: true,
      message: `Successfully warmed up ${warmedItems.length} cache items`,
      warmedItems,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to warmup cache: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      warmedItems,
    };
  }
}

/**
 * Cleanup expired entries across all caches
 */
export async function cleanupExpiredEntries(): Promise<{
  success: boolean;
  message: string;
  cleanedCaches: string[];
}> {
  try {
    const cacheNames = cacheManager.getCacheNames();
    await cacheManager.cleanupAll();

    return {
      success: true,
      message: `Successfully cleaned up ${cacheNames.length + 1} caches`,
      cleanedCaches: ["config", ...cacheNames],
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to cleanup caches: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      cleanedCaches: [],
    };
  }
}

/**
 * Invalidate config cache for a specific directory
 */
export async function invalidateConfigCache(cwd?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const configCache = cacheManager.getConfigCache();
    await configCache.invalidate(cwd);

    return {
      success: true,
      message: `Successfully invalidated config cache for ${
        cwd || "current directory"
      }`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to invalidate config cache: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Get cache health status
 */
export function getCacheHealth(): {
  status: "healthy" | "warning" | "critical";
  issues: string[];
  recommendations: string[];
} {
  const stats = cacheManager.getGlobalStatsSummary();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check hit rate
  if (stats.averageHitRate < 0.5) {
    issues.push("Low cache hit rate detected");
    recommendations.push(
      "Consider increasing cache TTL or reviewing cache usage patterns"
    );
  }

  // Check cache size
  if (stats.totalSize > 100 * 1024 * 1024) {
    // 100MB
    issues.push("Large cache size detected");
    recommendations.push(
      "Consider reducing cache size limits or implementing more aggressive cleanup"
    );
  }

  // Check number of caches
  if (stats.totalCaches > 10) {
    issues.push("High number of cache instances");
    recommendations.push(
      "Consider consolidating cache instances or reviewing cache architecture"
    );
  }

  let status: "healthy" | "warning" | "critical" = "healthy";
  if (issues.length > 2) {
    status = "critical";
  } else if (issues.length > 0) {
    status = "warning";
  }

  return { status, issues, recommendations };
}

// Helper functions

async function clearFileSystemCache(cacheDir: string): Promise<void> {
  try {
    const files = await readdir(cacheDir);
    const deletePromises = files.map(async (file) => {
      const filePath = resolve(cacheDir, file);
      try {
        await unlink(filePath);
      } catch {
        // Ignore individual file deletion errors
      }
    });
    await Promise.all(deletePromises);
  } catch {
    // Ignore directory read errors
  }
}

async function getFileSystemCacheStats(cacheDir: string): Promise<{
  totalFiles: number;
  totalSize: number;
  oldestFile: Date | null;
  newestFile: Date | null;
}> {
  try {
    const files = await readdir(cacheDir);
    let totalSize = 0;
    let oldestTime = Date.now();
    let newestTime = 0;

    for (const file of files) {
      try {
        const filePath = resolve(cacheDir, file);
        const stats = await stat(filePath);
        totalSize += stats.size;

        const mtime = stats.mtime.getTime();
        if (mtime < oldestTime) oldestTime = mtime;
        if (mtime > newestTime) newestTime = mtime;
      } catch {
        // Ignore individual file stat errors
      }
    }

    return {
      totalFiles: files.length,
      totalSize,
      oldestFile: files.length > 0 ? new Date(oldestTime) : null,
      newestFile: files.length > 0 ? new Date(newestTime) : null,
    };
  } catch {
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null,
    };
  }
}