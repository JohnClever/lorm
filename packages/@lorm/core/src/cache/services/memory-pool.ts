/**
 * Memory Pool Service for @lorm/core cache system
 * Provides efficient buffer and object pooling to reduce garbage collection pressure
 */

export interface PoolOptions {
  /** Initial pool size */
  initialSize?: number;
  /** Maximum pool size */
  maxSize?: number;
  /** Enable pool statistics */
  enableStats?: boolean;
  /** Auto-shrink pool when idle */
  autoShrink?: boolean;
  /** Shrink interval in milliseconds */
  shrinkInterval?: number;
  /** Minimum pool size when shrinking */
  minSize?: number;
}

export interface PoolStats {
  /** Current pool size */
  poolSize: number;
  /** Number of objects in use */
  inUse: number;
  /** Number of objects available */
  available: number;
  /** Total objects created */
  totalCreated: number;
  /** Total objects reused */
  totalReused: number;
  /** Pool hit rate (0-1) */
  hitRate: number;
  /** Memory usage in bytes */
  memoryUsage: number;
}

export class ObjectPool<T> {
  private pool: T[] = [];
  private inUseSet = new Set<T>();
  private factory: () => T;
  private reset?: (obj: T) => void;
  private options: Required<PoolOptions>;
  private stats = {
    totalCreated: 0,
    totalReused: 0,
    memoryUsage: 0
  };
  private shrinkTimer?: NodeJS.Timeout;

  constructor(
    factory: () => T,
    reset?: (obj: T) => void,
    options: PoolOptions = {}
  ) {
    this.factory = factory;
    this.reset = reset;
    this.options = {
      initialSize: 10,
      maxSize: 100,
      enableStats: true,
      autoShrink: true,
      shrinkInterval: 30000, // 30 seconds
      minSize: 5,
      ...options
    };

    // Pre-populate pool
    for (let i = 0; i < this.options.initialSize; i++) {
      this.pool.push(this.factory());
      this.stats.totalCreated++;
    }

    if (this.options.autoShrink) {
      this.startAutoShrink();
    }
  }

  acquire(): T {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this.factory();
      this.stats.totalCreated++;
    } else {
      this.stats.totalReused++;
      if (this.reset) {
        this.reset(obj);
      }
    }

    this.inUseSet.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.inUseSet.has(obj)) {
      return; // Object not from this pool
    }

    this.inUseSet.delete(obj);

    if (this.pool.length < this.options.maxSize) {
      this.pool.push(obj);
    }
  }

  getStats(): PoolStats {
    const totalRequests = this.stats.totalCreated + this.stats.totalReused;
    return {
      poolSize: this.pool.length + this.inUseSet.size,
      inUse: this.inUseSet.size,
      available: this.pool.length,
      totalCreated: this.stats.totalCreated,
      totalReused: this.stats.totalReused,
      hitRate: totalRequests > 0 ? this.stats.totalReused / totalRequests : 0,
      memoryUsage: this.stats.memoryUsage
    };
  }

  clear(): void {
    this.pool = [];
    this.inUseSet.clear();
    this.stats = {
      totalCreated: 0,
      totalReused: 0,
      memoryUsage: 0
    };
  }

  destroy(): void {
    if (this.shrinkTimer) {
      clearInterval(this.shrinkTimer);
      this.shrinkTimer = undefined;
    }
    this.clear();
  }

  private startAutoShrink(): void {
    this.shrinkTimer = setInterval(() => {
      this.shrink();
    }, this.options.shrinkInterval);
  }

  private shrink(): void {
    const targetSize = Math.max(this.options.minSize, this.options.initialSize);
    while (this.pool.length > targetSize) {
      this.pool.pop();
    }
  }
}

export class BufferPool {
  private pools = new Map<number, ObjectPool<Buffer>>();
  private options: Required<PoolOptions>;
  private readonly BUFFER_SIZES = [
    1024,      // 1KB
    4096,      // 4KB
    16384,     // 16KB
    65536,     // 64KB
    262144,    // 256KB
    1048576,   // 1MB
    4194304,   // 4MB
  ];

  constructor(options: PoolOptions = {}) {
    this.options = {
      initialSize: 5,
      maxSize: 50,
      enableStats: true,
      autoShrink: true,
      shrinkInterval: 30000,
      minSize: 2,
      ...options
    };

    // Create pools for different buffer sizes
    for (const size of this.BUFFER_SIZES) {
      this.pools.set(size, new ObjectPool<Buffer>(
        () => Buffer.allocUnsafe(size),
        (buffer: Buffer) => buffer.fill(0),
        this.options
      ));
    }
  }

  acquire(size: number): Buffer {
    // Find the smallest buffer size that can accommodate the request
    const poolSize = this.BUFFER_SIZES.find(s => s >= size);
    
    if (poolSize) {
      const pool = this.pools.get(poolSize)!;
      const buffer = pool.acquire();
      return buffer.subarray(0, size);
    }

    // For very large buffers, allocate directly
    return Buffer.allocUnsafe(size);
  }

  release(buffer: Buffer): void {
    // Find the original buffer size
    const originalSize = this.BUFFER_SIZES.find(size => {
      const pool = this.pools.get(size);
      return pool && buffer.length <= size;
    });

    if (originalSize) {
      const pool = this.pools.get(originalSize)!;
      // For subarrays, we need to get the parent buffer
      // Since we can't easily determine the parent, we'll skip releasing subarrays
      if (buffer.byteLength === originalSize) {
        pool.release(buffer);
      }
    }
  }

  getStats(): Record<number, PoolStats> {
    const stats: Record<number, PoolStats> = {};
    for (const [size, pool] of this.pools) {
      stats[size] = pool.getStats();
    }
    return stats;
  }

  getTotalStats(): PoolStats {
    let totalPoolSize = 0;
    let totalInUse = 0;
    let totalAvailable = 0;
    let totalCreated = 0;
    let totalReused = 0;
    let totalMemoryUsage = 0;

    for (const [size, pool] of this.pools) {
      const stats = pool.getStats();
      totalPoolSize += stats.poolSize;
      totalInUse += stats.inUse;
      totalAvailable += stats.available;
      totalCreated += stats.totalCreated;
      totalReused += stats.totalReused;
      totalMemoryUsage += stats.poolSize * size;
    }

    const totalRequests = totalCreated + totalReused;
    return {
      poolSize: totalPoolSize,
      inUse: totalInUse,
      available: totalAvailable,
      totalCreated,
      totalReused,
      hitRate: totalRequests > 0 ? totalReused / totalRequests : 0,
      memoryUsage: totalMemoryUsage
    };
  }

  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
  }

  destroy(): void {
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
  }
}

export class CacheEntryPool {
  private pool: ObjectPool<any>;

  constructor(options: PoolOptions = {}) {
    this.pool = new ObjectPool(
      () => ({}),
      (obj: Record<string, any>) => {
        // Reset object properties
        for (const key in obj) {
          delete obj[key];
        }
      },
      {
        initialSize: 20,
        maxSize: 200,
        ...options
      }
    );
  }

  acquire<T>(): Record<string, any> {
    return this.pool.acquire();
  }

  release(entry: Record<string, any>): void {
    this.pool.release(entry);
  }

  getStats(): PoolStats {
    return this.pool.getStats();
  }

  clear(): void {
    this.pool.clear();
  }

  destroy(): void {
    this.pool.destroy();
  }
}

export class MemoryPoolManager {
  private bufferPool: BufferPool;
  private entryPool: CacheEntryPool;
  private stringPool: ObjectPool<string[]>;
  private options: Required<PoolOptions>;

  constructor(options: PoolOptions = {}) {
    this.options = {
      initialSize: 10,
      maxSize: 100,
      enableStats: true,
      autoShrink: true,
      shrinkInterval: 30000,
      minSize: 5,
      ...options
    };

    this.bufferPool = new BufferPool(this.options);
    this.entryPool = new CacheEntryPool(this.options);
    this.stringPool = new ObjectPool<string[]>(
      () => [] as string[],
      (arr: string[]) => arr.length = 0,
      this.options
    );
  }

  getBuffer(size: number): Buffer {
    return this.bufferPool.acquire(size);
  }

  releaseBuffer(buffer: Buffer): void {
    this.bufferPool.release(buffer);
  }

  getCacheEntry<T>(): Record<string, any> {
    return this.entryPool.acquire();
  }

  releaseCacheEntry(entry: Record<string, any>): void {
    this.entryPool.release(entry);
  }

  getStringArray(): string[] {
    return this.stringPool.acquire();
  }

  releaseStringArray(arr: string[]): void {
    this.stringPool.release(arr);
  }

  getStats(): {
    buffers: Record<number, PoolStats>;
    bufferTotal: PoolStats;
    entries: PoolStats;
    strings: PoolStats;
  } {
    return {
      buffers: this.bufferPool.getStats(),
      bufferTotal: this.bufferPool.getTotalStats(),
      entries: this.entryPool.getStats(),
      strings: this.stringPool.getStats()
    };
  }

  clear(): void {
    this.bufferPool.clear();
    this.entryPool.clear();
    this.stringPool.clear();
  }

  destroy(): void {
    this.bufferPool.destroy();
    this.entryPool.destroy();
    this.stringPool.destroy();
  }
}

// Singleton instance
let memoryPoolManager: MemoryPoolManager | null = null;

export function getMemoryPoolManager(options?: PoolOptions): MemoryPoolManager {
  if (!memoryPoolManager) {
    memoryPoolManager = new MemoryPoolManager(options);
  }
  return memoryPoolManager;
}

export function destroyMemoryPoolManager(): void {
  if (memoryPoolManager) {
    memoryPoolManager.destroy();
    memoryPoolManager = null;
  }
}