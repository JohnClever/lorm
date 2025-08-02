/**
 * Reliability Features Tests for @lorm/core cache system
 * Tests circuit breaker, atomic operations, and checksum validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseCache } from '../core/base-cache.js';
import { CircuitBreaker } from '../services/circuit-breaker.js';
import { AtomicFileOperations } from '../services/atomic-operations.js';
import { ChecksumValidator } from '../services/checksum-validation.js';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Reliability Features', () => {
  let cache: BaseCache;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `lorm-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    cache = new BaseCache({
      cacheDir: testDir,
      maxMemoryEntries: 10,
      ttl: 60000,
      enableCompression: false,
      enableChecksum: true,
      enableAtomicOps: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 1000
    });
  });

  afterEach(async () => {
    cache.destroy();
    // Small delay to ensure async operations complete
    await new Promise(resolve => setTimeout(resolve, 10));
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch (error) {
        // Retry once after a short delay if directory cleanup fails
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
          rmSync(testDir, { recursive: true, force: true });
        } catch (retryError) {
          console.warn(`Failed to cleanup test directory: ${testDir}`, retryError);
        }
      }
    }
  });

  describe('Circuit Breaker', () => {
    it('should track successful operations', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000
      });

      const operation = async () => 'success';
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(1);
      expect(stats.failures).toBe(0);
      expect(stats.state).toBe('CLOSED');
    });

    it('should open circuit after threshold failures', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000
      });

      const failingOperation = async () => {
        throw new Error('Operation failed');
      };

      // First failure
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe('CLOSED');

      // Second failure - should open circuit
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe('OPEN');

      // Third attempt should be rejected immediately
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to half-open after timeout', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 100 // Short timeout for testing
      });

      const failingOperation = async () => {
        throw new Error('Operation failed');
      };

      // Trigger circuit open
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe('OPEN');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next operation should transition to half-open
      const successOperation = async () => 'success';
      const result = await circuitBreaker.execute(successOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getStats().state).toBe('CLOSED');
    });
  });

  describe('Atomic File Operations', () => {
    it('should write files atomically', async () => {
      const atomicOps = new AtomicFileOperations();
      const filePath = join(testDir, 'atomic-test.txt');
      const content = 'test content';

      const result = await atomicOps.writeFile(filePath, content);
      
      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should create backup when enabled', async () => {
      const atomicOps = new AtomicFileOperations();
      const filePath = join(testDir, 'backup-test.txt');
      
      // Create initial file
      await atomicOps.writeFile(filePath, 'initial content');
      
      // Write with backup enabled
      const result = await atomicOps.writeFile(filePath, 'new content', {
        createBackup: true,
        cleanupBackup: false
      });
      
      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);
    });

    it('should verify write when enabled', async () => {
      const atomicOps = new AtomicFileOperations();
      const filePath = join(testDir, 'verify-test.txt');
      const content = 'verify content';

      const result = await atomicOps.writeFile(filePath, content, {
        verifyWrite: true
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('should delete files atomically', async () => {
      const atomicOps = new AtomicFileOperations();
      const filePath = join(testDir, 'delete-test.txt');
      
      // Create file first
      await atomicOps.writeFile(filePath, 'content to delete');
      expect(existsSync(filePath)).toBe(true);
      
      // Delete atomically
      const result = await atomicOps.deleteFile(filePath);
      
      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(false);
    });
  });

  describe('Checksum Validation', () => {
    it('should calculate checksums for data', () => {
      const validator = new ChecksumValidator();
      const data = 'test data';
      
      const checksum = validator.calculateChecksum(data);
      
      expect(checksum.primary).toBeDefined();
      expect(checksum.algorithm).toBe('sha256');
      expect(checksum.timestamp).toBeGreaterThan(0);
      expect(checksum.dataSize).toBe(data.length);
    });

    it('should validate data against checksum', () => {
      const validator = new ChecksumValidator();
      const data = 'test data';
      
      const checksum = validator.calculateChecksum(data);
      const validation = validator.validateData(data, checksum);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect corrupted data', () => {
      const validator = new ChecksumValidator();
      const originalData = 'original data';
      const corruptedData = 'corrupted data';
      
      const checksum = validator.calculateChecksum(originalData);
      const validation = validator.validateData(corruptedData, checksum);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Primary checksum mismatch');
    });

    it('should use HMAC when secret is provided', () => {
      const validator = new ChecksumValidator({
        secretKey: 'test-secret'
      });
      const data = 'test data';
      
      const checksum = validator.calculateChecksum(data);
      
      expect(checksum.hmac).toBeDefined();
      expect(checksum.hmac).not.toBe('');
    });
  });

  describe('Cache Integration', () => {
    it('should use all reliability features together', async () => {
      const testKey = 'reliability-test';
      const testData = { message: 'test data with reliability' };
      
      // Set data
      await cache.set(testKey, testData);
      
      // Get data
      const retrieved = await cache.get<typeof testData>(testKey);
      
      expect(retrieved).toEqual(testData);
      
      // Check stats include reliability metrics
      const stats = await cache.getStats();
      expect(stats.checksumFailures).toBeDefined();
      expect(stats.atomicOpFailures).toBeDefined();
      expect(stats.circuitBreaker).toBeDefined();
      expect(stats.reliability).toBeDefined();
    });

    it('should handle checksum validation failures', async () => {
      const testKey = 'checksum-fail-test';
      const testData = { message: 'test data' };
      
      // Set data
      await cache.set(testKey, testData);
      
      // Clear memory cache to force file read
      cache['memoryCache'].clear();
      
      // Manually corrupt the file to simulate checksum failure
      const filePath = cache['getFilePath'](testKey);
      if (existsSync(filePath)) {
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        parsed.data = { message: 'corrupted data' };
        await fs.writeFile(filePath, JSON.stringify(parsed));
      }
      
      // Try to get data - should detect corruption
      const retrieved = await cache.get<typeof testData>(testKey);
      
      expect(retrieved).toBeNull();
      
      // Check that corruption was detected
      const stats = await cache.getStats();
      expect(stats.checksumFailures).toBeGreaterThan(0);
    });

    it('should track circuit breaker statistics', async () => {
      const stats = await cache.getStats();
      
      expect(stats.circuitBreaker.state).toBe('CLOSED');
      expect(stats.circuitBreaker.failureCount).toBe(0);
      expect(stats.circuitBreaker.successCount).toBeGreaterThanOrEqual(0);
      expect(stats.circuitBreaker.totalRequests).toBeGreaterThanOrEqual(0);
    });
  });
});