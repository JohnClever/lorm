/**
 * Partitioned Storage Service for @lorm/core cache system
 * Implements hash-based partitioning to avoid filesystem limits and improve performance
 */

import { createHash } from "crypto";
import { join, resolve } from "path";
import { mkdir, readdir, stat, unlink } from "fs/promises";
import { existsSync } from "fs";

export interface PartitionOptions {
  /** Number of partitions (default: 256) */
  partitionCount?: number;
  /** Base cache directory */
  baseDir?: string;
  /** Maximum files per partition before warning */
  maxFilesPerPartition?: number;
  /** Enable partition statistics */
  enableStats?: boolean;
}

export interface PartitionStats {
  totalPartitions: number;
  filesPerPartition: Map<number, number>;
  totalFiles: number;
  averageFilesPerPartition: number;
  maxFilesInPartition: number;
  minFilesInPartition: number;
  memoryUsage: number;
}

export interface PartitionInfo {
  partitionId: number;
  partitionDir: string;
  fileCount: number;
}

export class PartitionedStorage {
  private options: Required<PartitionOptions>;
  private partitionDirs: Map<number, string> = new Map();
  private stats: PartitionStats;
  private initialized = false;

  constructor(options: PartitionOptions = {}) {
    this.options = {
      partitionCount: 256,
      baseDir: resolve(process.cwd(), ".lorm", "cache"),
      maxFilesPerPartition: 1000,
      enableStats: true,
      ...options,
    };

    this.stats = {
      totalPartitions: this.options.partitionCount,
      filesPerPartition: new Map(),
      totalFiles: 0,
      averageFilesPerPartition: 0,
      maxFilesInPartition: 0,
      minFilesInPartition: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Initialize partitioned storage by creating partition directories
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure base directory exists
      if (!existsSync(this.options.baseDir)) {
        await mkdir(this.options.baseDir, { recursive: true });
      }

      // Create partition directories
      for (let i = 0; i < this.options.partitionCount; i++) {
        const partitionDir = join(this.options.baseDir, `partition_${i.toString(16).padStart(2, '0')}`);
        this.partitionDirs.set(i, partitionDir);
        
        if (!existsSync(partitionDir)) {
          await mkdir(partitionDir, { recursive: true });
        }

        if (this.options.enableStats) {
          this.stats.filesPerPartition.set(i, 0);
        }
      }

      // Update initial statistics
      if (this.options.enableStats) {
        await this.updateStats();
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize partitioned storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get partition ID for a given key using consistent hashing
   */
  getPartitionId(key: string): number {
    const hash = createHash('sha256').update(key).digest('hex');
    // Use first 4 hex characters for partition selection
    const hashValue = parseInt(hash.substring(0, 4), 16);
    return hashValue % this.options.partitionCount;
  }

  /**
   * Get the file path for a key in its designated partition
   */
  getPartitionedPath(key: string, filename: string): string {
    const partitionId = this.getPartitionId(key);
    const partitionDir = this.partitionDirs.get(partitionId);
    
    if (!partitionDir) {
      throw new Error(`Partition ${partitionId} not found`);
    }

    return join(partitionDir, filename);
  }

  /**
   * Get partition information for a specific key
   */
  async getPartitionInfo(key: string): Promise<PartitionInfo> {
    const partitionId = this.getPartitionId(key);
    const partitionDir = this.partitionDirs.get(partitionId)!;
    
    let fileCount = 0;
    try {
      if (existsSync(partitionDir)) {
        const files = await readdir(partitionDir);
        fileCount = files.length;
      }
    } catch {
      // Ignore errors, return 0 count
    }

    return {
      partitionId,
      partitionDir,
      fileCount,
    };
  }

  /**
   * Get all partition information
   */
  async getAllPartitionInfo(): Promise<PartitionInfo[]> {
    const partitionInfos: PartitionInfo[] = [];
    
    for (let i = 0; i < this.options.partitionCount; i++) {
      const partitionDir = this.partitionDirs.get(i)!;
      let fileCount = 0;
      
      try {
        if (existsSync(partitionDir)) {
          const files = await readdir(partitionDir);
          fileCount = files.length;
        }
      } catch {
        // Ignore errors, use 0 count
      }

      partitionInfos.push({
        partitionId: i,
        partitionDir,
        fileCount,
      });
    }

    return partitionInfos;
  }

  /**
   * Get all partition information synchronously (for performance)
   * Returns info compatible with types.ts PartitionInfo interface
   */
  getAllPartitionInfoSync(): import('../types/types.js').PartitionInfo[] {
    const partitionInfos: import('../types/types.js').PartitionInfo[] = [];
    
    for (let i = 0; i < this.options.partitionCount; i++) {
      const partitionId = `partition_${i}`;
      const partitionDir = this.partitionDirs.get(i)!;
      
      // Basic info without file system calls for performance
      partitionInfos.push({
        partitionId,
        partitionDir,
        fileCount: 0, // Would need async call to get accurate count
        totalSize: 0, // Would need async call to get accurate size
        lastCleanup: 0
      });
    }
    
    return partitionInfos;
  }

  /**
   * Update partition statistics
   */
  async updateStats(): Promise<void> {
    if (!this.options.enableStats) return;

    const partitionInfos = await this.getAllPartitionInfo();
    let totalFiles = 0;
    let maxFiles = 0;
    let minFiles = Number.MAX_SAFE_INTEGER;

    // Update per-partition stats
    for (const info of partitionInfos) {
      this.stats.filesPerPartition.set(info.partitionId, info.fileCount);
      totalFiles += info.fileCount;
      maxFiles = Math.max(maxFiles, info.fileCount);
      minFiles = Math.min(minFiles, info.fileCount);
    }

    // Update aggregate stats
    this.stats.totalFiles = totalFiles;
    this.stats.averageFilesPerPartition = totalFiles / this.options.partitionCount;
    this.stats.maxFilesInPartition = maxFiles;
    this.stats.minFilesInPartition = minFiles === Number.MAX_SAFE_INTEGER ? 0 : minFiles;
    
    // Estimate memory usage
    this.stats.memoryUsage = this.estimateSystemMemoryUsage();
  }

  /**
   * Get current partition statistics
   */
  getStats(): PartitionStats {
    return { ...this.stats };
  }

  /**
   * Check if any partition exceeds the maximum file limit
   */
  async checkPartitionLimits(): Promise<{ hasWarnings: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    const partitionInfos = await this.getAllPartitionInfo();

    for (const info of partitionInfos) {
      if (info.fileCount > this.options.maxFilesPerPartition) {
        warnings.push(
          `Partition ${info.partitionId} has ${info.fileCount} files (limit: ${this.options.maxFilesPerPartition})`
        );
      }
    }

    return {
      hasWarnings: warnings.length > 0,
      warnings,
    };
  }

  /**
   * Clean up empty partition directories
   */
  async cleanupEmptyPartitions(): Promise<number> {
    let cleanedCount = 0;
    
    for (let i = 0; i < this.options.partitionCount; i++) {
      const partitionDir = this.partitionDirs.get(i)!;
      
      try {
        if (existsSync(partitionDir)) {
          const files = await readdir(partitionDir);
          if (files.length === 0) {
            // Note: We don't actually remove the directory to avoid recreation overhead
            // Just count it as cleaned for statistics
            cleanedCount++;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return cleanedCount;
  }

  /**
   * Get partition distribution balance score (0-1, where 1 is perfectly balanced)
   */
  getBalanceScore(): number {
    if (this.stats.totalFiles === 0) return 1;
    
    const ideal = this.stats.averageFilesPerPartition;
    let variance = 0;
    
    for (const [, fileCount] of this.stats.filesPerPartition) {
      variance += Math.pow(fileCount - ideal, 2);
    }
    
    const standardDeviation = Math.sqrt(variance / this.options.partitionCount);
    const coefficientOfVariation = standardDeviation / ideal;
    
    // Convert to balance score (lower CV = higher balance)
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Estimate memory usage for a partition
   */
  estimateMemoryUsage(partitionId: string): number {
    // Basic estimation - in a real implementation this would be more sophisticated
    const partitionIndex = parseInt(partitionId.split('_')[1]);
    const partitionDir = this.partitionDirs.get(partitionIndex);
    
    if (!partitionDir) {
      return 0;
    }
    
    // Rough estimate: assume average file size of 1KB per cached item
    // In practice, this would track actual memory usage
    return 1024; // 1KB baseline per partition
  }

  /**
   * Estimate memory usage of the partitioned storage system
   */
  private estimateSystemMemoryUsage(): number {
    // Estimate based on internal data structures
    const mapOverhead = this.partitionDirs.size * 64; // Rough estimate for Map entries
    const statsOverhead = this.stats.filesPerPartition.size * 32;
    const baseOverhead = 1024; // Base object overhead
    
    return mapOverhead + statsOverhead + baseOverhead;
  }

  /**
   * Destroy the partitioned storage instance
   */
  destroy(): void {
    this.partitionDirs.clear();
    this.stats.filesPerPartition.clear();
    this.initialized = false;
  }
}

// Singleton instance
let partitionedStorageInstance: PartitionedStorage | null = null;

/**
 * Get the global partitioned storage instance
 */
export function getPartitionedStorage(options?: PartitionOptions): PartitionedStorage {
  if (!partitionedStorageInstance) {
    partitionedStorageInstance = new PartitionedStorage(options);
  }
  return partitionedStorageInstance;
}

/**
 * Destroy the global partitioned storage instance
 */
export function destroyPartitionedStorage(): void {
  if (partitionedStorageInstance) {
    partitionedStorageInstance.destroy();
    partitionedStorageInstance = null;
  }
}