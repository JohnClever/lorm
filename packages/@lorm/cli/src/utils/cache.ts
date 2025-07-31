import chalk from "chalk";
import { resolve } from "path";
import { createHash } from "crypto";
import { FileUtils } from "./file-utils";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
import { CacheOptions, CacheEntry } from '../types.js';

export type { CacheOptions, CacheEntry };
export class CommandCache {
  private cacheDir: string;
  private options: Required<CacheOptions>;
  private memoryCache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000,
      maxSize: 10 * 1024 * 1024,
      enabled: process.env.LORM_CACHE !== "false",
      compression: true,
      compressionThreshold: 1024,
      maxMemoryEntries: 100,
      ...options,
    };
    this.cacheDir = resolve(process.cwd(), ".lorm", "cache");
    this.ensureCacheDir();
  }
  async get<T>(key: string, inputHash?: string): Promise<T | null> {
    if (!this.options.enabled) return null;
    try {
      const memEntry = this.memoryCache.get(key);
      if (memEntry && this.isValid(memEntry, inputHash)) {
        this.updateAccessOrder(key);
        memEntry.accessCount = (memEntry.accessCount || 0) + 1;
        memEntry.lastAccessed = Date.now();
        return memEntry.data as T;
      }
      const filePath = this.getFilePath(key);
      if (!FileUtils.exists(filePath)) return null;
      let fileContent: string;
      let entry: CacheEntry<T>;
      if (filePath.endsWith(".gz")) {
        // Read compressed file as buffer using fs directly
        const fileBuffer = await import('fs').then(fs => fs.promises.readFile(filePath));
        const compressedData = await FileUtils.decompressFile(fileBuffer);
        fileContent = compressedData.toString("utf8");
      } else {
        fileContent = await FileUtils.readFile(filePath);
      }
      entry = JSON.parse(fileContent);
      if (this.isValid(entry, inputHash)) {
        entry.accessCount = (entry.accessCount || 0) + 1;
        entry.lastAccessed = Date.now();
        this.addToMemoryCache(key, entry);
        return entry.data;
      }
      this.delete(key);
      return null;
    } catch (error) {
      return null;
    }
  }
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.options.enabled) return;
    try {
      const serializedData = JSON.stringify(data);
      const dataSize = Buffer.byteLength(serializedData, "utf8");
      if (dataSize > this.options.maxSize) {
        console.warn(chalk.yellow("⚠️  Cache entry too large, skipping cache"));
        return;
      }
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash: this.createHash(key),
        size: dataSize,
        accessCount: 1,
        lastAccessed: Date.now(),
      };
      this.addToMemoryCache(key, entry);
      const filePath = this.getFilePath(key);
      const entryJson = JSON.stringify(entry, null, 2);
      const shouldCompress =
        this.options.compression &&
        Buffer.byteLength(entryJson, "utf8") >
          this.options.compressionThreshold;
      if (shouldCompress) {
        const compressed = await gzipAsync(Buffer.from(entryJson, "utf8"));
        // Write compressed file as buffer using fs directly
        await import('fs').then(fs => fs.promises.writeFile(filePath + ".gz", compressed));
        entry.compressed = true;
      } else {
        await FileUtils.writeFile(filePath, entryJson);
      }
    } catch (error) {
    }
  }
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    this.removeFromAccessOrder(key);
    try {
      const filePath = this.getFilePath(key);
      if (FileUtils.exists(filePath)) {
        FileUtils.deleteFileSync(filePath);
      }
      if (FileUtils.exists(filePath + ".gz")) {
        FileUtils.deleteFileSync(filePath + ".gz");
      }
    } catch (error) {
    }
  }
  async clear(): Promise<void> {
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
    }
  }
  private addToMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    if (this.memoryCache.has(key)) {
      this.removeFromAccessOrder(key);
    }
    this.memoryCache.set(key, entry);
    this.accessOrder.push(key);
    while (this.memoryCache.size > this.options.maxMemoryEntries) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      }
    }
  }
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  createHash(input: string | number | boolean | object | null): string {
    return createHash("sha256").update(JSON.stringify(input)).digest("hex");
  }
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
      compressionRatio:
        this.memoryCache.size > 0
          ? compressedEntries / this.memoryCache.size
          : 0,
      oldestEntry: this.memoryCache.size > 0 ? oldestTimestamp : null,
      newestEntry: this.memoryCache.size > 0 ? newestTimestamp : null,
    };
  }
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach((key) => this.delete(key));
  }
  wrap<T extends (string | number | boolean | object | null)[], R>(
    key: string,
    fn: (...args: T) => Promise<R>,
    hashInput?: (...args: T) => string | number | boolean | object | null
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
      await this.set(key, result);
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
