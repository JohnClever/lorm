import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir, rm, access } from "fs/promises";
import { join, resolve, dirname } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import type {
  PluginInstallOptions,
  PluginInstallResult,
  PluginUninstallOptions,
  PluginSearchResult,
  PluginSearchOptions,
  PluginInfo,
  PluginSource,
  PluginValidationResult,
  PluginLoaderContext,
  IPlugin,
  PluginDependency,
  PluginType,
} from "./types.js";
import type { PluginPermissions } from "../security/types.js";
import { PluginContextFactory } from "./context-factory.js";
import { PluginErrorHandler } from "./error-handler.js";

const execAsync = promisify(exec);

/**
 * Plugin Installer with security validation and multi-source support
 */
export class PluginInstaller {
  private loaderContext?: PluginLoaderContext;
  private contextFactory?: PluginContextFactory;
  private pluginsDirectory: string;

  constructor() {
    this.pluginsDirectory = join(process.cwd(), ".lorm", "plugins");
  }

  /**
   * Initialize installer with loader context
   */
  async initialize(
    loaderContext: PluginLoaderContext,
    contextFactory: PluginContextFactory
  ): Promise<void> {
    this.loaderContext = loaderContext;
    this.contextFactory = contextFactory;

    // Ensure plugins directory exists
    await this.ensurePluginsDirectory();
  }

  /**
   * Install a plugin from various sources
   */
  async installPlugin(
    options: PluginInstallOptions
  ): Promise<PluginInstallResult> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      // Validate installation request
      await this.validateInstallRequest(options);

      // Check if plugin already exists
      if (!options.force && (await this.isPluginInstalled(options.name))) {
        throw new Error(
          `Plugin '${options.name}' is already installed. Use --force to reinstall.`
        );
      }

      // Resolve plugin source
      const pluginSource = await this.resolvePluginSource(options);

      // Download/copy plugin
      const pluginPath = await this.downloadPlugin(pluginSource, options);

      // Load and validate plugin
      const plugin = await this.loadPluginFromPath(pluginPath);
      await this.validatePlugin(plugin);

      // Security validation
      await this.validatePluginSecurity(plugin);

      // Install dependencies
      if (!options.skipDependencies) {
        await this.installDependencies(plugin, pluginPath);
      }

      // Register plugin in configuration
      await this.registerPluginInConfig(plugin, options);

      return {
        success: true,
        plugin,
        installTime: Date.now() - startTime,
        dependencies: plugin.metadata.dependencies
          ? Object.keys(plugin.metadata.dependencies)
          : [],
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        installTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(
    name: string,
    options?: PluginUninstallOptions
  ): Promise<void> {
    this.ensureInitialized();

    const pluginPath = join(this.pluginsDirectory, name);

    if (!existsSync(pluginPath)) {
      throw new Error(`Plugin '${name}' is not installed`);
    }

    // Remove plugin files
    await rm(pluginPath, { recursive: true, force: true });

    // Remove from configuration
    if (options?.removeConfig !== false) {
      await this.unregisterPluginFromConfig(name);
    }

    // Remove dependencies if requested
    if (options?.removeDependencies) {
      await this.removeDependencies(name);
    }
  }

  /**
   * Search for plugins
   */
  async searchPlugins(
    query: string,
    options?: PluginSearchOptions
  ): Promise<PluginSearchResult[]> {
    const results: PluginSearchResult[] = [];
    const sources =
      options?.source === "all"
        ? ["npm", "marketplace"]
        : [options?.source || "marketplace"];

    for (const source of sources) {
      try {
        if (source === "npm") {
          const npmResults = await this.searchNpmPlugins(query, options);
          results.push(...npmResults);
        } else if (source === "marketplace") {
          const marketplaceResults = await this.searchMarketplacePlugins(
            query,
            options
          );
          results.push(...marketplaceResults);
        }
      } catch (error) {
        // Continue with other sources if one fails
        console.warn(`Failed to search ${source}:`, error);
      }
    }

    // Apply filters and limits
    let filteredResults = results;

    if (options?.verified !== undefined) {
      filteredResults = filteredResults.filter(
        (r) => r.verified === options.verified
      );
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      filteredResults = filteredResults.slice(offset, offset + options.limit);
    }

    return filteredResults;
  }

  /**
   * Get detailed plugin information
   */
  async getPluginInfo(name: string): Promise<PluginInfo> {
    // Try to get info from installed plugin first
    const installedPlugin = await this.getInstalledPluginInfo(name);
    if (installedPlugin) {
      return installedPlugin;
    }

    // Search for plugin in marketplace and npm
    const searchResults = await this.searchPlugins(name, { limit: 1 });
    const result = searchResults.find((r) => r.name === name);

    if (!result) {
      throw new Error(`Plugin '${name}' not found`);
    }

    return {
      metadata: {
        id: result.name,
        name: result.name,
        version: result.version,
        description: result.description,
        author: result.author,
        license: "open-source",
        type: result.source === "npm" ? "npm" : "marketplace",
        keywords: result.keywords,
        engines: {
          node: ">=14.0.0",
          lorm: ">=1.0.0",
        },
      },
      status: "available",
      latestVersion: result.version,
      dependencies: [],
      permissions: this.getDefaultPermissions(),
    };
  }

  /**
   * Validate a plugin
   */
  async validatePlugin(plugin: IPlugin): Promise<PluginValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate metadata
    if (!plugin.metadata) {
      errors.push("Plugin metadata is required");
    } else {
      if (!plugin.metadata.name) errors.push("Plugin name is required");
      if (!plugin.metadata.version) errors.push("Plugin version is required");
      if (!plugin.metadata.description)
        warnings.push("Plugin description is recommended");
      if (!plugin.metadata.author)
        warnings.push("Plugin author is recommended");
    }

    // Validate lifecycle methods
    if (plugin.initialize && typeof plugin.initialize !== "function") {
      errors.push("Plugin initialize must be a function");
    }
    if (plugin.activate && typeof plugin.activate !== "function") {
      errors.push("Plugin activate must be a function");
    }
    if (plugin.deactivate && typeof plugin.deactivate !== "function") {
      errors.push("Plugin deactivate must be a function");
    }

    // Validate commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        if (!command.name) errors.push("Command name is required");
        if (!command.handler || typeof command.handler !== "function") {
          errors.push(`Command '${command.name}' handler must be a function`);
        }
      }
    }

    // Validate hooks
    if (plugin.hooks) {
      for (const hook of plugin.hooks) {
        if (!hook.type) errors.push("Hook type is required");
        if (!hook.handler || typeof hook.handler !== "function") {
          errors.push(`Hook '${hook.type}' handler must be a function`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Resolve plugin source based on installation options
   */
  private async resolvePluginSource(
    options: PluginInstallOptions
  ): Promise<PluginSource> {
    switch (options.source) {
      case "npm":
        return this.resolveNpmPlugin(options);
      case "local":
        return this.resolveLocalPlugin(options);
      case "git":
        return this.resolveGitPlugin(options);
      case "marketplace":
        return this.resolveMarketplacePlugin(options);
      default:
        throw new Error(`Unsupported plugin source: ${options.source}`);
    }
  }

  /**
   * Resolve NPM plugin source
   */
  private async resolveNpmPlugin(
    options: PluginInstallOptions
  ): Promise<PluginSource> {
    const packageName = options.name;
    const version = options.version || "latest";

    // Verify package exists
    try {
      const { stdout } = await execAsync(
        `npm view ${packageName}@${version} version`
      );
      const actualVersion = stdout.trim();

      return {
        type: "npm",
        location: `${packageName}@${actualVersion}`,
        version: actualVersion,
        metadata: { packageName, registry: options.registry },
      };
    } catch (error) {
      throw new Error(`NPM package '${packageName}' not found`);
    }
  }

  /**
   * Resolve local plugin source
   */
  private async resolveLocalPlugin(
    options: PluginInstallOptions
  ): Promise<PluginSource> {
    const pluginPath = resolve(options.name);

    try {
      await access(pluginPath);
      return {
        type: "local",
        location: pluginPath,
        metadata: { originalPath: options.name },
      };
    } catch (error) {
      throw new Error(`Local plugin path '${options.name}' does not exist`);
    }
  }

  /**
   * Resolve Git plugin source
   */
  private async resolveGitPlugin(
    options: PluginInstallOptions
  ): Promise<PluginSource> {
    const gitUrl = options.name;
    const version = options.version || "main";

    // Basic Git URL validation
    if (!gitUrl.includes("git") && !gitUrl.includes("github.com")) {
      throw new Error(`Invalid Git URL: ${gitUrl}`);
    }

    return {
      type: "git",
      location: gitUrl,
      version,
      metadata: { branch: version },
    };
  }

  /**
   * Resolve marketplace plugin source
   */
  private async resolveMarketplacePlugin(
    options: PluginInstallOptions
  ): Promise<PluginSource> {
    // For now, marketplace plugins are resolved as npm packages
    // In the future, this could query a dedicated marketplace API
    try {
      // Validate that the plugin exists in npm registry
      const { stdout } = await execAsync(
        `npm view ${options.name} version --json`
      );
      const availableVersion = JSON.parse(stdout.trim());

      return {
        type: "marketplace",
        location: options.name,
        version: options.version || availableVersion || "latest",
        metadata: {
          marketplaceId: options.name,
          npmPackage: options.name,
          verified: true,
        },
      };
    } catch (error) {
      throw new Error(
        `Plugin '${options.name}' not found in marketplace: ${error}`
      );
    }
  }

  /**
   * Download plugin from source
   */
  private async downloadPlugin(
    source: PluginSource,
    options: PluginInstallOptions
  ): Promise<string> {
    const pluginDir = join(this.pluginsDirectory, options.name);

    // Remove existing plugin if force install
    if (options.force && existsSync(pluginDir)) {
      await rm(pluginDir, { recursive: true, force: true });
    }

    await mkdir(pluginDir, { recursive: true });

    switch (source.type) {
      case "npm":
        return this.downloadNpmPlugin(source, pluginDir, options);
      case "local":
        return this.copyLocalPlugin(source, pluginDir);
      case "git":
        return this.cloneGitPlugin(source, pluginDir);
      case "marketplace":
        return this.downloadMarketplacePlugin(source, pluginDir, options);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Download NPM plugin
   */
  private async downloadNpmPlugin(
    source: PluginSource,
    targetDir: string,
    options: PluginInstallOptions
  ): Promise<string> {
    const registryFlag = options.registry
      ? `--registry ${options.registry}`
      : "";
    const authFlags = this.buildNpmAuthFlags(options.auth);

    try {
      await execAsync(
        `npm pack ${source.location} ${registryFlag} ${authFlags}`,
        { cwd: targetDir }
      );

      // Extract the tarball
      const { stdout } = await execAsync("ls *.tgz", { cwd: targetDir });
      const tarball = stdout.trim();

      await execAsync(`tar -xzf ${tarball}`, { cwd: targetDir });
      await rm(join(targetDir, tarball));

      // Move contents from package/ to root
      const packageDir = join(targetDir, "package");
      if (existsSync(packageDir)) {
        await execAsync(`mv package/* .`, { cwd: targetDir });
        await rm(packageDir, { recursive: true });
      }

      return targetDir;
    } catch (error) {
      throw new Error(`Failed to download NPM plugin: ${error}`);
    }
  }

  /**
   * Copy local plugin
   */
  private async copyLocalPlugin(
    source: PluginSource,
    targetDir: string
  ): Promise<string> {
    try {
      await execAsync(`cp -r "${source.location}"/* "${targetDir}"/`);
      return targetDir;
    } catch (error) {
      throw new Error(`Failed to copy local plugin: ${error}`);
    }
  }

  /**
   * Clone Git plugin
   */
  private async cloneGitPlugin(
    source: PluginSource,
    targetDir: string
  ): Promise<string> {
    const branch = source.metadata?.branch || "main";

    try {
      await execAsync(
        `git clone --depth 1 --branch ${branch} "${source.location}" "${targetDir}"`
      );

      // Remove .git directory
      const gitDir = join(targetDir, ".git");
      if (existsSync(gitDir)) {
        await rm(gitDir, { recursive: true, force: true });
      }

      return targetDir;
    } catch (error) {
      throw new Error(`Failed to clone Git plugin: ${error}`);
    }
  }

  /**
   * Download marketplace plugin
   */
  private async downloadMarketplacePlugin(
    source: PluginSource,
    targetDir: string,
    options: PluginInstallOptions
  ): Promise<string> {
    try {
      // For now, marketplace plugins are treated as npm packages
      // In the future, this could integrate with a dedicated marketplace API
      const marketplaceId = source.metadata?.marketplaceId || options.name;

      // Convert marketplace source to npm source for download
      const npmSource: PluginSource = {
        type: "npm",
        location: marketplaceId as string,
        version: source.version,
        metadata: { ...source.metadata, originalSource: "marketplace" },
      };

      // Use npm download method
      return await this.downloadNpmPlugin(npmSource, targetDir, options);
    } catch (error) {
      throw new Error(`Failed to download marketplace plugin: ${error}`);
    }
  }

  /**
   * Load plugin from path
   */
  private async loadPluginFromPath(pluginPath: string): Promise<IPlugin> {
    const indexPath = join(pluginPath, "index.js");
    const packageJsonPath = join(pluginPath, "package.json");

    if (!existsSync(indexPath)) {
      throw new Error("Plugin index.js not found");
    }

    try {
      // Read package.json for metadata
      let packageJson: any = {};
      if (existsSync(packageJsonPath)) {
        const content = await readFile(packageJsonPath, "utf-8");
        packageJson = JSON.parse(content);
      }

      // Dynamic import of the plugin
      const pluginModule = await import(indexPath);
      const plugin = pluginModule.default || pluginModule;

      // Ensure plugin has required metadata
      if (!plugin.metadata) {
        plugin.metadata = {
          id: packageJson.name || "unknown",
          name: packageJson.name || "Unknown Plugin",
          version: packageJson.version || "1.0.0",
          description: packageJson.description || "",
          author: packageJson.author || "Unknown",
          license: "open-source",
          type: "local" as PluginType,
          keywords: packageJson.keywords || [],
          engines: {
            node: packageJson.engines?.node || ">=14.0.0",
            lorm: packageJson.engines?.lorm || ">=1.0.0",
          },
        };
      }

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin: ${error}`);
    }
  }

  /**
   * Validate plugin security
   */
  private async validatePluginSecurity(plugin: IPlugin): Promise<void> {
    if (!this.loaderContext?.sandbox) {
      return; // Skip security validation if sandbox not available
    }

    try {
      const context = await this.contextFactory!.createPluginContext(plugin);

      // Test plugin in sandbox
      const result = await this.loaderContext.sandbox.execute(
        context,
        async () => {
          // Basic security test - try to initialize plugin
          if (plugin.initialize) {
            await plugin.initialize(context);
          }
          return true;
        }
      );

      if (!result.success) {
        throw new Error(`Security validation failed: ${result.error?.message}`);
      }

      if (result.violations && result.violations.length > 0) {
        throw new Error(
          `Security violations detected: ${result.violations.join(", ")}`
        );
      }
    } catch (error) {
      throw new Error(`Plugin security validation failed: ${error}`);
    }
  }

  /**
   * Install plugin dependencies
   */
  private async installDependencies(
    plugin: IPlugin,
    pluginPath: string
  ): Promise<void> {
    const packageJsonPath = join(pluginPath, "package.json");

    if (!existsSync(packageJsonPath)) {
      return; // No package.json, no dependencies to install
    }

    try {
      await execAsync("npm install --production", { cwd: pluginPath });
    } catch (error) {
      console.warn(
        `Failed to install dependencies for plugin ${plugin.metadata.name}:`,
        error
      );
    }
  }

  /**
   * Register plugin in configuration
   */
  private async registerPluginInConfig(
    plugin: IPlugin,
    options: PluginInstallOptions
  ): Promise<void> {
    const configPath = join(process.cwd(), "lorm.config.json");

    try {
      let config: any = {};

      // Read existing config if it exists
      if (existsSync(configPath)) {
        const configContent = await readFile(configPath, "utf-8");
        config = JSON.parse(configContent);
      }

      // Initialize plugins section if it doesn't exist
      if (!config.plugins) {
        config.plugins = {};
      }

      // Register the plugin
      config.plugins[plugin.metadata.name] = {
        version: plugin.metadata.version,
        enabled: true,
        installedAt: new Date().toISOString(),
        source: options.source,
      };

      // Write updated config
      await writeFile(configPath, JSON.stringify(config, null, 2));

      console.log(
        `Registered plugin ${plugin.metadata.name}@${plugin.metadata.version} in configuration`
      );
    } catch (error) {
      throw new Error(`Failed to register plugin in config: ${error}`);
    }
  }

  /**
   * Unregister plugin from configuration
   */
  private async unregisterPluginFromConfig(name: string): Promise<void> {
    const configPath = join(process.cwd(), "lorm.config.json");

    try {
      // Check if config exists
      if (!existsSync(configPath)) {
        console.log(`No configuration file found at ${configPath}`);
        return;
      }

      // Read existing config
      const configContent = await readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);

      // Remove plugin if it exists
      if (config.plugins && config.plugins[name]) {
        delete config.plugins[name];

        // Write updated config
        await writeFile(configPath, JSON.stringify(config, null, 2));

        console.log(`Unregistered plugin ${name} from configuration`);
      } else {
        console.log(`Plugin ${name} not found in configuration`);
      }
    } catch (error) {
      throw new Error(`Failed to unregister plugin from config: ${error}`);
    }
  }

  /**
   * Remove plugin dependencies
   */
  private async removeDependencies(name: string): Promise<void> {
    const packageJsonPath = join(process.cwd(), "package.json");

    try {
      // Check if package.json exists
      if (!existsSync(packageJsonPath)) {
        console.log("No package.json found, skipping dependency removal");
        return;
      }

      // Read package.json
      const packageContent = await readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageContent);

      let removed = false;

      // Remove from dependencies
      if (packageJson.dependencies && packageJson.dependencies[name]) {
        delete packageJson.dependencies[name];
        removed = true;
      }

      // Remove from devDependencies
      if (packageJson.devDependencies && packageJson.devDependencies[name]) {
        delete packageJson.devDependencies[name];
        removed = true;
      }

      // Remove from peerDependencies
      if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
        delete packageJson.peerDependencies[name];
        removed = true;
      }

      if (removed) {
        // Write updated package.json
        await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`Removed dependencies for plugin ${name}`);
      } else {
        console.log(`No dependencies found for plugin ${name}`);
      }
    } catch (error) {
      throw new Error(`Failed to remove dependencies: ${error}`);
    }
  }

  /**
   * Search NPM plugins
   */
  private async searchNpmPlugins(
    query: string,
    options?: PluginSearchOptions
  ): Promise<PluginSearchResult[]> {
    try {
      const { stdout } = await execAsync(`npm search ${query} --json`);
      const results = JSON.parse(stdout);

      return results.slice(0, options?.limit || 10).map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || "",
        author: pkg.publisher?.username || "Unknown",
        keywords: pkg.keywords || [],
        downloads: pkg.downloads || 0,
        verified: false,
        source: "npm" as const,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Search marketplace plugins
   */
  private async searchMarketplacePlugins(
    query: string,
    options?: PluginSearchOptions
  ): Promise<PluginSearchResult[]> {
    try {
      // For now, search npm registry for plugins with 'lorm-plugin' keyword
      const searchQuery = `${query} keywords:lorm-plugin`;
      const { stdout } = await execAsync(`npm search "${searchQuery}" --json`);
      const results = JSON.parse(stdout);

      return results.slice(0, options?.limit || 10).map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || "",
        author: pkg.publisher?.username || "Unknown",
        keywords: pkg.keywords || [],
        downloads: pkg.downloads || 0,
        verified: pkg.keywords?.includes("lorm-plugin") || false,
        source: "marketplace" as const,
      }));
    } catch (error) {
      // If search fails, return empty results
      return [];
    }
  }

  /**
   * Get installed plugin info
   */
  private async getInstalledPluginInfo(
    name: string
  ): Promise<PluginInfo | null> {
    const pluginPath = join(this.pluginsDirectory, name);

    if (!existsSync(pluginPath)) {
      return null;
    }

    try {
      const plugin = await this.loadPluginFromPath(pluginPath);

      return {
        metadata: plugin.metadata,
        status: "installed",
        installedVersion: plugin.metadata.version,
        latestVersion: plugin.metadata.version, // Would check for updates
        dependencies: [],
        permissions: this.getDefaultPermissions(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if plugin is installed
   */
  private async isPluginInstalled(name: string): Promise<boolean> {
    const pluginPath = join(this.pluginsDirectory, name);
    return existsSync(pluginPath);
  }

  /**
   * Validate install request
   */
  private async validateInstallRequest(
    options: PluginInstallOptions
  ): Promise<void> {
    if (!options.name) {
      throw new Error("Plugin name is required");
    }

    if (!options.source) {
      throw new Error("Plugin source is required");
    }

    // Validate plugin name format
    if (!/^[a-zA-Z0-9_-]+$/.test(options.name)) {
      throw new Error("Plugin name contains invalid characters");
    }
  }

  /**
   * Build NPM auth flags
   */
  private buildNpmAuthFlags(auth?: PluginInstallOptions["auth"]): string {
    if (!auth) return "";

    const flags: string[] = [];

    if (auth.token) {
      flags.push(`--//registry.npmjs.org/:_authToken=${auth.token}`);
    }

    if (auth.username && auth.password) {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString(
        "base64"
      );
      flags.push(`--//registry.npmjs.org/:_auth=${encoded}`);
    }

    return flags.join(" ");
  }

  /**
   * Get default permissions
   */
  private getDefaultPermissions(): PluginPermissions {
    return {
      filesystem: {
        read: ["./"],
        write: ["./tmp", "./cache"],
        execute: [],
      },
      network: {
        hosts: ["registry.npmjs.org"],
        ports: [443, 80],
      },
      process: {
        spawn: false,
        env: ["NODE_ENV", "LORM_*"],
      },
      system: {
        exit: false,
        signals: false,
      },
    };
  }

  /**
   * Ensure plugins directory exists
   */
  private async ensurePluginsDirectory(): Promise<void> {
    await mkdir(this.pluginsDirectory, { recursive: true });
  }

  /**
   * Ensure installer is initialized
   */
  private ensureInitialized(): void {
    if (!this.loaderContext || !this.contextFactory) {
      throw new Error(
        "PluginInstaller not initialized. Call initialize() first."
      );
    }
  }
}
