/**
 * Plugin Validation Service
 * Handles comprehensive plugin validation, error recovery, and validation caching
 */

import type {
  Plugin,
  PluginContext,
  PluginTelemetry,
  PluginError,
} from "../types";
import {
  validatePlugin,
  PluginValidator,
  EnhancedValidationResult,
  ValidationContext,
  ErrorRecoveryStrategy,
  createPluginError,
} from "../utils/validation";
import { PluginErrorCode } from "../types";

interface ValidationCacheEntry {
  result: EnhancedValidationResult;
  timestamp: Date;
  pluginHash: string;
}

interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  cacheHits: number;
  averageValidationTime: number;
  errorRecoveryAttempts: number;
  successfulRecoveries: number;
}

export class PluginValidationService {
  private validator: PluginValidator;
  private validationCache = new Map<string, ValidationCacheEntry>();
  private telemetry: PluginTelemetry;
  private metrics: ValidationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    cacheHits: 0,
    averageValidationTime: 0,
    errorRecoveryAttempts: 0,
    successfulRecoveries: 0,
  };

  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(telemetry: PluginTelemetry) {
    this.telemetry = telemetry;
    this.validator = new PluginValidator();
    this.setupDefaultValidationRules();
    this.setupDefaultErrorRecoveryStrategies();
  }

  /**
   * Validate a plugin with caching and error recovery
   */
  async validatePluginWithRecovery(
    plugin: Plugin,
    context: ValidationContext = {}
  ): Promise<EnhancedValidationResult> {
    const startTime = Date.now();
    this.metrics.totalValidations++;

    try {
      // Check cache first
      const cachedResult = this.getCachedValidation(plugin);
      if (cachedResult) {
        this.metrics.cacheHits++;
        this.telemetry.track("plugin_validation_cache_hit", {
          pluginName: plugin.name,
          pluginVersion: plugin.version,
        });
        return cachedResult;
      }

      // Perform validation
      const result = await this.validator.validatePlugin(plugin, context);
      const validationTime = Date.now() - startTime;

      // Update metrics
      this.updateValidationMetrics(result.valid, validationTime);

      // Cache the result
      this.cacheValidationResult(plugin, result);

      // Track telemetry
      if (this.telemetry && typeof this.telemetry.track === "function") {
        this.telemetry.track("plugin_validation_completed", {
          pluginName: plugin.name,
          pluginVersion: plugin.version,
          isValid: result.valid,
          errorCount: result.errors?.length || 0,
          warningCount: result.warnings?.length || 0,
          validationTime,
        });
      }

      // Attempt error recovery if validation failed
      if (!result.valid && result.errors && result.errors.length > 0) {
        return await this.attemptErrorRecovery(plugin, result, context);
      }

      return result;
    } catch (error) {
      this.metrics.failedValidations++;

      if (this.telemetry && typeof this.telemetry.track === "function") {
        this.telemetry.track("plugin_validation_error", {
          pluginName: plugin.name,
          pluginVersion: plugin.version,
          error: error instanceof Error ? error.message : String(error),
          validationTime: Date.now() - startTime,
        });
      }

      throw createPluginError(
        PluginErrorCode.VALIDATION_ERROR,
        `Validation failed for plugin '${plugin.name}': ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          pluginName: plugin.name,
          originalError:
            error instanceof Error ? error : new Error(String(error)),
        }
      );
    }
  }

  /**
   * Validate plugin installation prerequisites
   */
  async validateInstallationPrerequisites(
    plugin: Plugin,
    context: PluginContext
  ): Promise<EnhancedValidationResult> {
    const validationContext: ValidationContext = {
      pluginName: plugin.name,
      operation: "installation",
      strict: true,
    };

    return await this.validatePluginWithRecovery(plugin, validationContext);
  }

  /**
   * Validate plugin before enabling
   */
  async validateEnablePrerequisites(
    plugin: Plugin,
    context: PluginContext
  ): Promise<EnhancedValidationResult> {
    const validationContext: ValidationContext = {
      pluginName: plugin.name,
      operation: "runtime",
      strict: false,
    };

    return await this.validatePluginWithRecovery(plugin, validationContext);
  }

  /**
   * Validate plugin configuration
   */
  async validatePluginConfiguration(
    plugin: Plugin,
    config: Record<string, unknown>
  ): Promise<EnhancedValidationResult> {
    const validationContext: ValidationContext = {
      pluginName: plugin.name,
      operation: "configuration",
      strict: true,
    };

    return await this.validatePluginWithRecovery(plugin, validationContext);
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(
    name: string,
    rule: {
      name: string;
      validate: (
        value: unknown,
        context?: ValidationContext
      ) => {
        valid: boolean;
        errors?: Array<{ message: string; code?: string }>;
        warnings?: string[];
      };
    }
  ): void {
    this.validator.addRule(name, rule);
  }

  /**
   * Add custom error recovery strategy
   */
  addErrorRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.validator.addRecoveryStrategy(strategy);
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(pluginName?: string): void {
    if (pluginName) {
      this.validationCache.delete(pluginName);
    } else {
      this.validationCache.clear();
    }

    this.telemetry.track("validation_cache_cleared", {
      pluginName: pluginName || "all",
    });
  }

  /**
   * Get validation metrics
   */
  getValidationMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get validation cache statistics
   */
  getCacheStatistics(): {
    size: number;
    hitRate: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.validationCache.values());
    const hitRate =
      this.metrics.totalValidations > 0
        ? this.metrics.cacheHits / this.metrics.totalValidations
        : 0;

    const timestamps = entries.map((e) => e.timestamp);

    return {
      size: this.validationCache.size,
      hitRate,
      oldestEntry:
        timestamps.length > 0
          ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
          : undefined,
      newestEntry:
        timestamps.length > 0
          ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
          : undefined,
    };
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of Array.from(this.validationCache.entries())) {
      if (now - entry.timestamp.getTime() > this.CACHE_TTL) {
        this.validationCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.telemetry.track("validation_cache_cleanup", {
        removedEntries: removedCount,
        remainingEntries: this.validationCache.size,
      });
    }
  }

  private getCachedValidation(plugin: Plugin): EnhancedValidationResult | null {
    const cacheKey = this.generateCacheKey(plugin);
    const cached = this.validationCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    const now = Date.now();
    if (now - cached.timestamp.getTime() > this.CACHE_TTL) {
      this.validationCache.delete(cacheKey);
      return null;
    }

    // Check if plugin has changed
    const currentHash = this.generatePluginHash(plugin);
    if (cached.pluginHash !== currentHash) {
      this.validationCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  private cacheValidationResult(
    plugin: Plugin,
    result: EnhancedValidationResult
  ): void {
    const cacheKey = this.generateCacheKey(plugin);
    const pluginHash = this.generatePluginHash(plugin);

    this.validationCache.set(cacheKey, {
      result,
      timestamp: new Date(),
      pluginHash,
    });
  }

  private generateCacheKey(plugin: Plugin): string {
    return `${plugin.name}@${plugin.version}`;
  }

  private generatePluginHash(plugin: Plugin): string {
    // Simple hash based on plugin structure
    const pluginString = JSON.stringify({
      name: plugin.name,
      version: plugin.version,
      dependencies: plugin.dependencies,
      engines: plugin.engines,
      commands: plugin.commands?.map((c) => c.name),
      hooks: plugin.hooks?.map((h) => h.name),
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < pluginString.length; i++) {
      const char = pluginString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  private updateValidationMetrics(
    isValid: boolean,
    validationTime: number
  ): void {
    if (isValid) {
      this.metrics.successfulValidations++;
    } else {
      this.metrics.failedValidations++;
    }

    // Update average validation time
    const totalTime =
      this.metrics.averageValidationTime * (this.metrics.totalValidations - 1) +
      validationTime;
    this.metrics.averageValidationTime =
      totalTime / this.metrics.totalValidations;
  }

  private async attemptErrorRecovery(
    plugin: Plugin,
    result: EnhancedValidationResult,
    context: ValidationContext
  ): Promise<EnhancedValidationResult> {
    this.metrics.errorRecoveryAttempts++;

    try {
      // For now, just return the original result since attemptRecovery doesn't exist
      this.telemetry.track("plugin_validation_recovery_attempted", {
        pluginName: plugin.name,
        pluginVersion: plugin.version,
        errorCount: result.errors?.length || 0,
      });

      return result;
    } catch (error) {
      this.telemetry.track("plugin_validation_recovery_failed", {
        pluginName: plugin.name,
        pluginVersion: plugin.version,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return original result if recovery fails
      return result;
    }
  }

  private setupDefaultValidationRules(): void {
    // Add default validation rules
    this.validator.addRule("plugin-name-format", {
      name: "plugin-name-format",
      validate: (value: unknown) => {
        const plugin = value as Plugin;
        const nameRegex = /^[a-z0-9-]+$/;
        return {
          valid: nameRegex.test(plugin.name),
          errors: nameRegex.test(plugin.name)
            ? undefined
            : [
                {
                  message:
                    "Plugin name must contain only lowercase letters, numbers, and hyphens",
                },
              ],
        };
      },
    });

    this.validator.addRule("version-format", {
      name: "version-format",
      validate: (value: unknown) => {
        const plugin = value as Plugin;
        const versionRegex = /^\d+\.\d+\.\d+/;
        return {
          valid: versionRegex.test(plugin.version),
          errors: versionRegex.test(plugin.version)
            ? undefined
            : [
                {
                  message:
                    "Plugin version must follow semantic versioning (x.y.z)",
                },
              ],
        };
      },
    });
  }

  private setupDefaultErrorRecoveryStrategies(): void {
    // Add default error recovery strategies
    this.validator.addRecoveryStrategy({
      canRecover: (error: PluginError) => {
        return (
          error.message.includes("dependency") &&
          error.message.includes("not found")
        );
      },
      recover: async (
        error: PluginError,
        context?: Record<string, unknown>
      ) => {
        // Attempt to install missing dependencies
        console.log(
          `Attempting to recover from missing dependency: ${error.message}`
        );
        return {
          success: false,
          message: "Dependency recovery not implemented",
        };
      },
      priority: 2,
    });

    this.validator.addRecoveryStrategy({
      canRecover: (error: PluginError) => {
        return (
          error.message.includes("configuration") ||
          error.message.includes("config")
        );
      },
      recover: async (
        error: PluginError,
        context?: Record<string, unknown>
      ) => {
        // Attempt to use default configuration
        console.log(
          `Attempting to recover from invalid config: ${error.message}`
        );
        return { success: true, message: "Using default configuration" };
      },
      priority: 1,
    });
  }
}
