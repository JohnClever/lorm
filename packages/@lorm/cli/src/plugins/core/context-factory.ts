/**
 * Plugin Context Factory
 * Handles creation of plugin execution contexts with all necessary utilities
 */

import type {
  Plugin,
  PluginContext,
  PluginFileSystem,
  PluginCache,
  PluginCLICommand,
  PluginCLIInstance,
  PluginLifecycleManager,
  PluginDependencyManager,
  PluginSandbox,
  PluginTelemetry,
  PerformanceProfiler,
  PluginCommand,
  PluginHook,
  TypedPluginHook,
  MeasureOptions,
  PerformanceMetrics,
  SanitizeOptions,
  EncryptionAlgorithm,
  HashAlgorithm,
  MetricsFilter,
  SecurityReport,
  SecurityVulnerability,
  SecurityPermission,
  PerformanceTimer,
  BenchmarkResult,
  MemoryUsage,
  CpuUsage
} from '../types';
import { PluginLifecycleState } from '../types';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

export class PluginContextFactory {
  private permissionStore = new Map<string, Set<string>>();
  private securityAuditLog: Array<{ timestamp: Date; pluginName: string; action: string; details?: Record<string, unknown> }> = [];
  private performanceMetrics = new Map<string, PerformanceMetrics>();
  private activeTimers = new Map<string, { startTime: number; metadata?: Record<string, unknown> }>();
  private thresholds = new Map<string, { threshold: number; callback: (value: number) => void }>();

  constructor(
    private lifecycleManagers: Map<string, PluginLifecycleManager>,
    private dependencyManager: PluginDependencyManager,
    private sandbox: PluginSandbox,
    private telemetry: PluginTelemetry,
    private performanceProfiler: PerformanceProfiler
  ) {
    // Initialize default permissions for system plugins
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
    // Core system permissions
    const systemPermissions = new Set([
      'filesystem.read',
      'filesystem.write',
      'network.http',
      'process.spawn',
      'crypto.encrypt',
      'crypto.decrypt'
    ]);
    this.permissionStore.set('system', systemPermissions);
  }

  private async auditSecurityAction(pluginName: string, action: string, details?: Record<string, unknown>): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      pluginName,
      action,
      details
    };
    this.securityAuditLog.push(auditEntry);
  }

  private async generateSecurityReport(pluginName: string): Promise<SecurityReport> {
     const permissions = this.permissionStore.get(pluginName) || new Set();
     
     return {
       pluginName,
       timestamp: new Date(),
       vulnerabilities: [], // No vulnerabilities detected in basic implementation
       permissions: Array.from(permissions).map(permission => ({
         name: permission,
         granted: true,
         required: false,
         description: `Permission: ${permission}`,
         riskLevel: 'low' as const
       })),
       riskScore: 0,
       recommendations: ['Keep permissions minimal', 'Regular security audits']
     };
   }

  createContext<TConfig extends Record<string, unknown> = Record<string, unknown>>(
    plugin: Plugin<TConfig>
  ): PluginContext<TConfig> {
    const pluginInfo = this.createPluginInfo(plugin);
    return {
      plugin: pluginInfo,
      config: this.createConfigManager(plugin),
      fileSystem: this.createFileSystem(),
      security: {
        checkPermission: (permission: string) => {
          const pluginPermissions = this.permissionStore.get(pluginInfo.name) || new Set();
          return pluginPermissions.has(permission);
        },
        requestPermission: async (permission: string, reason?: string) => {
          const pluginPermissions = this.permissionStore.get(pluginInfo.name) || new Set();
          
          // Log permission request
          await this.auditSecurityAction(pluginInfo.name, 'permission_request', {
            permission,
            reason,
            granted: true
          });
          
          pluginPermissions.add(permission);
          this.permissionStore.set(pluginInfo.name, pluginPermissions);
          return true;
        },
        revokePermission: async (permission: string) => {
          const pluginPermissions = this.permissionStore.get(pluginInfo.name) || new Set();
          pluginPermissions.delete(permission);
          this.permissionStore.set(pluginInfo.name, pluginPermissions);
          
          await this.auditSecurityAction(pluginInfo.name, 'permission_revoked', { permission });
        },
        listPermissions: () => {
           const pluginPermissions = this.permissionStore.get(pluginInfo.name) || new Set();
           return Array.from(pluginPermissions).map(permission => ({
             name: permission,
             granted: true,
             required: false,
             description: `Permission: ${permission}`,
             riskLevel: 'low' as const
           }));
         },
        sanitizeInput: (input: string, options?: SanitizeOptions) => {
          let sanitized = input;
          
          if (!options?.allowHtml) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
          }
          
          if (!options?.allowScripts) {
            sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/on\w+\s*=/gi, '');
          }
          
          // Remove potentially dangerous characters
          sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
          
          return sanitized;
        },
        validatePath: (filePath: string, allowedPaths?: readonly string[]) => {
          const normalizedPath = path.resolve(filePath);
          
          // Check for path traversal attempts
          if (normalizedPath.includes('..')) {
            return false;
          }
          
          if (allowedPaths) {
            return allowedPaths.some(allowedPath => 
              normalizedPath.startsWith(path.resolve(allowedPath))
            );
          }
          
          // Default: only allow paths within plugin directory
          const pluginDir = path.resolve(process.cwd(), 'plugins', pluginInfo.name);
          return normalizedPath.startsWith(pluginDir);
        },
        encryptData: async (data: string, algorithm: EncryptionAlgorithm = 'aes-256-gcm') => {
           const key = crypto.randomBytes(32);
           const iv = crypto.randomBytes(16);
           const cipher = crypto.createCipheriv(algorithm, key, iv);
           
           let encrypted = cipher.update(data, 'utf8', 'hex');
           encrypted += cipher.final('hex');
           
           // Return base64 encoded result with key and iv
           const result = {
             encrypted,
             key: key.toString('hex'),
             iv: iv.toString('hex'),
             algorithm
           };
           
           return Buffer.from(JSON.stringify(result)).toString('base64');
         },
        decryptData: async (encryptedData: string, algorithm?: EncryptionAlgorithm) => {
           try {
             const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
             const key = Buffer.from(data.key, 'hex');
             const iv = Buffer.from(data.iv, 'hex');
             const decipher = crypto.createDecipheriv(data.algorithm, key, iv);
             
             let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
             decrypted += decipher.final('utf8');
             
             return decrypted;
           } catch (error) {
             throw new Error('Failed to decrypt data: Invalid format or corrupted data');
           }
         },
        hashData: async (data: string, algorithm: HashAlgorithm = 'sha256') => {
          return crypto.createHash(algorithm).update(data).digest('hex');
        },
        verifySignature: async (data: string, signature: string, publicKey: string) => {
          try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(data);
            return verify.verify(publicKey, signature, 'hex');
          } catch (error) {
            return false;
          }
        },
        createSecureToken: async (payload: Record<string, unknown>, expiresIn: number = 3600) => {
          const header = { alg: 'HS256', typ: 'JWT' };
          const now = Math.floor(Date.now() / 1000);
          const tokenPayload = {
            ...payload,
            iat: now,
            exp: now + expiresIn,
            iss: 'lorm-plugin-system',
            sub: pluginInfo.name
          };
          
          const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
          const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
          
          const secret = crypto.randomBytes(32).toString('hex');
          const signature = crypto
            .createHmac('sha256', secret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64url');
          
          return `${encodedHeader}.${encodedPayload}.${signature}`;
        },
        verifySecureToken: async (token: string) => {
          try {
            const [header, payload, signature] = token.split('.');
            const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
            
            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (decodedPayload.exp && decodedPayload.exp < now) {
              return null;
            }
            
            return decodedPayload;
          } catch (error) {
            return null;
          }
        },
        auditLog: async (action: string, details?: Record<string, unknown>) => {
          await this.auditSecurityAction(pluginInfo.name, action, details);
        },
        getSecurityReport: async () => {
          return this.generateSecurityReport(pluginInfo.name);
        }
      },
      getConfig: <K extends keyof TConfig>(key: K) => {
        const config = plugin.config?.default as TConfig;
        return config?.[key];
      },
      setConfig: async <K extends keyof TConfig>(key: K, value: TConfig[K]) => {
        console.log(`Setting config ${String(key)} = ${value} for plugin ${plugin.name}`);
      },
      logger: this.createLogger(plugin.name),
      cli: this.createCLI(),
      utils: this.createUtils(plugin),
      cache: this.createCache(),
      performance: this.createPerformanceUtils(plugin),
      events: this.createEventSystem(),
      state: this.createStateManager(),
      lifecycle: this.getLifecycleManager(plugin.name),
      dependencies: this.dependencyManager,
      sandbox: this.sandbox,
      telemetry: this.telemetry
    };
  }

  private createPluginInfo<TConfig extends Record<string, unknown>>(plugin: Plugin<TConfig>) {
    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author || '',
      license: plugin.license,
      installed: true,
      enabled: true,
      size: 0,
      dependencies: [],
      commands: plugin.commands ? [...plugin.commands] : [],
      hooks: plugin.hooks ? [...plugin.hooks] : []
    };
  }

  private createConfigManager<TConfig extends Record<string, unknown>>(plugin: Plugin<TConfig>) {
    return {
      get: <K extends keyof TConfig>(key: K) => {
        const config = plugin.config?.default as TConfig;
        return config?.[key];
      },
      set: async <K extends keyof TConfig>(key: K, value: TConfig[K]) => {
        console.log(`Setting config ${String(key)} = ${value} for plugin ${plugin.name}`);
      },
      has: (key: keyof TConfig) => {
        const config = plugin.config?.default as TConfig;
        return config ? key in config : false;
      },
      delete: async (key: keyof TConfig) => {
        console.log(`Deleting config ${String(key)} for plugin ${plugin.name}`);
      },
      getAll: () => {
        return (plugin.config?.default || {}) as Readonly<TConfig>;
      },
      validate: (config: Partial<TConfig>) => {
        return { valid: true, errors: [] };
      },
      defaults: (plugin.config?.default || {}) as Readonly<Partial<TConfig>>,
      watch: <K extends keyof TConfig>(key: K, callback: (newValue: TConfig[K], oldValue: TConfig[K]) => void) => {
        return () => {}; // unwatch function
      },
      unwatch: <K extends keyof TConfig>(key: K) => {
        // Implementation for removing config watcher
      },
      reset: async () => {
        // Implementation for resetting config to defaults
      },
      backup: async () => {
        return JSON.stringify(plugin.config?.default || {});
      },
      restore: async (backup: string) => {
        // Implementation for restoring config from backup
      },
      merge: async (config: Partial<TConfig>) => {
        // Implementation for merging config
      },
      schema: plugin.configSchema,
      version: '1.0.0',
      lastModified: new Date()
    };
  }

  private createFileSystem(): PluginFileSystem {
    return {
      readFile: async (path: string, encoding = 'utf8') => {
        return fs.readFile(path, encoding);
      },
      writeFile: async (path: string, content: string, encoding = 'utf8') => {
        return fs.writeFile(path, content, encoding);
      },
      exists: async (path: string) => {
        try {
          await fs.access(path);
          return true;
        } catch {
          return false;
        }
      },
      mkdir: async (path: string, options = {}) => {
        await fs.mkdir(path, options);
      },
      readdir: async (path: string) => {
        return fs.readdir(path);
      },
      stat: async (path: string) => {
        const stats = await fs.stat(path);
        return {
          isFile: () => stats.isFile(),
          isDirectory: () => stats.isDirectory(),
          size: stats.size,
          mtime: stats.mtime
        };
      },
      unlink: async (path: string) => {
        return fs.unlink(path);
      },
      rmdir: async (path: string, options = {}) => {
        return fs.rmdir(path, options);
      },
      copyFile: async (src: string, dest: string) => {
        return fs.copyFile(src, dest);
      },
      access: async (path: string, mode = 0) => {
        return fs.access(path, mode);
      }
    };
  }

  private createCache(): PluginCache {
    return {
      get: async <T = unknown>(key: string): Promise<T | undefined> => {
        return undefined;
      },
      set: async <T = unknown>(key: string, value: T, ttl?: number): Promise<void> => {
        // Implementation would use actual cache
      },
      has: async (key: string): Promise<boolean> => {
        return false;
      },
      del: async (key: string): Promise<boolean> => {
        return false;
      },
      clear: async (): Promise<void> => {
        // Implementation would clear cache
      },
      keys: async (pattern?: string): Promise<string[]> => {
        return [];
      },
      size: async (): Promise<number> => {
        return 0;
      },
      ttl: async (key: string): Promise<number> => {
        return -1;
      }
    };
  }

  private createLogger(pluginName: string) {
    return {
      info: (message: string) => console.log(`[${pluginName}] ${message}`),
      warn: (message: string) => console.warn(`[${pluginName}] ${message}`),
      error: (message: string) => console.error(`[${pluginName}] ${message}`),
      debug: (message: string) => console.debug(`[${pluginName}] ${message}`)
    };
  }

  private createCLI() {
    return {
      command: (name: string, description: string) => ({
        option: () => ({ option: true }),
        alias: () => ({ alias: true }),
        action: () => ({ action: true }),
        example: () => ({ example: true })
      }) as unknown as PluginCLICommand,
      option: () => ({ option: true }) as unknown as PluginCLIInstance,
      version: '1.0.0',
      args: process.argv,
      cwd: process.cwd()
    };
  }

  private createUtils<TConfig extends Record<string, unknown>>(plugin: Plugin<TConfig>) {
    return {
      executeHook: async <
        THook extends TypedPluginHook = TypedPluginHook,
        TArgs extends THook extends PluginHook<infer A, any, any> ? A : readonly unknown[] = THook extends PluginHook<infer A, any, any> ? A : readonly unknown[],
        TReturn extends THook extends PluginHook<any, infer R, any> ? R : unknown = THook extends PluginHook<any, infer R, any> ? R : unknown
      >(hookName: THook['name'], ...args: TArgs): Promise<readonly TReturn[]> => {
        // TODO: Implement hook execution
        return [] as readonly TReturn[];
      },
      validateConfig: (config: unknown, schema: unknown) => {
        // TODO: Implement config validation
        return { valid: true, errors: [] };
      },
      createCommand: <TArgs extends Record<string, unknown>, TOptions extends Record<string, unknown>>(
          definition: Omit<PluginCommand<TArgs, TOptions>, 'pluginName'>
        ): PluginCommand<TArgs, TOptions> => {
          return {
            ...definition,
            pluginName: plugin.name,
          } as PluginCommand<TArgs, TOptions>;
        },
      createHook: <TArgs extends readonly unknown[], TReturn>(
          definition: Omit<PluginHook<TArgs, TReturn>, 'pluginName'>
        ): PluginHook<TArgs, TReturn> => {
          return {
            ...definition,
            pluginName: plugin.name,
          } as PluginHook<TArgs, TReturn>;
        },
      debounce: <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
        let timeoutId: NodeJS.Timeout;
        return ((...args: Parameters<T>) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        }) as T;
      },
      throttle: <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
        let lastCall = 0;
        return ((...args: Parameters<T>) => {
          const now = Date.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            return fn(...args);
          }
        }) as T;
      },
      retry: async <T>(fn: () => Promise<T>, options?: { attempts?: number; delay?: number; backoff?: 'linear' | 'exponential'; maxDelay?: number; shouldRetry?: (error: Error, attempt: number) => boolean }): Promise<T> => {
        const maxRetries = options?.attempts ?? 3;
        const delay = options?.delay ?? 1000;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        throw new Error('Max retries exceeded');
      },
      fs: this.createFileSystem(),
      path: {
        join: (...paths: string[]) => path.join(...paths),
        resolve: (...paths: string[]) => path.resolve(...paths),
        dirname: (p: string) => path.dirname(p),
        basename: (p: string, ext?: string) => path.basename(p, ext)
      },
      crypto: {
        createHash: (algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512') => ({
          update: (data: string | Buffer) => ({
            digest: (encoding: 'hex' | 'base64' | 'latin1') => 'hash'
          })
        }),
        randomBytes: async (size: number) => Buffer.alloc(size),
        randomUUID: () => 'uuid',
        createHmac: (algorithm: 'sha256' | 'sha512', key: string | Buffer) => ({
          update: (data: string | Buffer) => ({
            digest: (encoding: 'hex' | 'base64' | 'latin1') => 'hmac'
          })
        })
      },
      http: {
        get: async <T = unknown>(url: string, options = {}) => ({
          data: {} as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          ok: true
        }),
        post: async <T = unknown>(url: string, data?: unknown, options = {}) => ({
          data: {} as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          ok: true
        }),
        put: async <T = unknown>(url: string, data?: unknown, options = {}) => ({
          data: {} as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          ok: true
        }),
        delete: async <T = unknown>(url: string, options = {}) => ({
          data: {} as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          ok: true
        }),
        patch: async <T = unknown>(url: string, data?: unknown, options = {}) => ({
          data: {} as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          ok: true
        })
      },
      chalk: {
        red: (text: string) => text,
        green: (text: string) => text,
        blue: (text: string) => text,
        yellow: (text: string) => text,
        cyan: (text: string) => text,
        magenta: (text: string) => text,
        white: (text: string) => text,
        gray: (text: string) => text,
        bold: (text: string) => text,
        dim: (text: string) => text,
        italic: (text: string) => text,
        underline: (text: string) => text
      },
      cache: this.createCache()
    };
  }

  private createPerformanceUtils<TConfig extends Record<string, unknown>>(plugin: Plugin<TConfig>) {
    return {
      startTimer: (name: string) => {
        const startTime = performance.now();
        const metadata = { pluginName: plugin.name };
        this.activeTimers.set(name, { startTime, metadata });
        
        return {
          stop: () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            this.activeTimers.delete(name);
            
            // Store metrics
            const pluginMetrics = this.performanceMetrics.get(plugin.name) || {
              timers: {},
              memory: { used: 0, total: 0, free: 0, peak: 0, gc: { collections: 0, time: 0 } },
              cpu: { usage: 0, user: 0, system: 0, load: [0, 0, 0] },
              network: { bytesIn: 0, bytesOut: 0, requestsIn: 0, requestsOut: 0, errors: 0, latency: { min: 0, max: 0, average: 0 } },
              uptime: process.uptime(),
              timestamp: new Date(),
              pluginName: plugin.name,
              version: plugin.version
            };
            
            if (!pluginMetrics.timers[name]) {
              pluginMetrics.timers[name] = { 
                count: 0, 
                total: 0, 
                average: 0, 
                min: Infinity, 
                max: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                standardDeviation: 0
              };
            }
            
            const timer = { ...pluginMetrics.timers[name] };
            timer.count++;
            timer.total += duration;
            timer.average = timer.total / timer.count;
            timer.min = Math.min(timer.min, duration);
            timer.max = Math.max(timer.max, duration);
            
            // Update percentiles and standard deviation (simplified calculation)
            timer.p50 = timer.average;
            timer.p95 = timer.max * 0.95;
            timer.p99 = timer.max * 0.99;
            timer.standardDeviation = Math.abs(duration - timer.average);
            
            pluginMetrics.timers[name] = timer;
            
            this.performanceMetrics.set(plugin.name, pluginMetrics);
            
            return duration;
          },
          elapsed: () => performance.now() - startTime,
          lap: (label?: string) => {
            const lapTime = performance.now() - startTime;
            return lapTime;
          },
          reset: () => {
            this.activeTimers.set(name, { startTime: performance.now(), metadata });
          },
          getStats: () => {
            const currentTime = performance.now();
            const pluginMetrics = this.performanceMetrics.get(plugin.name);
            const timerStats = pluginMetrics?.timers[name];
            
            return {
              name,
              startTime,
              endTime: currentTime,
              duration: currentTime - startTime,
              laps: [],
              isRunning: this.activeTimers.has(name),
              count: timerStats?.count || 0,
              total: timerStats?.total || 0,
              average: timerStats?.average || 0,
              min: timerStats?.min === Infinity ? 0 : (timerStats?.min || 0),
              max: timerStats?.max || 0
            };
          }
        };
      },
      measure: async <T>(name: string, fn: () => T | Promise<T>, options?: MeasureOptions): Promise<T> => {
          const startTime = performance.now();
          const startMemory = process.memoryUsage();
          
          try {
            const result = await fn();
            const duration = performance.now() - startTime;
            const endMemory = process.memoryUsage();
            
            // Store measurement
            const pluginMetrics = this.performanceMetrics.get(plugin.name) || {
              timers: {},
              memory: { used: 0, total: 0, free: 0, peak: 0, gc: { collections: 0, time: 0 } },
              cpu: { usage: 0, user: 0, system: 0, load: [0, 0, 0] },
              network: { bytesIn: 0, bytesOut: 0, requestsIn: 0, requestsOut: 0, errors: 0, latency: { min: 0, max: 0, average: 0 } },
              uptime: process.uptime(),
              timestamp: new Date(),
              pluginName: plugin.name,
              version: plugin.version
            };
            
            if (!pluginMetrics.timers[name]) {
              pluginMetrics.timers[name] = { 
                count: 0, 
                total: 0, 
                average: 0, 
                min: Infinity, 
                max: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                standardDeviation: 0
              };
            }
            
            const timer = { ...pluginMetrics.timers[name] };
            timer.count++;
            timer.total += duration;
            timer.average = timer.total / timer.count;
            timer.min = Math.min(timer.min, duration);
            timer.max = Math.max(timer.max, duration);
            
            // Update percentiles and standard deviation (simplified calculation)
            timer.p50 = timer.average;
            timer.p95 = timer.max * 0.95;
            timer.p99 = timer.max * 0.99;
            timer.standardDeviation = Math.abs(duration - timer.average);
            
            pluginMetrics.timers[name] = timer;
            
            // Update memory metrics
            const updatedMemory = {
              used: endMemory.heapUsed,
              total: endMemory.heapTotal,
              free: endMemory.heapTotal - endMemory.heapUsed,
              peak: Math.max(pluginMetrics.memory.peak, endMemory.heapUsed),
              gc: pluginMetrics.memory.gc
            };
            
            // Create new metrics object with updated values
            const updatedMetrics: PerformanceMetrics = {
              ...pluginMetrics,
              timers: { ...pluginMetrics.timers, [name]: timer },
              memory: updatedMemory,
              timestamp: new Date()
            };
            
            this.performanceMetrics.set(plugin.name, updatedMetrics);
            
            // Check thresholds
            const threshold = this.thresholds.get(name);
            if (threshold && duration > threshold.threshold) {
              threshold.callback(duration);
            }
            
            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            // Still record the measurement even on error
            throw error;
          }
        },
      getMetrics: (filter?: MetricsFilter): PerformanceMetrics => {
        const pluginMetrics = this.performanceMetrics.get(plugin.name);
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const metrics: PerformanceMetrics = {
          timers: pluginMetrics?.timers || {},
          memory: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            free: memUsage.heapTotal - memUsage.heapUsed,
            peak: pluginMetrics?.memory.peak || memUsage.heapUsed,
            gc: { collections: 0, time: 0 }
          },
          cpu: {
            usage: cpuUsage.user + cpuUsage.system,
            user: cpuUsage.user,
            system: cpuUsage.system,
            load: [0, 0, 0]
          },
          network: {
            bytesIn: 0,
            bytesOut: 0,
            requestsIn: 0,
            requestsOut: 0,
            errors: 0,
            latency: { min: 0, max: 0, average: 0 }
          },
          uptime: process.uptime(),
          timestamp: new Date(),
          pluginName: plugin.name,
          version: plugin.version,
        };
        
        if (filter) {
          // Apply filter logic
          if (filter.timeRange) {
            // Filter by time range
          }
          if (filter.pattern) {
            // Filter by pattern
          }
        }
        
        return metrics;
      },
      clearMetrics: () => {
        this.performanceMetrics.delete(plugin.name);
        // Clear active timers for this plugin
        for (const [name, timer] of this.activeTimers.entries()) {
          if (timer.metadata?.pluginName === plugin.name) {
            this.activeTimers.delete(name);
          }
        }
      },
      createProfiler: () => this.performanceProfiler,
      benchmark: async (name: string, fn: () => any, iterations = 100): Promise<BenchmarkResult> => {
        const times: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          await fn();
          const duration = performance.now() - start;
          times.push(duration);
        }
        
        const totalTime = times.reduce((sum, time) => sum + time, 0);
        const averageTime = totalTime / iterations;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        // Calculate standard deviation
        const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / iterations;
        const standardDeviation = Math.sqrt(variance);
        
        const operationsPerSecond = 1000 / averageTime;
        
        return {
          name,
          iterations,
          totalTime,
          averageTime,
          minTime,
          maxTime,
          standardDeviation,
          operationsPerSecond
        };
      },
      memoryUsage: (): MemoryUsage => {
        const usage = process.memoryUsage();
        return {
          used: usage.heapUsed,
          total: usage.heapTotal,
          free: usage.heapTotal - usage.heapUsed,
          heap: { used: usage.heapUsed, total: usage.heapTotal },
          external: usage.external
        };
      },
      cpuUsage: (): CpuUsage => {
        const usage = process.cpuUsage();
        const total = usage.user + usage.system;
        
        return {
          user: usage.user,
          system: usage.system,
          idle: 0,
          total,
          percentage: 0 // Would need baseline measurement for accurate percentage
        };
      },
      setThreshold: (metric: string, threshold: number, callback?: (value: number) => void) => {
        this.thresholds.set(metric, {
          threshold,
          callback: callback || ((value) => console.warn(`Threshold exceeded for ${metric}: ${value} > ${threshold}`))
        });
      },
      exportMetrics: async (format: 'json' | 'csv' | 'prometheus' = 'json') => {
        const metrics = this.performanceMetrics.get(plugin.name);
        
        if (format === 'json') {
          return JSON.stringify(metrics, null, 2);
        }
        
        if (format === 'csv') {
          let csv = 'metric,count,total,average,min,max\n';
          if (metrics?.timers) {
            for (const [name, timer] of Object.entries(metrics.timers)) {
              csv += `${name},${timer.count},${timer.total},${timer.average},${timer.min},${timer.max}\n`;
            }
          }
          return csv;
        }
        
        if (format === 'prometheus') {
          let prometheus = '';
          if (metrics?.timers) {
            for (const [name, timer] of Object.entries(metrics.timers)) {
              prometheus += `# HELP ${name}_duration_ms Duration in milliseconds\n`;
              prometheus += `# TYPE ${name}_duration_ms gauge\n`;
              prometheus += `${name}_duration_ms ${timer.average}\n`;
            }
          }
          return prometheus;
        }
        
        return '';
      },
      subscribe: (event: string, callback: (data: unknown) => void) => {
        // Basic event subscription implementation
        return () => {
          // Unsubscribe logic
        };
      }
    };
  }

  private createEventSystem() {
    return {
      on: <T = unknown>(event: string, listener: (data: T) => void) => {
        // TODO: Implement event system
      },
      off: (event: string, listener: Function) => {
        // TODO: Implement event system
      },
      emit: <T = unknown>(event: string, data?: T) => {
        // TODO: Implement event system
      },
      once: <T = unknown>(event: string, listener: (data: T) => void) => {
        // TODO: Implement event system
      },
      listenerCount: (event: string) => 0
    };
  }

  private createStateManager() {
    return {
      get: <T = unknown>(key: string) => undefined as T | undefined,
      set: <T = unknown>(key: string, value: T) => {
        // TODO: Implement state management
      },
      has: (key: string) => false,
      delete: (key: string) => false,
      clear: () => {
        // TODO: Clear state
      },
      keys: () => [],
      size: () => 0
    };
  }

  private getLifecycleManager(pluginName: string): PluginLifecycleManager {
    return this.lifecycleManagers.get(pluginName) || {
      getState: () => PluginLifecycleState.UNLOADED,
      transition: async (to: PluginLifecycleState) => {
        // Implementation for state transition
      },
      onStateChange: (callback: (from: PluginLifecycleState, to: PluginLifecycleState) => void) => {
        return () => {}; // unsubscribe function
      },
      canTransition: (to: PluginLifecycleState) => true,
      getHistory: () => [],
      rollback: async () => {
        // Implementation for rollback
      }
    };
  }
}