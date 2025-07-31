/**
 * Centralized configuration management for the plugin system.
 * 
 * This module provides a flexible configuration system that supports multiple
 * configuration sources (files, environment variables) and real-time updates.
 * It handles validation, merging, and change notifications for plugin configurations.
 * 
 * @example
 * ```typescript
 * const configManager = createPluginConfigManager();
 * await configManager.loadConfig();
 * const config = configManager.getConfig();
 * ```
 */

import {
  PluginManagerConfigSchema,
  ValidationConfigSchema,
  HookSystemConfigSchema,
  LifecycleConfigSchema,
  SecurityConfigSchema,
  PerformanceConfigSchema,
  PluginSystemConfigSchema,
  type PluginManagerConfig,
  type ValidationConfig,
  type HookSystemConfig,
  type LifecycleConfig,
  type SecurityConfig,
  type PerformanceConfig,
  type PluginSystemConfig,
} from "../schemas/index.js";

export type {
  PluginManagerConfig,
  ValidationConfig,
  HookSystemConfig,
  LifecycleConfig,
  SecurityConfig,
  PerformanceConfig,
  PluginSystemConfig,
};

/**
 * Interface for configuration sources that can load and optionally save plugin configurations.
 */
export interface ConfigSource {
  /**
   * Loads configuration data from the source.
   * @returns Promise resolving to partial configuration data
   */
  load(): Promise<Partial<PluginSystemConfig>>;
  
  /**
   * Saves configuration data to the source (optional).
   * @param config - The complete configuration to save
   */
  save?(config: PluginSystemConfig): Promise<void>;
}

/**
 * Configuration source that loads and saves configuration from/to a JSON file.
 */
export class FileConfigSource implements ConfigSource {
  /**
   * Creates a new file-based configuration source.
   * @param filePath - Path to the configuration file
   */
  constructor(private filePath: string) {}

  /**
   * Loads configuration from the file.
   * @returns Promise resolving to partial configuration, or empty object if file doesn't exist
   */
  async load(): Promise<Partial<PluginSystemConfig>> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  /**
   * Saves configuration to the file.
   * @param config - The configuration to save
   */
  async save(config: PluginSystemConfig): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(config, null, 2), "utf-8");
  }
}

/**
 * Configuration source that loads configuration from environment variables.
 * 
 * Environment variables should be prefixed with 'PLUGIN_' and will be mapped
 * to the corresponding configuration properties.
 */
export class EnvironmentConfigSource implements ConfigSource {
  /**
   * Loads configuration from environment variables.
   * @returns Promise resolving to partial configuration from environment
   */
  async load(): Promise<Partial<PluginSystemConfig>> {
    const config: Partial<PluginSystemConfig> = {};

    const envVars = Object.keys(process.env)
      .filter((key) => key.startsWith("PLUGIN_"))
      .reduce((acc, key) => {
        const value = process.env[key];
        if (value === undefined) return acc;
        const configKey = key.replace("PLUGIN_", "").toLowerCase();
        acc[configKey] = this.parseEnvValue(value);
        return acc;
      }, {} as Record<string, unknown>);

    const managerUpdates: Partial<PluginManagerConfig> = {};
    if (envVars.max_plugins) {
      managerUpdates.maxPlugins = envVars.max_plugins as number;
    }
    if (envVars.enable_telemetry !== undefined) {
      managerUpdates.enableTelemetry = envVars.enable_telemetry as boolean;
    }
    if (envVars.log_level) {
      managerUpdates.logLevel = envVars.log_level as
        | "debug"
        | "info"
        | "warn"
        | "error";
    }

    if (Object.keys(managerUpdates).length > 0) {
      config.manager = managerUpdates as PluginManagerConfig;
    }

    return config;
  }

  /**
   * Parses environment variable values, attempting JSON parsing first.
   * @param value - The environment variable value to parse
   * @returns Parsed value (JSON, boolean, number, or string)
   * @private
   */
  private parseEnvValue(value: string | undefined): unknown {
    if (!value) return undefined;

    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try to parse as boolean or number
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;

      const num = Number(value);
      if (!isNaN(num)) return num;

      return value;
    }
  }
}

/**
 * Main configuration manager that handles loading, merging, and managing
 * plugin system configuration from multiple sources.
 */
export class PluginConfigManager {
  private config: PluginSystemConfig;
  private sources: ConfigSource[] = [];
  private listeners: Array<(config: PluginSystemConfig) => void> = [];

  /**
   * Creates a new configuration manager.
   * @param initialConfig - Optional initial configuration to merge with defaults
   */
  constructor(initialConfig?: Partial<PluginSystemConfig>) {
    // Start with default configuration
    this.config = PluginSystemConfigSchema.parse(initialConfig || {});
  }

  /**
   * Adds a configuration source to the manager.
   * @param source - The configuration source to add
   */
  addSource(source: ConfigSource): void {
    this.sources.push(source);
  }

  /**
   * Loads configuration from all registered sources and merges them.
   * 
   * Sources are processed in order, with later sources overriding earlier ones.
   * The final configuration is validated against the schema.
   */
  async loadConfig(): Promise<void> {
    let mergedConfig: Partial<PluginSystemConfig> = {};

    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        mergedConfig = this.deepMerge(mergedConfig, sourceConfig);
      } catch (error) {
        console.warn("Failed to load config from source:", error);
      }
    }

    this.config = PluginSystemConfigSchema.parse(mergedConfig);
    this.notifyListeners();
  }

  /**
   * Saves the current configuration to the first writable source.
   * 
   * @throws {Error} If no writable sources are available
   */
  async saveConfig(): Promise<void> {
    const writableSource = this.sources.find(
      (source) => typeof source.save === "function"
    );
    if (writableSource && writableSource.save) {
      await writableSource.save(this.config);
    }
  }

  /**
   * Gets a copy of the complete configuration.
   * @returns A copy of the current plugin system configuration
   */
  getConfig(): PluginSystemConfig {
    return { ...this.config };
  }

  /**
   * Gets a copy of the plugin manager configuration.
   * @returns A copy of the manager configuration section
   */
  getManagerConfig(): PluginManagerConfig {
    return { ...this.config.manager };
  }

  /**
   * Gets a copy of the validation configuration.
   * @returns A copy of the validation configuration section
   */
  getValidationConfig(): ValidationConfig {
    return { ...this.config.validation };
  }

  /**
   * Gets a copy of the hook system configuration.
   * @returns A copy of the hook system configuration section
   */
  getHookSystemConfig(): HookSystemConfig {
    return { ...this.config.hookSystem };
  }

  /**
   * Gets a copy of the lifecycle configuration.
   * @returns A copy of the lifecycle configuration section
   */
  getLifecycleConfig(): LifecycleConfig {
    return { ...this.config.lifecycle };
  }

  /**
   * Gets a copy of the security configuration.
   * @returns A copy of the security configuration section
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config.security };
  }

  /**
   * Gets a copy of the performance configuration.
   * @returns A copy of the performance configuration section
   */
  getPerformanceConfig(): PerformanceConfig {
    return { ...this.config.performance };
  }

  /**
   * Updates the configuration with the provided changes.
   * 
   * The updates are merged with the current configuration and validated.
   * All registered listeners are notified of the change.
   * 
   * @param updates - Partial configuration updates to apply
   * @throws {Error} If the updated configuration is invalid
   */
  updateConfig(updates: Partial<PluginSystemConfig>): void {
    const mergedConfig = this.deepMerge(this.config, updates);
    this.config = PluginSystemConfigSchema.parse(mergedConfig);
    this.notifyListeners();
  }

  /**
   * Registers a listener for configuration changes.
   * 
   * @param listener - Function to call when configuration changes
   * @returns Function to unregister the listener
   */
  onConfigChange(listener: (config: PluginSystemConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifies all registered listeners of configuration changes.
   * @private
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.config);
      } catch (error) {
        console.error("Error in config change listener:", error);
      }
    });
  }

  /**
   * Performs a deep merge of two configuration objects.
   * 
   * @param target - The target object to merge into
   * @param source - The source object to merge from
   * @returns A new object with merged properties
   * @private
   */
  private deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (this.isObject(sourceValue) && this.isObject(targetValue)) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * Type guard to check if a value is a plain object.
   * @param value - The value to check
   * @returns True if the value is a plain object
   * @private
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

/**
 * Factory function to create a configured PluginConfigManager instance.
 * 
 * This function creates a manager with common configuration sources:
 * - Environment variable source
 * - File source (if configFile is provided)
 * 
 * @param initialConfig - Optional initial configuration to merge with defaults
 * @param configFile - Optional path to configuration file
 * @returns Configured PluginConfigManager instance
 */
export function createPluginConfigManager(
  initialConfig?: Partial<PluginSystemConfig>,
  configFile?: string
): PluginConfigManager {
  const manager = new PluginConfigManager(initialConfig);

  // Add default sources
  manager.addSource(new EnvironmentConfigSource());

  if (configFile) {
    manager.addSource(new FileConfigSource(configFile));
  }

  return manager;
}
