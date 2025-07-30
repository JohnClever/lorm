import chalk from "chalk";
import { resolve } from "path";
import { createHash } from "crypto";
import { FileUtils } from "./file-utils";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  enabled?: boolean;
  compression?: boolean; // Enable gzip compression for large entries
  compressionThreshold?: number; // Compress entries larger than this size
  maxMemoryEntries?: number; // Maximum entries to keep in memory
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  hash: string;
  size: number;
  compressed?: boolean;
  accessCount?: number;
  lastAccessed?: number;
}

/**
 * Enhanced file-based cache for CLI operations with compression and LRU eviction
 */
export class CommandCache {
  private cacheDir: string;
  private options: Required<CacheOptions>;
  private memoryCache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // For LRU eviction

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 10 * 1024 * 1024, // 10MB default
      enabled: process.env.LORM_CACHE !== "false",
      compression: true,
      compressionThreshold: 1024, // 1KB threshold
      maxMemoryEntries: 100,
      ...options,
    };

    this.cacheDir = resolve(process.cwd(), ".lorm", "cache");
    this.ensureCacheDir();
  }

  /**
   * Get cached result for a command
   */
  async get<T>(key: string, inputHash?: string): Promise<T | null> {
    if (!this.options.enabled) return null;

    try {
      // Check memory cache first
      const memEntry = this.memoryCache.get(key);
      if (memEntry && this.isValid(memEntry, inputHash)) {
        this.updateAccessOrder(key);
        memEntry.accessCount = (memEntry.accessCount || 0) + 1;
        memEntry.lastAccessed = Date.now();
        return memEntry.data;
      }

      // Check file cache
      const filePath = this.getFilePath(key);
      if (!FileUtils.exists(filePath)) return null;

      let fileContent: string;
      let entry: CacheEntry<T>;

      // Handle compressed files
      if (filePath.endsWith('.gz')) {
        const compressedData = await FileUtils.decompressFile(await FileUtils.readFile(filePath, { encoding: undefined as any }) as any);
        fileContent = compressedData.toString('utf8');
      } else {
        fileContent = FileUtils.readFileSync(filePath);
      }

      entry = JSON.parse(fileContent);

      if (this.isValid(entry, inputHash)) {
        // Update access metadata
        entry.accessCount = (entry.accessCount || 0) + 1;
        entry.lastAccessed = Date.now();
        
        // Add to memory cache with LRU management
        this.addToMemoryCache(key, entry);
        return entry.data;
      }

      this.delete(key);
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached result for a command
   */
  async set<T>(key: string, data: T, inputHash?: string): Promise<void> {
    if (!this.options.enabled) return;

    try {
      const serializedData = JSON.stringify(data);
      const dataSize = Buffer.byteLength(serializedData, 'utf8');

      if (dataSize > this.options.maxSize) {
        console.warn(chalk.yellow("⚠️  Cache entry too large, skipping cache"));
        return;
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash: inputHash || "",
        size: dataSize,
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      // Add to memory cache with LRU management
      this.addToMemoryCache(key, entry);

      // Write to file with optional compression
      const filePath = this.getFilePath(key);
      const entryJson = JSON.stringify(entry, null, 2);
      const shouldCompress = this.options.compression && 
                            Buffer.byteLength(entryJson, 'utf8') > this.options.compressionThreshold;

      if (shouldCompress) {
        const compressed = await gzipAsync(Buffer.from(entryJson, 'utf8'));
        await FileUtils.writeFile(filePath + '.gz', compressed as any, { encoding: undefined as any });
        entry.compressed = true;
      } else {
        FileUtils.writeFileSync(filePath, entryJson);
      }
    } catch (error) {
      // Silently fail for cache operations
    }
  }

  /**
   * Delete cached entry
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    this.removeFromAccessOrder(key);

    try {
      const filePath = this.getFilePath(key);
      // Delete both compressed and uncompressed versions
      if (FileUtils.exists(filePath)) {
        FileUtils.deleteFileSync(filePath);
      }
      if (FileUtils.exists(filePath + '.gz')) {
        FileUtils.deleteFileSync(filePath + '.gz');
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.accessOrder = [];

    try {
      if (FileUtils.exists(this.cacheDir)) {
        const files = FileUtils.readDirSync(this.cacheDir);
        files.forEach((file: string) => {
          const filePath = resolve(this.cacheDir, file);
          const stats = FileUtils.getStatsSync(filePath);
          if (stats?.isFile) {
            FileUtils.deleteFileSync(filePath);
          }
        });
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Add entry to memory cache with LRU eviction
   */
  private addToMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    // Remove if already exists to update position
    if (this.memoryCache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Add to memory cache
    this.memoryCache.set(key, entry);
    this.accessOrder.push(key);

    // Evict least recently used entries if over limit
    while (this.memoryCache.size > this.options.maxMemoryEntries) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      }
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order array
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Create hash for input data
   */
  createHash(input: any): string {
    return createHash("md5").update(JSON.stringify(input)).digest("hex");
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    totalSize: number;
    hitRate: number;
    compressionRatio: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let totalSize = 0;
    let compressedEntries = 0;
    let totalHits = 0;
    let totalAccesses = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
      if (entry.compressed) compressedEntries++;
      if (entry.accessCount) {
        totalHits += entry.accessCount;
        totalAccesses += entry.accessCount;
      }
      if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
      if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
    }

    return {
      memoryEntries: this.memoryCache.size,
      totalSize,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      compressionRatio: this.memoryCache.size > 0 ? compressedEntries / this.memoryCache.size : 0,
      oldestEntry: this.memoryCache.size > 0 ? oldestTimestamp : null,
      newestEntry: this.memoryCache.size > 0 ? newestTimestamp : null,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Wrap a function with caching
   */
  wrap<T extends any[], R>(
    key: string,
    fn: (...args: T) => Promise<R>,
    hashInput?: (...args: T) => any
  ) {
    return async (...args: T): Promise<R> => {
      const inputHash = hashInput
        ? this.createHash(hashInput(...args))
        : undefined;

      const cached = await this.get<R>(key, inputHash);
      if (cached !== null) {
        return cached;
      }

      const result = await fn(...args);
      await this.set(key, result, inputHash);

      return result;
    };
  }

  private ensureCacheDir(): void {
    if (!FileUtils.exists(this.cacheDir)) {
      FileUtils.ensureDirSync(this.cacheDir);
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, "_");
    return resolve(this.cacheDir, `${safeKey}.json`);
  }

  private isValid(entry: CacheEntry, inputHash?: string): boolean {
    if (Date.now() - entry.timestamp > this.options.ttl) {
      return false;
    }

    if (inputHash && entry.hash !== inputHash) {
      return false;
    }

    return true;
  }
}

export const commandCache = new CommandCache();
