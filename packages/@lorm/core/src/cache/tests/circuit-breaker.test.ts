/**
 * Circuit Breaker Tests for @lorm/core cache system
 * Tests fault tolerance patterns and state transitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitBreaker } from '../services/circuit-breaker.js';
import type { CircuitBreakerOptions, CircuitBreakerStats } from '../types.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockOperation: ReturnType<typeof vi.fn>;
  let mockFailingOperation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOperation = vi.fn().mockResolvedValue('success');
    mockFailingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
    
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100, // 100ms for faster tests
      monitoringWindow: 1000 // 1 second
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default options', () => {
      const defaultBreaker = new CircuitBreaker();
      
      expect(defaultBreaker.getState()).toBe('CLOSED');
      expect(defaultBreaker.getStats()).toMatchObject({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        requests: 0,
        lastFailureTime: null,
        lastSuccessTime: null
      });
    });

    it('should initialize with custom options', () => {
      const customOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 5000,
        monitoringWindow: 10000
      };
      
      const customBreaker = new CircuitBreaker(customOptions);
      
      expect(customBreaker.getState()).toBe('CLOSED');
      expect(customBreaker.getStats().state).toBe('CLOSED');
    });
  });

  describe('CLOSED State Behavior', () => {
    it('should execute operations successfully in CLOSED state', async () => {
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(1);
      expect(stats.failures).toBe(0);
      expect(stats.requests).toBe(1);
    });

    it('should track failures in CLOSED state', async () => {
      await expect(circuitBreaker.execute(mockFailingOperation))
        .rejects.toThrow('Operation failed');
      
      expect(mockFailingOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(0);
      expect(stats.requests).toBe(1);
      expect(stats.lastFailureTime).toBeInstanceOf(Date);
    });

    it('should transition to OPEN state after failure threshold', async () => {
      // Execute failing operations to reach threshold
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFailingOperation))
          .rejects.toThrow('Operation failed');
      }
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(mockFailingOperation).toHaveBeenCalledTimes(3);
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(3);
      expect(stats.requests).toBe(3);
    });

    it('should reset failure count on successful operation', async () => {
      // Add some failures
      await expect(circuitBreaker.execute(mockFailingOperation))
        .rejects.toThrow('Operation failed');
      await expect(circuitBreaker.execute(mockFailingOperation))
        .rejects.toThrow('Operation failed');
      
      expect(circuitBreaker.getStats().failures).toBe(2);
      
      // Successful operation should reset failure count
      await circuitBreaker.execute(mockOperation);
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getStats().failures).toBe(0);
      expect(circuitBreaker.getStats().successes).toBe(1);
    });
  });

  describe('OPEN State Behavior', () => {
    beforeEach(async () => {
      // Force circuit breaker to OPEN state
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFailingOperation))
          .rejects.toThrow('Operation failed');
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject operations immediately in OPEN state', async () => {
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow('Circuit breaker is OPEN');
      
      // Operation should not be called
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for timeout period
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Next operation should transition to HALF_OPEN
      await circuitBreaker.execute(mockOperation);
      
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should not execute operations before timeout expires', async () => {
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Try to execute immediately (before timeout)
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow('Circuit breaker is OPEN');
      
      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('HALF_OPEN State Behavior', () => {
    beforeEach(async () => {
      // Force to OPEN state
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFailingOperation))
          .rejects.toThrow('Operation failed');
      }
      
      // Wait for timeout and transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));
      await circuitBreaker.execute(mockOperation);
      
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should allow limited operations in HALF_OPEN state', async () => {
      // First operation already executed in beforeEach
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      // Execute another successful operation
      await circuitBreaker.execute(mockOperation);
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(mockOperation).toHaveBeenCalledTimes(2); // 1 from beforeEach + 1 here
    });

    it('should transition to CLOSED after success threshold', async () => {
      // Need one more success to reach threshold (2)
      await circuitBreaker.execute(mockOperation);
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(0); // Should be reset
    });

    it('should transition back to OPEN on failure', async () => {
      await expect(circuitBreaker.execute(mockFailingOperation))
        .rejects.toThrow('Operation failed');
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track operation statistics accurately', async () => {
      // Execute mixed operations
      await circuitBreaker.execute(mockOperation); // success
      await expect(circuitBreaker.execute(mockFailingOperation))
        .rejects.toThrow(); // failure
      await circuitBreaker.execute(mockOperation); // success
      
      const stats = circuitBreaker.getStats();
      expect(stats.requests).toBe(3);
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(0); // Reset after last success
      expect(stats.lastSuccessTime).toBeInstanceOf(Date);
      expect(stats.lastFailureTime).toBeInstanceOf(Date);
    });

    it('should calculate success rate correctly', async () => {
      // Execute operations with known success/failure ratio
      await circuitBreaker.execute(mockOperation); // success
      await circuitBreaker.execute(mockOperation); // success
      
      const stats = circuitBreaker.getStats();
      expect(stats.successRate).toBe(1.0); // 100% success rate
      
      // Add a failure (but it will reset the counter)
      await expect(circuitBreaker.execute(mockFailingOperation))
        .rejects.toThrow();
      
      const updatedStats = circuitBreaker.getStats();
      expect(updatedStats.failures).toBe(1);
    });

    it('should track timing information', async () => {
      const slowOperation = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'slow success';
      });
      
      const startTime = Date.now();
      await circuitBreaker.execute(slowOperation);
      const endTime = Date.now();
      
      const stats = circuitBreaker.getStats();
      expect(stats.lastSuccessTime!.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(stats.lastSuccessTime!.getTime()).toBeLessThanOrEqual(endTime);
    });
  });

  describe('Monitoring Window', () => {
    it('should respect monitoring window for failure counting', async () => {
      const shortWindowBreaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 100,
        monitoringWindow: 200 // 200ms window
      });
      
      // Add one failure
      await expect(shortWindowBreaker.execute(mockFailingOperation))
        .rejects.toThrow();
      
      expect(shortWindowBreaker.getStats().failures).toBe(1);
      
      // Wait for monitoring window to expire
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Add another failure - should not accumulate with previous
      await expect(shortWindowBreaker.execute(mockFailingOperation))
        .rejects.toThrow();
      
      // Should still be CLOSED because failures are in different windows
      expect(shortWindowBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent operations correctly', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => 
        circuitBreaker.execute(async () => `result-${i}`)
      );
      
      const results = await Promise.all(concurrentOperations);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBe(`result-${index}`);
      });
      
      const stats = circuitBreaker.getStats();
      expect(stats.requests).toBe(5);
      expect(stats.successes).toBe(5);
    });

    it('should handle mixed concurrent success and failure operations', async () => {
      const mixedOperations = [
        circuitBreaker.execute(mockOperation),
        circuitBreaker.execute(mockFailingOperation).catch(e => e),
        circuitBreaker.execute(mockOperation),
        circuitBreaker.execute(mockFailingOperation).catch(e => e),
        circuitBreaker.execute(mockOperation)
      ];
      
      const results = await Promise.all(mixedOperations);
      
      expect(results).toHaveLength(5);
      
      const stats = circuitBreaker.getStats();
      expect(stats.requests).toBe(5);
      // Note: failures reset on success, so final count depends on order
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations that throw non-Error objects', async () => {
      const weirdFailingOperation = vi.fn().mockRejectedValue('string error');
      
      await expect(circuitBreaker.execute(weirdFailingOperation))
        .rejects.toBe('string error');
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
    });

    it('should handle operations that return rejected promises', async () => {
      const rejectedPromiseOperation = vi.fn().mockReturnValue(
        Promise.reject(new Error('Rejected promise'))
      );
      
      await expect(circuitBreaker.execute(rejectedPromiseOperation))
        .rejects.toThrow('Rejected promise');
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
    });

    it('should handle synchronous operations that throw', async () => {
      const syncFailingOperation = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      
      await expect(circuitBreaker.execute(syncFailingOperation))
        .rejects.toThrow('Sync error');
      
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
    });

    it('should handle operations with undefined return values', async () => {
      const undefinedOperation = vi.fn().mockResolvedValue(undefined);
      
      const result = await circuitBreaker.execute(undefinedOperation);
      
      expect(result).toBeUndefined();
      expect(circuitBreaker.getStats().successes).toBe(1);
    });

    it('should handle very fast consecutive operations', async () => {
      const fastOperations = [];
      
      for (let i = 0; i < 10; i++) {
        fastOperations.push(
          circuitBreaker.execute(() => Promise.resolve(i))
        );
      }
      
      const results = await Promise.all(fastOperations);
      
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(circuitBreaker.getStats().requests).toBe(10);
      expect(circuitBreaker.getStats().successes).toBe(10);
    });
  });

  describe('State Transitions Edge Cases', () => {
    it('should handle rapid state transitions correctly', async () => {
      // Quickly move to OPEN
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFailingOperation))
          .rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Move to HALF_OPEN and immediately back to CLOSED
      await circuitBreaker.execute(mockOperation); // HALF_OPEN
      await circuitBreaker.execute(mockOperation); // CLOSED
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      // Should work normally in CLOSED state
      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBe('success');
    });

    it('should handle timeout edge cases', async () => {
      // Move to OPEN
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFailingOperation))
          .rejects.toThrow();
      }
      
      // Try operation just before timeout expires
      await new Promise(resolve => setTimeout(resolve, 90)); // Just before 100ms timeout
      
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow('Circuit breaker is OPEN');
      
      // Wait a bit more and try again
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });
  });

  describe('Configuration Validation', () => {
    it('should handle zero thresholds gracefully', () => {
      const zeroThresholdBreaker = new CircuitBreaker({
        failureThreshold: 0,
        successThreshold: 0,
        timeout: 100
      });
      
      expect(zeroThresholdBreaker.getState()).toBe('CLOSED');
    });

    it('should handle very large thresholds', async () => {
      const largeThresholdBreaker = new CircuitBreaker({
        failureThreshold: 1000,
        successThreshold: 1000,
        timeout: 100
      });
      
      // Should not transition to OPEN easily
      for (let i = 0; i < 10; i++) {
        await expect(largeThresholdBreaker.execute(mockFailingOperation))
          .rejects.toThrow();
      }
      
      expect(largeThresholdBreaker.getState()).toBe('CLOSED');
    });

    it('should handle very short timeouts', async () => {
      const shortTimeoutBreaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 1 // 1ms
      });
      
      // Move to OPEN
      await expect(shortTimeoutBreaker.execute(mockFailingOperation))
        .rejects.toThrow();
      
      expect(shortTimeoutBreaker.getState()).toBe('OPEN');
      
      // Very short wait
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Should be able to transition to HALF_OPEN quickly
      await shortTimeoutBreaker.execute(mockOperation);
      expect(shortTimeoutBreaker.getState()).toBe('CLOSED');
    });
  });
});