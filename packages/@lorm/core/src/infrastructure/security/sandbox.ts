import { resolve } from 'path';
import type {
  IPluginSandbox,
  PluginContext,
  SecurityConfig,
  SecurityViolation,
  SandboxResult,
  ViolationType,
  FileSystemOperation,
  NetworkOperation,
  ProcessOperation
} from './types.js';

/**
 * Lightweight plugin sandbox for LORM CLI v2
 * Provides basic security controls without heavy isolation
 */
export class PluginSandbox implements IPluginSandbox {
  private violations: SecurityViolation[] = [];
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async execute<T>(
    pluginContext: PluginContext,
    operation: () => Promise<T>
  ): Promise<SandboxResult<T>> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const violations: SecurityViolation[] = [];

    if (!this.config.sandboxing) {
      // Sandboxing disabled, execute directly
      try {
        const result = await operation();
        return {
          success: true,
          result,
          violations: [],
          executionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed - startMemory
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          violations: [],
          executionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed - startMemory
        };
      }
    }

    try {
      // Set up execution timeout
      const timeoutPromise = this.config.maxExecutionTime
        ? new Promise<never>((_, reject) => {
            setTimeout(() => {
              const violation = this.createViolation(
                'execution_timeout',
                pluginContext.pluginId,
                'execute',
                `${this.config.maxExecutionTime}ms`,
                true,
                `Plugin execution exceeded timeout of ${this.config.maxExecutionTime}ms`
              );
              violations.push(violation);
              this.violations.push(violation);
              reject(new Error('Plugin execution timeout'));
            }, this.config.maxExecutionTime);
          })
        : null;

      // Execute operation with potential timeout
      const operationPromise = operation();
      const result = timeoutPromise
        ? await Promise.race([operationPromise, timeoutPromise])
        : await operationPromise;

      // Check memory usage
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;
      if (this.config.maxMemoryUsage && memoryUsed > this.config.maxMemoryUsage) {
        const violation = this.createViolation(
          'memory_limit',
          pluginContext.pluginId,
          'memory_usage',
          `${memoryUsed} bytes`,
          false,
          `Plugin exceeded memory limit: ${memoryUsed} > ${this.config.maxMemoryUsage}`
        );
        violations.push(violation);
        this.violations.push(violation);
      }

      return {
        success: true,
        result,
        violations,
        executionTime: Date.now() - startTime,
        memoryUsage: memoryUsed
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        violations,
        executionTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed - startMemory
      };
    }
  }

  validatePermissions(
    pluginContext: PluginContext,
    operation: string,
    target: string
  ): boolean {
    if (!this.config.sandboxing) {
      return true;
    }

    // Validate based on operation type
    if (operation.startsWith('fs:')) {
      return this.validateFileSystemOperation(
        pluginContext,
        operation.substring(3) as FileSystemOperation,
        target
      );
    }

    if (operation.startsWith('net:')) {
      return this.validateNetworkOperation(
        pluginContext,
        operation.substring(4) as NetworkOperation,
        target
      );
    }

    if (operation.startsWith('proc:')) {
      return this.validateProcessOperation(
        pluginContext,
        operation.substring(5) as ProcessOperation,
        target
      );
    }

    // Default: allow unknown operations (with warning)
    return true;
  }

  getViolations(pluginId?: string): SecurityViolation[] {
    if (pluginId) {
      return this.violations.filter(v => v.pluginId === pluginId);
    }
    return [...this.violations];
  }

  clearViolations(pluginId?: string): void {
    if (pluginId) {
      this.violations = this.violations.filter(v => v.pluginId !== pluginId);
    } else {
      this.violations = [];
    }
  }

  /**
   * Validate file system operations
   */
  private validateFileSystemOperation(
    pluginContext: PluginContext,
    operation: FileSystemOperation,
    targetPath: string
  ): boolean {
    const resolvedPath = resolve(targetPath);
    const { permissions } = pluginContext;

    let allowedPaths: string[] = [];
    let violationType: ViolationType = 'filesystem_read';

    switch (operation) {
      case 'read':
      case 'list':
      case 'stat':
      case 'watch':
        allowedPaths = permissions.filesystem.read;
        violationType = 'filesystem_read';
        break;
      case 'write':
      case 'create':
      case 'delete':
        allowedPaths = permissions.filesystem.write;
        violationType = 'filesystem_write';
        break;
      default:
        return false;
    }

    // Check if path is allowed
    const isAllowed = allowedPaths.some(allowedPath => {
      const resolvedAllowed = resolve(allowedPath);
      return resolvedPath.startsWith(resolvedAllowed);
    });

    if (!isAllowed) {
      const violation = this.createViolation(
        violationType,
        pluginContext.pluginId,
        `fs:${operation}`,
        resolvedPath,
        true,
        `File system ${operation} not allowed for path: ${resolvedPath}`
      );
      this.violations.push(violation);
    }

    return isAllowed;
  }

  /**
   * Validate network operations
   */
  private validateNetworkOperation(
    pluginContext: PluginContext,
    operation: NetworkOperation,
    target: string
  ): boolean {
    const { permissions } = pluginContext;
    
    // Extract hostname from target (URL or host:port)
    let hostname: string;
    try {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        hostname = new URL(target).hostname;
      } else {
        hostname = target.split(':')[0] || target;
      }
    } catch {
      hostname = target;
    }

    // Check if host is allowed
    const isAllowed = permissions.network.hosts.some(allowedHost => {
      return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
    });

    if (!isAllowed) {
      const violation = this.createViolation(
        'network_access',
        pluginContext.pluginId,
        `net:${operation}`,
        target,
        true,
        `Network ${operation} not allowed for host: ${hostname}`
      );
      this.violations.push(violation);
    }

    return isAllowed;
  }

  /**
   * Validate process operations
   */
  private validateProcessOperation(
    pluginContext: PluginContext,
    operation: ProcessOperation,
    target: string
  ): boolean {
    const { permissions } = pluginContext;

    if (!permissions.process.spawn) {
      const violation = this.createViolation(
        'process_spawn',
        pluginContext.pluginId,
        `proc:${operation}`,
        target,
        true,
        `Process ${operation} not allowed`
      );
      this.violations.push(violation);
      return false;
    }

    return true;
  }

  /**
   * Create a security violation record
   */
  private createViolation(
    type: ViolationType,
    pluginId: string,
    operation: string,
    target: string,
    blocked: boolean,
    message: string
  ): SecurityViolation {
    return {
      type,
      pluginId,
      operation,
      target,
      timestamp: Date.now(),
      blocked,
      message
    };
  }

  /**
   * Get sandbox configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }
}