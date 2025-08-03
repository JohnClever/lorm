import { readFile, writeFile, unlink, readdir, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import type { ICache, CacheEntry, CacheStats, DiskCacheOptions } from './types.js';

/**
 * Disk-based cache implementation
 */
export class DiskCache implements ICache {
  private stats = {
    hits: 0,
    misses: 0,
    diskUsage: 0
  };

  constructor(private options: DiskCacheOptions) {
    this.ensureCacheDir();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const content = await readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check if entry has expired
      const now = Date.now();
      if (now > entry.timestamp + (entry.ttl * 1000)) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access tracking
      entry.hits++;
      entry.lastAccessed = now;
      await this.writeEntry(key, entry);
      
      this.stats.hits++;
      return entry.value;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl,
      size: this.calculateSize(value),
      hits: 0,
      lastAccessed: now
    };

    await this.writeEntry(key, entry);
  }

  async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const content = await readFile(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      // Check if expired
      const now = Date.now();
      if (now > entry.timestamp + (entry.ttl * 1000)) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await readdir(this.options.cacheDir);
      const deletePromises = files
        .filter(file => file.endsWith(this.options.fileExtension ?? '.cache'))
        .map(file => unlink(join(this.options.cacheDir, file)));
      
      await Promise.allSettled(deletePromises);
      this.stats.diskUsage = 0;
    } catch {
      // Directory might not exist or be empty
    }
  }

  async getStats(): Promise<CacheStats> {
    const diskUsage = await this.calculateDiskUsage();
    const entryCount = await this.getEntryCount();
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: diskUsage,
      entryCount,
      hitRate,
      memoryUsage: 0,
      diskUsage
    };
  }

  async cleanup(): Promise<void> {
    try {
      const files = await readdir(this.options.cacheDir);
      const now = Date.now();
      const expiredFiles: string[] = [];

      for (const file of files) {
        if (!file.endsWith(this.options.fileExtension ?? '.cache')) {
          continue;
        }

        try {
          const filePath = join(this.options.cacheDir, file);
          const content = await readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);

          if (now > entry.timestamp + (entry.ttl * 1000)) {
            expiredFiles.push(file);
          }
        } catch {
          // Invalid file, mark for deletion
          expiredFiles.push(file);
        }
      }

      // Delete expired files
      const deletePromises = expiredFiles.map(file => 
        unlink(join(this.options.cacheDir, file))
      );
      
      await Promise.allSettled(deletePromises);
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await mkdir(this.options.cacheDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Generate file path for cache key
   */
  private getFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    const extension = this.options.fileExtension ?? '.cache';
    return join(this.options.cacheDir, `${hash}${extension}`);
  }

  /**
   * Write cache entry to disk
   */
  private async writeEntry<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const filePath = this.getFilePath(key);
    await this.ensureCacheDir();
    
    const content = JSON.stringify(entry, null, 0);
    await writeFile(filePath, content, 'utf-8');
  }

  /**
   * Calculate total disk usage
   */
  private async calculateDiskUsage(): Promise<number> {
    try {
      const files = await readdir(this.options.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith(this.options.fileExtension ?? '.cache')) {
          try {
            const filePath = join(this.options.cacheDir, file);
            const stats = await stat(filePath);
            totalSize += stats.size;
          } catch {
            // File might have been deleted
          }
        }
      }

      this.stats.diskUsage = totalSize;
      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Get number of cache entries
   */
  private async getEntryCount(): Promise<number> {
    try {
      const files = await readdir(this.options.cacheDir);
      return files.filter(file => 
        file.endsWith(this.options.fileExtension ?? '.cache')
      ).length;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate approximate size of a value in bytes
   */
  private calculateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1024; // Fallback for non-serializable objects
    }
  }
}