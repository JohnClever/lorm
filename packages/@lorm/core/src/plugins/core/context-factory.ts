// Plugin Context Factory for LORM Framework
// Creates and manages plugin execution contexts

import {
  PluginContext,
  PluginName,
  PluginInfo,
  PluginRuntimeAdapter,
  PluginConfig,
  PluginLogger,
  PluginCache,
  PluginFileSystem,
  PluginSecurity,
  PluginPerformance,
  PluginEventEmitter,
  PluginState,
  PluginLifecycle,
  PluginLifecycleManager,
  PluginDependencies,
  PluginDependencyManager,
  PluginDependency,
  DependencyCheckResult,
  DependencyResolutionResult,
  DependencyGraph,
  CompatibilityResult,
  Plugin,
  PluginSandbox,
  PluginTelemetry,
  PluginUtils,
  PluginCLI,
  PluginCommand,
  PluginHook,
  HookName,
  ConfigSchema,
  StrictRecord,
  PluginLifecycleState,
  PerformanceMetrics
} from '../types';

/**
 * Plugin Context Factory
 * 
 * Creates comprehensive plugin contexts with:
 * - Configuration management
 * - Logging and telemetry
 * - File system access
 * - Security and sandboxing
 * - Performance monitoring
 * - Event handling
 * - State management
 * - Dependency resolution
 * - CLI integration
 * - Utility functions
 */
export class PluginContextFactory {
  private readonly contextCache = new Map<PluginName, PluginContext>();
  private readonly configSchemas = new Map<PluginName, ConfigSchema<any>>();
  private readonly securityPolicies = new Map<PluginName, StrictRecord<string, unknown>>();
  private readonly configCache = new Map<string, any>();

  constructor(
    private readonly adapter: PluginRuntimeAdapter,
    private readonly pluginsDir: string
  ) {}

  /**
   * Create a plugin context
   */
  async createContext(
    pluginName: PluginName,
    pluginInfo: StrictRecord<string, unknown>,
    options: {
      enableSandbox?: boolean;
      securityPolicy?: StrictRecord<string, unknown>;
      configSchema?: ConfigSchema<any>;
      cacheEnabled?: boolean;
      telemetryEnabled?: boolean;
    } = {}
  ): Promise<PluginContext> {
    try {
      const logger = this.adapter.createLogger('PluginContextFactory');
      logger.debug(`Creating context for plugin: ${pluginName}`);

      // Check if context already exists
      const existingContext = this.contextCache.get(pluginName);
      if (existingContext) {
        return existingContext;
      }

      // Store configuration schema
      if (options.configSchema) {
        this.configSchemas.set(pluginName, options.configSchema);
      }

      // Store security policy
      if (options.securityPolicy) {
        this.securityPolicies.set(pluginName, options.securityPolicy);
      }

      // Create context components
      const config = await this.createPluginConfig(pluginName, options.configSchema);
      const pluginLogger = this.createPluginLogger(pluginName);
      const cache = this.createPluginCache(pluginName, options.cacheEnabled);
      const fileSystem = this.createPluginFileSystem(pluginName);
      const security = this.createPluginSecurity(pluginName, options.securityPolicy);
      const performance = this.createPluginPerformance(pluginName);
      const events = this.createPluginEvents(pluginName);
      const state = this.createPluginState(pluginName);
      const lifecycle = this.createPluginLifecycle(pluginName);
      const dependencies = this.createPluginDependencies(pluginName);
      const sandbox = this.createPluginSandbox(pluginName, options.enableSandbox);
      const telemetry = this.createPluginTelemetry(pluginName, options.telemetryEnabled);
      const utils = this.createPluginUtils(pluginName);
      const cli = this.createPluginCLI(pluginName);

      // Create the context
      const context: PluginContext = {
        plugin: this.createPluginInfo(pluginInfo),
        config,
        logger: pluginLogger,
        utils,
        cache,
        fileSystem,
        security,
        performance,
        events,
        state,
        lifecycle,
        dependencies,
        sandbox,
        telemetry,

        // Node.js modules (optional)
        cwd: this.adapter.environment.cwd,
        fs: this.adapter.environment.fs,
        path: this.adapter.environment.path,
        crypto: this.adapter.environment.crypto,
        http: this.adapter.environment.http,
        chalk: this.adapter.environment.chalk,

        // Configuration methods
        getConfig: (key?: string) => key ? config.get(key) : config.getAll(),
        setConfig: (key: string, value: unknown) => config.set(key, value)
      };

      // Cache the context
      this.contextCache.set(pluginName, context);

      logger.debug(`Created context for plugin: ${pluginName}`);

      return context;

    } catch (error) {
      const logger = this.adapter.createLogger('PluginContextFactory');
      logger.error(`Failed to create context for plugin ${pluginName}:`, error);
      throw error;
    }
  }

  /**
   * Create plugin info
   */
  private createPluginInfo(pluginInfo: StrictRecord<string, unknown>): PluginInfo {
    return {
      name: (pluginInfo.name as string) || 'unknown',
      version: (pluginInfo.version as string) || '1.0.0',
      description: (pluginInfo.description as string) || '',
      author: (pluginInfo.author as string) || '',
      license: pluginInfo.license as any,
      installed: true,
      enabled: true,
      size: 0,
      dependencies: [],
      commands: (pluginInfo.commands as any[]) || [],
      hooks: (pluginInfo.hooks as any[]) || [],
      keywords: (pluginInfo.keywords as string[]) || [],
      isPremium: (pluginInfo.isPremium as boolean) || false,
      marketplace: pluginInfo.marketplace as any,
      path: pluginInfo.path as string,
      installPath: pluginInfo.installPath as string,
      source: (pluginInfo.source as any) || 'local',
      gitUrl: pluginInfo.gitUrl as string,
      gitBranch: pluginInfo.gitBranch as string,
      npmPackage: pluginInfo.npmPackage as string,
      peerDependencies: (pluginInfo.peerDependencies as string[]) || [],
      engines: (pluginInfo.engines as Record<string, string>) || {}
    };
  }

  /**
   * Get existing context
   */
  getContext(pluginName: PluginName): PluginContext | undefined {
    return this.contextCache.get(pluginName);
  }

  /**
   * Remove context
   */
  async removeContext(pluginName: PluginName): Promise<void> {
    try {
      const context = this.contextCache.get(pluginName);
      if (context) {
        // Cleanup context resources
        await this.cleanupContext(context);
        
        // Remove from cache
        this.contextCache.delete(pluginName);
        this.configSchemas.delete(pluginName);
        this.securityPolicies.delete(pluginName);
        
        const logger = this.adapter.createLogger('PluginContextFactory');
        logger.debug(`Removed context for plugin: ${pluginName}`);
      }
    } catch (error) {
      const logger = this.adapter.createLogger('PluginContextFactory');
      logger.error(`Failed to remove context for plugin ${pluginName}:`, error);
    }
  }

  /**
   * Create plugin configuration
   */
  private async createPluginConfig(pluginName: PluginName, schema?: ConfigSchema<any>): Promise<PluginConfig> {
    const configKey = `plugins.${pluginName}`;
    
    return {
        get: (key?: string) => {
          const config = this.configCache.get(pluginName) as Record<string, unknown> || {};
          if (key) {
            const keyPath = `${configKey}.${key}`.split('.');
            let value: any = config;
            for (const k of keyPath) {
              value = value?.[k];
            }
            return value;
          }
          const keyPath = configKey.split('.');
          let value: any = config;
          for (const k of keyPath) {
            value = value?.[k];
          }
          return value || {};
        },
        
        set: async (key: string, value: unknown) => {
          const config: any = await this.adapter.loadConfig(`${pluginName}.json`) || {};
          const keyPath = `${configKey}.${key}`.split('.');
          let current = config;
          for (let i = 0; i < keyPath.length - 1; i++) {
            const k = keyPath[i];
            if (!current[k] || typeof current[k] !== 'object') {
              current[k] = {};
            }
            current = current[k];
          }
          current[keyPath[keyPath.length - 1]] = value;
          await this.adapter.saveConfig(`${pluginName}.json`, config);
          this.configCache.set(pluginName, config);
        },
        
        has: (key: string) => {
          const config = this.configCache.get(pluginName) as Record<string, unknown> || {};
          const keyPath = `${configKey}.${key}`.split('.');
          let value: any = config;
          for (const k of keyPath) {
            if (value?.[k] === undefined) return false;
            value = value[k];
          }
          return true;
        },
        
        delete: async (key: string) => {
          const config = await this.adapter.loadConfig(`${pluginName}.json`) as Record<string, unknown> || {};
          const keyPath = `${configKey}.${key}`.split('.');
          let current: any = config;
          for (let i = 0; i < keyPath.length - 1; i++) {
            const k = keyPath[i];
            if (!current[k]) return;
            current = current[k];
          }
          delete current[keyPath[keyPath.length - 1]];
          await this.adapter.saveConfig(`${pluginName}.json`, config);
          this.configCache.set(pluginName, config);
        },
        
        getAll: () => {
          const config = this.configCache.get(pluginName) || {};
          return config as Readonly<StrictRecord<string, unknown>>;
        },
      
      validate: (config: Partial<StrictRecord<string, unknown>>) => {
        if (!schema) {
          return { valid: true };
        }
        
        // Basic validation against schema
        const validationErrors: Array<{ field: string; message: string; code: string }> = [];
        
        for (const [key, schemaProperty] of Object.entries(schema.properties || {})) {
          const value = config[key];
          
          // Check required properties
          if (schemaProperty.required && (value === undefined || value === null)) {
            validationErrors.push({
              field: key,
              message: `Required property '${key}' is missing`,
              code: 'REQUIRED_FIELD_MISSING'
            });
            continue;
          }
          
          // Check type
          if (value !== undefined && schemaProperty.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== schemaProperty.type) {
              validationErrors.push({
                field: key,
                message: `Property '${key}' should be of type '${schemaProperty.type}', got '${actualType}'`,
                code: 'INVALID_TYPE'
              });
            }
          }
          
          // Check enum values
          if (value !== undefined && schemaProperty.enum && !schemaProperty.enum.includes(value)) {
            validationErrors.push({
              field: key,
              message: `Property '${key}' should be one of: ${schemaProperty.enum.join(', ')}`,
              code: 'INVALID_ENUM_VALUE'
            });
          }
          
          // Check minimum/maximum for numbers
          if (typeof value === 'number' && schemaProperty.type === 'number') {
            if (schemaProperty.minimum !== undefined && value < schemaProperty.minimum) {
              validationErrors.push({
                field: key,
                message: `Property '${key}' should be >= ${schemaProperty.minimum}`,
                code: 'VALUE_TOO_SMALL'
              });
            }
            if (schemaProperty.maximum !== undefined && value > schemaProperty.maximum) {
              validationErrors.push({
                field: key,
                message: `Property '${key}' should be <= ${schemaProperty.maximum}`,
                code: 'VALUE_TOO_LARGE'
              });
            }
          }
        }
        
        return {
          valid: validationErrors.length === 0,
          errors: validationErrors.length > 0 ? validationErrors : undefined
        };
      },
      
      watch: (key: string, callback: (newValue: unknown, oldValue: unknown) => void) => {
        // Simple implementation - in a real scenario this would watch for file changes
        const watchKey = `${configKey}.${key}`;
        let lastValue: unknown;
        
        const interval = setInterval(async () => {
          const config = await this.adapter.loadConfig(`${pluginName}.json`) as Record<string, unknown> || {};
          const keyPath = watchKey.split('.');
          let currentValue: any = config;
          
          for (const part of keyPath) {
            if (currentValue && typeof currentValue === 'object') {
              currentValue = currentValue[part];
            } else {
              currentValue = undefined;
              break;
            }
          }
          if (currentValue !== lastValue) {
            const oldValue = lastValue;
            lastValue = currentValue;
            callback(currentValue, oldValue);
          }
        }, 1000);
        
        return () => clearInterval(interval);
      },
      
      unwatch: async (key: string) => {
        // Simple implementation - remove watchers
      },
      
      reset: async () => {
        const config = await this.adapter.loadConfig(`${pluginName}.json`) || {};
        const keyPath = configKey.split('.');
        let current = config as Record<string, any>;
        for (let i = 0; i < keyPath.length - 1; i++) {
          const k = keyPath[i];
          if (!current[k]) return;
          current = current[k] as Record<string, any>;
        }
        delete current[keyPath[keyPath.length - 1]];
        await this.adapter.saveConfig(`${pluginName}.json`, config);
        this.configCache.delete(pluginName);
      },
      
      backup: async () => {
        const config = await this.adapter.loadConfig(`${pluginName}.json`) as Record<string, unknown> || {};
        return JSON.stringify(config);
      },
      
      restore: async (backup: string) => {
        try {
          const config = JSON.parse(backup) as Record<string, unknown>;
          await this.adapter.saveConfig(`${pluginName}.json`, config);
          this.configCache.set(pluginName, config);
        } catch (error) {
          throw new Error('Invalid backup data');
        }
      },
      
      schema,
      defaults: {},
      version: '1.0.0',
      lastModified: new Date()
    };
  }

  /**
   * Create plugin logger
   */
  private createPluginLogger(pluginName: PluginName): PluginLogger {
    return {
      debug: (message: string, ...args: unknown[]) => {
        const logger = this.adapter.createLogger(pluginName);
        logger.debug(message, ...args);
      },
      
      info: (message: string, ...args: unknown[]) => {
        const logger = this.adapter.createLogger(pluginName);
        logger.info(message, ...args);
      },
      
      warn: (message: string, ...args: unknown[]) => {
          const logger = this.adapter.createLogger(pluginName);
          logger.warn(message, ...args);
        },
        
        error: (message: string, ...args: unknown[]) => {
          const logger = this.adapter.createLogger(pluginName);
          logger.error(message, ...args);
        },
        
        trace: (message: string, ...args: unknown[]) => {
          const logger = this.adapter.createLogger(pluginName);
          logger.trace(message, ...args);
        },
        
        child: (metadata: Record<string, unknown>) => {
           // Create a child logger with additional metadata
           const childLogger = this.adapter.createLogger(pluginName);
           return {
             debug: (message: string, ...args: unknown[]) => {
               childLogger.debug(`[${Object.keys(metadata).join(':')}] ${message}`, ...args);
             },
             info: (message: string, ...args: unknown[]) => {
               childLogger.info(`[${Object.keys(metadata).join(':')}] ${message}`, ...args);
             },
             warn: (message: string, ...args: unknown[]) => {
               childLogger.warn(`[${Object.keys(metadata).join(':')}] ${message}`, ...args);
             },
             error: (message: string, ...args: unknown[]) => {
               childLogger.error(`[${Object.keys(metadata).join(':')}] ${message}`, ...args);
             },
             trace: (message: string, ...args: unknown[]) => {
               childLogger.trace(`[${Object.keys(metadata).join(':')}] ${message}`, ...args);
             },
             child: (childMetadata: Record<string, unknown>) => {
               const combinedMetadata = { ...metadata, ...childMetadata };
               return this.createPluginLogger(pluginName).child(combinedMetadata);
             }
           };
         }
    };
  }

  /**
   * Create plugin cache
   */
  private createPluginCache(pluginName: PluginName, enabled = true): PluginCache {
    const cachePrefix = `plugin:${pluginName}:`;
    // Simple in-memory cache implementation since adapter doesn't provide cache
    const cache = new Map<string, { value: any; expires?: number }>();
    
    return {
      get: async (key: string) => {
        if (!enabled) return undefined;
        const fullKey = `${cachePrefix}${key}`;
        const item = cache.get(fullKey);
        if (!item) return undefined;
        
        if (item.expires && Date.now() > item.expires) {
          cache.delete(fullKey);
          return undefined;
        }
        
        return item.value;
      },
      
      set: async (key: string, value: unknown, ttl?: number) => {
        if (!enabled) return;
        const fullKey = `${cachePrefix}${key}`;
        const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
        cache.set(fullKey, { value, expires });
      },
      
      has: async (key: string) => {
        if (!enabled) return false;
        const fullKey = `${cachePrefix}${key}`;
        const item = cache.get(fullKey);
        if (!item) return false;
        
        if (item.expires && Date.now() > item.expires) {
          cache.delete(fullKey);
          return false;
        }
        
        return true;
      },
      
      delete: async (key: string) => {
        if (!enabled) return;
        const fullKey = `${cachePrefix}${key}`;
        cache.delete(fullKey);
      },
      
      clear: async () => {
        if (!enabled) return;
        const keysToDelete = Array.from(cache.keys()).filter(k => k.startsWith(cachePrefix));
        keysToDelete.forEach(k => cache.delete(k));
      },
      
      keys: async () => {
        if (!enabled) return [];
        return Array.from(cache.keys()).filter(k => k.startsWith(cachePrefix)).map(k => k.substring(cachePrefix.length));
      }
    };
  }

  /**
   * Create plugin file system
   */
  private createPluginFileSystem(pluginName: PluginName): PluginFileSystem {
    const pluginDir = this.adapter.environment.path.join(this.pluginsDir, pluginName);
    
    return {
      readFile: async (path: string) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        return this.adapter.environment.fs.readFile(fullPath, 'utf8');
      },
      
      writeFile: async (path: string, content: string) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        await this.adapter.environment.fs.writeFile(fullPath, content, 'utf8');
      },
      
      exists: async (path: string) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        try {
          await this.adapter.environment.fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
      },
      
      mkdir: async (path: string, recursive?: boolean) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        await this.adapter.environment.fs.mkdir(fullPath, { recursive: recursive ?? true });
      },
      
      rmdir: async (path: string, recursive?: boolean) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        await this.adapter.environment.fs.rmdir(fullPath, { recursive: recursive ?? true });
      },
      
      readdir: async (path: string) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        return this.adapter.environment.fs.readdir(fullPath);
      },
      
      stat: async (path: string) => {
        const fullPath = this.adapter.environment.path.resolve(pluginDir, path);
        this.validatePluginPath(fullPath, pluginDir);
        const stats = await this.adapter.environment.fs.stat(fullPath);
        return {
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          mtime: stats.mtime
        };
      }
    };
  }

  /**
   * Create plugin security
   */
  private createPluginSecurity(pluginName: PluginName, policy?: StrictRecord<string, unknown>): PluginSecurity {
    const crypto = this.adapter.environment.crypto;
    const logger = this.adapter.logger;

    return {
      checkPermission: (permission: string): boolean => {
        // Check against security policy
        if (policy && policy.permissions) {
          const allowedPermissions = policy.permissions as string[];
          return allowedPermissions.includes(permission);
        }
        
        // Default: allow all permissions
        return true;
      },

      requestPermission: async (permission: string, reason?: string): Promise<boolean> => {
        logger?.info(`Requesting permission: ${permission}${reason ? ` (${reason})` : ''}`);
        return true; // Simplified for now
      },

      revokePermission: async (permission: string): Promise<void> => {
        logger?.info(`Revoking permission: ${permission}`);
      },

      listPermissions: (): readonly any[] => {
        return []; // Return empty array for now
      },

      sanitizeInput: (input: string, options?: any): string => {
        // Basic sanitization - remove potentially dangerous characters
        return input.replace(/[<>"'&]/g, '');
      },

      validatePath: (path: string, allowedPaths?: readonly string[]): boolean => {
        // Basic path validation
        if (path.includes('..') || path.includes('~')) {
          return false;
        }
        if (allowedPaths && !allowedPaths.some(allowed => path.startsWith(allowed))) {
          return false;
        }
        return true;
      },

      encryptData: async (data: string, algorithm?: any): Promise<string> => {
        // Use available crypto methods - createHash for basic encryption simulation
        const hash = crypto.createHash('sha256');
        hash.update(data + 'secret-salt');
        return hash.digest('hex');
      },

      decryptData: async (encryptedData: string, algorithm?: any): Promise<string> => {
        // Simplified decryption - in real implementation would use proper decryption
        logger?.warn('Decryption not fully implemented - returning original data');
        return encryptedData;
      },

      hashData: async (data: string, algorithm?: any): Promise<string> => {
        const hash = crypto.createHash(algorithm || 'sha256');
        hash.update(data);
        return hash.digest('hex');
      },

      verifySignature: async (data: string, signature: string, publicKey: string): Promise<boolean> => {
        // Simplified signature verification
        logger?.debug(`Verifying signature for data: ${data}`);
        return true; // Simplified for now
      },

      createSecureToken: async (payload: Record<string, unknown>, expiresIn?: number): Promise<string> => {
        const tokenData = JSON.stringify({ ...payload, exp: Date.now() + (expiresIn || 3600000) });
        return Buffer.from(tokenData).toString('base64');
      },

      verifySecureToken: async (token: string): Promise<Record<string, unknown> | null> => {
        try {
          const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
          if (tokenData.exp && Date.now() > tokenData.exp) {
            return null; // Token expired
          }
          return tokenData;
        } catch {
          return null;
        }
      },

      auditLog: async (action: string, details?: Record<string, unknown>): Promise<void> => {
        logger?.info(`Security audit: ${action}`, details);
      },

      getSecurityReport: async (): Promise<any> => {
        return {
          permissions: [],
          violations: [],
          lastAudit: new Date(),
          riskLevel: 'low'
        };
      }
    };
  }

  /**
   * Create plugin performance monitor
   */
  private createPluginPerformance(pluginName: PluginName): PluginPerformance {
    const timers = new Map<string, number>();
    const marks = new Map<string, number>();
    
    return {
      mark: (name: string) => {
        marks.set(name, Date.now());
      },
      
      measure: (name: string, startMark?: string, endMark?: string) => {
        const startTime = startMark ? marks.get(startMark) : Date.now();
        const endTime = endMark ? marks.get(endMark) : Date.now();
        
        if (startTime && endTime) {
          const duration = endTime - startTime;
          this.adapter.logger?.debug(`[${pluginName}] Measure '${name}': ${duration}ms`);
          return duration;
        }
        return 0;
      },
      
      getMetrics: (): PerformanceMetrics => {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
          marks: Object.fromEntries(marks),
          measures: {},
          memory: {
            used: memUsage.heapUsed,
            total: memUsage.rss,
            peak: memUsage.heapTotal
          },
          cpu: {
            usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert microseconds to milliseconds
            time: (cpuUsage.user + cpuUsage.system) / 1000 // Convert microseconds to milliseconds
          }
        };
      },
      
      startTimer: (name: string) => {
        const startTime = Date.now();
        timers.set(name, startTime);
        return () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          timers.delete(name);
          this.adapter.logger?.debug(`[${pluginName}] Timer '${name}': ${duration}ms`);
          return duration;
        };
      },
      
      profile: <T>(name: string, fn: () => T): T => {
        const startTime = Date.now();
        try {
          const result = fn();
          const duration = Date.now() - startTime;
          this.adapter.logger?.debug(`[${pluginName}] Profile '${name}': ${duration}ms`);
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          this.adapter.logger?.debug(`[${pluginName}] Profile '${name}' (error): ${duration}ms`);
          throw error;
        }
      },
      
      profileAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
        const startTime = Date.now();
        try {
          const result = await fn();
          const duration = Date.now() - startTime;
          this.adapter.logger?.debug(`[${pluginName}] Profile async '${name}': ${duration}ms`);
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          this.adapter.logger?.debug(`[${pluginName}] Profile async '${name}' (error): ${duration}ms`);
          throw error;
        }
      }
    };
  }
  
  private getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
  }

  /**
   * Create plugin events
   */
  private createPluginEvents(pluginName: PluginName): PluginEventEmitter {
    const eventPrefix = `plugin:${pluginName}:`;
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    
    const events: PluginEventEmitter = {
      emit: (event: string, ...args: unknown[]): void => {
        this.adapter.emit(`${eventPrefix}${event}`, ...args);
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          for (const listener of eventListeners) {
            try {
              listener(...args);
            } catch (error) {
              console.error(`Error in event listener for ${event}:`, error);
            }
          }
        }
      },
      
      on: (event: string, listener: (...args: unknown[]) => void): void => {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event)!.add(listener);
        this.adapter.on(`${eventPrefix}${event}`, listener);
      },
      
      off: (event: string, listener: (...args: unknown[]) => void): void => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.delete(listener);
          if (eventListeners.size === 0) {
            listeners.delete(event);
          }
        }
        this.adapter.off(`${eventPrefix}${event}`, listener);
      },
      
      once: (event: string, listener: (...args: unknown[]) => void): void => {
        const onceWrapper = (...args: unknown[]) => {
          events.off(event, onceWrapper);
          listener(...args);
        };
        events.on(event, onceWrapper);
      },
      
      listenerCount: (event: string): number => {
        const eventListeners = listeners.get(event);
        return eventListeners ? eventListeners.size : 0;
      },
      
      removeAllListeners: (event?: string): void => {
        if (event) {
          listeners.delete(event);
        } else {
          listeners.clear();
        }
      }
    };
    
    return events;
  }

  /**
   * Create plugin state
   */
  private createPluginState(pluginName: PluginName): PluginState {
    const stateKey = `plugin:${pluginName}:state`;
    
    return {
      get: <T>(key?: string): T | undefined => {
        const state = this.adapter.state?.get(stateKey) || {};
        return key ? (state as Record<string, unknown>)[key] as T : state as T;
      },
      
      set: async <T>(key: string, value: T): Promise<void> => {
        const state = this.adapter.state?.get(stateKey) || {};
        (state as Record<string, unknown>)[key] = value;
        await this.adapter.state?.set(stateKey, state);
      },
      
      delete: async (key: string): Promise<void> => {
        const state = this.adapter.state?.get(stateKey) || {};
        delete (state as Record<string, unknown>)[key];
        await this.adapter.state?.set(stateKey, state);
      },
      
      clear: async (): Promise<void> => {
        await this.adapter.state?.delete(stateKey);
      },
      
      has: (key: string): boolean => {
        const state = this.adapter.state?.get(stateKey) as Record<string, unknown> | undefined;
        return state ? key in state : false;
      },
      
      keys: (): string[] => {
        const state = this.adapter.state?.get(stateKey) || {};
        return Object.keys(state);
      },
      
      size: (() => {
        const state = this.adapter.state?.get(stateKey) || {};
        return Object.keys(state).length;
      })()
    };
  }

  /**
   * Create plugin lifecycle
   */
  private createPluginLifecycle(pluginName: PluginName): PluginLifecycleManager<any> {
    return {
      getCurrentState: () => {
        return this.adapter.lifecycle?.getCurrentState() || PluginLifecycleState.UNLOADED;
      },
      
      getState: () => {
        return this.adapter.lifecycle?.getState() || PluginLifecycleState.UNLOADED;
      },
      
      transition: async (newState) => {
        await this.adapter.lifecycle?.transition(newState);
      },
      
      onStateChange: (callback) => {
        return this.adapter.lifecycle?.onStateChange(callback) || (() => {});
      },
      
      executeLifecycleHook: async (hook, ...args) => {
        await this.adapter.lifecycle?.executeLifecycleHook(hook, ...args);
      }
    };
  }

  /**
   * Create plugin dependencies
   */
  private createPluginDependencies(pluginName: PluginName): PluginDependencyManager {
    return {
      resolve: async (dependencies: readonly PluginDependency[]): Promise<DependencyResolutionResult> => {
        return {
          resolved: dependencies,
          missing: [],
          conflicts: [],
          installOrder: []
        };
      },
      
      check: async (dependency: PluginDependency): Promise<DependencyCheckResult> => {
        return {
          satisfied: true,
          version: '1.0.0',
          reason: 'Available'
        };
      },
      
      install: async (dependency: PluginDependency) => {
        // Implementation for installing dependency
      },
      
      uninstall: async (dependency: PluginDependency) => {
        // Implementation for uninstalling dependency
      },
      
      getDependencyGraph: (): DependencyGraph => {
        return {
          nodes: [],
          edges: [],
          cycles: []
        };
      },
      
      validateCompatibility: async (plugin: Plugin) => {
        return {
          compatible: true,
          issues: [],
          recommendations: []
        };
      },
      
      getConflicts: () => {
        return [];
      }
    };
  }

  /**
   * Create plugin sandbox
   */
  private createPluginSandbox(pluginName: PluginName, enabled = false): PluginSandbox {
    return {
      execute: async <T>(code: string, context?: StrictRecord<string, unknown>) => {
        if (!enabled) {
          throw new Error('Sandbox is not enabled for this plugin');
        }
        return this.adapter.sandbox?.execute?.(code, context) as T;
      },
      
      createContext: (permissions: readonly string[]) => {
        if (!enabled) {
          throw new Error('Sandbox is not enabled for this plugin');
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          permissions,
          globals: {},
          limits: {
            maxMemory: 100 * 1024 * 1024, // 100MB
            maxCpu: 80,
            maxExecutionTime: 30000, // 30 seconds
            maxApiCalls: 1000,
            allowedModules: [],
            blockedModules: []
          },
          createdAt: new Date()
        };
      },
        
        destroyContext: async (contextId: string) => {
          if (enabled) {
            // Implementation for destroying context
          }
        },
        
        getResourceUsage: () => ({
          memory: 0,
          cpu: 0,
          executionTime: 0,
          apiCalls: 0
        }),
        
        setLimits: (limits) => {
          // Implementation for setting limits
        },
        
        getLimits: () => ({
          maxMemory: 100 * 1024 * 1024,
          maxCpu: 80,
          maxExecutionTime: 30000,
          maxApiCalls: 1000,
          allowedModules: [],
          blockedModules: []
        }),
        
        isSecure: () => enabled
    };
  }

  /**
   * Create plugin telemetry
   */
  private createPluginTelemetry(pluginName: PluginName, enabled = true): PluginTelemetry {
    return {
      track: (event: string, properties?: StrictRecord<string, unknown>) => {
        if (!enabled) return;
        this.adapter.telemetry?.track?.(event, properties);
      },
      
      identify: (userId: string, traits?: StrictRecord<string, unknown>) => {
        if (!enabled) return;
        this.adapter.telemetry?.identify?.(userId, traits);
      },
      
      group: (groupId: string, traits?: StrictRecord<string, unknown>) => {
        if (!enabled) return;
        this.adapter.telemetry?.group?.(groupId, traits);
      },
      
      page: (name: string, properties?: StrictRecord<string, unknown>) => {
        if (!enabled) return;
        this.adapter.telemetry?.page?.(name, properties);
      },
      
      flush: async () => {
        if (!enabled) return;
        await this.adapter.telemetry?.flush?.();
      },
      
      increment: (metric: string, value = 1) => {
        if (!enabled) return;
        this.adapter.telemetry?.increment?.(metric, value);
      },
      
      gauge: (metric: string, value: number) => {
        if (!enabled) return;
        this.adapter.telemetry?.gauge?.(metric, value);
      },
      
      timing: (metric: string, duration: number) => {
        if (!enabled) return;
        this.adapter.telemetry?.timing?.(metric, duration);
      },
      
      createSpan: (name: string, metadata?: Record<string, unknown>) => {
        return {
          setTag: (key: string, value: string | number | boolean) => {},
          setError: (error: Error) => {},
          finish: () => {},
          getDuration: () => 0
        };
      },
      
      recordMetric: (name: string, value: number, tags?: Record<string, string>) => {
        if (!enabled) return;
        this.adapter.telemetry?.gauge?.(name, value);
      },
      
      recordEvent: (name: string, data?: Record<string, unknown>) => {
        if (!enabled) return;
        this.adapter.telemetry?.track?.(name, data);
      },
      
      configure: (config) => {
        // Implementation for configuring telemetry
      }
    };
  }

  /**
   * Create plugin utilities
   */
  private createPluginUtils(pluginName: PluginName): PluginUtils {
    return {
      executeHook: async (hookName: HookName, ...args: unknown[]) => {
        return this.adapter.utils?.executeHook?.(hookName, ...args) || [];
      },
      
      validateConfig: <T extends StrictRecord<string, unknown>>(config: T, schema?: ConfigSchema<T>) => {
        const configSchema = schema || this.configSchemas.get(pluginName);
        if (!configSchema) {
          return { valid: true, errors: [] };
        }
        
        // Simple validation - in a real implementation this would be more sophisticated
        return { valid: true, errors: [] };
      },
      
      createCommand: (command: Omit<PluginCommand, 'pluginName'>) => {
        if (!this.adapter.utils?.createCommand) {
          throw new Error('Utils adapter not available');
        }
        return this.adapter.utils.createCommand(command);
      },
      
      createHook: (hook: Omit<PluginHook, 'pluginName'>) => {
        if (!this.adapter.utils?.createHook) {
          throw new Error('Utils adapter not available');
        }
        return this.adapter.utils.createHook(hook);
      }
    };
  }

  /**
   * Create plugin CLI
   */
  private createPluginCLI(pluginName: PluginName): PluginCLI {
    return {
      command: (name: string) => {
        return this.adapter.cli?.command(name) || null;
      },
      
      option: (flags: string, description?: string, defaultValue?: unknown) => {
        return this.adapter.cli?.option(flags, description, defaultValue) || null;
      },
      
      argument: (name: string, description?: string, defaultValue?: unknown) => {
        return this.adapter.cli?.argument(name, description, defaultValue) || null;
      },
      
      action: (handler: (...args: unknown[]) => unknown) => {
        return this.adapter.cli?.action(handler) || null;
      },
      
      parse: (argv?: string[]) => {
        return this.adapter.cli?.parse(argv) || null;
      },
      
      help: () => {
        return this.adapter.cli?.help() || '';
      }
    };
  }

  /**
   * Validate plugin path security
   */
  private validatePluginPath(fullPath: string, pluginDir: string): void {
    const normalizedPath = this.adapter.path?.normalize(fullPath) || fullPath;
    const normalizedPluginDir = this.adapter.path?.normalize(pluginDir) || pluginDir;
    
    if (!normalizedPath.startsWith(normalizedPluginDir)) {
      throw new Error(`Path '${fullPath}' is outside plugin directory`);
    }
  }

  /**
   * Cleanup context resources
   */
  private async cleanupContext(context: PluginContext): Promise<void> {
    try {
      // Clear cache
      if (context.cache) {
        await context.cache.clear();
      }
      
      // Clear state
      if (context.state) {
        await context.state.clear();
      }
      
      // Remove event listeners
      // Note: This would require tracking listeners, which is not implemented here
      
    } catch (error) {
      this.adapter.logger?.error('Failed to cleanup context resources:', error);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup all contexts
      for (const [pluginName] of this.contextCache) {
        await this.removeContext(pluginName);
      }
      
      this.adapter.logger?.info('Plugin context factory cleaned up');
    } catch (error) {
      this.adapter.logger?.error('Failed to cleanup plugin context factory:', error);
    }
  }
}