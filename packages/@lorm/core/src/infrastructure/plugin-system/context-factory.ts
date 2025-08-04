import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type {
  IPlugin,
  PluginLoaderContext,
  PluginOperationContext,
  TypedCacheInstance,
  TypedSandboxInstance,
  TypedCommandSystemInstance,
  TypedPerformanceMonitorInstance
} from './types.js';
import type { PluginContext, PluginPermissions } from '../security/index.js';
import { ProjectScopedCache } from '../cache/cache-manager.js';
import { SecurityManager } from '../security/security-manager.js';
import { PerformanceManager } from '../performance/manager.js';

/**
 * Project detector for identifying project type and configuration
 */
class ProjectDetector {
  async detectProject(projectPath: string) {
    const packageJsonPath = join(projectPath, 'package.json');
    let packageJson: Record<string, unknown> | undefined;
    
    try {
      if (existsSync(packageJsonPath)) {
        const content = await readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(content);
      }
    } catch (error) {
      // Ignore package.json parsing errors
    }
    
    const projectType = this.detectProjectType(projectPath, packageJson);
    const framework = this.detectFramework(packageJson);
    const language = this.detectLanguage(projectPath, packageJson);
    
    return {
      root: resolve(projectPath),
      type: projectType,
      packageJson,
      framework,
      language
    };
  }
  
  private detectProjectType(
    projectPath: string,
    packageJson?: Record<string, unknown>
  ): 'mobile' | 'library' | 'unknown' {
    // Check for mobile indicators
    if (existsSync(join(projectPath, 'android')) || 
        existsSync(join(projectPath, 'ios')) ||
        existsSync(join(projectPath, 'app.json')) ||
        existsSync(join(projectPath, 'expo.json'))) {
      return 'mobile';
    }
    
    // Check for library indicators
    if (packageJson) {
      const scripts = packageJson.scripts as Record<string, string> || {};
      const devDeps = packageJson.devDependencies as Record<string, string> || {};
      
      if (scripts.build || scripts.compile || devDeps.typescript || devDeps.rollup) {
        return 'library';
      }
    }
    
    return 'unknown';
  }
  
  private detectFramework(packageJson?: Record<string, unknown>): string | undefined {
    if (!packageJson) return undefined;
    
    const deps = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {})
    };
    
    if (deps.react || deps['react-native']) return 'react';
    if (deps.vue) return 'vue';
    if (deps.angular || deps['@angular/core']) return 'angular';
    if (deps.svelte) return 'svelte';
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';
    if (deps.expo) return 'expo';
    
    return undefined;
  }
  
  private detectLanguage(
    projectPath: string,
    packageJson?: Record<string, unknown>
  ): string | undefined {
    // Check for TypeScript
    if (existsSync(join(projectPath, 'tsconfig.json')) ||
        (packageJson?.devDependencies as Record<string, string> | undefined)?.typescript) {
      return 'typescript';
    }
    
    // Default to JavaScript for Node.js projects
    if (packageJson) {
      return 'javascript';
    }
    
    return undefined;
  }
}

/**
 * Command system implementation for plugin context
 */
class PluginCommandSystem implements TypedCommandSystemInstance {
  private commands = new Map<string, any>();
  
  register(command: any): void {
    this.commands.set(command.name, command);
  }
  
  getCommand(name: string): any | undefined {
    return this.commands.get(name);
  }
  
  getAllCommands(): any[] {
    return Array.from(this.commands.values());
  }
}

/**
 * Plugin Context Factory for centralized context creation
 */
export class PluginContextFactory {
  private projectDetector: ProjectDetector;
  private cacheManager?: ProjectScopedCache;
  private securityManager?: SecurityManager;
  private performanceManager?: PerformanceManager;
  
  constructor(
    cacheManager?: ProjectScopedCache,
    securityManager?: SecurityManager,
    performanceManager?: PerformanceManager
  ) {
    this.projectDetector = new ProjectDetector();
    this.cacheManager = cacheManager;
    this.securityManager = securityManager;
    this.performanceManager = performanceManager;
  }
  
  /**
   * Create plugin loader context for initializing the plugin system
   */
  async createLoaderContext(projectPath: string): Promise<PluginLoaderContext> {
    const projectContext = await this.projectDetector.detectProject(projectPath);
    const config = await this.loadPluginConfiguration(projectPath);
    
    // Initialize managers if not provided
    if (!this.cacheManager) {
      this.cacheManager = new ProjectScopedCache(projectPath, {
        enabled: true,
        strategy: 'hybrid',
        ttl: 3600000,
        maxSize: 100
      });
    }
    if (!this.securityManager) {
      this.securityManager = new SecurityManager(projectPath);
    }
    if (!this.performanceManager) {
      this.performanceManager = PerformanceManager.getInstance();
    }
    
    return {
      projectContext,
      config,
      cache: this.createCacheInstance(),
      sandbox: this.createSandboxInstance(),
      commandSystem: this.createCommandSystem(),
      performanceMonitor: this.createPerformanceMonitor()
    };
  }
  
  /**
   * Create plugin context for individual plugin operations
   */
  async createPluginContext(
    plugin: IPlugin,
    permissions?: PluginPermissions
  ): Promise<PluginContext> {
    const workingDirectory = process.cwd();
    const tempDirectory = await this.getTempDirectory();
    const configDirectory = await this.getConfigDirectory();
    const cacheDirectory = await this.getCacheDirectory();
    
    return {
      pluginId: plugin.metadata.id,
      pluginName: plugin.metadata.name,
      version: plugin.metadata.version,
      permissions: permissions || this.getDefaultPermissions(),
      workingDirectory,
      tempDirectory,
      configDirectory,
      cacheDirectory
    };
  }
  
  /**
   * Create operation context for plugin operations
   */
  async createOperationContext(
    plugin: IPlugin,
    permissions?: PluginPermissions
  ): Promise<PluginOperationContext> {
    const workingDirectory = process.cwd();
    const tempDirectory = await this.getTempDirectory();
    const configDirectory = await this.getConfigDirectory();
    const cacheDirectory = await this.getCacheDirectory();
    
    return {
      pluginId: plugin.metadata.id,
      pluginName: plugin.metadata.name,
      version: plugin.metadata.version,
      permissions: permissions || this.getDefaultPermissions(),
      workingDirectory,
      tempDirectory,
      configDirectory,
      cacheDirectory
    };
  }
  
  /**
   * Load plugin configuration from project
   */
  private async loadPluginConfiguration(projectPath: string) {
    const configPaths = [
      join(projectPath, '.lormrc.json'),
      join(projectPath, '.lorm.json'),
      join(projectPath, 'lorm.config.json')
    ];
    
    for (const configPath of configPaths) {
      try {
        if (existsSync(configPath)) {
          const content = await readFile(configPath, 'utf-8');
          const config = JSON.parse(content);
          return this.normalizePluginConfig(config);
        }
      } catch (error) {
        // Continue to next config file
      }
    }
    
    // Return default configuration
    return this.getDefaultPluginConfig();
  }
  
  /**
   * Normalize plugin configuration
   */
  private normalizePluginConfig(config: any) {
    return {
      plugins: {
        builtin: config.plugins?.builtin || [],
        npm: config.plugins?.npm || {},
        local: config.plugins?.local || [],
        marketplace: config.plugins?.marketplace || {}
      },
      cache: {
        enabled: config.cache?.enabled ?? true,
        strategy: config.cache?.strategy || 'hybrid',
        ttl: config.cache?.ttl || 3600000, // 1 hour
        maxSize: config.cache?.maxSize || 100
      },
      performance: {
        monitoring: config.performance?.monitoring ?? true,
        profiling: config.performance?.profiling ?? false
      },
      security: {
        sandboxing: config.security?.sandboxing ?? true,
        allowedPaths: config.security?.allowedPaths || [],
        allowedNetworkHosts: config.security?.allowedNetworkHosts || []
      }
    };
  }
  
  /**
   * Get default plugin configuration
   */
  private getDefaultPluginConfig() {
    return {
      plugins: {
        builtin: [],
        npm: {},
        local: [],
        marketplace: {}
      },
      cache: {
        enabled: true,
        strategy: 'hybrid' as const,
        ttl: 3600000, // 1 hour
        maxSize: 100
      },
      performance: {
        monitoring: true,
        profiling: false
      },
      security: {
        sandboxing: true,
        allowedPaths: [],
        allowedNetworkHosts: []
      }
    };
  }
  
  /**
   * Create typed cache instance
   */
  private createCacheInstance(): TypedCacheInstance {
    if (this.cacheManager) {
      return {
        get: <T>(key: string) => this.cacheManager!.get<T>(key),
        set: <T>(key: string, value: T, ttl?: number) => this.cacheManager!.set(key, value, ttl),
        delete: (key: string) => this.cacheManager!.delete(key),
        clear: () => this.cacheManager!.clear(),
        has: (key: string) => this.cacheManager!.has(key)
      };
    }
    
    // Fallback implementation
    const memoryCache = new Map<string, { value: any; expires: number }>();
    
    return {
      async get<T>(key: string): Promise<T | null> {
        const item = memoryCache.get(key);
        if (!item || item.expires < Date.now()) {
          memoryCache.delete(key);
          return null;
        }
        return item.value;
      },
      
      async set<T>(key: string, value: T, ttl = 3600000): Promise<void> {
        memoryCache.set(key, {
          value,
          expires: Date.now() + ttl
        });
      },
      
      async delete(key: string): Promise<boolean> {
        return memoryCache.delete(key);
      },
      
      async clear(): Promise<void> {
        memoryCache.clear();
      },
      
      async has(key: string): Promise<boolean> {
        const item = memoryCache.get(key);
        if (!item || item.expires < Date.now()) {
          memoryCache.delete(key);
          return false;
        }
        return true;
      }
    };
  }
  
  /**
   * Create typed sandbox instance
   */
  private createSandboxInstance(): TypedSandboxInstance {
    const sandbox = this.securityManager?.getSandbox();
    if (sandbox) return sandbox;
    
    // Fallback implementation
    return {
      async execute<T>(context: PluginContext, operation: () => Promise<T>) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        try {
          const result = await operation();
          const endTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;
          
          return {
            success: true,
            result,
            violations: [],
            executionTime: endTime - startTime,
            memoryUsage: endMemory - startMemory
          };
        } catch (error) {
          const endTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;
          
          return {
            success: false,
            error: error as Error,
            violations: [{
              type: 'system_call' as const,
              pluginId: context.pluginId,
              operation: 'execute',
              target: 'unknown',
              timestamp: Date.now(),
              blocked: true,
              message: 'Execution failed'
            }],
            executionTime: endTime - startTime,
            memoryUsage: endMemory - startMemory
          };
        }
      },
      
      validatePermissions(context: PluginContext, operation: string, target: string): boolean {
        // Basic permission validation
        return true; // Allow all operations in fallback mode
      }
    };
  }
  
  /**
   * Create command system instance
   */
  private createCommandSystem(): TypedCommandSystemInstance {
    return new PluginCommandSystem();
  }
  
  /**
   * Create performance monitor instance
   */
  private createPerformanceMonitor(): TypedPerformanceMonitorInstance {
    if (this.performanceManager) {
      return {
        start: (operationName: string, metadata?: Record<string, unknown>) => {
          this.performanceManager!.startOperation(operationName, metadata);
        },
        end: (operationName: string) => {
          this.performanceManager!.endOperation(operationName);
        },
        recordError: (error: Error) => {
          this.performanceManager!.recordError(error);
        },
        recordWarning: (message: string) => {
          this.performanceManager!.recordWarning(message);
        },
        getMetrics: () => {
          return this.performanceManager!.getMetrics();
        },
        generateSummary: () => {
          return this.performanceManager!.getMetrics() as any;
        },
        reset: () => {
          // PerformanceManager doesn't have a reset method, so we'll start a new session
          this.performanceManager!.startSession();
        }
      };
    }
    
    // Fallback implementation
    const operations = new Map<string, { start: number; metadata?: Record<string, unknown> }>();
    const metrics = { operations: [], errors: [], warnings: [] };
    
    return {
      start(operationName: string, metadata?: Record<string, unknown>): void {
        operations.set(operationName, { start: Date.now(), metadata });
      },
      
      end(operationName: string): void {
        const operation = operations.get(operationName);
        if (operation) {
          const duration = Date.now() - operation.start;
          (metrics.operations as any[]).push({
            name: operationName,
            duration,
            metadata: operation.metadata
          });
          operations.delete(operationName);
        }
      },
      
      recordError(error: Error): void {
        (metrics.errors as any[]).push({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      },
      
      recordWarning(message: string): void {
        (metrics.warnings as any[]).push({
          message,
          timestamp: Date.now()
        });
      },
      
      getMetrics() {
        return metrics as any;
      },
      
      generateSummary() {
        return {
          totalOperations: metrics.operations.length,
          totalErrors: metrics.errors.length,
          totalWarnings: metrics.warnings.length
        } as any;
      },
      
      reset(): void {
        operations.clear();
        metrics.operations = [];
        metrics.errors = [];
        metrics.warnings = [];
      }
    };
  }
  
  /**
   * Get default plugin permissions
   */
  private getDefaultPermissions(): PluginPermissions {
    return {
      filesystem: {
        read: ['./'],
        write: ['./tmp', './cache'],
        execute: []
      },
      network: {
        hosts: ['registry.npmjs.org'],
        ports: [443, 80]
      },
      process: {
        spawn: false,
        env: ['NODE_ENV', 'LORM_*']
      },
      system: {
        exit: false,
        signals: false
      }
    };
  }
  
  /**
   * Get temporary directory for plugin operations
   */
  private async getTempDirectory(): Promise<string> {
    const tmpDir = join(process.cwd(), '.lorm', 'tmp');
    return tmpDir;
  }
  
  /**
   * Get configuration directory for plugins
   */
  private async getConfigDirectory(): Promise<string> {
    const configDir = join(process.cwd(), '.lorm', 'config');
    return configDir;
  }
  
  /**
   * Get cache directory for plugins
   */
  private async getCacheDirectory(): Promise<string> {
    const cacheDir = join(process.cwd(), '.lorm', 'cache');
    return cacheDir;
  }
}