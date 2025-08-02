/**
 * @fileoverview Simplified Plugin Interface
 *
 * Provides a streamlined interface for basic plugin development,
 * reducing complexity for simple use cases while maintaining
 * compatibility with the full plugin system.
 *
 * @example
 * ```typescript
 * import { SimplePlugin } from './simple';
 *
 * const myPlugin: SimplePlugin = {
 *   name: 'my-simple-plugin',
 *   version: '1.0.0',
 *   description: 'A simple plugin example',
 *   commands: [
 *     {
 *       name: 'hello',
 *       description: 'Say hello',
 *       action: () => console.log('Hello from plugin!')
 *     }
 *   ]
 * };
 * ```
 */

import type {
  PluginCommand,
  PluginHook,
  PluginPermission,
  PluginDependency,
  LicenseType,
  Plugin,
} from "./index.js";

/**
 * Simplified plugin interface for basic plugin development.
 *
 * This interface provides a minimal set of required fields and optional
 * features, making it easier for developers to create simple plugins
 * without dealing with the full complexity of the advanced plugin system.
 */
export interface SimplePlugin {
  /** Plugin name (must be unique) */
  readonly name: string;

  /** Plugin version (semver format) */
  readonly version: string;

  /** Brief description of the plugin */
  readonly description: string;

  /** Plugin author information */
  readonly author?: string | { name: string; email?: string; url?: string };

  /** Plugin license */
  readonly license?: LicenseType | string;

  /** Plugin commands */
  readonly commands?: readonly SimplePluginCommand[];

  /** Plugin hooks */
  readonly hooks?: readonly SimplePluginHook[];

  /** Plugin dependencies */
  readonly dependencies?: readonly string[];

  /** Plugin permissions */
  readonly permissions?: readonly string[];

  /** Plugin initialization function */
  readonly init?: () => void | Promise<void>;

  /** Plugin cleanup function */
  readonly cleanup?: () => void | Promise<void>;

  /** Plugin configuration */
  readonly config?: Record<string, unknown>;
}

/**
 * Simplified command interface for basic plugin commands.
 */
export interface SimplePluginCommand {
  /** Command name */
  readonly name: string;

  /** Command description */
  readonly description: string;

  /** Command category */
  readonly category?: string;

  /** Command aliases */
  readonly aliases?: readonly string[];

  /** Command options */
  readonly options?: readonly SimpleCommandOption[];

  /** Command examples */
  readonly examples?: readonly string[];

  /** Command action */
  readonly action: (args: Record<string, unknown>) => void | Promise<void>;
}

/**
 * Simplified command option interface.
 */
export interface SimpleCommandOption {
  /** Option flag (e.g., '--verbose', '-v') */
  readonly flag: string;

  /** Option description */
  readonly description: string;

  /** Default value */
  readonly defaultValue?: unknown;

  /** Whether option is required */
  readonly required?: boolean;
}

/**
 * Simplified hook interface for basic plugin hooks.
 */
export interface SimplePluginHook {
  /** Hook name */
  readonly name: string;

  /** Hook description */
  readonly description?: string;

  /** Hook handler */
  readonly handler: (...args: unknown[]) => unknown | Promise<unknown>;

  /** Hook priority (higher numbers run first) */
  readonly priority?: number;
}

/**
 * Plugin builder for creating simple plugins with a fluent API.
 *
 * @example
 * ```typescript
 * const plugin = new SimplePluginBuilder('my-plugin', '1.0.0')
 *   .description('My awesome plugin')
 *   .author('John Doe')
 *   .addCommand({
 *     name: 'greet',
 *     description: 'Greet the user',
 *     action: () => console.log('Hello!')
 *   })
 *   .build();
 * ```
 */
export class SimplePluginBuilder {
  private plugin: {
    name?: string;
    version?: string;
    description?: string;
    author?: string | { name: string; email?: string; url?: string };
    license?: LicenseType | string;
    commands?: SimplePluginCommand[];
    hooks?: SimplePluginHook[];
    dependencies?: string[];
    permissions?: string[];
    init?: () => void | Promise<void>;
    cleanup?: () => void | Promise<void>;
    config?: Record<string, unknown>;
  };

  constructor(name: string, version: string) {
    this.plugin = { name, version };
  }

  /**
   * Set plugin description.
   */
  description(description: string): this {
    this.plugin.description = description;
    return this;
  }

  /**
   * Set plugin author.
   */
  author(
    author: string | { name: string; email?: string; url?: string }
  ): this {
    this.plugin.author = author;
    return this;
  }

  /**
   * Set plugin license.
   */
  license(license: LicenseType | string): this {
    this.plugin.license = license;
    return this;
  }

  /**
   * Add a command to the plugin.
   */
  addCommand(command: SimplePluginCommand): this {
    if (!this.plugin.commands) {
      this.plugin.commands = [];
    }
    this.plugin.commands.push(command);
    return this;
  }

  /**
   * Add a hook to the plugin.
   */
  addHook(hook: SimplePluginHook): this {
    if (!this.plugin.hooks) {
      this.plugin.hooks = [];
    }
    this.plugin.hooks.push(hook);
    return this;
  }

  /**
   * Add dependencies to the plugin.
   */
  dependencies(dependencies: string[]): this {
    this.plugin.dependencies = dependencies;
    return this;
  }

  /**
   * Add permissions to the plugin.
   */
  permissions(permissions: string[]): this {
    this.plugin.permissions = permissions;
    return this;
  }

  /**
   * Set plugin initialization function.
   */
  init(init: () => void | Promise<void>): this {
    this.plugin.init = init;
    return this;
  }

  /**
   * Set plugin cleanup function.
   */
  cleanup(cleanup: () => void | Promise<void>): this {
    this.plugin.cleanup = cleanup;
    return this;
  }

  /**
   * Set plugin configuration.
   */
  config(config: Record<string, unknown>): this {
    this.plugin.config = config;
    return this;
  }

  /**
   * Build the simple plugin.
   */
  build(): SimplePlugin {
    if (!this.plugin.name || !this.plugin.version || !this.plugin.description) {
      throw new Error("Plugin name, version, and description are required");
    }
    return this.plugin as SimplePlugin;
  }
}

/**
 * Convert a simple plugin to a full plugin interface.
 *
 * This function bridges the gap between the simplified interface
 * and the full plugin system, allowing simple plugins to work
 * seamlessly with the advanced plugin architecture.
 */
export function convertSimplePlugin(simplePlugin: SimplePlugin): Plugin {
  const fullPlugin: Plugin = {
    name: simplePlugin.name as any, // Cast to handle branded type
    version: simplePlugin.version as any, // Cast to handle branded type
    description: simplePlugin.description,
    author:
      typeof simplePlugin.author === "string"
        ? simplePlugin.author
        : simplePlugin.author?.name || "",
    license: simplePlugin.license
      ? { type: simplePlugin.license as LicenseType }
      : { type: "MIT" as LicenseType },

    // Convert simple commands to full commands
    commands: simplePlugin.commands?.map(
      (cmd) =>
        ({
          name: cmd.name,
          description: cmd.description,
          aliases: cmd.aliases,
          category: cmd.category,
          options: cmd.options?.map((opt) => ({
            flag: opt.flag,
            description: opt.description,
            defaultValue: opt.defaultValue,
            required: opt.required || false,
            type: typeof opt.defaultValue || "string",
          })),
          examples: cmd.examples,
          handler: async (args: any, options: any, context: any) => {
            await cmd.action(args);
            return { success: true };
          },
        } as any)
    ),

    // Convert simple hooks to full hooks
    hooks: simplePlugin.hooks?.map(
      (hook) =>
        ({
          name: hook.name,
          description: hook.description,
          handler: hook.handler,
          priority: hook.priority || 0,
        } as any)
    ),

    // Convert dependencies
    dependencies: simplePlugin.dependencies?.reduce((acc, dep) => {
      acc[dep] = "*"; // Use wildcard version for simple dependencies
      return acc;
    }, {} as Record<string, string>),

    // Convert permissions
    permissions: simplePlugin.permissions?.map(
      (perm) =>
        ({
          name: perm,
          description: `Permission: ${perm}`,
          required: false,
        } as any)
    ),

    // Lifecycle methods
    initialize: simplePlugin.init,
    cleanup: simplePlugin.cleanup,

    // Default configuration
    config: simplePlugin.config || {},
  };

  return fullPlugin;
}

/**
 * Type guard to check if an object is a simple plugin.
 */
export function isSimplePlugin(obj: unknown): obj is SimplePlugin {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const plugin = obj as Record<string, unknown>;

  return (
    typeof plugin.name === "string" &&
    typeof plugin.version === "string" &&
    typeof plugin.description === "string"
  );
}

/**
 * Create a simple plugin using the builder pattern.
 */
export function createSimplePlugin(
  name: string,
  version: string
): SimplePluginBuilder {
  return new SimplePluginBuilder(name, version);
}