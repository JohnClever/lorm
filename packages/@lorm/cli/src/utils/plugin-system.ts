import chalk from "chalk";
import type { CAC } from "cac";
import { resolve } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";

export interface PluginContext {
  cli: CAC;
  version: string;
  cwd: string;
  utils: {
    chalk: typeof chalk;
    validateConfig: any;
    errorRecovery: any;
    cache: any;
  };
}

export interface PluginCommand {
  name: string;
  description: string;
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: any;
  }>;
  action: (options: any, context: PluginContext) => Promise<void> | void;
  aliases?: string[];
}

export interface PluginHook {
  name: string;
  handler: (context: PluginContext, ...args: any[]) => Promise<void> | void;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  commands?: PluginCommand[];
  hooks?: PluginHook[];
  init?: (context: PluginContext) => Promise<void> | void;
  cleanup?: (context: PluginContext) => Promise<void> | void;
  isPremium?: boolean;
  license?: {
    type: "free" | "premium" | "enterprise";
    requiresKey?: boolean;
    serviceEndpoint?: string;
  };
  marketplace?: {
    category?: string;
    tags?: string[];
    author?: string;
    homepage?: string;
    repository?: string;
  };
}

export interface PluginConfig {
  plugins: string[];
  disabled?: string[];
  settings?: Record<string, any>;
  authorizedUsers?: string[];
  requireAuth?: boolean;
  marketplace?: {
    enabled: boolean;
    registryUrl?: string;
    apiKey?: string;
  };
  premium?: {
    licenseKey?: string;
    serviceUrl?: string;
  };
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<string, PluginHook[]>();
  private context: PluginContext;
  private config: PluginConfig;

  constructor(context: PluginContext) {
    this.context = context;
    this.config = this.loadConfig();
  }

  private isAuthorizedUser(): boolean {
    if (!this.config.requireAuth) {
      return true;
    }

    const currentUser =
      process.env.USER || process.env.USERNAME || process.env.LOGNAME;

    if (!currentUser) {
      console.warn(chalk.yellow("⚠️  Could not determine current user"));
      return false;
    }

    const authorizedUsers = this.config.authorizedUsers || [];
    const isAuthorized = authorizedUsers.includes(currentUser);

    if (!isAuthorized) {
      console.warn(
        chalk.red(`🔒 Plugin access denied for user: ${currentUser}`)
      );
      console.warn(
        chalk.yellow(`   Authorized users: ${authorizedUsers.join(", ")}`)
      );
    }

    return isAuthorized;
  }

  async loadPlugins(): Promise<void> {
    if (!this.isAuthorizedUser()) {
      console.log(chalk.gray("🔒 Plugin loading disabled - unauthorized user"));
      return;
    }

    const pluginPaths = this.discoverPlugins();

    if (pluginPaths.length === 0) {
      console.log(chalk.gray("📦 No plugins found"));
      return;
    }

    console.log(
      chalk.blue(`🔍 Discovering ${pluginPaths.length} plugin(s)...`)
    );

    for (const pluginPath of pluginPaths) {
      try {
        await this.loadPlugin(pluginPath);
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️  Failed to load plugin ${pluginPath}: ${error}`)
        );
      }
    }

    for (const plugin of this.plugins.values()) {
      try {
        if (plugin.isPremium && !(await this.validatePremiumPlugin(plugin))) {
          console.warn(
            chalk.yellow(
              `⚠️  Skipping premium plugin ${plugin.name} - validation failed`
            )
          );
          continue;
        }

        if (plugin.init) {
          await plugin.init(this.context);
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to initialize plugin ${plugin.name}: ${error}`
          )
        );
      }
    }

    const loadedCount = this.plugins.size;
    if (loadedCount > 0) {
      console.log(
        chalk.green(`✅ Successfully loaded ${loadedCount} plugin(s)`)
      );
    }
  }

  registerCommands(): void {
    for (const plugin of this.plugins.values()) {
      if (!plugin.commands) continue;

      for (const command of plugin.commands) {
        try {
          const cmd = this.context.cli.command(
            command.name,
            command.description
          );

          if (command.options) {
            command.options.forEach((option) => {
              cmd.option(option.flags, option.description, {
                default: option.defaultValue,
              });
            });
          }

          if (command.aliases) {
            command.aliases.forEach((alias) => cmd.alias(alias));
          }

          cmd.action(async (options: any) => {
            try {
              await command.action(options, this.context);
            } catch (error) {
              console.error(
                chalk.red(`❌ Plugin command ${command.name} failed: ${error}`)
              );
              process.exit(1);
            }
          });

          console.log(
            chalk.gray(`🔌 Registered plugin command: ${command.name}`)
          );
        } catch (error) {
          console.warn(
            chalk.yellow(
              `⚠️  Failed to register command ${command.name}: ${error}`
            )
          );
        }
      }
    }
  }

  private discoverPlugins(): string[] {
    const pluginPaths: string[] = [];

    const nodeModulesPath = resolve(this.context.cwd, "node_modules");
    if (existsSync(nodeModulesPath)) {
      try {
        const packages = readdirSync(nodeModulesPath);
        for (const pkg of packages) {
          if (
            pkg.startsWith("lorm-plugin-") ||
            pkg.startsWith("@lorm/plugin-")
          ) {
            pluginPaths.push(resolve(nodeModulesPath, pkg));
          }
        }
      } catch (error) {
        // Ignore errors reading node_modules
      }
    }

    const localPluginsPath = resolve(this.context.cwd, ".lorm", "plugins");
    if (existsSync(localPluginsPath)) {
      try {
        const localPlugins = readdirSync(localPluginsPath);
        for (const plugin of localPlugins) {
          pluginPaths.push(resolve(localPluginsPath, plugin));
        }
      } catch (error) {
        // Ignore errors reading local plugins
      }
    }

    return pluginPaths;
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    const packageJsonPath = resolve(pluginPath, "package.json");
    if (!existsSync(packageJsonPath)) {
      throw new Error("Plugin package.json not found");
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const pluginName = packageJson.name;

    if (this.config.disabled?.includes(pluginName)) {
      console.log(chalk.gray(`⏭️  Skipping disabled plugin: ${pluginName}`));
      return;
    }

    const mainFile = packageJson.main || "index.js";
    const pluginMainPath = resolve(pluginPath, mainFile);

    if (!existsSync(pluginMainPath)) {
      throw new Error(`Plugin main file not found: ${mainFile}`);
    }

    const pluginModule = await import(pluginMainPath);
    const plugin: Plugin = pluginModule.default || pluginModule;

    if (!plugin.name || !plugin.version) {
      throw new Error("Plugin must export name and version");
    }

    this.plugins.set(plugin.name, plugin);

    if (plugin.hooks) {
      for (const hook of plugin.hooks) {
        if (!this.hooks.has(hook.name)) {
          this.hooks.set(hook.name, []);
        }
        this.hooks.get(hook.name)!.push(hook);
      }
    }

    console.log(
      chalk.green(`✅ Loaded plugin: ${plugin.name}@${plugin.version}`)
    );
  }

  private async validatePremiumPlugin(plugin: Plugin): Promise<boolean> {
    if (!plugin.isPremium || !plugin.license?.requiresKey) {
      return true;
    }

    const licenseKey = this.config.premium?.licenseKey;
    if (!licenseKey) {
      console.warn(
        chalk.yellow(`⚠️  Premium plugin ${plugin.name} requires a license key`)
      );
      return false;
    }

    return true;
  }

  getPluginInfo(): Array<{
    name: string;
    version: string;
    description?: string;
    isPremium?: boolean;
    marketplace?: {
      category?: string;
    };
  }> {
    return Array.from(this.plugins.values()).map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      isPremium: plugin.isPremium,
      marketplace: plugin.marketplace,
    }));
  }

  getMarketplaceInfo(): {
    enabled: boolean;
    registryUrl?: string;
    totalPlugins: number;
    hasApiKey?: boolean;
  } {
    return {
      enabled: this.config.marketplace?.enabled ?? true,
      registryUrl: this.config.marketplace?.registryUrl,
      totalPlugins: this.plugins.size,
      hasApiKey: !!this.config.marketplace?.apiKey,
    };
  }

  async searchMarketplace(
    query: string,
    options?: string
  ): Promise<
    Array<{
      name: string;
      version: string;
      description?: string;
      price?: number;
      downloads?: number;
      rating?: number;
    }>
  > {
    // Mock implementation for now
    const mockResults = [
      {
        name: `${query}-plugin`,
        version: "1.0.0",
        description: `A plugin for ${query} functionality`,
        price: 0,
        downloads: 1000,
        rating: 4.5,
      },
      {
        name: `advanced-${query}`,
        version: "2.1.0",
        description: `Advanced ${query} features`,
        price: 29.99,
        downloads: 500,
        rating: 4.8,
      },
    ];

    return mockResults;
  }

  async installFromMarketplace(
    name: string,
    version?: string
  ): Promise<boolean> {
    try {
      console.log(`Installing ${name}${version ? `@${version}` : ""}...`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return Math.random() > 0.3;
    } catch (error) {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    this.plugins.clear();
    this.hooks.clear();
  }

  private loadConfig(): PluginConfig {
    const configPath = resolve(this.context.cwd, ".lorm", "plugins.json");

    if (!existsSync(configPath)) {
      return {
        plugins: [],
        disabled: [],
        settings: {},
        requireAuth: false,
        marketplace: {
          enabled: true,
        },
      };
    }

    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch (error) {
      console.warn(
        chalk.yellow("⚠️  Failed to load plugin config, using defaults")
      );
      return {
        plugins: [],
        disabled: [],
        settings: {},
        requireAuth: false,
        marketplace: {
          enabled: true,
        },
      };
    }
  }
}
