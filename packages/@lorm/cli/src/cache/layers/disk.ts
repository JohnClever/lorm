/**
 * Disk Cache Layer
 * 
 * This module implements the file-system cache layer with compression,
 * atomic writes, and efficient storage management.
 */

import type {
  CacheLayerInterface,
  CacheOptions,
  CacheStats,
  CacheHealth,
  CacheEntry,
  CacheEntryMetadata,
  CacheNamespace,
  CacheLayer,
  CompressionAlgorithm
} from '../core/types.js';
import { CompressionUtils } from '../utils/compression.js';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

/**
 * Disk cache configuration
 */
interface DiskCacheConfig {
  cacheDir: string;
  maxDiskSize: number; // bytes
  maxFiles: number;
  defaultTtl: number; // milliseconds
  compressionThreshold: number; // bytes
  compressionAlgorithm: CompressionAlgorithm;
  cleanupInterval: number; // milliseconds
  atomicWrites: boolean;
  indexFile: string;
}

/**
 * Cache index entry for fast lookups
 */
interface CacheIndexEntry {
  key: string;
  filename: string;
  size: number;
  createdAt: string;
  expiresAt?: string;
  namespace: CacheNamespace;
  lastAccessed: string;
  accessCount: number;
}

/**
 * Disk cache layer implementation
 */
export class DiskCacheLayer extends EventEmitter implements CacheLayerInterface {
  readonly name: CacheLayer = 'disk';
  
  private readonly compressionUtils: CompressionUtils;
  private readonly config: DiskCacheConfig;
  private readonly index = new Map<string, CacheIndexEntry>();
  
  // Statistics
  public stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    diskUsage: 0,
    fileCount: 0,
    compressionSavings: 0
  };
  
  // Cleanup timer
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private indexDirty = false;

  constructor(config: Partial<DiskCacheConfig> = {}) {
    super();
    
    this.config = {
      cacheDir: join(tmpdir(), 'lorm-cache'),
      maxDiskSize: 500 * 1024 * 1024, // 500MB
      maxFiles: 50000,
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
      compressionThreshold: 1024, // 1KB
      compressionAlgorithm: 'gzip',
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      atomicWrites: true,
      indexFile: 'cache-index.json',
      ...config
    };
    
    this.compressionUtils = new CompressionUtils();
  }

  /**
   * Initialize the disk cache layer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      
      // Load existing index
      await this._loadIndex();
      
      // Validate existing files
      await this._validateFiles();
      
      // Start cleanup timer
      this.cleanupTimer = setInterval(() => {
        this._performCleanup().catch(error => {
          this.emit('error', { operation: 'cleanup', error });
        });
      }, this.config.cleanupInterval);

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { operation: 'initialize', error });
      throw error;
    }
  }

  /**
   * Shutdown the disk cache layer
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Save index if dirty
    if (this.indexDirty) {
      await this._saveIndex();
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Get a value from disk cache
   */
  async get<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const indexEntry = this.index.get(key);
      
      if (!indexEntry) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (this._isExpired(indexEntry)) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Read file
      const filePath = join(this.config.cacheDir, indexEntry.filename);
      
      let fileData: Buffer;
      try {
        fileData = await fs.readFile(filePath);
      } catch (error) {
        // File doesn't exist, remove from index
        this.index.delete(key);
        this.indexDirty = true;
        this.stats.misses++;
        return null;
      }

      // Parse cache entry
      const cacheEntry: CacheEntry<T> = JSON.parse(fileData.toString('utf8'));
      
      // Decompress if needed
      if (cacheEntry.metadata.compression) {
        try {
          cacheEntry.value = await this.compressionUtils.decompress(
            cacheEntry.value as Buffer,
            cacheEntry.metadata.compression.algorithm
          ) as T;
        } catch (error) {
          this.emit('error', { operation: 'decompress', key, error });
          return null;
        }
      }
      
      // Update access metadata
      indexEntry.lastAccessed = new Date().toISOString();
      indexEntry.accessCount++;
      cacheEntry.metadata.lastAccessed = new Date();
      cacheEntry.metadata.accessCount++;
      
      this.indexDirty = true;
      this.stats.hits++;
      
      return cacheEntry;
    } catch (error) {
      this.emit('error', { operation: 'get', key, error });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in disk cache
   */
  async set<T = unknown>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      // Calculate TTL
      const ttl = options.ttl || this.config.defaultTtl;
      const expiresAt = ttl > 0 ? new Date(Date.now() + ttl) : undefined;
      
      // Serialize and potentially compress the value
      let serializedValue: unknown = value;
      let compression: CacheEntryMetadata['compression'];
      
      const serializedSize = this._calculateSize(value);
      
      if (serializedSize >= this.config.compressionThreshold) {
        try {
          const compressed = await this.compressionUtils.compress(
            value,
            this.config.compressionAlgorithm
          );
          
          const compressedSize = this._calculateSize(compressed);
          
          if (compressedSize < serializedSize) {
            serializedValue = compressed;
            compression = {
              algorithm: this.config.compressionAlgorithm,
              originalSize: serializedSize,
              compressedSize
            };
            this.stats.compressionSavings += serializedSize - compressedSize;
          }
        } catch (error) {
          this.emit('warning', {
            message: 'Compression failed, storing uncompressed',
            context: { key, error }
          });
        }
      }
      
      // Create cache entry
      const entry: CacheEntry<T> = {
        key,
        value: serializedValue as T,
        metadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          size: compression?.compressedSize || serializedSize,
          ttl,
          expiresAt,
          namespace: options.namespace || 'custom',
          compression,
          metadata: options.metadata,
          priority: options.priority || 1
        }
      };
      
      // Generate filename
      const filename = this._generateFilename(key);
      const filePath = join(this.config.cacheDir, filename);
      
      // Serialize entry
      const serializedEntry = JSON.stringify(entry, null, 0);
      const entrySize = Buffer.byteLength(serializedEntry, 'utf8');
      
      // Write file atomically if configured
      if (this.config.atomicWrites) {
        await this._writeFileAtomic(filePath, serializedEntry);
      } else {
        await fs.writeFile(filePath, serializedEntry, 'utf8');
      }
      
      // Update index
      const existingEntry = this.index.get(key);
      if (existingEntry) {
        // Update existing entry
        this.stats.diskUsage -= existingEntry.size;
        await this._deleteFile(join(this.config.cacheDir, existingEntry.filename));
      } else {
        this.stats.fileCount++;
      }
      
      const indexEntry: CacheIndexEntry = {
        key,
        filename,
        size: entrySize,
        createdAt: entry.metadata.createdAt.toISOString(),
        expiresAt: expiresAt?.toISOString(),
        namespace: entry.metadata.namespace,
        lastAccessed: entry.metadata.lastAccessed.toISOString(),
        accessCount: entry.metadata.accessCount
      };
      
      this.index.set(key, indexEntry);
      this.stats.diskUsage += entrySize;
      this.stats.sets++;
      this.indexDirty = true;
      
      // Check if eviction is needed
      await this._checkEviction();
      
      this.emit('set', { key, size: entrySize, namespace: entry.metadata.namespace });
    } catch (error) {
      this.emit('error', { operation: 'set', key, error });
      throw error;
    }
  }

  /**
   * Delete a value from disk cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const indexEntry = this.index.get(key);
      
      if (!indexEntry) {
        return false;
      }
      
      // Delete file
      const filePath = join(this.config.cacheDir, indexEntry.filename);
      await this._deleteFile(filePath);
      
      // Remove from index
      this.index.delete(key);
      
      // Update statistics
      this.stats.diskUsage -= indexEntry.size;
      this.stats.fileCount--;
      this.stats.deletes++;
      this.indexDirty = true;
      
      this.emit('delete', { key, namespace: indexEntry.namespace });
      
      return true;
    } catch (error) {
      this.emit('error', { operation: 'delete', key, error });
      return false;
    }
  }

  /**
   * Check if key exists in disk cache
   */
  async has(key: string): Promise<boolean> {
    const indexEntry = this.index.get(key);
    
    if (!indexEntry) {
      return false;
    }
    
    // Check if expired
    if (this._isExpired(indexEntry)) {
      await this.delete(key);
      return false;
    }
    
    // Verify file exists
    const filePath = join(this.config.cacheDir, indexEntry.filename);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      // File doesn't exist, remove from index
      this.index.delete(key);
      this.indexDirty = true;
      return false;
    }
  }

  /**
   * Clear disk cache
   */
  async clear(namespace?: CacheNamespace, pattern?: string): Promise<void> {
    try {
      if (!namespace && !pattern) {
        // Clear everything
        const files = await fs.readdir(this.config.cacheDir);
        for (const file of files) {
          if (file !== this.config.indexFile) {
            await this._deleteFile(join(this.config.cacheDir, file));
          }
        }
        
        this.index.clear();
        this.stats.diskUsage = 0;
        this.stats.fileCount = 0;
        this.indexDirty = true;
        
        this.emit('clear', { namespace, pattern });
        return;
      }
      
      // Clear specific entries
      const keysToDelete: string[] = [];
      
      for (const [key, indexEntry] of this.index) {
        let shouldDelete = false;
        
        if (namespace && indexEntry.namespace === namespace) {
          shouldDelete = true;
        }
        
        if (pattern && this._matchesPattern(key, pattern)) {
          shouldDelete = true;
        }
        
        if (shouldDelete) {
          keysToDelete.push(key);
        }
      }
      
      // Delete matched keys
      for (const key of keysToDelete) {
        await this.delete(key);
      }
      
      this.emit('clear', { namespace, pattern, deletedCount: keysToDelete.length });
    } catch (error) {
      this.emit('error', { operation: 'clear', error });
      throw error;
    }
  }

  /**
   * Get all keys from disk cache
   */
  async keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]> {
    const result: string[] = [];
    
    for (const [key, indexEntry] of this.index) {
      // Check if expired
      if (this._isExpired(indexEntry)) {
        continue;
      }
      
      let shouldInclude = true;
      
      if (namespace && indexEntry.namespace !== namespace) {
        shouldInclude = false;
      }
      
      if (pattern && !this._matchesPattern(key, pattern)) {
        shouldInclude = false;
      }
      
      if (shouldInclude) {
        result.push(key);
      }
    }
    
    return result;
  }

  /**
   * Get disk cache statistics
   */
  async stats(): Promise<CacheStats> {
    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRatio = totalOperations > 0 ? this.stats.hits / totalOperations : 0;
    
    return {
      totalOperations,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatio,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions,
      memoryUsage: this.stats.diskUsage, // Map disk usage to memory usage field
      entryCount: this.stats.fileCount, // Map file count to entry count field
      compressionSavings: this.stats.compressionSavings,
      avgResponseTime: 0, // TODO: Implement response time tracking
      errorRate: 0 // TODO: Implement error tracking
    };
  }

  /**
   * Optimize disk cache
   */
  async optimize(): Promise<void> {
    await this._performCleanup();
    await this._checkEviction();
    await this._saveIndex();
    this.emit('optimized');
  }

  /**
   * Check disk cache health
   */
  async health(): Promise<Partial<CacheHealth>> {
    const diskUsageRatio = this.stats.diskUsage / this.config.maxDiskSize;
    const fileCountRatio = this.stats.fileCount / this.config.maxFiles;
    
    let diskStatus: 'ok' | 'warning' | 'critical' = 'ok';
    if (diskUsageRatio > 0.9) diskStatus = 'critical';
    else if (diskUsageRatio > 0.7) diskStatus = 'warning';
    
    const messages: string[] = [];
    if (diskStatus === 'critical') {
      messages.push('Disk usage is critical');
    } else if (diskStatus === 'warning') {
      messages.push('Disk usage is high');
    }
    
    if (fileCountRatio > 0.9) {
      messages.push('File count is near limit');
    }
    
    // Check cache directory accessibility
    try {
      await fs.access(this.config.cacheDir);
    } catch {
      diskStatus = 'critical';
      messages.push('Cache directory is not accessible');
    }
    
    return {
      status: diskStatus,
      checks: {
        diskUsage: diskStatus
      },
      messages,
      lastCheck: new Date()
    };
  }

  // Private helper methods

  private _isExpired(indexEntry: CacheIndexEntry): boolean {
    if (!indexEntry.expiresAt) {
      return false;
    }
    return new Date() > new Date(indexEntry.expiresAt);
  }

  private _calculateSize(value: unknown): number {
    try {
      if (Buffer.isBuffer(value)) {
        return value.length;
      }
      return JSON.stringify(value).length * 2; // UTF-16 estimate
    } catch {
      return 0;
    }
  }

  private _matchesPattern(key: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(key);
  }

  private _generateFilename(key: string): string {
    // Generate a safe filename from the cache key
    const hash = createHash('sha256').update(key).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 16)}.cache`;
  }

  private async _writeFileAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });
      
      // Write to temporary file
      await fs.writeFile(tempPath, content, 'utf8');
      
      // Atomic rename
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async _deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, which is fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async _loadIndex(): Promise<void> {
    const indexPath = join(this.config.cacheDir, this.config.indexFile);
    
    try {
      const indexData = await fs.readFile(indexPath, 'utf8');
      const indexEntries: CacheIndexEntry[] = JSON.parse(indexData);
      
      for (const entry of indexEntries) {
        this.index.set(entry.key, entry);
        this.stats.diskUsage += entry.size;
        this.stats.fileCount++;
      }
    } catch (error) {
      // Index file doesn't exist or is corrupted, start fresh
      this.index.clear();
      this.stats.diskUsage = 0;
      this.stats.fileCount = 0;
    }
  }

  private async _saveIndex(): Promise<void> {
    if (!this.indexDirty) {
      return;
    }
    
    const indexPath = join(this.config.cacheDir, this.config.indexFile);
    const indexEntries = Array.from(this.index.values());
    
    try {
      if (this.config.atomicWrites) {
        await this._writeFileAtomic(indexPath, JSON.stringify(indexEntries, null, 0));
      } else {
        await fs.writeFile(indexPath, JSON.stringify(indexEntries, null, 0), 'utf8');
      }
      
      this.indexDirty = false;
    } catch (error) {
      this.emit('error', { operation: 'saveIndex', error });
    }
  }

  private async _validateFiles(): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, indexEntry] of this.index) {
      const filePath = join(this.config.cacheDir, indexEntry.filename);
      
      try {
        const stat = await fs.stat(filePath);
        
        // Update size if different
        if (stat.size !== indexEntry.size) {
          this.stats.diskUsage += stat.size - indexEntry.size;
          indexEntry.size = stat.size;
          this.indexDirty = true;
        }
      } catch {
        // File doesn't exist, remove from index
        keysToDelete.push(key);
      }
    }
    
    // Remove invalid entries
    for (const key of keysToDelete) {
      const indexEntry = this.index.get(key);
      if (indexEntry) {
        this.stats.diskUsage -= indexEntry.size;
        this.stats.fileCount--;
      }
      this.index.delete(key);
      this.indexDirty = true;
    }
  }

  private async _performCleanup(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    // Find expired entries
    for (const [key, indexEntry] of this.index) {
      if (this._isExpired(indexEntry)) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key);
    }
    
    // Save index if dirty
    if (this.indexDirty) {
      await this._saveIndex();
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredCount: expiredKeys.length });
    }
  }

  private async _checkEviction(): Promise<void> {
    // Check disk size limit
    if (this.stats.diskUsage > this.config.maxDiskSize) {
      await this._evictBySize();
    }
    
    // Check file count limit
    if (this.stats.fileCount > this.config.maxFiles) {
      await this._evictByCount();
    }
  }

  private async _evictBySize(): Promise<void> {
    const targetSize = this.config.maxDiskSize * 0.8; // Evict to 80% of limit
    
    // Sort by last accessed (LRU)
    const entries = Array.from(this.index.entries())
      .sort(([, a], [, b]) => 
        new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
      );
    
    for (const [key] of entries) {
      if (this.stats.diskUsage <= targetSize) {
        break;
      }
      
      await this.delete(key);
      this.stats.evictions++;
      this.emit('eviction', { key, reason: 'size', strategy: 'lru' });
    }
  }

  private async _evictByCount(): Promise<void> {
    const targetCount = Math.floor(this.config.maxFiles * 0.8); // Evict to 80% of limit
    
    // Sort by last accessed (LRU)
    const entries = Array.from(this.index.entries())
      .sort(([, a], [, b]) => 
        new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
      );
    
    for (const [key] of entries) {
      if (this.stats.fileCount <= targetCount) {
        break;
      }
      
      await this.delete(key);
      this.stats.evictions++;
      this.emit('eviction', { key, reason: 'count', strategy: 'lru' });
    }
  }
}