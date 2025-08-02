/**
 * Cache Utils - Utility functions for cache operations
 * Provides helper functions for cache key generation, serialization, and validation
 */

import { createHash } from 'crypto';
import { resolve } from 'path';
import { statSync } from 'fs';

/**
 * Generate a consistent cache key from various input types
 */
export function generateCacheKey(
  namespace: string,
  input: string | number | boolean | object | null,
  options?: {
    includeTimestamp?: boolean;
    includePath?: boolean;
    cwd?: string;
  }
): string {
  const { includeTimestamp = false, includePath = false, cwd = process.cwd() } = options || {};
  
  const keyData: any = {
    namespace,
    input
  };
  
  if (includeTimestamp) {
    keyData.timestamp = Date.now();
  }
  
  if (includePath) {
    keyData.cwd = resolve(cwd);
  }
  
  return createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

/**
 * Generate a file-based cache key that includes file modification time
 */
export function generateFileCacheKey(
  filePath: string,
  namespace?: string
): string | null {
  try {
    const resolvedPath = resolve(filePath);
    const stats = statSync(resolvedPath);
    
    const keyData = {
      namespace: namespace || 'file',
      path: resolvedPath,
      mtime: stats.mtime.getTime(),
      size: stats.size
    };
    
    return createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Generate a directory-based cache key that includes all file modification times
 */
export async function generateDirectoryCacheKey(
  dirPath: string,
  patterns: string[] = ['**/*.{js,ts,json}'],
  namespace?: string
): Promise<string | null> {
  try {
    const { glob } = await import('glob');
    const resolvedDir = resolve(dirPath);
    
    const allFiles: string[] = [];
    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: resolvedDir, absolute: true });
      allFiles.push(...files);
    }
    
    const fileHashes: Record<string, string> = {};
    for (const file of allFiles) {
      const hash = generateFileCacheKey(file);
      if (hash) {
        fileHashes[file] = hash;
      }
    }
    
    const keyData = {
      namespace: namespace || 'directory',
      directory: resolvedDir,
      files: fileHashes
    };
    
    return createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Serialize data for caching with compression support
 */
export function serializeForCache<T>(
  data: T,
  options?: {
    compress?: boolean;
    compressionThreshold?: number;
  }
): {
  serialized: string;
  compressed: boolean;
  size: number;
} {
  const { compress = true, compressionThreshold = 1024 } = options || {};
  
  const serialized = JSON.stringify(data);
  const size = Buffer.byteLength(serialized, 'utf8');
  
  // For now, return uncompressed (compression would require async)
  // In a real implementation, you'd use zlib here
  return {
    serialized,
    compressed: false,
    size
  };
}

/**
 * Deserialize data from cache
 */
export function deserializeFromCache<T>(
  serialized: string,
  compressed: boolean = false
): T {
  // For now, just parse JSON (compression would require async)
  // In a real implementation, you'd decompress here if needed
  return JSON.parse(serialized);
}

/**
 * Validate cache entry structure
 */
export function validateCacheEntry<T>(
  entry: any
): entry is {
  data: T;
  timestamp: number;
  hash: string;
  size: number;
  compressed?: boolean;
  accessCount?: number;
  lastAccessed?: number;
  ttl?: number;
} {
  return (
    entry &&
    typeof entry === 'object' &&
    'data' in entry &&
    'timestamp' in entry &&
    'hash' in entry &&
    'size' in entry &&
    typeof entry.timestamp === 'number' &&
    typeof entry.hash === 'string' &&
    typeof entry.size === 'number'
  );
}

/**
 * Check if cache entry is expired
 */
export function isCacheEntryExpired(
  entry: { timestamp: number; ttl?: number },
  defaultTtl: number = 5 * 60 * 1000
): boolean {
  const ttl = entry.ttl || defaultTtl;
  return Date.now() - entry.timestamp > ttl;
}

/**
 * Calculate cache entry size in bytes
 */
export function calculateCacheEntrySize(data: any): number {
  return Buffer.byteLength(JSON.stringify(data), 'utf8');
}

/**
 * Format cache size for human reading
 */
export function formatCacheSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format cache duration for human reading
 */
export function formatCacheDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Create a cache key for configuration validation
 */
export function createConfigCacheKey(
  options: {
    requireConfig?: boolean;
    requireSchema?: boolean;
    requireRouter?: boolean;
    checkDatabase?: boolean;
    checkDependencies?: boolean;
    checkEnvironment?: boolean;
    autoFix?: boolean;
  },
  cwd: string = process.cwd()
): string {
  const normalizedOptions = {
    requireConfig: options.requireConfig ?? true,
    requireSchema: options.requireSchema ?? false,
    requireRouter: options.requireRouter ?? false,
    checkDatabase: options.checkDatabase ?? false,
    checkDependencies: options.checkDependencies ?? false,
    checkEnvironment: options.checkEnvironment ?? false,
    autoFix: options.autoFix ?? false
  };
  
  const keyData = {
    cwd: resolve(cwd),
    options: normalizedOptions
  };
  
  return createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

/**
 * Get file hashes for cache invalidation
 */
export function getFileHashesSync(
  files: string[],
  basePath: string = process.cwd()
): Record<string, string> {
  const hashes: Record<string, string> = {};
  
  for (const file of files) {
    try {
      const filePath = resolve(basePath, file);
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

/**
 * Compare file hashes to detect changes
 */
export function hasFileChanges(
  oldHashes: Record<string, string>,
  newHashes: Record<string, string>
): boolean {
  const allFiles = new Set([...Object.keys(oldHashes), ...Object.keys(newHashes)]);
  
  for (const file of allFiles) {
    if (oldHashes[file] !== newHashes[file]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Create a debounced cache operation
 */
export function debounceCache<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 100
): T {
  let timeoutId: NodeJS.Timeout | undefined;
  
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;
}

/**
 * Cache operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}