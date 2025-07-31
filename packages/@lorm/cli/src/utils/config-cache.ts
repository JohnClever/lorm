import { createHash } from "crypto";
import { statSync } from "fs";
import { resolve } from "path";
import { CommandCache } from "./cache";
import type { ValidationResult, ConfigValidationOptions } from "./config-validator";
export interface ConfigCacheEntry {
  result: ValidationResult;
  fileHashes: Record<string, string>;
  timestamp: number;
  options: ConfigValidationOptions;
}
export class ConfigValidationCache {
  private cache: CommandCache;
  private static instance: ConfigValidationCache;
  constructor() {
    this.cache = new CommandCache({
      ttl: 2 * 60 * 1000,
  maxSize: 1024 * 1024,
      enabled: process.env.LORM_CONFIG_CACHE !== "false",
    });
  }
  static getInstance(): ConfigValidationCache {
    if (!ConfigValidationCache.instance) {
      ConfigValidationCache.instance = new ConfigValidationCache();
    }
    return ConfigValidationCache.instance;
  }
  private getConfigFiles(cwd: string = process.cwd()): string[] {
    return [
      resolve(cwd, "lorm.config.ts"),
      resolve(cwd, "lorm.config.js"),
      resolve(cwd, "lorm/schema/index.ts"),
      resolve(cwd, "lorm/schema/index.js"),
      resolve(cwd, "lorm.schema.ts"),
      resolve(cwd, "lorm.schema.js"),
      resolve(cwd, "lorm/router/index.ts"),
      resolve(cwd, "lorm/router/index.js"),
      resolve(cwd, "lorm/router/index.mjs"),
      resolve(cwd, "lorm.router.js"),
      resolve(cwd, "package.json"),
      resolve(cwd, ".env"),
      resolve(cwd, "drizzle.config.ts"),
      resolve(cwd, "drizzle.config.js"),
    ];
  }
  private getFileHash(filePath: string): string | null {
    try {
      const stats = statSync(filePath);
      const content = `${filePath}:${stats.mtime.getTime()}:${stats.size}`;
      return createHash("md5").update(content).digest("hex");
    } catch {
      return null;
    }
  }
  private getConfigHash(options: ConfigValidationOptions, cwd: string = process.cwd()): string {
    const configFiles = this.getConfigFiles(cwd);
    const fileHashes: Record<string, string> = {};
    for (const file of configFiles) {
      const hash = this.getFileHash(file);
      if (hash) {
        fileHashes[file] = hash;
      }
    }
    const optionsHash = createHash("md5")
      .update(JSON.stringify(options))
      .digest("hex");
    const combinedHash = createHash("md5")
      .update(JSON.stringify(fileHashes) + optionsHash)
      .digest("hex");
    return combinedHash;
  }
  async get(
    options: ConfigValidationOptions,
    cwd: string = process.cwd()
  ): Promise<ValidationResult | null> {
    const cacheKey = `config-validation:${cwd}`;
    const currentHash = this.getConfigHash(options, cwd);
    const cached = await this.cache.get<ConfigCacheEntry>(cacheKey, currentHash);
    if (cached && this.isOptionsCompatible(cached.options, options)) {
      return cached.result;
    }
    return null;
  }
  async set(
    options: ConfigValidationOptions,
    result: ValidationResult,
    cwd: string = process.cwd()
  ): Promise<void> {
    const cacheKey = `config-validation:${cwd}`;
    const currentHash = this.getConfigHash(options, cwd);
    const configFiles = this.getConfigFiles(cwd);
    const fileHashes: Record<string, string> = {};
    for (const file of configFiles) {
      const hash = this.getFileHash(file);
      if (hash) {
        fileHashes[file] = hash;
      }
    }
    const entry: ConfigCacheEntry = {
      result,
      fileHashes,
      timestamp: Date.now(),
      options,
    };
    await this.cache.set(cacheKey, entry);
  }
  private isOptionsCompatible(
    cachedOptions: ConfigValidationOptions,
    requestedOptions: ConfigValidationOptions
  ): boolean {
    const checks = [
      'requireConfig',
      'requireSchema', 
      'requireRouter',
      'checkDatabase',
      'checkDependencies',
      'checkEnvironment'
    ] as const;
    for (const check of checks) {
      if (requestedOptions[check] && !cachedOptions[check]) {
        return false;
      }
    }
    return true;
  }
  async invalidate(cwd: string = process.cwd()): Promise<void> {
    const cacheKey = `config-validation:${cwd}`;
    this.cache.delete(cacheKey);
  }
  getStats() {
    return this.cache.getStats();
  }
  clear(): void {
    this.cache.clear();
  }
}
export const configValidationCache = ConfigValidationCache.getInstance();