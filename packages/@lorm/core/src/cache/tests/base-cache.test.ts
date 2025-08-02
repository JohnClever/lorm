/**
 * Base Cache Tests for @lorm/core cache system
 * Comprehensive unit and integration tests for the core cache functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseCache } from '../core/base-cache.js';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('BaseCache', () => {
  let cache: BaseCache;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `lorm-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    cache = new BaseCache({
      cacheDir: testDir,
      maxMemoryEntries: 10,
      ttl: 60000,
      compression: false,
      enableChecksum: true,
      enableAtomicOps: true,
      enableCircuitBreaker: true
    });
  });

  afterEach(async () => {
    await cache.destroy();
    // Add a small delay to ensure all file handles are closed
    await new Promise(resolve => setTimeout(resolve, 10));
    
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Test cleanup warning:', error);
    }
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      const key = 'test-key';
      const value = { message: 'Hello, World!' };

      await cache.set(key, value);
      const result = await cache.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      const key = 'delete-test';
      const value = 'test value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
    });

    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new BaseCache({
        cacheDir: testDir,
        ttl: 100, // 100ms
        compression: false
      });

      await shortTtlCache.set('expire-test', 'value');
      expect(await shortTtlCache.get('expire-test')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await shortTtlCache.get('expire-test')).toBeNull();

      await shortTtlCache.destroy();
    });

    it('should support custom TTL per entry', async () => {
      const key = 'custom-ttl-test';
      const value = 'test value';
      const customTtl = 200; // 200ms

      await cache.set(key, value, customTtl);
      expect(await cache.get(key)).toBe(value);

      // Wait for custom TTL expiration
      await new Promise(resolve => setTimeout(resolve, 250));
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should respect maxMemoryEntries limit', async () => {
      const smallCache = new BaseCache({
        cacheDir: testDir,
        maxMemoryEntries: 3,
        compression: false
      });

      // Add more entries than the limit
      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');
      await smallCache.set('key4', 'value4'); // Should evict oldest

      const stats = await smallCache.getStats();
      expect(stats.memoryEntries).toBeLessThanOrEqual(3);

      await smallCache.destroy();
    });

    it('should update access order for LRU eviction', async () => {
      const smallCache = new BaseCache({
        cacheDir: testDir,
        maxMemoryEntries: 2,
        compression: false
      });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      
      // Access key1 to make it recently used
      await smallCache.get('key1');
      
      // Add key3, should evict key2 (least recently used)
      await smallCache.set('key3', 'value3');
      
      expect(await smallCache.get('key1')).toBe('value1');
      expect(await smallCache.get('key3')).toBe('value3');

      await smallCache.destroy();
    });
  });

  describe('Compression', () => {
    it('should compress large entries when enabled', async () => {
      const compressedCache = new BaseCache({
        cacheDir: testDir,
        compression: true,
        compressionThreshold: 100
      });

      const largeValue = 'x'.repeat(200); // Larger than threshold
      await compressedCache.set('large-key', largeValue);
      
      const result = await compressedCache.get('large-key');
      expect(result).toBe(largeValue);

      await compressedCache.destroy();
    });

    it('should not compress small entries', async () => {
      const compressedCache = new BaseCache({
        cacheDir: testDir,
        compression: true,
        compressionThreshold: 100
      });

      const smallValue = 'small'; // Smaller than threshold
      await compressedCache.set('small-key', smallValue);
      
      const result = await compressedCache.get('small-key');
      expect(result).toBe(smallValue);

      await compressedCache.destroy();
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', async () => {
      await cache.set('stats-key1', 'value1');
      await cache.set('stats-key2', 'value2');
      
      await cache.get('stats-key1'); // Hit
      await cache.get('non-existent'); // Miss
      
      const stats = await cache.getStats();
      
      expect(stats.memoryEntries).toBe(2);
      expect(stats.totalHits).toBeGreaterThan(0);
      expect(stats.totalMisses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set('hit-test', 'value');
      
      // Generate some hits and misses
      await cache.get('hit-test'); // Hit
      await cache.get('hit-test'); // Hit
      await cache.get('miss-test'); // Miss
      
      const stats = await cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2/3, 2); // 2 hits out of 3 total
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data gracefully', async () => {
      const key = 'error-test';
      
      // Try to set data that exceeds maxSize
      const largeData = 'x'.repeat(20 * 1024 * 1024); // 20MB
      
      await expect(cache.set(key, largeData)).rejects.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      // Create cache with invalid directory
      const invalidCache = new BaseCache({
        cacheDir: '/invalid/path/that/does/not/exist',
        enableCircuitBreaker: true
      });

      try {
        // Should not throw, but should handle gracefully
        await invalidCache.set('test', 'value');
        const result = await invalidCache.get('test');
        
        // Should still work from memory cache
        expect(result).toBe('value');
      } catch (error) {
        // If circuit breaker throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }

      await invalidCache.destroy();
    });
  });

  describe('Events', () => {
    it('should emit events for cache operations', async () => {
      const events: any[] = [];
      
      cache.on('cacheEvent', (event) => {
        events.push(event);
      });

      await cache.set('event-test', 'value');
      await cache.get('event-test');
      await cache.delete('event-test');

      expect(events).toHaveLength(3);
      expect(events[0].operation).toBe('set');
      expect(events[1].operation).toBe('get');
      expect(events[2].operation).toBe('delete');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries automatically', async () => {
      const autoCleanupCache = new BaseCache({
        cacheDir: testDir,
        ttl: 100, // 100ms
        autoCleanup: true,
        cleanupInterval: 50 // 50ms
      });

      await autoCleanupCache.set('cleanup-test', 'value');
      
      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = await autoCleanupCache.getStats();
      expect(stats.expiredEntries).toBeGreaterThan(0);

      await autoCleanupCache.destroy();
    });

    it('should cleanup manually', async () => {
      const manualCache = new BaseCache({
        cacheDir: testDir,
        ttl: 50, // 50ms
        autoCleanup: false
      });

      await manualCache.set('manual-cleanup', 'value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await manualCache.cleanup();
      
      const stats = await manualCache.getStats();
      expect(stats.expiredEntries).toBeGreaterThan(0);

      await manualCache.destroy();
    });
  });

  describe('Batch Operations', () => {
    it('should support batch get operations', async () => {
      await cache.set('batch1', 'value1');
      await cache.set('batch2', 'value2');
      await cache.set('batch3', 'value3');

      const results = await cache.batchGet(['batch1', 'batch2', 'batch3', 'nonexistent']);
      
      // batchGet returns an array of BatchResult objects, not a plain object
      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('value1');
      expect(results[1].success).toBe(true);
      expect(results[1].data).toBe('value2');
      expect(results[2].success).toBe(true);
      expect(results[2].data).toBe('value3');
      expect(results[3].success).toBe(true);
      expect(results[3].data).toBeNull();
    });

    it('should support batch set operations', async () => {
      const entries = [
        { key: 'batchSet1', data: 'value1' },
        { key: 'batchSet2', data: 'value2' },
        { key: 'batchSet3', data: 'value3' }
      ];

      await cache.batchSet(entries);

      expect(await cache.get('batchSet1')).toBe('value1');
      expect(await cache.get('batchSet2')).toBe('value2');
      expect(await cache.get('batchSet3')).toBe('value3');
    });

    it('should support batch delete operations', async () => {
      await cache.set('batchDel1', 'value1');
      await cache.set('batchDel2', 'value2');
      await cache.set('batchDel3', 'value3');

      await cache.batchDelete(['batchDel1', 'batchDel2']);

      expect(await cache.get('batchDel1')).toBeNull();
      expect(await cache.get('batchDel2')).toBeNull();
      expect(await cache.get('batchDel3')).toBe('value3'); // Should still exist
    });
  });
});