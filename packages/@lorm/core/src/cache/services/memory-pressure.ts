/**
 * Memory Pressure Detection Service for @lorm/core cache system
 * Monitors memory usage and triggers adaptive eviction strategies
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";

export interface MemoryPressureOptions {
  /** Memory threshold percentage (0-1) to trigger warnings */
  warningThreshold?: number;
  /** Memory threshold percentage (0-1) to trigger critical alerts */
  criticalThreshold?: number;
  /** Monitoring interval in milliseconds */
  monitoringInterval?: number;
  /** Enable automatic eviction on pressure */
  autoEviction?: boolean;
  /** Maximum memory usage in bytes (0 = use system limit) */
  maxMemory?: number;
  /** Maximum memory usage in bytes (0 = use system limit) */
  maxMemoryUsage?: number;
  /** Enable detailed memory tracking */
  enableDetailedTracking?: boolean;
  /** Enable detailed memory tracking */
  detailedTracking?: boolean;
  /** Maximum history size */
  maxHistorySize?: number;
}

export interface MemoryStats {
  /** Current heap used in bytes */
  heapUsed: number;
  /** Current heap total in bytes */
  heapTotal: number;
  /** External memory usage in bytes */
  external: number;
  /** RSS (Resident Set Size) in bytes */
  rss: number;
  /** Array buffers in bytes */
  arrayBuffers: number;
  /** Memory usage percentage (0-1) */
  usagePercentage: number;
  /** Available memory in bytes */
  availableMemory: number;
  /** System total memory in bytes */
  totalSystemMemory: number;
  /** Timestamp when stats were collected */
  timestamp: number;
}

export interface MemoryPressureEvent {
  type: 'warning' | 'critical' | 'normal';
  stats: MemoryStats;
  timestamp: number;
  message: string;
  suggestedActions: string[];
}

export interface EvictionStrategy {
  name: string;
  evict: (level: 'warning' | 'critical', stats: MemoryStats) => Promise<{ itemsEvicted: number; memoryFreed: number }>;
}

export class MemoryPressureDetector extends EventEmitter {
  private options: Required<MemoryPressureOptions>;
  private monitoringTimer?: NodeJS.Timeout;
  private currentState: 'normal' | 'warning' | 'critical' = 'normal';
  private evictionStrategies: EvictionStrategy[] = [];
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;
  private isDestroyed = false;
  private lastGCTime = 0;
  private gcThreshold = 30000; // 30 seconds
  private lastEvictionTime = 0;
  private evictionCooldown = 1000; // 1 second cooldown between evictions

  constructor(options: MemoryPressureOptions = {}) {
    super();
    
    this.options = {
      warningThreshold: 0.75, // 75%
      criticalThreshold: 0.90, // 90%
      monitoringInterval: 5000, // 5 seconds
      autoEviction: true,
      maxMemory: options.maxMemory || options.maxMemoryUsage || 0, // Use system limit
      maxMemoryUsage: options.maxMemory || options.maxMemoryUsage || 0, // Use system limit
      enableDetailedTracking: options.detailedTracking ?? options.enableDetailedTracking ?? true,
      detailedTracking: options.detailedTracking ?? options.enableDetailedTracking ?? true,
      maxHistorySize: options.maxHistorySize ?? 100,
      ...options,
    };

    if (options.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize;
    }

    // Don't auto-start monitoring - let tests control this
  }

  /**
   * Check if monitoring is currently active
   */
  isMonitoring(): boolean {
    return !!this.monitoringTimer && !this.isDestroyed;
  }

  /**
   * Start memory pressure monitoring
   */
  startMonitoring(): void {
    if (this.monitoringTimer || this.isDestroyed) return;

    this.monitoringTimer = setInterval(() => {
      this.checkMemoryPressure();
    }, this.options.monitoringInterval);

    // Initial check
    this.checkMemoryPressure();
  }

  /**
   * Stop memory pressure monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
  }

  /**
   * Get current memory statistics
   */
  getCurrentMemoryStats(): MemoryStats {
    let memUsage: NodeJS.MemoryUsage;
    
    try {
      memUsage = process.memoryUsage();
    } catch (error) {
      // Fallback to safe default values if process.memoryUsage() fails
      memUsage = {
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0
      };
    }
    
    const totalSystemMemory = this.getTotalSystemMemory();
    const maxMemory = this.options.maxMemoryUsage || totalSystemMemory;
    const rawUsagePercentage = memUsage.rss / maxMemory;
    // Ensure usage percentage is between 0 and 1
    const usagePercentage = Math.max(0, Math.min(1, rawUsagePercentage));
    
    return {
      heapUsed: Math.max(0, memUsage.heapUsed),
      heapTotal: Math.max(0, memUsage.heapTotal),
      external: Math.max(0, memUsage.external),
      rss: Math.max(0, memUsage.rss),
      arrayBuffers: Math.max(0, memUsage.arrayBuffers || 0),
      usagePercentage,
      availableMemory: Math.max(0, maxMemory - memUsage.rss),
      totalSystemMemory,
      timestamp: Date.now(),
    };
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * Get statistics synchronously
   */
  getStatsSync(): {
    currentStats: MemoryStats;
    currentState: 'normal' | 'warning' | 'critical';
    history: MemoryStats[];
  } {
    return {
      currentStats: this.getCurrentMemoryStats(),
      currentState: this.currentState,
      history: this.getMemoryHistory()
    };
  }

  /**
   * Get number of registered eviction strategies
   */
  getEvictionStrategyCount(): number {
    return this.evictionStrategies.length;
  }

  /**
   * Get current memory pressure state
   */
  getCurrentState(): 'normal' | 'warning' | 'critical' {
    return this.currentState;
  }

  /**
   * Add an eviction strategy
   */
  addEvictionStrategy(strategy: EvictionStrategy): void {
    this.evictionStrategies.push(strategy);
  }

  /**
   * Register an eviction strategy
   */
  registerEvictionStrategy(strategy: EvictionStrategy): void {
    this.addEvictionStrategy(strategy);
  }

  /**
   * Remove an eviction strategy
   */
  removeEvictionStrategy(name: string): boolean {
    const index = this.evictionStrategies.findIndex(s => s.name === name);
    if (index > -1) {
      this.evictionStrategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Trigger manual eviction
   */
  async triggerEviction(level: 'warning' | 'critical'): Promise<{
    strategiesExecuted: number;
    totalItemsEvicted: number;
    totalMemoryFreed: number;
  }> {
    const stats = this.getCurrentMemoryStats();
    let strategiesExecuted = 0;
    let totalItemsEvicted = 0;
    let totalMemoryFreed = 0;

    for (const strategy of this.evictionStrategies) {
      try {
        const result = await strategy.evict(level, stats);
        strategiesExecuted++;
        totalItemsEvicted += result.itemsEvicted;
        totalMemoryFreed += result.memoryFreed;
      } catch (error) {
        console.error(`Eviction strategy '${strategy.name}' failed:`, error);
      }
    }

    const result = {
      strategiesExecuted,
      totalItemsEvicted,
      totalMemoryFreed
    };

    this.emit('eviction', { level, ...result });
    return result;
  }

  /**
   * Get registered eviction strategies
   */
  getEvictionStrategies(): EvictionStrategy[] {
    return [...this.evictionStrategies];
  }

  /**
   * Force memory pressure check
   */
  async forceCheck(): Promise<MemoryPressureEvent | null> {
    return this.checkMemoryPressure();
  }

  /**
   * Trigger garbage collection if available and needed
   */
  triggerGarbageCollection(): boolean {
    const now = Date.now();
    
    // Throttle GC calls
    if (now - this.lastGCTime < this.gcThreshold) {
      return false;
    }

    if (global.gc) {
      try {
        global.gc();
        this.lastGCTime = now;
        return true;
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error);
      }
    }
    
    return false;
  }

  /**
   * Get memory pressure recommendations
   */
  getRecommendations(stats: MemoryStats): string[] {
    const recommendations: string[] = [];
    
    if (stats.usagePercentage > this.options.criticalThreshold) {
      recommendations.push('Critical memory pressure detected - immediate action required');
      recommendations.push('Consider reducing cache size or increasing memory limits');
      recommendations.push('Enable aggressive eviction policies');
      recommendations.push('Review memory-intensive operations');
    } else if (stats.usagePercentage > this.options.warningThreshold) {
      recommendations.push('Memory pressure warning - monitor closely');
      recommendations.push('Consider enabling cache compression');
      recommendations.push('Review cache TTL settings');
      recommendations.push('Monitor for memory leaks');
    } else {
      recommendations.push('Memory usage is within normal limits');
      recommendations.push('Continue monitoring for trends');
    }
    
    // Additional recommendations based on memory patterns
    if (this.memoryHistory.length > 10) {
      const recent = this.memoryHistory.slice(-10);
      const trend = this.calculateMemoryTrend(recent);
      
      if (trend > 0.1) {
        recommendations.push('Memory usage is trending upward - investigate potential leaks');
      } else if (trend < -0.1) {
        recommendations.push('Memory usage is trending downward - eviction strategies are working');
      }
    }
    
    return recommendations;
  }

  /**
   * Destroy the memory pressure detector
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    this.stopMonitoring();
    this.removeAllListeners();
    this.evictionStrategies = [];
    this.memoryHistory = [];
  }

  private async checkMemoryPressure(): Promise<MemoryPressureEvent | null> {
    if (this.isDestroyed) return null;
    
    const stats = this.getCurrentMemoryStats();
    
    // Add to history
    if (this.options.enableDetailedTracking) {
      this.memoryHistory.push(stats);
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }
    }
    
    // Determine pressure level
    let pressureType: 'normal' | 'warning' | 'critical';
    let message: string;
    
    if (stats.usagePercentage >= this.options.criticalThreshold) {
      pressureType = 'critical';
      message = `Critical memory pressure: ${(stats.usagePercentage * 100).toFixed(1)}% used`;
    } else if (stats.usagePercentage >= this.options.warningThreshold) {
      pressureType = 'warning';
      message = `Memory pressure warning: ${(stats.usagePercentage * 100).toFixed(1)}% used`;
    } else {
      pressureType = 'normal';
      message = `Memory usage normal: ${(stats.usagePercentage * 100).toFixed(1)}% used`;
    }
    
    // Check for state change
    const stateChanged = this.currentState !== pressureType;
    this.currentState = pressureType;
    
    // Create event
    const event: MemoryPressureEvent = {
      type: pressureType,
      stats,
      timestamp: Date.now(),
      message,
      suggestedActions: this.getRecommendations(stats),
    };
    
    // Emit specific events based on pressure type
    if (stateChanged || pressureType === 'critical') {
      this.emit('memoryPressure', event);
      
      if (pressureType === 'warning') {
        this.emit('warning', stats);
      } else if (pressureType === 'critical') {
        this.emit('critical', stats);
      }
    }
    
    // Always emit memory update events
    this.emit('memoryUpdate', stats);
    
    // Trigger automatic eviction if enabled and needed (with cooldown)
    const now = Date.now();
    if (this.options.autoEviction && 
        (pressureType === 'warning' || pressureType === 'critical') &&
        (now - this.lastEvictionTime) > this.evictionCooldown) {
      this.lastEvictionTime = now;
      await this.executeEvictionStrategies(stats);
    }
    
    // Trigger GC if critical
    if (pressureType === 'critical') {
      this.triggerGarbageCollection();
    }
    
    return event;
  }

  private async executeEvictionStrategies(stats: MemoryStats): Promise<void> {
    const level = stats.usagePercentage >= this.options.criticalThreshold ? 'critical' : 'warning';
    let totalEvicted = 0;
    let totalFreed = 0;
    let strategiesExecuted = 0;
    
    for (const strategy of this.evictionStrategies) {
      try {
        const result = await strategy.evict(level, stats);
        strategiesExecuted++;
        totalEvicted += result.itemsEvicted;
        totalFreed += result.memoryFreed;
        
        // Check if we've freed enough memory
        const newStats = this.getCurrentMemoryStats();
        if (newStats.usagePercentage < this.options.warningThreshold) {
          break;
        }
      } catch (error) {
        console.error(`Eviction strategy '${strategy.name}' failed:`, error);
      }
    }
    
    if (totalEvicted > 0) {
      this.emit('evictionCompleted', {
        totalEvicted,
        totalFreed,
        timestamp: Date.now(),
      });
    }
  }

  private getTotalSystemMemory(): number {
    try {
      const os = require('os');
      return os.totalmem();
    } catch {
      // Fallback to a reasonable default (4GB)
      return 4 * 1024 * 1024 * 1024;
    }
  }

  private calculateMemoryTrend(history: MemoryStats[]): number {
    if (history.length < 2) return 0;
    
    const first = history[0].usagePercentage;
    const last = history[history.length - 1].usagePercentage;
    
    return (last - first) / history.length;
  }
}

/**
 * Default eviction strategies
 */
export const defaultEvictionStrategies: EvictionStrategy[] = [
  {
    name: 'lru-eviction',
    evict: async (level: 'warning' | 'critical', stats: MemoryStats) => {
      // Placeholder for LRU eviction
      // In a real implementation, this would evict least recently used items
      return { itemsEvicted: 0, memoryFreed: 0 };
    },
  },
  {
    name: 'size-based-eviction',
    evict: async (level: 'warning' | 'critical', stats: MemoryStats) => {
      // Placeholder for size-based eviction
      // In a real implementation, this would evict largest items first
      return { itemsEvicted: 0, memoryFreed: 0 };
    },
  },
  {
    name: 'ttl-eviction',
    evict: async (level: 'warning' | 'critical', stats: MemoryStats) => {
      // Placeholder for TTL-based eviction
      // In a real implementation, this would evict expired items
      return { itemsEvicted: 0, memoryFreed: 0 };
    },
  },
];

// Singleton instance
let memoryPressureInstance: MemoryPressureDetector | null = null;

/**
 * Get the global memory pressure detector instance
 */
export function getMemoryPressureDetector(options?: MemoryPressureOptions): MemoryPressureDetector {
  if (!memoryPressureInstance) {
    memoryPressureInstance = new MemoryPressureDetector(options);
    
    // Register default eviction strategies
    for (const strategy of defaultEvictionStrategies) {
      memoryPressureInstance.addEvictionStrategy(strategy);
    }
  }
  return memoryPressureInstance;
}

/**
 * Destroy the global memory pressure detector instance
 */
export function destroyMemoryPressureDetector(): void {
  if (memoryPressureInstance) {
    memoryPressureInstance.destroy();
    memoryPressureInstance = null;
  }
}