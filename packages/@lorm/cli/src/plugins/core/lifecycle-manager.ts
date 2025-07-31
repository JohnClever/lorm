/**
 * @fileoverview Plugin Lifecycle Manager
 * 
 * Handles plugin state transitions, lifecycle events, and state management
 * with dependency resolution, error recovery, and batch operations.
 * 
 * @example
 * ```typescript
 * import { PluginLifecycleManager } from './lifecycle-manager';
 * 
 * const manager = new PluginLifecycleManager(telemetry, dependencyManager);
 * 
 * // Initialize plugin lifecycle tracking
 * manager.initializePlugin('my-plugin', PluginLifecycleState.UNLOADED, dependencies);
 * 
 * // Transition plugin state
 * await manager.transition('my-plugin', PluginLifecycleState.ACTIVE, context);
 * 
 * // Listen for state changes
 * const unsubscribe = manager.onStateChange('my-plugin', (from, to) => {
 *   console.log(`Plugin transitioned from ${from} to ${to}`);
 * });
 * ```
 */

import type {
  Plugin,
  PluginContext,
  PluginLifecycleManager as IPluginLifecycleManager,
  PluginTelemetry,
  PluginLifecycleTransition,
  PluginDependencyManager,
  PluginDependency
} from '../types';
import { PluginLifecycleState } from '../types';
import { createPluginError } from '../utils/validation';
import { PluginErrorCode } from '../types';
import { EventEmitter } from 'events';

/**
 * Represents a single lifecycle state transition.
 */
interface LifecycleTransition {
  /** The state the plugin transitioned from */
  from: PluginLifecycleState;
  /** The state the plugin transitioned to */
  to: PluginLifecycleState;
  /** When the transition occurred */
  timestamp: Date;
  /** How long the transition took in milliseconds */
  duration?: number;
  /** Any error that occurred during transition */
  error?: Error;
}

/**
 * Internal data structure for tracking plugin lifecycle state.
 */
interface PluginLifecycleData {
  /** Current lifecycle state */
  state: PluginLifecycleState;
  /** History of all state transitions */
  history: LifecycleTransition[];
  /** Registered state change callbacks */
  callbacks: Map<string, ((from: PluginLifecycleState, to: PluginLifecycleState) => void)[]>;
  /** Plugin dependencies */
  dependencies: PluginDependency[];
  /** Plugins that depend on this one */
  dependents: string[];
  /** Current retry attempt count */
  retryCount: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Last error encountered */
  lastError?: Error;
}

/**
 * Manages plugin lifecycle states, transitions, and dependencies.
 * 
 * Provides comprehensive lifecycle management including state validation,
 * dependency resolution, error recovery, and batch operations.
 */
export class PluginLifecycleManager {
  private lifecycleData = new Map<string, PluginLifecycleData>();
  private eventEmitter = new EventEmitter();
  private telemetry: PluginTelemetry;
  private dependencyManager?: PluginDependencyManager;
  private batchOperations = new Map<string, Promise<void>>();

  /** Valid state transitions mapping */
  private readonly validTransitions = new Map<PluginLifecycleState, PluginLifecycleState[]>([
    [PluginLifecycleState.UNLOADED, [PluginLifecycleState.LOADING, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.LOADING, [PluginLifecycleState.LOADED, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.LOADED, [PluginLifecycleState.INITIALIZING, PluginLifecycleState.UNLOADING, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.INITIALIZING, [PluginLifecycleState.INITIALIZED, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.INITIALIZED, [PluginLifecycleState.ACTIVATING, PluginLifecycleState.DEACTIVATING, PluginLifecycleState.UNLOADING, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.ACTIVATING, [PluginLifecycleState.ACTIVE, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.ACTIVE, [PluginLifecycleState.DEACTIVATING, PluginLifecycleState.UNLOADING, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.DEACTIVATING, [PluginLifecycleState.DEACTIVATED, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.DEACTIVATED, [PluginLifecycleState.ACTIVATING, PluginLifecycleState.UNLOADING, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.UNLOADING, [PluginLifecycleState.UNLOADED, PluginLifecycleState.ERROR]],
    [PluginLifecycleState.ERROR, [PluginLifecycleState.UNLOADING, PluginLifecycleState.LOADING]] // Allow recovery from error state
  ]);

  /**
   * Creates a new plugin lifecycle manager.
   * 
   * @param telemetry - Telemetry service for tracking lifecycle events
   * @param dependencyManager - Optional dependency manager for resolving plugin dependencies
   */
  constructor(telemetry: PluginTelemetry, dependencyManager?: PluginDependencyManager) {
    this.telemetry = telemetry;
    this.dependencyManager = dependencyManager;
  }

  /**
   * Initialize lifecycle tracking for a plugin.
   * 
   * Sets up initial state, dependency tracking, and retry configuration.
   * 
   * @param pluginName - Name of the plugin to initialize
   * @param initialState - Initial lifecycle state (default: UNLOADED)
   * @param dependencies - Plugin dependencies to track
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  initializePlugin(
    pluginName: string, 
    initialState: PluginLifecycleState = PluginLifecycleState.UNLOADED,
    dependencies: PluginDependency[] = [],
    maxRetries: number = 3
  ): void {
    if (this.lifecycleData.has(pluginName)) {
      return;
    }

    this.lifecycleData.set(pluginName, {
      state: initialState,
      history: [],
      callbacks: new Map(),
      dependencies,
      dependents: [],
      retryCount: 0,
      maxRetries
    });


    this.updateDependencyGraph(pluginName, dependencies);

    this.telemetry.track('plugin_lifecycle_initialized', {
      pluginName,
      initialState,
      dependencyCount: dependencies.length
    });
  }

  /**
   * Get the current state of a plugin.
   * 
   * @param pluginName - Name of the plugin
   * @returns Current lifecycle state of the plugin
   * @throws Error if plugin is not initialized
   */
  getState(pluginName: string): PluginLifecycleState {
    const data = this.lifecycleData.get(pluginName);
    return data?.state || PluginLifecycleState.UNLOADED;
  }

  /**
   * Transition a plugin to a new lifecycle state.
   * 
   * Validates the transition, checks dependencies, and executes hooks.
   * 
   * @param pluginName - Name of the plugin to transition
   * @param toState - Target lifecycle state
   * @param context - Optional plugin context for the transition
   * @throws Error if transition is invalid or fails
   */
  async transition(
    pluginName: string,
    toState: PluginLifecycleState,
    context?: PluginContext
  ): Promise<void> {
    const data = this.lifecycleData.get(pluginName);
    if (!data) {
      throw createPluginError(
        PluginErrorCode.VALIDATION_ERROR,
        `Plugin '${pluginName}' is not initialized for lifecycle management`,
        { pluginName }
      );
    }

    const fromState = data.state;
    
    // Check if transition is valid
    if (!this.canTransition(fromState, toState)) {
      throw createPluginError(
          PluginErrorCode.INVALID_VERSION,
          `Invalid state transition from '${fromState}' to '${toState}' for plugin '${pluginName}'`,
          { pluginName }
        );
    }

    const startTime = Date.now();
    let error: Error | undefined;

    try {
      // Execute transition hooks
      await this.executeTransitionHooks(pluginName, fromState, toState, context);
      
      // Update state
      data.state = toState;
      
      // Record transition
      const transition: LifecycleTransition = {
        from: fromState,
        to: toState,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
      
      data.history.push(transition);
      
      // Notify callbacks
      this.notifyStateChange(pluginName, fromState, toState);
      
      // Track telemetry
      this.telemetry.track('plugin_state_transition', {
          pluginName,
          fromState: fromState as string,
          toState: toState as string,
          duration: transition.duration
        });
      
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      
      // Record failed transition
      const failedTransition: LifecycleTransition = {
        from: fromState,
        to: toState,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        error
      };
      
      data.history.push(failedTransition);
      
      // Transition to error state if not already there
      if (toState !== PluginLifecycleState.ERROR) {
        data.state = PluginLifecycleState.ERROR;
        this.notifyStateChange(pluginName, fromState, PluginLifecycleState.ERROR);
      }
      
      this.telemetry.track('plugin_state_transition_failed', {
          pluginName,
          fromState: fromState as string,
          toState: toState as string,
          error: error.message,
          duration: failedTransition.duration
        });
      
      throw error;
    }
  }

  /**
   * Check if a state transition is valid.
   * 
   * @param fromState - Current state
   * @param toState - Target state
   * @returns True if transition is valid, false otherwise
   */
  canTransition(fromState: PluginLifecycleState, toState: PluginLifecycleState): boolean {
    if (fromState === toState) {
      return true; // Allow same state transitions
    }
    
    const validNextStates = this.validTransitions.get(fromState);
    return validNextStates?.includes(toState) || false;
  }

  /**
   * Get the transition history for a plugin.
   * 
   * @param pluginName - Name of the plugin
   * @returns Array of lifecycle transitions
   */
  getHistory(pluginName: string): LifecycleTransition[] {
    const data = this.lifecycleData.get(pluginName);
    return data?.history || [];
  }

  /**
   * Get the plugin history in the public API format.
   * 
   * @param pluginName - Name of the plugin
   * @returns Array of plugin lifecycle transitions
   */
  getPluginHistory(pluginName: string): readonly PluginLifecycleTransition[] {
    const data = this.lifecycleData.get(pluginName);
    return (data?.history || []).map(transition => ({
      from: transition.from,
      to: transition.to,
      timestamp: transition.timestamp,
      duration: transition.duration || 0,
      error: transition.error ? {
        name: transition.error.name,
        message: transition.error.message,
        code: PluginErrorCode.VALIDATION_ERROR
      } : undefined
    }));
  }

  /**
   * Rollback a plugin to its previous state.
   * 
   * @param pluginName - Name of the plugin to rollback
   * @param context - Optional plugin context for the rollback
   * @throws Error if rollback is not possible
   */
  async rollback(pluginName: string, context?: PluginContext): Promise<void> {
    const data = this.lifecycleData.get(pluginName);
    if (!data || data.history.length === 0) {
      throw createPluginError(
        PluginErrorCode.VALIDATION_ERROR,
        `Cannot rollback plugin '${pluginName}': no previous state available`,
        { pluginName }
      );
    }

    // Find the last successful transition
    const lastSuccessfulTransition = data.history
      .slice()
      .reverse()
      .find(t => !t.error);

    if (!lastSuccessfulTransition) {
      throw createPluginError(
          PluginErrorCode.VALIDATION_ERROR,
          `Cannot rollback plugin '${pluginName}': no successful previous state found`,
          { pluginName }
        );
    }

    await this.transition(pluginName, lastSuccessfulTransition.from, context);
  }

  /**
   * Register a callback for state change events.
   * 
   * @param pluginName - Name of the plugin to watch
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function to remove the callback
   */
  onStateChange(
    pluginName: string,
    callback: (from: PluginLifecycleState, to: PluginLifecycleState) => void
  ): () => void {
    const data = this.lifecycleData.get(pluginName);
    if (!data) {
      throw createPluginError(
          PluginErrorCode.VALIDATION_ERROR,
          `Plugin '${pluginName}' is not initialized for lifecycle management`,
          { pluginName }
        );
    }

    const callbackId = Math.random().toString(36).substr(2, 9);
    const callbacks = data.callbacks.get('stateChange') || [];
    callbacks.push(callback);
    data.callbacks.set('stateChange', callbacks);

    // Return unsubscribe function
    return () => {
      const currentCallbacks = data.callbacks.get('stateChange') || [];
      const index = currentCallbacks.indexOf(callback);
      if (index > -1) {
        currentCallbacks.splice(index, 1);
        data.callbacks.set('stateChange', currentCallbacks);
      }
    };
  }

  /**
   * Get lifecycle manager for a specific plugin
   */
  getPluginLifecycleManager(pluginName: string): IPluginLifecycleManager {
    return {
      getState: () => this.getState(pluginName),
      transition: (to: PluginLifecycleState) => this.transition(pluginName, to),
      onStateChange: (callback) => this.onStateChange(pluginName, callback),
      canTransition: (to: PluginLifecycleState) => this.canTransition(this.getState(pluginName), to),
      getHistory: () => this.getPluginHistory(pluginName),
      rollback: () => this.rollback(pluginName)
    };
  }

  /**
   * Get lifecycle statistics for all plugins
   */
  getLifecycleStats(): Record<string, {
    currentState: PluginLifecycleState;
    transitionCount: number;
    errorCount: number;
    averageTransitionTime: number;
    lastTransition?: Date;
  }> {
    const stats: Record<string, {
      currentState: PluginLifecycleState;
      transitionCount: number;
      errorCount: number;
      averageTransitionTime: number;
      lastTransition?: Date;
    }> = {};
    
    for (const [pluginName, data] of Array.from(this.lifecycleData.entries())) {
      const errorTransitions = data.history.filter(t => t.error);
      const successfulTransitions = data.history.filter(t => !t.error && t.duration);
      const averageTime = successfulTransitions.length > 0
        ? successfulTransitions.reduce((sum, t) => sum + (t.duration || 0), 0) / successfulTransitions.length
        : 0;
      
      stats[pluginName] = {
        currentState: data.state,
        transitionCount: data.history.length,
        errorCount: errorTransitions.length,
        averageTransitionTime: averageTime,
        lastTransition: data.history.length > 0 ? data.history[data.history.length - 1].timestamp : undefined
      };
    }
    
    return stats;
  }

  /**
   * Clean up lifecycle data for a plugin
   */
  cleanup(pluginName: string): void {
    this.lifecycleData.delete(pluginName);
    this.eventEmitter.removeAllListeners(`stateChange:${pluginName}`);
    
    this.telemetry.track('plugin_lifecycle_cleanup', {
      pluginName
    });
  }

  /**
   * Transition multiple plugins in dependency order
   */
  async batchTransition(
    plugins: string[],
    toState: PluginLifecycleState,
    context?: PluginContext
  ): Promise<void> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Sort plugins by dependency order
      const sortedPlugins = this.sortByDependencyOrder(plugins);
      
      // Create batch operation promise
      const batchPromise = this.executeBatchTransition(sortedPlugins, toState, context);
      this.batchOperations.set(batchId, batchPromise);
      
      await batchPromise;
    } finally {
      this.batchOperations.delete(batchId);
    }
  }

  /**
   * Retry failed transition with exponential backoff
   */
  async retryTransition(
    pluginName: string,
    toState: PluginLifecycleState,
    context?: PluginContext
  ): Promise<void> {
    const data = this.lifecycleData.get(pluginName);
    if (!data) {
      throw createPluginError(
        PluginErrorCode.VALIDATION_ERROR,
        `Plugin '${pluginName}' is not initialized for lifecycle management`,
        { pluginName }
      );
    }

    if (data.retryCount >= data.maxRetries) {
       throw createPluginError(
         PluginErrorCode.VALIDATION_ERROR,
         `Maximum retry attempts (${data.maxRetries}) exceeded for plugin '${pluginName}'`,
         { pluginName }
       );
     }

    try {
      // Exponential backoff delay
      const delay = Math.pow(2, data.retryCount) * 1000;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      data.retryCount++;
      await this.transition(pluginName, toState, context);
      
      // Reset retry count on success
      data.retryCount = 0;
      data.lastError = undefined;
    } catch (error) {
      data.lastError = error instanceof Error ? error : new Error(String(error));
      
      this.telemetry.track('plugin_transition_retry_failed', {
        pluginName,
        toState,
        retryCount: data.retryCount,
        error: data.lastError.message
      });
      
      throw error;
    }
  }

  /**
   * Get plugins that depend on the given plugin
   */
  getDependents(pluginName: string): string[] {
    const data = this.lifecycleData.get(pluginName);
    return data?.dependents || [];
  }

  /**
   * Get dependencies of the given plugin
   */
  getDependencies(pluginName: string): PluginDependency[] {
    const data = this.lifecycleData.get(pluginName);
    return data?.dependencies || [];
  }

  /**
   * Check if all dependencies are in required state
   */
  async areDependenciesSatisfied(
    pluginName: string,
    requiredState: PluginLifecycleState = PluginLifecycleState.ACTIVE
  ): Promise<boolean> {
    const dependencies = this.getDependencies(pluginName);
    
    for (const dep of dependencies) {
      if (dep.optional) continue;
      
      const depState = this.getState(dep.name);
      if (depState !== requiredState) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Update dependency graph when plugin dependencies change
   */
  private updateDependencyGraph(pluginName: string, dependencies: PluginDependency[]): void {
    // Remove old dependency relationships
    for (const [name, data] of this.lifecycleData.entries()) {
      const index = data.dependents.indexOf(pluginName);
      if (index > -1) {
        data.dependents.splice(index, 1);
      }
    }

    // Add new dependency relationships
    for (const dep of dependencies) {
      const depData = this.lifecycleData.get(dep.name);
      if (depData && !depData.dependents.includes(pluginName)) {
        depData.dependents.push(pluginName);
      }
    }
  }

  /**
   * Sort plugins by dependency order (dependencies first)
   */
  public sortByDependencyOrder(pluginNames: string[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (pluginName: string): void => {
      if (visited.has(pluginName)) return;
      if (visiting.has(pluginName)) {
        // Circular dependency detected - log warning but continue
        console.warn(`Circular dependency detected involving plugin: ${pluginName}`);
        return;
      }

      visiting.add(pluginName);
      
      const dependencies = this.getDependencies(pluginName);
      for (const dep of dependencies) {
        if (pluginNames.includes(dep.name)) {
          visit(dep.name);
        }
      }
      
      visiting.delete(pluginName);
      visited.add(pluginName);
      result.push(pluginName);
    };

    for (const plugin of pluginNames) {
      visit(plugin);
    }

    return result;
  }

  /**
   * Execute batch transition with proper error handling
   */
  private async executeBatchTransition(
    plugins: string[],
    toState: PluginLifecycleState,
    context?: PluginContext
  ): Promise<void> {
    const errors: Array<{ plugin: string; error: Error }> = [];
    
    for (const pluginName of plugins) {
      try {
        // Check if dependencies are satisfied before transition
        if (toState === PluginLifecycleState.ACTIVE) {
          const dependenciesSatisfied = await this.areDependenciesSatisfied(pluginName);
          if (!dependenciesSatisfied) {
            throw createPluginError(
              PluginErrorCode.VALIDATION_ERROR,
              `Dependencies not satisfied for plugin '${pluginName}'`,
              { pluginName }
            );
          }
        }
        
        await this.transition(pluginName, toState, context);
      } catch (error) {
        const pluginError = error instanceof Error ? error : new Error(String(error));
        errors.push({ plugin: pluginName, error: pluginError });
        
        this.telemetry.track('plugin_batch_transition_failed', {
          pluginName,
          toState,
          error: pluginError.message
        });
      }
    }
    
    if (errors.length > 0) {
       const errorMessage = errors.map(e => `${e.plugin}: ${e.error.message}`).join('; ');
       throw createPluginError(
         PluginErrorCode.VALIDATION_ERROR,
         `Batch transition failed for ${errors.length} plugin(s): ${errorMessage}`,
         {}
       );
     }
  }

  private async executeTransitionHooks(
    pluginName: string,
    fromState: PluginLifecycleState,
    toState: PluginLifecycleState,
    context?: PluginContext
  ): Promise<void> {
    // Execute pre-transition hooks
    this.eventEmitter.emit(`preTransition:${pluginName}`, { fromState, toState, context });
    this.eventEmitter.emit('preTransition', { pluginName, fromState, toState, context });
    
    // Execute state-specific hooks
    this.eventEmitter.emit(`entering:${toState}:${pluginName}`, { fromState, context });
    this.eventEmitter.emit(`leaving:${fromState}:${pluginName}`, { toState, context });
    
    // Execute post-transition hooks
    this.eventEmitter.emit(`postTransition:${pluginName}`, { fromState, toState, context });
    this.eventEmitter.emit('postTransition', { pluginName, fromState, toState, context });
  }

  private notifyStateChange(
    pluginName: string,
    fromState: PluginLifecycleState,
    toState: PluginLifecycleState
  ): void {
    const data = this.lifecycleData.get(pluginName);
    if (!data) return;
    
    const callbacks = data.callbacks.get('stateChange') || [];
    callbacks.forEach(callback => {
      try {
        callback(fromState, toState);
      } catch (error) {
        console.warn(`State change callback failed for plugin '${pluginName}':`, error);
      }
    });
    
    // Emit global events
    this.eventEmitter.emit(`stateChange:${pluginName}`, { fromState, toState });
    this.eventEmitter.emit('stateChange', { pluginName, fromState, toState });
  }
}