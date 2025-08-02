/**
 * Memory Pressure Detector Tests for @lorm/core cache system
 * Tests adaptive behavior, eviction strategies, and memory monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryPressureDetector } from '../services/memory-pressure.js';
import type { EvictionStrategy, MemoryStats } from '../types.js';

// Mock process.memoryUsage for testing
const mockMemoryUsage = vi.fn();
vi.stubGlobal('process', {
  memoryUsage: mockMemoryUsage
});

describe('MemoryPressureDetector', () => {
  let detector: MemoryPressureDetector;
  let mockEvictionStrategy: EvictionStrategy;
  let evictionCalls: Array<{ level: 'warning' | 'critical'; stats: MemoryStats }>;

  beforeEach(() => {
    evictionCalls = [];
    
    mockEvictionStrategy = {
      name: 'test-strategy',
      evict: vi.fn((level, stats) => {
        evictionCalls.push({ level, stats });
        return Promise.resolve({
          itemsEvicted: level === 'critical' ? 10 : 5,
          memoryFreed: level === 'critical' ? 1024 * 1024 : 512 * 1024
        });
      })
    };

    // Default memory usage mock (normal conditions)
    mockMemoryUsage.mockReturnValue({
      rss: 50 * 1024 * 1024, // 50MB
      heapUsed: 30 * 1024 * 1024, // 30MB
      heapTotal: 40 * 1024 * 1024, // 40MB
      external: 5 * 1024 * 1024, // 5MB
      arrayBuffers: 2 * 1024 * 1024 // 2MB
    });

    detector = new MemoryPressureDetector({
      warningThreshold: 0.7, // 70%
      criticalThreshold: 0.9, // 90%
      maxMemory: 100 * 1024 * 1024, // 100MB
      monitoringInterval: 100, // 100ms for faster tests
      autoEviction: true,
      detailedTracking: true
    });
  });

  afterEach(() => {
    detector.stopMonitoring();
    vi.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default options', () => {
      const defaultDetector = new MemoryPressureDetector();
      
      expect(defaultDetector).toBeDefined();
      expect(defaultDetector.isMonitoring()).toBe(false);
      
      defaultDetector.stopMonitoring();
    });

    it('should initialize with custom options', () => {
      const customDetector = new MemoryPressureDetector({
        warningThreshold: 0.6,
        criticalThreshold: 0.8,
        maxMemory: 200 * 1024 * 1024,
        monitoringInterval: 500,
        autoEviction: false,
        detailedTracking: false
      });
      
      expect(customDetector).toBeDefined();
      expect(customDetector.isMonitoring()).toBe(false);
      
      customDetector.stopMonitoring();
    });
  });

  describe('Memory Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(detector.isMonitoring()).toBe(false);
      
      detector.startMonitoring();
    expect(detector.isMonitoring()).toBe(true);
    
    detector.stopMonitoring();
      expect(detector.isMonitoring()).toBe(false);
    });

    it('should collect memory statistics', () => {
      const stats = detector.getCurrentMemoryStats();
      
      expect(stats).toMatchObject({
        rss: expect.any(Number),
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
        external: expect.any(Number),
        arrayBuffers: expect.any(Number),
        timestamp: expect.any(Number),
        usagePercentage: expect.any(Number)
      });
      
      expect(stats.usagePercentage).toBe(0.5); // 50MB / 100MB = 50%
    });

    it('should track memory history when detailed tracking is enabled', async () => {
      detector.startMonitoring();
      
      // Wait for a few monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const history = detector.getMemoryHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toMatchObject({
        rss: expect.any(Number),
        heapUsed: expect.any(Number),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Threshold Detection', () => {
    it('should detect warning threshold', async () => {
      let warningEmitted = false;
      
      detector.on('warning', (stats) => {
        warningEmitted = true;
        expect(stats.usagePercentage).toBeGreaterThanOrEqual(0.7);
      });
      
      // Simulate high memory usage (75%)
      mockMemoryUsage.mockReturnValue({
        rss: 75 * 1024 * 1024,
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 72 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(warningEmitted).toBe(true);
    });

    it('should detect critical threshold', async () => {
      let criticalEmitted = false;
      
      detector.on('critical', (stats) => {
        criticalEmitted = true;
        expect(stats.usagePercentage).toBeGreaterThanOrEqual(0.9);
      });
      
      // Simulate critical memory usage (95%)
      mockMemoryUsage.mockReturnValue({
        rss: 95 * 1024 * 1024,
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 92 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(criticalEmitted).toBe(true);
    });

    it('should not emit duplicate events for same threshold', async () => {
      let warningCount = 0;
      
      detector.on('warning', () => {
        warningCount++;
      });
      
      // Simulate sustained high memory usage
      mockMemoryUsage.mockReturnValue({
        rss: 75 * 1024 * 1024,
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 72 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Wait for multiple monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should only emit once for sustained threshold breach
      expect(warningCount).toBe(1);
    });
  });

  describe('Eviction Strategies', () => {
    it('should register and remove eviction strategies', () => {
      detector.addEvictionStrategy(mockEvictionStrategy);
      
      const strategies = detector.getEvictionStrategies();
      expect(strategies).toContain(mockEvictionStrategy);
      
      detector.removeEvictionStrategy('test-strategy');
      
      const updatedStrategies = detector.getEvictionStrategies();
      expect(updatedStrategies).not.toContain(mockEvictionStrategy);
    });

    it('should trigger eviction on warning threshold with auto-eviction', async () => {
      detector.addEvictionStrategy(mockEvictionStrategy);
      
      // Simulate warning threshold
      mockMemoryUsage.mockReturnValue({
        rss: 75 * 1024 * 1024,
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 72 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Wait for monitoring cycle and eviction
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(evictionCalls).toHaveLength(1);
      expect(evictionCalls[0].level).toBe('warning');
      expect(mockEvictionStrategy.evict).toHaveBeenCalledWith(
        'warning',
        expect.objectContaining({
          usagePercentage: 0.75
        })
      );
    });

    it('should trigger eviction on critical threshold with auto-eviction', async () => {
      detector.addEvictionStrategy(mockEvictionStrategy);
      
      // Simulate critical threshold
      mockMemoryUsage.mockReturnValue({
        rss: 95 * 1024 * 1024,
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 92 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Wait for monitoring and eviction
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(evictionCalls).toHaveLength(1);
      expect(evictionCalls[0].level).toBe('critical');
    });

    it('should not trigger eviction when auto-eviction is disabled', async () => {
      const noAutoDetector = new MemoryPressureDetector({
        warningThreshold: 0.7,
        criticalThreshold: 0.9,
        maxMemory: 100 * 1024 * 1024,
        monitoringInterval: 100,
        autoEviction: false
      });
      
      noAutoDetector.addEvictionStrategy(mockEvictionStrategy);
      
      // Simulate warning threshold
      mockMemoryUsage.mockReturnValue({
        rss: 75 * 1024 * 1024,
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 72 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      noAutoDetector.startMonitoring();
      
      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(evictionCalls).toHaveLength(0);
      
      noAutoDetector.stopMonitoring();
    });

    it('should handle multiple eviction strategies', async () => {
      const secondStrategy: EvictionStrategy = {
        name: 'second-strategy',
        evict: vi.fn().mockResolvedValue({
          itemsEvicted: 3,
          memoryFreed: 256 * 1024
        })
      };
      
      detector.addEvictionStrategy(mockEvictionStrategy);
      detector.addEvictionStrategy(secondStrategy);
      
      // Simulate warning threshold
      mockMemoryUsage.mockReturnValue({
        rss: 75 * 1024 * 1024,
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 72 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Wait for monitoring and eviction
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockEvictionStrategy.evict).toHaveBeenCalled();
      expect(secondStrategy.evict).toHaveBeenCalled();
    });
  });

  describe('Manual Eviction', () => {
    it('should allow manual eviction trigger', async () => {
      detector.addEvictionStrategy(mockEvictionStrategy);
      
      const result = await detector.triggerEviction('warning');
      
      expect(result.strategiesExecuted).toBe(1);
      expect(result.totalItemsEvicted).toBe(5);
      expect(result.totalMemoryFreed).toBe(512 * 1024);
      expect(mockEvictionStrategy.evict).toHaveBeenCalledWith(
        'warning',
        expect.any(Object)
      );
    });

    it('should handle eviction strategy errors gracefully', async () => {
      const failingStrategy: EvictionStrategy = {
        name: 'failing-strategy',
        evict: vi.fn().mockRejectedValue(new Error('Eviction failed'))
      };
      
      detector.addEvictionStrategy(mockEvictionStrategy);
      detector.addEvictionStrategy(failingStrategy);
      
      const result = await detector.triggerEviction('critical');
      
      // Should still execute successful strategy
      expect(result.strategiesExecuted).toBe(1);
      expect(result.totalItemsEvicted).toBe(10);
      expect(mockEvictionStrategy.evict).toHaveBeenCalled();
    });
  });

  describe('Memory History and Analytics', () => {
    it('should maintain memory history with size limit', async () => {
      const limitedDetector = new MemoryPressureDetector({
        monitoringInterval: 50,
        detailedTracking: true,
        maxHistorySize: 5
      });
      
      limitedDetector.startMonitoring();
      
      // Wait for more than 5 monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const history = limitedDetector.getMemoryHistory();
      expect(history.length).toBeLessThanOrEqual(5);
      
      limitedDetector.stopMonitoring();
    });

    it('should calculate memory trends', async () => {
      detector.startMonitoring();
      
      // Simulate increasing memory usage
      let memoryUsage = 50;
      const interval = setInterval(() => {
        memoryUsage += 5;
        mockMemoryUsage.mockReturnValue({
          rss: memoryUsage * 1024 * 1024,
          heapUsed: (memoryUsage - 5) * 1024 * 1024,
          heapTotal: memoryUsage * 1024 * 1024,
          external: 3 * 1024 * 1024,
          arrayBuffers: 2 * 1024 * 1024
        });
      }, 60);
      
      // Wait for trend to develop
      await new Promise(resolve => setTimeout(resolve, 250));
      
      clearInterval(interval);
      
      const history = detector.getMemoryHistory();
      expect(history.length).toBeGreaterThan(2);
      
      // Check that memory usage is generally increasing
      const firstUsage = history[0].usagePercentage;
      const lastUsage = history[history.length - 1].usagePercentage;
      expect(lastUsage).toBeGreaterThan(firstUsage);
    });
  });

  describe('Event System', () => {
    it('should emit memory update events', async () => {
      let updateCount = 0;
      
      detector.on('memoryUpdate', (stats) => {
        updateCount++;
        expect(stats).toMatchObject({
          rss: expect.any(Number),
          usagePercentage: expect.any(Number),
          timestamp: expect.any(Number)
        });
      });
      
      detector.startMonitoring();
      
      // Wait for a few updates
      await new Promise(resolve => setTimeout(resolve, 250));
      
      expect(updateCount).toBeGreaterThan(0);
    });

    it('should emit eviction events', async () => {
      let evictionEventEmitted = false;
      
      detector.on('eviction', (result) => {
        evictionEventEmitted = true;
        expect(result).toMatchObject({
          level: expect.any(String),
          strategiesExecuted: expect.any(Number),
          totalItemsEvicted: expect.any(Number),
          totalMemoryFreed: expect.any(Number)
        });
      });
      
      detector.addEvictionStrategy(mockEvictionStrategy);
      
      await detector.triggerEviction('warning');
      
      expect(evictionEventEmitted).toBe(true);
    });

    it('should remove event listeners properly', () => {
      const listener = vi.fn();
      
      detector.on('warning', listener);
      detector.off('warning', listener);
      
      // Trigger warning condition
      mockMemoryUsage.mockReturnValue({
        rss: 75 * 1024 * 1024,
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 72 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      });
      
      detector.startMonitoring();
      
      // Listener should not be called
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle process.memoryUsage() errors', async () => {
      mockMemoryUsage.mockImplementation(() => {
        throw new Error('Memory usage unavailable');
      });
      
      // Should not crash
      const stats = detector.getCurrentMemoryStats();
      expect(stats).toBeDefined();
      
      detector.startMonitoring();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should continue monitoring without crashing
      expect(detector.isMonitoring()).toBe(true);
    });

    it('should handle zero or negative memory values', () => {
      mockMemoryUsage.mockReturnValue({
        rss: 0,
        heapUsed: -1,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0
      });
      
      const stats = detector.getCurrentMemoryStats();
      expect(stats.usagePercentage).toBeGreaterThanOrEqual(0);
      expect(stats.usagePercentage).toBeLessThanOrEqual(1);
    });

    it('should handle very large memory values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER / 2;
      
      mockMemoryUsage.mockReturnValue({
        rss: largeValue,
        heapUsed: largeValue,
        heapTotal: largeValue,
        external: largeValue,
        arrayBuffers: largeValue
      });
      
      const stats = detector.getCurrentMemoryStats();
      expect(stats).toBeDefined();
      expect(typeof stats.usagePercentage).toBe('number');
      expect(isFinite(stats.usagePercentage)).toBe(true);
    });
  });
});