import { EventEmitter } from 'events';
import {
  PluginHook,
  PluginName,
  HookName,
  PluginContext,
  PluginEventEmitter,
  TypedHookRegistry,
  HookFactory,
  PluginError,
  PluginErrorCode,
  CommandName,
  CommandResult,
  PluginLifecycleState,
  HookExecutionOptions,
  HookExecutionResult
} from '../types';

/**
 * Manages the plugin hook system for LORM core
 * Handles registration, execution, and lifecycle of plugin hooks
 */
export class HookSystemManager extends EventEmitter {
  private readonly hooks = new Map<HookName, PluginHook[]>();
  private readonly pluginHooks = new Map<PluginName, Set<HookName>>();
  private readonly hookStats = new Map<HookName, { executions: number; totalTime: number; errors: number }>();
  private readonly eventEmitter: PluginEventEmitter;
  private readonly hookRegistry: TypedHookRegistry;
  private readonly hookFactory: HookFactory;

  constructor(
    eventEmitter: PluginEventEmitter,
    hookRegistry: TypedHookRegistry,
    hookFactory: HookFactory
  ) {
    super();
    this.eventEmitter = eventEmitter;
    this.hookRegistry = hookRegistry;
    this.hookFactory = hookFactory;
  }

  /**
   * Register a single hook
   */
  registerHook(hook: PluginHook, pluginName: PluginName): void {
    try {
      this.validateHook(hook);
      
      // Initialize hook array if it doesn't exist
      if (!this.hooks.has(hook.name)) {
        this.hooks.set(hook.name, []);
      }
      
      // Add plugin name to hook for tracking
      const hookWithPlugin = { ...hook, pluginName };
      
      // Insert hook in priority order (higher priority first)
      const hookArray = this.hooks.get(hook.name)!;
      const insertIndex = hookArray.findIndex(h => (h.priority || 0) < (hook.priority || 0));
      
      if (insertIndex === -1) {
        hookArray.push(hookWithPlugin);
      } else {
        hookArray.splice(insertIndex, 0, hookWithPlugin);
      }
      
      // Track plugin hooks
      if (!this.pluginHooks.has(pluginName)) {
        this.pluginHooks.set(pluginName, new Set());
      }
      this.pluginHooks.get(pluginName)!.add(hook.name);
      
      // Initialize stats
      if (!this.hookStats.has(hook.name)) {
        this.hookStats.set(hook.name, { executions: 0, totalTime: 0, errors: 0 });
      }
      
      // Register with typed registry
      this.hookRegistry.register(hookWithPlugin, pluginName);
      
      this.eventEmitter.emit('hook:registered', { hookName: hook.name, pluginName });
    } catch (error) {
      const pluginError: PluginError = {
        name: 'PluginError',
        message: `Failed to register hook '${hook.name}': ${error instanceof Error ? error.message : String(error)}`,
        code: PluginErrorCode.REGISTRATION_FAILED,
        plugin: pluginName,
        details: {
          hookName: hook.name,
          pluginName,
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      };
      
      this.eventEmitter.emit('hook:error', pluginError);
      throw pluginError;
    }
  }

  /**
   * Unregister hooks for a specific plugin
   */
  unregisterHooks(pluginName: PluginName): void {
    const hookNames = this.pluginHooks.get(pluginName);
    if (!hookNames) return;

    for (const hookName of hookNames) {
      this.unregisterHook(hookName, pluginName);
    }

    this.pluginHooks.delete(pluginName);
    this.eventEmitter.emit('hooks:unregistered', { pluginName });
  }

  /**
   * Unregister a specific hook
   */
  unregisterHook(hookName: HookName, pluginName: PluginName): void {
    const hookArray = this.hooks.get(hookName);
    if (!hookArray) return;

    const initialLength = hookArray.length;
    const filteredHooks = hookArray.filter(h => h.pluginName !== pluginName);
    
    if (filteredHooks.length === 0) {
      this.hooks.delete(hookName);
    } else {
      this.hooks.set(hookName, filteredHooks);
    }

    // Update plugin hooks tracking
    const pluginHookSet = this.pluginHooks.get(pluginName);
    if (pluginHookSet) {
      pluginHookSet.delete(hookName);
      if (pluginHookSet.size === 0) {
        this.pluginHooks.delete(pluginName);
      }
    }

    // Unregister from typed registry
    this.hookRegistry.unregister(hookName, pluginName);

    if (hookArray.length !== initialLength) {
      this.eventEmitter.emit('hook:unregistered', { hookName, pluginName });
    }
  }

  /**
   * Execute hooks for a given hook name
   */
  async executeHooks<TArgs extends readonly unknown[] = readonly unknown[], TReturn = unknown>(
    hookName: HookName,
    context: PluginContext,
    options: HookExecutionOptions = {},
    ...args: TArgs
  ): Promise<HookExecutionResult<TReturn>> {
    const startTime = Date.now();
    const hooks = this.hooks.get(hookName) || [];
    const results: TReturn[] = [];
    const errors: PluginError[] = [];
    const executedHooks: HookName[] = [];
    const skippedHooks: HookName[] = [];

    if (hooks.length === 0) {
      return {
        success: true,
        results,
        errors,
        duration: Date.now() - startTime,
        executedHooks,
        skippedHooks
      };
    }

    const {
      timeout = 30000,
      parallel = false,
      stopOnError = false,
      maxRetries = 0,
      retryDelay = 1000
    } = options;

    const executeHook = async (hook: PluginHook): Promise<TReturn | undefined> => {
      // Check conditions
      if (hook.conditions) {
        for (const condition of hook.conditions) {
          try {
            const conditionMet = await condition.check(context, ...args);
            if (!conditionMet) {
              skippedHooks.push(hook.name);
              return undefined;
            }
          } catch (error) {
            const pluginError: PluginError = {
              name: 'PluginError',
              message: `Hook condition check failed for '${hook.name}': ${error instanceof Error ? error.message : String(error)}`,
              code: PluginErrorCode.PLUGIN_HOOK_EXECUTION_FAILED,
              plugin: hook.pluginName,
              details: {
                hookName: hook.name,
                pluginName: hook.pluginName,
                originalError: error instanceof Error ? error : new Error(String(error))
              }
            };
            errors.push(pluginError);
            if (stopOnError) throw pluginError;
            return undefined;
          }
        }
      }

      let attempts = 0;
      const maxAttempts = maxRetries + 1;

      while (attempts < maxAttempts) {
        try {
          const hookTimeout = hook.timeout || timeout;
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Hook '${hook.name}' timed out after ${hookTimeout}ms`)), hookTimeout);
          });

          const hookPromise = Promise.resolve(hook.handler(context, ...args));
          const result = await Promise.race([hookPromise, timeoutPromise]) as TReturn;
          
          executedHooks.push(hook.name);
          this.updateHookStats(hook.name, Date.now() - startTime, false);
          
          return result;
        } catch (error) {
          attempts++;
          this.updateHookStats(hook.name, Date.now() - startTime, true);
          
          if (attempts >= maxAttempts) {
            const pluginError: PluginError = {
              name: 'PluginError',
              message: `Hook '${hook.name}' failed after ${attempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
              code: PluginErrorCode.PLUGIN_HOOK_EXECUTION_FAILED,
              plugin: hook.pluginName,
              details: {
                hookName: hook.name,
                 pluginName: hook.pluginName,
                 originalError: error instanceof Error ? error : new Error(String(error))
               }
            };
            errors.push(pluginError);
            
            if (stopOnError) throw pluginError;
            return undefined;
          }
          
          if (retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      return undefined;
    };

    try {
      if (parallel) {
        const promises = hooks.map(executeHook);
        const hookResults = await Promise.allSettled(promises);
        
        for (const result of hookResults) {
          if (result.status === 'fulfilled' && result.value !== undefined) {
            results.push(result.value);
          }
        }
      } else {
        for (const hook of hooks) {
          const result = await executeHook(hook);
          if (result !== undefined) {
            results.push(result);
          }
          
          // Remove hook if it's marked as 'once'
           if (hook.once && hook.pluginName) {
             this.unregisterHook(hook.name, hook.pluginName as PluginName);
           }
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        errors.push(error as PluginError);
      } else {
        const pluginError: PluginError = {
          name: 'PluginError',
          message: `Hook execution failed: ${error instanceof Error ? error.message : String(error)}`,
          code: PluginErrorCode.PLUGIN_HOOK_EXECUTION_FAILED,
          details: {
            hookName,
            originalError: error instanceof Error ? error : new Error(String(error))
          }
        };
        errors.push(pluginError);
      }
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    this.eventEmitter.emit('hooks:executed', {
      hookName,
      success,
      duration,
      resultCount: results.length,
      errorCount: errors.length
    });

    return {
      success,
      results,
      errors,
      duration,
      executedHooks,
      skippedHooks
    };
  }

  /**
   * Execute typed hooks using the registry
   */
  async executeTypedHooks<TArgs extends readonly unknown[] = readonly unknown[], TReturn = unknown>(
    hookName: HookName,
    context: PluginContext,
    ...args: TArgs
  ): Promise<TReturn[]> {
    return this.hookRegistry.executeTyped<TArgs, TReturn>(hookName, context, ...args);
  }

  /**
   * Get all hooks for a specific hook name
   */
  getHooks(hookName?: HookName): readonly PluginHook[] {
    if (hookName) {
      return this.hooks.get(hookName) || [];
    }
    
    const allHooks: PluginHook[] = [];
    for (const hookArray of this.hooks.values()) {
      allHooks.push(...hookArray);
    }
    return allHooks;
  }

  /**
   * Get all hooks registered by a specific plugin
   */
  getPluginHooks(pluginName: PluginName): readonly PluginHook[] {
    const hookNames = this.pluginHooks.get(pluginName);
    if (!hookNames) return [];
    
    const pluginHooks: PluginHook[] = [];
    for (const hookName of hookNames) {
      const hooks = this.hooks.get(hookName) || [];
      pluginHooks.push(...hooks.filter(h => h.pluginName === pluginName));
    }
    return pluginHooks;
  }

  /**
   * Get hooks by type/name
   */
  getHooksByType(hookName: HookName): readonly PluginHook[] {
    return this.hooks.get(hookName) || [];
  }

  /**
   * Check if a hook is registered
   */
  hasHook(hookName: HookName): boolean {
    return this.hooks.has(hookName) && this.hooks.get(hookName)!.length > 0;
  }

  /**
   * Check if a specific plugin has registered a hook
   */
  hasPluginHook(hookName: HookName, pluginName: PluginName): boolean {
    const hooks = this.hooks.get(hookName);
    return hooks ? hooks.some(h => h.pluginName === pluginName) : false;
  }

  /**
   * Get total number of registered hooks
   */
  getHookCount(): number {
    let count = 0;
    for (const hookArray of this.hooks.values()) {
      count += hookArray.length;
    }
    return count;
  }

  /**
   * Get number of hooks registered by a specific plugin
   */
  getPluginHookCount(pluginName: PluginName): number {
    return this.getPluginHooks(pluginName).length;
  }

  /**
   * Get all registered hook names
   */
  getHookNames(): readonly HookName[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hook execution statistics
   */
  getHookStats(hookName?: HookName): Record<string, { executions: number; totalTime: number; errors: number; averageTime: number }> {
     const stats: Record<string, { executions: number; totalTime: number; errors: number; averageTime: number }> = {};
     
     const statsToProcess = hookName 
       ? this.hookStats.has(hookName) ? [[hookName, this.hookStats.get(hookName)!]] as const : []
       : Array.from(this.hookStats.entries());
     
     for (const [name, stat] of statsToProcess) {
       stats[name as string] = {
         executions: stat.executions,
         totalTime: stat.totalTime,
         errors: stat.errors,
         averageTime: stat.executions > 0 ? stat.totalTime / stat.executions : 0
       };
     }
     
     return stats;
   }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.pluginHooks.clear();
    this.hookStats.clear();
    this.hookRegistry.clear();
    this.eventEmitter.emit('hooks:cleared');
  }

  /**
   * Validate hook structure
   */
  private validateHook(hook: PluginHook): void {
    if (!hook.name || typeof hook.name !== 'string') {
      throw new Error('Hook must have a valid name');
    }
    
    if (!hook.handler || typeof hook.handler !== 'function') {
      throw new Error('Hook must have a valid handler function');
    }
    
    if (hook.priority !== undefined && (typeof hook.priority !== 'number' || hook.priority < 0)) {
      throw new Error('Hook priority must be a non-negative number');
    }
    
    if (hook.timeout !== undefined && (typeof hook.timeout !== 'number' || hook.timeout <= 0)) {
      throw new Error('Hook timeout must be a positive number');
    }
  }

  /**
   * Update hook execution statistics
   */
  private updateHookStats(hookName: HookName, duration: number, isError: boolean): void {
    const stats = this.hookStats.get(hookName);
    if (stats) {
      stats.executions++;
      stats.totalTime += duration;
      if (isError) {
        stats.errors++;
      }
    }
  }
}