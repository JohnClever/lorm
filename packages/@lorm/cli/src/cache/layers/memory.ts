/**
 * Memory Cache Layer
 * 
 * This module implements the in-memory cache layer with LRU/LFU eviction,
 * TTL support, compression, and memory pressure handling.
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
  EvictionStrategy,
  CompressionAlgorithm
} from '../core/types.js';
import { CompressionUtils } from '../utils/compression.js';
import { EventEmitter } from 'node:events';

/**
 * Memory cache configuration
 */
interface MemoryCacheConfig {
  maxMemory: number; // bytes
  maxEntries: number;
  defaultTtl: number; // milliseconds
  evictionStrategy: EvictionStrategy;
  compressionThreshold: number; // bytes
  compressionAlgorithm: CompressionAlgorithm;
  cleanupInterval: number; // milliseconds
}

/**
 * LRU Node for doubly linked list
 */
class LRUNode {
  constructor(
    public key: string,
    public entry: CacheEntry,
    public prev: LRUNode | null = null,
    public next: LRUNode | null = null
  ) {}
}

/**
 * Memory cache layer implementation
 */
export class MemoryCacheLayer extends EventEmitter implements CacheLayerInterface {
  readonly name: CacheLayer = 'memory';
  
  private readonly cache = new Map<string, LRUNode>();
  private readonly compressionUtils: CompressionUtils;
  private readonly config: MemoryCacheConfig;
  
  // LRU tracking
  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;
  
  // Statistics
  private _stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memoryUsage: 0,
    entryCount: 0,
    compressionSavings: 0
  };
  
  // Cleanup timer
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<MemoryCacheConfig> = {}) {
    super();
    
    this.config = {
      maxMemory: 100 * 1024 * 1024, // 100MB
      maxEntries: 10000,
      defaultTtl: 60 * 60 * 1000, // 1 hour
      evictionStrategy: 'lru',
      compressionThreshold: 1024, // 1KB
      compressionAlgorithm: 'gzip',
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };
    
    this.compressionUtils = new CompressionUtils();
  }

  /**
   * Initialize the memory cache layer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this._performCleanup().catch(error => {
        this.emit('error', { operation: 'cleanup', error });
      });
    }, this.config.cleanupInterval);

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the memory cache layer
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clear all data
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this._stats.memoryUsage = 0;
    this._stats.entryCount = 0;

    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Get a value from memory cache
   */
  async get<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
    const node = this.cache.get(key);
    
    if (!node) {
      this._stats.misses++;
      return null;
    }

    // Check if expired
    if (this._isExpired(node.entry)) {
      await this.delete(key);
      this._stats.misses++;
      return null;
    }

    // Update LRU position
    this._moveToHead(node);
    
    // Update access metadata
    node.entry.metadata.lastAccessed = new Date();
    node.entry.metadata.accessCount++;
    
    // Decompress if needed
    let value = node.entry.value;
    if (node.entry.metadata.compression) {
      try {
        value = await this.compressionUtils.decompress(
          value as Buffer,
          node.entry.metadata.compression.algorithm
        );
      } catch (error) {
        this.emit('error', { operation: 'decompress', key, error });
        return null;
      }
    }

    this._stats.hits++;
    
    return {
      ...node.entry,
      value: value as T
    };
  }

  /**
   * Set a value in memory cache
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
            this._stats.compressionSavings += serializedSize - compressedSize;
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
      
      // Check if key already exists
      const existingNode = this.cache.get(key);
      if (existingNode) {
        // Update existing entry
        this._stats.memoryUsage -= existingNode.entry.metadata.size;
        existingNode.entry = entry;
        this._stats.memoryUsage += entry.metadata.size;
        this._moveToHead(existingNode);
      } else {
        // Create new entry
        const node = new LRUNode(key, entry);
        this.cache.set(key, node);
        this._addToHead(node);
        this._stats.memoryUsage += entry.metadata.size;
        this._stats.entryCount++;
      }
      
      this._stats.sets++;
      
      // Check if eviction is needed
      await this._checkEviction();
      
      this.emit('set', { key, size: entry.metadata.size, namespace: entry.metadata.namespace });
    } catch (error) {
      this.emit('error', { operation: 'set', key, error });
      throw error;
    }
  }

  /**
   * Delete a value from memory cache
   */
  async delete(key: string): Promise<boolean> {
    const node = this.cache.get(key);
    
    if (!node) {
      return false;
    }
    
    // Remove from cache and LRU list
    this.cache.delete(key);
    this._removeNode(node);
    
    // Update statistics
    this.stats.memoryUsage -= node.entry.metadata.size;
    this.stats.entryCount--;
    this.stats.deletes++;
    
    this.emit('delete', { key, namespace: node.entry.metadata.namespace });
    
    return true;
  }

  /**
   * Check if key exists in memory cache
   */
  async has(key: string): Promise<boolean> {
    const node = this.cache.get(key);
    
    if (!node) {
      return false;
    }
    
    // Check if expired
    if (this._isExpired(node.entry)) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear memory cache
   */
  async clear(namespace?: CacheNamespace, pattern?: string): Promise<void> {
    if (!namespace && !pattern) {
      // Clear everything
      this.cache.clear();
      this.head = null;
      this.tail = null;
      this.stats.memoryUsage = 0;
      this.stats.entryCount = 0;
      this.emit('clear', { namespace, pattern });
      return;
    }
    
    // Clear specific entries
    const keysToDelete: string[] = [];
    
    for (const [key, node] of this.cache) {
      let shouldDelete = false;
      
      if (namespace && node.entry.metadata.namespace === namespace) {
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
  }

  /**
   * Get all keys from memory cache
   */
  async keys(namespace?: CacheNamespace, pattern?: string): Promise<string[]> {
    const result: string[] = [];
    
    for (const [key, node] of this.cache) {
      // Check if expired
      if (this._isExpired(node.entry)) {
        continue;
      }
      
      let shouldInclude = true;
      
      if (namespace && node.entry.metadata.namespace !== namespace) {
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
   * Get memory cache statistics
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
      memoryUsage: this.stats.memoryUsage,
      entryCount: this.stats.entryCount,
      compressionSavings: this.stats.compressionSavings,
      avgResponseTime: 0, // TODO: Implement response time tracking
      errorRate: 0 // TODO: Implement error tracking
    };
  }

  /**
   * Optimize memory cache
   */
  async optimize(): Promise<void> {
    await this._performCleanup();
    await this._checkEviction();
    this.emit('optimized');
  }

  /**
   * Check memory cache health
   */
  async health(): Promise<Partial<CacheHealth>> {
    const memoryUsageRatio = this.stats.memoryUsage / this.config.maxMemory;
    const entryCountRatio = this.stats.entryCount / this.config.maxEntries;
    
    let memoryStatus: 'ok' | 'warning' | 'critical' = 'ok';
    if (memoryUsageRatio > 0.9) memoryStatus = 'critical';
    else if (memoryUsageRatio > 0.7) memoryStatus = 'warning';
    
    const messages: string[] = [];
    if (memoryStatus === 'critical') {
      messages.push('Memory usage is critical');
    } else if (memoryStatus === 'warning') {
      messages.push('Memory usage is high');
    }
    
    if (entryCountRatio > 0.9) {
      messages.push('Entry count is near limit');
    }
    
    return {
      status: memoryStatus,
      checks: {
        memoryUsage: memoryStatus
      },
      messages,
      lastCheck: new Date()
    };
  }

  // Private helper methods

  private _isExpired(entry: CacheEntry): boolean {
    if (!entry.metadata.expiresAt) {
      return false;
    }
    return new Date() > entry.metadata.expiresAt;
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

  private async _performCleanup(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    // Find expired entries
    for (const [key, node] of this.cache) {
      if (this._isExpired(node.entry)) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredCount: expiredKeys.length });
    }
  }

  private async _checkEviction(): Promise<void> {
    // Check memory limit
    if (this.stats.memoryUsage > this.config.maxMemory) {
      await this._evictByMemory();
    }
    
    // Check entry count limit
    if (this.stats.entryCount > this.config.maxEntries) {
      await this._evictByCount();
    }
  }

  private async _evictByMemory(): Promise<void> {
    const targetMemory = this.config.maxMemory * 0.8; // Evict to 80% of limit
    
    while (this.stats.memoryUsage > targetMemory && this.tail) {
      const key = this.tail.key;
      await this.delete(key);
      this.stats.evictions++;
      this.emit('eviction', { key, reason: 'memory', strategy: this.config.evictionStrategy });
    }
  }

  private async _evictByCount(): Promise<void> {
    const targetCount = Math.floor(this.config.maxEntries * 0.8); // Evict to 80% of limit
    
    while (this.stats.entryCount > targetCount && this.tail) {
      const key = this.tail.key;
      await this.delete(key);
      this.stats.evictions++;
      this.emit('eviction', { key, reason: 'count', strategy: this.config.evictionStrategy });
    }
  }

  // LRU list management

  private _addToHead(node: LRUNode): void {
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
  }

  private _removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private _moveToHead(node: LRUNode): void {
    if (node === this.head) {
      return;
    }
    
    this._removeNode(node);
    this._addToHead(node);
  }
}