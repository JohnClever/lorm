/**
 * Hook System Manager
 * Handles plugin hook registration, execution, and event management
 */

import type {
  Plugin,
  PluginHook,
  PluginEventEmitter,
  TypedHookRegistry,
  HookFactory,
  PluginContext,
  PluginName,
  HookName
} from '../types';
import { createPluginError } from '../utils/validation';
import { PluginErrorCode } from '../types';

export class HookSystemManager {
  private hookEventEmitter: PluginEventEmitter;
  private typedHookRegistry: TypedHookRegistry;
  private hookFactory: HookFactory;
  private registeredHooks = new Map<string, Set<PluginHook>>();

  constructor(
    hookEventEmitter: PluginEventEmitter,
    typedHookRegistry: TypedHookRegistry,
    hookFactory: HookFactory
  ) {
    this.hookEventEmitter = hookEventEmitter;
    this.typedHookRegistry = typedHookRegistry;
    this.hookFactory = hookFactory;
  }

  /**
   * Register hooks for a plugin
   */
  async registerHooks(plugin: Plugin, context: PluginContext): Promise<void> {
    if (!plugin.hooks || plugin.hooks.length === 0) {
      return;
    }

    const pluginHooks = new Set<PluginHook>();
    
    for (const hook of plugin.hooks) {
      try {
        await this.registerSingleHook(plugin, hook, context);
        pluginHooks.add(hook);
      } catch (error) {
        throw createPluginError(
          PluginErrorCode.PLUGIN_HOOK_EXECUTION_FAILED,
          `Failed to register hook '${hook.name}' for plugin '${plugin.name}': ${error instanceof Error ? error.message : String(error)}`,
          { pluginName: plugin.name, hookName: hook.name, originalError: error instanceof Error ? error : new Error(String(error)) }
        );
      }
    }

    this.registeredHooks.set(plugin.name, pluginHooks);
  }

  /**
   * Unregister all hooks for a plugin
   */
  async unregisterHooks(pluginName: string): Promise<void> {
    const hooks = this.registeredHooks.get(pluginName);
    if (!hooks) {
      return;
    }

    Array.from(hooks).forEach(async (hook) => {
      try {
        await this.unregisterSingleHook(pluginName, hook);
      } catch (error) {
        console.warn(`Failed to unregister hook '${hook.name}' for plugin '${pluginName}':`, error);
      }
    });

    this.registeredHooks.delete(pluginName);
  }

  /**
   * Execute a hook with the given parameters
   */
  async executeHook<T = unknown>(
    hookName: string,
    params: Record<string, unknown> = {},
    options: { timeout?: number; parallel?: boolean } = {}
  ): Promise<T[]> {
    const { timeout = 30000, parallel = false } = options;

    try {
      const hookExecutors = this.getHookExecutors(hookName);
      
      if (hookExecutors.length === 0) {
        return [];
      }

      if (parallel) {
        return await this.executeHooksInParallel(hookExecutors, params, timeout);
      } else {
        return await this.executeHooksSequentially(hookExecutors, params, timeout);
      }
    } catch (error) {
      throw createPluginError(
        PluginErrorCode.PLUGIN_HOOK_EXECUTION_FAILED,
        `Failed to execute hook '${hookName}': ${error instanceof Error ? error.message : String(error)}`,
        { hookName: hookName as string, context: { params }, originalError: error instanceof Error ? error : new Error(String(error)) }
      );
    }
  }

  /**
   * Execute a typed hook
   */
  async executeTypedHook<TInput = unknown, TOutput = unknown>(
    hookType: string,
    input: TInput
  ): Promise<TOutput[]> {
    try {
      const hooks = this.typedHookRegistry.getHooks(hookType as HookName);
      const results: TOutput[] = [];
      
      for (const hook of hooks) {
        const result = await hook.handler(input);
        results.push(result as TOutput);
      }
      
      return results;
    } catch (error) {
      throw createPluginError(
        PluginErrorCode.PLUGIN_HOOK_EXECUTION_FAILED,
        `Failed to execute typed hook '${hookType}': ${error instanceof Error ? error.message : String(error)}`,
        { hookName: hookType as string, context: { input }, originalError: error instanceof Error ? error : new Error(String(error)) }
      );
    }
  }

  /**
   * Get all registered hooks for a plugin
   */
  getPluginHooks(pluginName: string): PluginHook[] {
    const hooks = this.registeredHooks.get(pluginName);
    return hooks ? Array.from(hooks) : [];
  }

  /**
   * Get all hooks by type
   */
  getHooksByType(hookType: string): PluginHook[] {
    const allHooks: PluginHook[] = [];
    
    Array.from(this.registeredHooks.values()).forEach(hooks => {
      Array.from(hooks).forEach(hook => {
        // Note: PluginHook interface doesn't have 'type' property
        // This method may need to be updated based on actual hook filtering logic
        allHooks.push(hook);
      });
    });
    
    return allHooks;
  }

  /**
   * Check if a hook is registered
   */
  isHookRegistered(hookName: string): boolean {
    return this.getHookExecutors(hookName).length > 0;
  }

  /**
   * Get hook execution statistics
   */
  getHookStats(): Record<string, { count: number; lastExecuted?: Date }> {
    const stats: Record<string, { count: number; lastExecuted?: Date }> = {};
    
    Array.from(this.registeredHooks.entries()).forEach(([pluginName, hooks]) => {
      Array.from(hooks).forEach(hook => {
        if (!stats[hook.name]) {
          stats[hook.name] = { count: 0 };
        }
        stats[hook.name].count++;
      });
    });
    
    return stats;
  }

  private async registerSingleHook(
    plugin: Plugin,
    hook: PluginHook,
    context: PluginContext
  ): Promise<void> {
    // Validate hook structure
    if (!hook.name || typeof hook.name !== 'string') {
      throw new Error('Hook name is required and must be a string');
    }

    if (!hook.handler || typeof hook.handler !== 'function') {
      throw new Error('Hook handler is required and must be a function');
    }

    // Register with event emitter
    const wrappedHandler = this.createWrappedHandler(plugin, hook, context);
    this.hookEventEmitter.on(hook.name, wrappedHandler as (data: unknown) => void);

    // Register with typed registry
    this.typedHookRegistry.register(hook);
  }

  private async unregisterSingleHook(pluginName: string, hook: PluginHook): Promise<void> {
    // Remove from event emitter - we need to track handlers to remove them properly
    // For now, we'll use a simple approach since PluginEventEmitter doesn't have removeAllListeners
    
    // Unregister from typed registry
    this.typedHookRegistry.unregister(hook.name, pluginName as PluginName);
  }

  private createWrappedHandler(
    plugin: Plugin,
    hook: PluginHook,
    context: PluginContext
  ): Function {
    return async (...args: unknown[]) => {
      try {
        const startTime = Date.now();
        const result = await hook.handler.call(context, ...args);
        const duration = Date.now() - startTime;
        
        // Log execution metrics
        context.logger.debug(`Hook '${hook.name}' executed in ${duration}ms`);
        
        return result;
      } catch (error) {
        context.logger.error(`Hook '${hook.name}' failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    };
  }

  private async registerTypedHook(hook: PluginHook, handler: Function): Promise<void> {
    // Register with typed registry using the hook name
    this.typedHookRegistry.register(hook);
  }

  private getHookExecutors(hookName: string): Function[] {
    // Get hooks from typed registry
    const hooks = this.typedHookRegistry.getHooks(hookName as HookName);
    return hooks.map(hook => hook.handler);
  }

  private async executeHooksInParallel<T>(
    executors: Function[],
    params: Record<string, unknown>,
    timeout: number
  ): Promise<T[]> {
    const promises = executors.map(executor => 
      Promise.race([
        executor(params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Hook execution timeout')), timeout)
        )
      ])
    );

    const results = await Promise.allSettled(promises);
    return results
      .filter((result): result is PromiseFulfilledResult<T> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  private async executeHooksSequentially<T>(
    executors: Function[],
    params: Record<string, unknown>,
    timeout: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (const executor of executors) {
      try {
        const result = await Promise.race([
          executor(params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Hook execution timeout')), timeout)
          )
        ]);
        results.push(result);
      } catch (error) {
        console.warn('Hook execution failed:', error);
        // Continue with other hooks
      }
    }
    
    return results;
  }
}