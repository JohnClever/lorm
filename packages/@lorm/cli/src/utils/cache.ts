import chalk from "chalk";
import { resolve } from "path";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  enabled?: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  hash: string;
  size: number;
}

/**
 * Simple file-based cache for CLI operations
 */
export class CommandCache {
  private cacheDir: string;
  private options: Required<CacheOptions>;
  private memoryCache = new Map<string, CacheEntry>();

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 10 * 1024 * 1024, // 10MB default
      enabled: process.env.LORM_CACHE !== "false",
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
      const memEntry = this.memoryCache.get(key);
      if (memEntry && this.isValid(memEntry, inputHash)) {
        return memEntry.data;
      }

      const filePath = this.getFilePath(key);
      if (!existsSync(filePath)) return null;

      const fileContent = readFileSync(filePath, "utf8");
      const entry: CacheEntry<T> = JSON.parse(fileContent);

      if (this.isValid(entry, inputHash)) {
        this.memoryCache.set(key, entry);
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
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash: inputHash || "",
        size: JSON.stringify(data).length,
      };

      if (entry.size > this.options.maxSize) {
        console.warn(chalk.yellow("⚠️  Cache entry too large, skipping cache"));
        return;
      }

      this.memoryCache.set(key, entry);

      const filePath = this.getFilePath(key);
      writeFileSync(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {}
  }

  /**
   * Delete cached entry
   */
  delete(key: string): void {
    this.memoryCache.delete(key);

    try {
      const filePath = this.getFilePath(key);
      if (existsSync(filePath)) {
        require("fs").unlinkSync(filePath);
      }
    } catch (error) {}
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();

    try {
      if (existsSync(this.cacheDir)) {
        const fs = require("fs");
        const files = fs.readdirSync(this.cacheDir);
        files.forEach((file: string) => {
          fs.unlinkSync(resolve(this.cacheDir, file));
        });
      }
    } catch (error) {}
  }

  /**
   * Create hash for input data
   */
  createHash(input: any): string {
    return createHash("md5").update(JSON.stringify(input)).digest("hex");
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
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
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
