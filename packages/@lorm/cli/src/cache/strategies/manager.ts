/**
 * Cache Strategy Manager
 * 
 * This module manages different caching strategies including eviction policies,
 * routing strategies, and optimization algorithms.
 */

import type {
  CacheStrategyInterface,
  CacheLayerInterface,
  CacheOptions,
  CacheEntry,
  EvictionStrategy,
  CacheLayer,
  CacheNamespace
} from '../core/types.js';
import type {
  CacheStrategyContext,
  CacheStrategyResult
} from '../core/interface.js';
import { EventEmitter } from 'node:events';

/**
 * Strategy configuration
 */
interface StrategyConfig {
  defaultEviction: EvictionStrategy;
  routingRules: RoutingRule[];
  optimizationInterval: number;
  adaptiveThresholds: AdaptiveThresholds;
}

/**
 * Routing rule for layer selection
 */
interface RoutingRule {
  condition: RoutingCondition;
  targetLayers: CacheLayer[];
  priority: number;
}

/**
 * Routing condition
 */
interface RoutingCondition {
  namespace?: CacheNamespace[];
  keyPattern?: string;
  sizeThreshold?: number;
  ttlThreshold?: number;
  accessFrequency?: 'high' | 'medium' | 'low';
}

/**
 * Adaptive thresholds for optimization
 */
interface AdaptiveThresholds {
  memoryPressure: number;
  diskPressure: number;
  hitRatioThreshold: number;
  evictionRateThreshold: number;
}

/**
 * Cache operation context
 */
interface OperationContext {
  key: string;
  operation: 'get' | 'set' | 'delete' | 'has';
  namespace: CacheNamespace;
  size?: number;
  ttl?: number;
  priority?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Strategy decision result
 */
interface StrategyDecision {
  targetLayers: CacheLayer[];
  evictionStrategy: EvictionStrategy;
  shouldCompress: boolean;
  ttlAdjustment?: number;
  priorityBoost?: number;
}

/**
 * Cache strategy manager implementation
 */
export class CacheStrategyManager extends EventEmitter implements CacheStrategyInterface {
  readonly name: string = 'strategy-manager';
  private readonly config: StrategyConfig;
  private readonly layers = new Map<CacheLayer, CacheLayerInterface>();
  private readonly accessPatterns = new Map<string, AccessPattern>();
  private optimizationTimer?: NodeJS.Timeout;
  private isInitialized = false;

  // Performance tracking
  private stats = {
    decisions: 0,
    optimizations: 0,
    adaptations: 0,
    routingChanges: 0
  };

  constructor(config: Partial<StrategyConfig> = {}) {
    super();
    
    this.config = {
      defaultEviction: 'lru',
      routingRules: this._getDefaultRoutingRules(),
      optimizationInterval: 5 * 60 * 1000, // 5 minutes
      adaptiveThresholds: {
        memoryPressure: 0.8,
        diskPressure: 0.8,
        hitRatioThreshold: 0.7,
        evictionRateThreshold: 0.1
      },
      ...config
    };
  }

  /**
   * Initialize the strategy manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Start optimization timer
    this.optimizationTimer = setInterval(() => {
      this._performOptimization().catch(error => {
        this.emit('error', { operation: 'optimization', error });
      });
    }, this.config.optimizationInterval);

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the strategy manager
   */
  async shutdown(): Promise<void> {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = undefined;
    }

    this.layers.clear();
    this.accessPatterns.clear();
    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Register a cache layer
   */
  registerLayer(layer: CacheLayerInterface): void {
    this.layers.set(layer.name, layer);
    this.emit('layerRegistered', { layer: layer.name });
  }

  /**
   * Unregister a cache layer
   */
  unregisterLayer(layerName: CacheLayer): void {
    this.layers.delete(layerName);
    this.emit('layerUnregistered', { layer: layerName });
  }

  /**
   * Make a strategy decision for cache operation
   */
  async makeDecision(context: OperationContext): Promise<StrategyDecision> {
    try {
      this.stats.decisions++;
      
      // Update access patterns
      this._updateAccessPattern(context);
      
      // Determine target layers
      const targetLayers = await this._selectTargetLayers(context);
      
      // Determine eviction strategy
      const evictionStrategy = this._selectEvictionStrategy(context);
      
      // Determine compression strategy
      const shouldCompress = this._shouldCompress(context);
      
      // Calculate adjustments
      const ttlAdjustment = this._calculateTtlAdjustment(context);
      const priorityBoost = this._calculatePriorityBoost(context);
      
      const decision: StrategyDecision = {
        targetLayers,
        evictionStrategy,
        shouldCompress,
        ttlAdjustment,
        priorityBoost
      };
      
      this.emit('decision', { context, decision });
      
      return decision;
    } catch (error) {
      this.emit('error', { operation: 'makeDecision', context, error });
      
      // Fallback decision
      return {
        targetLayers: ['memory'],
        evictionStrategy: this.config.defaultEviction,
        shouldCompress: false
      };
    }
  }

  /**
   * Optimize cache strategy based on performance metrics
   */
  async optimize(): Promise<void> {
    await this._performOptimization();
  }

  /**
   * Get strategy statistics
   */
  getStats(): Record<string, unknown> {
    return {
      ...this.stats,
      accessPatterns: this.accessPatterns.size,
      registeredLayers: Array.from(this.layers.keys()),
      routingRules: this.config.routingRules.length
    };
  }

  /**
   * Update routing rules
   */
  updateRoutingRules(rules: RoutingRule[]): void {
    this.config.routingRules = rules.sort((a, b) => b.priority - a.priority);
    this.stats.routingChanges++;
    this.emit('routingUpdated', { rulesCount: rules.length });
  }

  /**
   * Add a routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.config.routingRules.push(rule);
    this.config.routingRules.sort((a, b) => b.priority - a.priority);
    this.stats.routingChanges++;
    this.emit('routingRuleAdded', { rule });
  }

  /**
   * Remove routing rules by condition
   */
  removeRoutingRules(predicate: (rule: RoutingRule) => boolean): number {
    const initialLength = this.config.routingRules.length;
    this.config.routingRules = this.config.routingRules.filter(rule => !predicate(rule));
    const removedCount = initialLength - this.config.routingRules.length;
    
    if (removedCount > 0) {
      this.stats.routingChanges++;
      this.emit('routingRulesRemoved', { removedCount });
    }
    
    return removedCount;
  }

  /**
   * Check if strategy should be applied (CacheStrategyInterface method)
   */
  shouldApply(context: CacheStrategyContext): boolean {
    // Always apply the strategy manager
    return true;
  }

  /**
   * Execute the strategy (CacheStrategyInterface method)
   */
  async execute(context: CacheStrategyContext): Promise<CacheStrategyResult> {
    const startTime = Date.now();
    const actions: CacheStrategyResult['actions'] = [];
    let itemsProcessed = 0;
    let memoryFreed = 0;
    let diskFreed = 0;

    try {
      // Perform optimization based on current metrics
      await this._performOptimization();
      itemsProcessed = this.stats.optimizations;
      
      actions.push({
        type: 'optimize',
        target: 'all-layers',
        result: true,
        metadata: { optimizations: this.stats.optimizations }
      });

      return {
        success: true,
        actions,
        metrics: {
          executionTime: Date.now() - startTime,
          itemsProcessed,
          memoryFreed,
          diskFreed
        }
      };
    } catch (error) {
      return {
        success: false,
        actions,
        metrics: {
          executionTime: Date.now() - startTime,
          itemsProcessed,
          memoryFreed,
          diskFreed
        },
        error: error as Error
      };
    }
  }

  /**
   * Get strategy configuration (CacheStrategyInterface method)
   */
  getConfig(): Record<string, unknown> {
    return {
      name: this.name,
      defaultEviction: this.config.defaultEviction,
      optimizationInterval: this.config.optimizationInterval,
      adaptiveThresholds: this.config.adaptiveThresholds,
      routingRulesCount: this.config.routingRules.length,
      stats: this.stats
    };
  }

  /**
   * Update strategy configuration (CacheStrategyInterface method)
   */
  updateConfig(config: Record<string, unknown>): void {
    if (config.defaultEviction && typeof config.defaultEviction === 'string') {
      this.config.defaultEviction = config.defaultEviction as EvictionStrategy;
    }
    
    if (config.optimizationInterval && typeof config.optimizationInterval === 'number') {
      this.config.optimizationInterval = config.optimizationInterval;
      
      // Restart optimization timer with new interval
      if (this.optimizationTimer) {
        clearInterval(this.optimizationTimer);
        this.optimizationTimer = setInterval(() => {
          this._performOptimization().catch(error => {
            this.emit('error', { operation: 'optimization', error });
          });
        }, this.config.optimizationInterval);
      }
    }
    
    if (config.adaptiveThresholds && typeof config.adaptiveThresholds === 'object') {
      this.config.adaptiveThresholds = {
        ...this.config.adaptiveThresholds,
        ...config.adaptiveThresholds as any
      };
    }
    
    this.emit('configUpdated', { config });
  }

  // Private helper methods

  private _getDefaultRoutingRules(): RoutingRule[] {
    return [
      {
        condition: { namespace: ['config', 'schema'] },
        targetLayers: ['memory', 'disk'],
        priority: 100
      },
      {
        condition: { namespace: ['plugin'] },
        targetLayers: ['memory', 'disk'],
        priority: 90
      },
      {
        condition: { sizeThreshold: 1024 * 1024 }, // 1MB
        targetLayers: ['disk'],
        priority: 80
      },
      {
        condition: { ttlThreshold: 60 * 1000 }, // 1 minute
        targetLayers: ['memory'],
        priority: 70
      },
      {
        condition: { accessFrequency: 'high' },
        targetLayers: ['memory'],
        priority: 60
      },
      {
        condition: {},
        targetLayers: ['memory', 'disk'],
        priority: 1
      }
    ];
  }

  private async _selectTargetLayers(context: OperationContext): Promise<CacheLayer[]> {
    // Find matching routing rules
    for (const rule of this.config.routingRules) {
      if (this._matchesCondition(context, rule.condition)) {
        // Filter available layers
        const availableLayers = rule.targetLayers.filter(layer => 
          this.layers.has(layer)
        );
        
        if (availableLayers.length > 0) {
          return availableLayers;
        }
      }
    }
    
    // Fallback to available layers
    const availableLayers = Array.from(this.layers.keys());
    return availableLayers.length > 0 ? availableLayers : ['memory'];
  }

  private _selectEvictionStrategy(context: OperationContext): EvictionStrategy {
    const pattern = this.accessPatterns.get(context.key);
    
    if (!pattern) {
      return this.config.defaultEviction;
    }
    
    // Select strategy based on access pattern
    if (pattern.frequency > 10 && pattern.recency < 60000) { // High frequency, recent
      return 'lfu'; // Least Frequently Used
    }
    
    if (pattern.recency > 300000) { // Old access
      return 'lru'; // Least Recently Used
    }
    
    return this.config.defaultEviction;
  }

  private _shouldCompress(context: OperationContext): boolean {
    // Compress large items
    if (context.size && context.size > 1024) {
      return true;
    }
    
    // Compress items with long TTL
    if (context.ttl && context.ttl > 60 * 60 * 1000) { // 1 hour
      return true;
    }
    
    // Compress based on namespace
    if (context.namespace === 'config' || context.namespace === 'schema') {
      return true;
    }
    
    return false;
  }

  private _calculateTtlAdjustment(context: OperationContext): number | undefined {
    const pattern = this.accessPatterns.get(context.key);
    
    if (!pattern) {
      return undefined;
    }
    
    // Extend TTL for frequently accessed items
    if (pattern.frequency > 5) {
      return 1.5; // 50% longer
    }
    
    // Reduce TTL for rarely accessed items
    if (pattern.frequency < 2 && pattern.recency > 300000) {
      return 0.5; // 50% shorter
    }
    
    return undefined;
  }

  private _calculatePriorityBoost(context: OperationContext): number | undefined {
    const pattern = this.accessPatterns.get(context.key);
    
    if (!pattern) {
      return undefined;
    }
    
    // Boost priority for frequently accessed items
    if (pattern.frequency > 10) {
      return 2;
    }
    
    if (pattern.frequency > 5) {
      return 1;
    }
    
    return undefined;
  }

  private _matchesCondition(context: OperationContext, condition: RoutingCondition): boolean {
    // Check namespace
    if (condition.namespace && !condition.namespace.includes(context.namespace)) {
      return false;
    }
    
    // Check key pattern
    if (condition.keyPattern && !this._matchesPattern(context.key, condition.keyPattern)) {
      return false;
    }
    
    // Check size threshold
    if (condition.sizeThreshold && context.size && context.size < condition.sizeThreshold) {
      return false;
    }
    
    // Check TTL threshold
    if (condition.ttlThreshold && context.ttl && context.ttl < condition.ttlThreshold) {
      return false;
    }
    
    // Check access frequency
    if (condition.accessFrequency) {
      const pattern = this.accessPatterns.get(context.key);
      if (!pattern) {
        return condition.accessFrequency === 'low';
      }
      
      const frequency = this._categorizeFrequency(pattern.frequency);
      if (frequency !== condition.accessFrequency) {
        return false;
      }
    }
    
    return true;
  }

  private _matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(key);
  }

  private _categorizeFrequency(frequency: number): 'high' | 'medium' | 'low' {
    if (frequency > 10) return 'high';
    if (frequency > 3) return 'medium';
    return 'low';
  }

  private _updateAccessPattern(context: OperationContext): void {
    const now = Date.now();
    const existing = this.accessPatterns.get(context.key);
    
    if (existing) {
      existing.frequency++;
      existing.lastAccess = now;
      existing.recency = now - existing.firstAccess;
    } else {
      this.accessPatterns.set(context.key, {
        key: context.key,
        frequency: 1,
        firstAccess: now,
        lastAccess: now,
        recency: 0,
        namespace: context.namespace
      });
    }
    
    // Cleanup old patterns (keep only recent 10000)
    if (this.accessPatterns.size > 10000) {
      const entries = Array.from(this.accessPatterns.entries())
        .sort(([, a], [, b]) => b.lastAccess - a.lastAccess)
        .slice(0, 8000); // Keep top 8000
      
      this.accessPatterns.clear();
      for (const [key, pattern] of entries) {
        this.accessPatterns.set(key, pattern);
      }
    }
  }

  private async _performOptimization(): Promise<void> {
    try {
      this.stats.optimizations++;
      
      // Get layer statistics
      const layerStats = new Map<CacheLayer, any>();
      for (const [name, layer] of this.layers) {
        try {
          const stats = await layer.stats();
          layerStats.set(name, stats);
        } catch (error) {
          this.emit('warning', {
            message: `Failed to get stats for layer ${name}`,
            context: { layer: name, error }
          });
        }
      }
      
      // Analyze performance and adapt strategies
      await this._adaptStrategies(layerStats);
      
      // Clean up old access patterns
      this._cleanupAccessPatterns();
      
      this.emit('optimized', {
        layerStats: Object.fromEntries(layerStats),
        accessPatterns: this.accessPatterns.size
      });
    } catch (error) {
      this.emit('error', { operation: 'optimization', error });
    }
  }

  private async _adaptStrategies(layerStats: Map<CacheLayer, any>): Promise<void> {
    let adaptations = 0;
    
    // Check memory pressure
    const memoryStats = layerStats.get('memory');
    if (memoryStats && memoryStats.hitRatio < this.config.adaptiveThresholds.hitRatioThreshold) {
      // Add rule to prefer disk for large items
      this.addRoutingRule({
        condition: { sizeThreshold: 512 * 1024 }, // 512KB
        targetLayers: ['disk'],
        priority: 85
      });
      adaptations++;
    }
    
    // Check disk pressure
    const diskStats = layerStats.get('disk');
    if (diskStats && diskStats.hitRatio < this.config.adaptiveThresholds.hitRatioThreshold) {
      // Add rule to prefer memory for frequently accessed items
      this.addRoutingRule({
        condition: { accessFrequency: 'high' },
        targetLayers: ['memory'],
        priority: 95
      });
      adaptations++;
    }
    
    if (adaptations > 0) {
      this.stats.adaptations += adaptations;
      this.emit('strategiesAdapted', { adaptations });
    }
  }

  private _cleanupAccessPatterns(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleaned = 0;
    for (const [key, pattern] of this.accessPatterns) {
      if (now - pattern.lastAccess > maxAge) {
        this.accessPatterns.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.emit('accessPatternsCleanup', { cleaned });
    }
  }
}

/**
 * Access pattern tracking
 */
interface AccessPattern {
  key: string;
  frequency: number;
  firstAccess: number;
  lastAccess: number;
  recency: number;
  namespace: CacheNamespace;
}