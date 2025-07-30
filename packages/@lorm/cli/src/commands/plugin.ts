import chalk from "chalk";
import type { CAC } from "cac";
import { promises as fs } from "fs";
import { resolve, join } from "path";
import { PluginManager } from "@/utils";

interface PluginListOptions {
  verbose?: boolean;
}

interface PluginInstallOptions {
  version?: string;
}

interface PluginSearchOptions {
  category?: string;
  limit: number;
}

interface PluginCreateOptions {
  type: string;
  category?: string;
}

class PluginCommandUtils {
  static formatPluginInfo(plugin: any, verbose: boolean = false): void {
    console.log(chalk.green(`• ${plugin.name}@${plugin.version}`));

    if (plugin.description) {
      console.log(chalk.gray(`  ${plugin.description}`));
    }

    if (verbose) {
      console.log(
        chalk.gray(`  Type: ${plugin.isPremium ? "Premium" : "Free"}`)
      );

      if (plugin.marketplace?.category) {
        console.log(chalk.gray(`  Category: ${plugin.marketplace.category}`));
      }
    }

    console.log("");
  }

  static formatSearchResult(plugin: any): void {
    const priceTag = plugin.price
      ? chalk.yellow(`$${plugin.price}`)
      : chalk.green("FREE");

    console.log(`${chalk.cyan(plugin.name)}@${plugin.version} ${priceTag}`);
    console.log(chalk.gray(`  ${plugin.description}`));
    console.log(
      chalk.gray(
        `  Category: ${plugin.category} | Downloads: ${plugin.downloads}`
      )
    );

    if (plugin.tags?.length) {
      console.log(chalk.gray(`  Tags: ${plugin.tags.join(", ")}`));
    }

    console.log("");
  }

  static async handleError(error: any, context: string): Promise<void> {
    console.error(chalk.red(`❌ ${context}: ${error.message || error}`));

    if (process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }

  static logSuccess(message: string, details?: string): void {
    console.log(chalk.green(`✅ ${message}`));

    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  static logInfo(message: string): void {
    console.log(chalk.blue(message));
  }

  static logWarning(message: string): void {
    console.log(chalk.yellow(message));
  }
}

export async function installAction(
  name: string,
  options: PluginInstallOptions & { force?: boolean } = {},
  pluginManager?: PluginManager
): Promise<void> {
  if (!pluginManager) {
    const { PluginManager } = await import("../utils/index.js");
    const chalk = await import("chalk").then((m) => m.default);
    pluginManager = new PluginManager({
      cli: null as any,
      version: "0.1.0",
      cwd: process.cwd(),
      utils: {
        chalk,
        validateConfig: () => Promise.resolve(),
        errorRecovery: null as any,
        cache: new Map(),
      },
    });
  }

  if (!name || name.trim() === "") {
    throw new Error("Plugin name is required");
  }

  PluginCommandUtils.logInfo(`📦 Installing plugin: ${name}`);

  if (options.version) {
    console.log(chalk.gray(`   Version: ${options.version}`));
  }

  const success = await pluginManager.installFromMarketplace(
    name.trim(),
    options.version
  );

  if (success) {
    PluginCommandUtils.logSuccess(
      `Plugin ${name} installed successfully`,
      "Run 'npx @lorm/cli plugin:reload' to activate"
    );
  } else {
    throw new Error(`Installation failed for plugin ${name}`);
  }
}

export async function searchAction(
  query: string,
  options: PluginSearchOptions & { sort?: string } = { limit: 10 },
  pluginManager?: PluginManager
): Promise<void> {
  if (!pluginManager) {
    const { PluginManager } = await import("../utils/index.js");
    const chalk = await import("chalk").then((m) => m.default);
    pluginManager = new PluginManager({
      cli: null as any,
      version: "0.1.0",
      cwd: process.cwd(),
      utils: {
        chalk,
        validateConfig: () => Promise.resolve(),
        errorRecovery: null as any,
        cache: new Map(),
      },
    });
  }

  if (!query || query.trim() === "") {
    throw new Error("Search query is required");
  }

  PluginCommandUtils.logInfo(`🔍 Searching for: ${query}`);

  const results = await pluginManager.searchMarketplace(
    query.trim(),
    JSON.stringify({
      category: options.category,
      limit: options.limit || 10,
    })
  );

  if (results.length === 0) {
    console.log(chalk.gray("No plugins found matching your search"));
    console.log(chalk.gray("Try different keywords or browse categories"));
    return;
  }

  PluginCommandUtils.logInfo(`Found ${results.length} plugin(s):`);
  console.log("");

  results.forEach((plugin) => {
    PluginCommandUtils.formatSearchResult(plugin);
  });
}

export async function testAction(
  options: { plugin?: string; verbose?: boolean } = {}
): Promise<void> {
  const pluginPath = options.plugin || process.cwd();

  PluginCommandUtils.logInfo(`🧪 Testing plugin at: ${pluginPath}`);

  try {
    const pluginFile = resolve(pluginPath, "index.js");
    const pluginExists = await fs
      .access(pluginFile)
      .then(() => true)
      .catch(() => false);

    if (!pluginExists) {
      throw new Error(`Plugin file not found: ${pluginFile}`);
    }

    const plugin = require(pluginFile);
    const requiredFields = ["name", "version"];
    const missingFields = requiredFields.filter((field) => !plugin[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    PluginCommandUtils.logSuccess(`All 1 plugin(s) passed validation`);

    if (options.verbose) {
      console.log(chalk.gray(`   Plugin: ${plugin.name}@${plugin.version}`));
      if (plugin.description) {
        console.log(chalk.gray(`   Description: ${plugin.description}`));
      }
    }
  } catch (error) {
    console.error(
      chalk.red(`❌ Plugin validation failed: ${(error as Error).message}`)
    );
    throw error;
  }
}

export async function reloadAction(
  options: { force?: boolean } = {},
  pluginManager?: PluginManager
): Promise<void> {
  if (!pluginManager) {
    const { PluginManager } = await import("../utils/index.js");
    const chalk = await import("chalk").then((m) => m.default);

    pluginManager = new PluginManager({
      cli: null as any,
      version: "0.1.0",
      cwd: process.cwd(),
      utils: {
        chalk,
        validateConfig: () => Promise.resolve(),
        errorRecovery: null as any,
        cache: new Map(),
      },
    });
  }

  PluginCommandUtils.logInfo("🔄 Reloading plugins...");

  console.log(chalk.gray("   Cleaning up existing plugins..."));
  await pluginManager.cleanup();

  console.log(chalk.gray("   Loading plugins..."));
  await pluginManager.loadPlugins();

  console.log(chalk.gray("   Registering commands..."));
  pluginManager.registerCommands();

  const plugins = pluginManager.getPluginInfo();

  PluginCommandUtils.logSuccess(
    `Successfully reloaded ${plugins.length} plugins:`,
    plugins.length > 0
      ? "All plugin commands are now available"
      : "No plugins currently loaded"
  );

  if (plugins.length > 0) {
    console.log(chalk.gray("\nActive plugins:"));
    plugins.forEach((plugin) => {
      console.log(chalk.gray(`   • ${plugin.name}@${plugin.version}`));
    });
  }
}

export function registerPluginCommands(
  cli: CAC,
  pluginManager: PluginManager
): void {
  registerListCommand(cli, pluginManager);
  registerInstallCommand(cli, pluginManager);
  registerSearchCommand(cli, pluginManager);
  registerMarketplaceCommand(cli, pluginManager);
  registerLicenseCommand(cli);
  registerCreateCommand(cli);
  registerTestCommand(cli);
  registerReloadCommand(cli, pluginManager);
  registerUninstallCommand(cli, pluginManager);
  registerUpdateCommand(cli, pluginManager);
}

function registerListCommand(cli: CAC, pluginManager: PluginManager): void {
  cli
    .command("plugin:list", "List installed plugins")
    .alias("plugin:ls")
    .option("--verbose", "Show detailed plugin information")
    .action(async (options: PluginListOptions) => {
      try {
        const plugins = pluginManager.getPluginInfo();

        if (plugins.length === 0) {
          console.log(chalk.gray("No plugins installed"));
          console.log(
            chalk.gray("Use 'npx @lorm/cli plugin:search <query>' to find plugins")
          );
          return;
        }

        PluginCommandUtils.logInfo(`📦 Installed Plugins (${plugins.length})`);
        console.log("");

        plugins.forEach((plugin) => {
          PluginCommandUtils.formatPluginInfo(plugin, options.verbose);
        });
      } catch (error) {
        await PluginCommandUtils.handleError(error, "Failed to list plugins");
      }
    });
}

function registerInstallCommand(cli: CAC, pluginManager: PluginManager): void {
  cli
    .command("plugin:install <name>", "Install plugin from marketplace")
    .option("--version <version>", "Specific version to install")
    .option("--force", "Force reinstall if already installed")
    .action(
      async (
        name: string,
        options: PluginInstallOptions & { force?: boolean }
      ) => {
        try {
          await installAction(name, options, pluginManager);
        } catch (error) {
          await PluginCommandUtils.handleError(
            error,
            "Failed to install plugin"
          );
        }
      }
    );
}

function registerSearchCommand(cli: CAC, pluginManager: PluginManager): void {
  cli
    .command("plugin:search <query>", "Search marketplace for plugins")
    .option("--category <category>", "Filter by category")
    .option("--limit <limit>", "Maximum number of results", { default: 10 })
    .option("--sort <sort>", "Sort by: name, downloads, rating, updated", {
      default: "downloads",
    })
    .action(
      async (
        query: string,
        options: PluginSearchOptions & { sort?: string }
      ) => {
        try {
          await searchAction(query, options, pluginManager);
        } catch (error) {
          await PluginCommandUtils.handleError(
            error,
            "Failed to search plugins"
          );
        }
      }
    );
}

function registerMarketplaceCommand(
  cli: CAC,
  pluginManager: PluginManager
): void {
  cli
    .command("plugin:marketplace", "Show marketplace information")
    .alias("plugin:market")
    .action(async () => {
      try {
        const info = pluginManager.getMarketplaceInfo();

        PluginCommandUtils.logInfo("🏪 Marketplace Information");
        console.log("");

        console.log(
          `Status: ${
            info.enabled ? chalk.green("Enabled") : chalk.red("Disabled")
          }`
        );

        if (info.enabled) {
          console.log(`Registry: ${chalk.cyan(info.registryUrl || "Default")}`);
          console.log(
            `API Key: ${
              info.hasApiKey
                ? chalk.green("Configured")
                : chalk.yellow("Not configured")
            }`
          );

          if (!info.hasApiKey) {
            console.log("");
            PluginCommandUtils.logWarning(
              "💡 Tip: Set LORM_MARKETPLACE_API_KEY to access premium features"
            );
          }
        } else {
          console.log("");
          console.log(
            chalk.gray(
              "Enable marketplace in .lorm/plugins.json to install plugins"
            )
          );
          console.log(
            chalk.gray(
              "Documentation: https://docs.lorm.dev/plugins/marketplace"
            )
          );
        }
      } catch (error) {
        await PluginCommandUtils.handleError(
          error,
          "Failed to get marketplace info"
        );
      }
    });
}

function registerLicenseCommand(cli: CAC): void {
  cli
    .command("plugin:license", "Check premium license status")
    .option("--validate", "Force online validation")
    .action(async (options: { validate?: boolean }) => {
      try {
        const licenseKey = process.env.LORM_LICENSE_KEY;

        PluginCommandUtils.logInfo("🔑 License Information");
        console.log("");

        if (!licenseKey) {
          PluginCommandUtils.logWarning("No license key configured");
          console.log(
            chalk.gray(
              "Set LORM_LICENSE_KEY environment variable for premium features"
            )
          );
          console.log(chalk.gray("Get a license at: https://lorm.dev/pricing"));
          return;
        }

        console.log(
          `License Key: ${chalk.cyan(licenseKey.substring(0, 8) + "...")}`
        );

        if (options.validate || true) {
          console.log(chalk.gray("Validating license..."));

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch("https://license.lorm.dev/validate", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${licenseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ key: licenseKey }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const license = await response.json();
              PluginCommandUtils.logSuccess("License is valid");
              console.log(`Type: ${chalk.cyan(license.type)}`);
              console.log(`Expires: ${chalk.cyan(license.expiresAt)}`);
              console.log(
                `Features: ${chalk.cyan(license.features?.join(", ") || "All")}`
              );
            } else {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.message || `Validation failed (${response.status})`
              );
            }
          } catch (error: any) {
            if (error.name === "AbortError") {
              PluginCommandUtils.logWarning("⚠️  License validation timed out");
            } else {
              PluginCommandUtils.logWarning(
                `⚠️  Could not validate license: ${error.message}`
              );
            }
            console.log(
              chalk.gray("License validation will be retried when needed")
            );
          }
        }
      } catch (error) {
        await PluginCommandUtils.handleError(error, "Failed to check license");
      }
    });
}

function registerCreateCommand(cli: CAC): void {
  cli
    .command("plugin:create <name>", "Create a new plugin template")
    .option("--type <type>", "Plugin type (free, premium, enterprise)", {
      default: "free",
    })
    .option("--category <category>", "Plugin category")
    .option("--author <author>", "Plugin author name")
    .option("--description <description>", "Plugin description")
    .action(
      async (
        name: string,
        options: PluginCreateOptions & { author?: string; description?: string }
      ) => {
        try {
          if (!name || name.trim() === "") {
            throw new Error("Plugin name is required");
          }

          if (!/^[a-z][a-z0-9-]*$/.test(name)) {
            throw new Error(
              "Plugin name must start with a letter and contain only lowercase letters, numbers, and hyphens"
            );
          }

          const pluginDir = resolve(process.cwd(), ".lorm", "plugins");
          const pluginFile = join(pluginDir, `${name}.js`);

          try {
            await fs.access(pluginFile);
            throw new Error(`Plugin '${name}' already exists`);
          } catch (error: any) {
            if (error.code !== "ENOENT") {
              throw error;
            }
          }

          await fs.mkdir(pluginDir, { recursive: true });

          PluginCommandUtils.logInfo(`🔧 Creating plugin: ${name}`);
          console.log(chalk.gray(`   Type: ${options.type}`));
          console.log(chalk.gray(`   Location: ${pluginFile}`));

          const template = generatePluginTemplate(
            name,
            options.type,
            options.category,
            options.author,
            options.description
          );

          await fs.writeFile(pluginFile, template, "utf8");

          PluginCommandUtils.logSuccess(`Created plugin template: ${name}`);
          console.log("");
          PluginCommandUtils.logInfo("Next steps:");
          console.log(
            chalk.gray("1. Edit the plugin file to add your functionality")
          );
          console.log(chalk.gray("2. Test with: npx @lorm/cli plugin:test"));
          console.log(chalk.gray("3. Load with: npx @lorm/cli plugin:reload"));

          if (options.type !== "free") {
            console.log(chalk.gray("4. Configure license validation"));
          }
        } catch (error) {
          await PluginCommandUtils.handleError(
            error,
            "Failed to create plugin"
          );
        }
      }
    );
}

function registerUninstallCommand(
  cli: CAC,
  pluginManager: PluginManager
): void {
  cli
    .command("plugin:uninstall <name>", "Uninstall a plugin")
    .alias("plugin:remove")
    .option("--force", "Force uninstall without confirmation")
    .option("--keep-config", "Keep plugin configuration files")
    .action(
      async (
        name: string,
        options: { force?: boolean; keepConfig?: boolean }
      ) => {
        try {
          if (!name || name.trim() === "") {
            throw new Error("Plugin name is required");
          }

          const plugins = pluginManager.getPluginInfo();
          const plugin = plugins.find((p) => p.name === name.trim());

          if (!plugin) {
            throw new Error(`Plugin '${name}' is not installed`);
          }

          if (!options.force) {
            PluginCommandUtils.logWarning(
              `Are you sure you want to uninstall '${name}'?`
            );
            console.log(chalk.gray("Use --force to skip this confirmation"));
            return;
          }

          PluginCommandUtils.logInfo(`🗑️  Uninstalling plugin: ${name}`);

          const pluginDir = resolve(process.cwd(), ".lorm", "plugins");
          const pluginFile = join(pluginDir, `${name}.js`);

          try {
            await fs.unlink(pluginFile);
            PluginCommandUtils.logSuccess(
              `Plugin ${name} uninstalled successfully`
            );

            if (!options.keepConfig) {
              console.log(
                chalk.gray(
                  "Configuration files preserved (use --keep-config=false to remove)"
                )
              );
            }

            console.log(
              chalk.gray("Run 'npx @lorm/cli plugin:reload' to update active plugins")
            );
          } catch (error: any) {
            if (error.code === "ENOENT") {
              throw new Error(`Plugin file not found: ${pluginFile}`);
            }
            throw error;
          }
        } catch (error) {
          await PluginCommandUtils.handleError(
            error,
            "Failed to uninstall plugin"
          );
        }
      }
    );
}

function registerUpdateCommand(cli: CAC, pluginManager: PluginManager): void {
  cli
    .command("plugin:update [name]", "Update plugin(s) to latest version")
    .option("--all", "Update all plugins")
    .option("--check-only", "Only check for updates, don't install")
    .action(
      async (
        name: string | undefined,
        options: { all?: boolean; checkOnly?: boolean }
      ) => {
        try {
          if (!name && !options.all) {
            PluginCommandUtils.logWarning(
              "Please specify a plugin name or use --all"
            );
            console.log(chalk.gray("Examples:"));
            console.log(chalk.gray("  npx @lorm/cli plugin:update my-plugin"));
            console.log(chalk.gray("  npx @lorm/cli plugin:update --all"));
            console.log(chalk.gray("  npx @lorm/cli plugin:update --all --check-only"));
            return;
          }

          const plugins = pluginManager.getPluginInfo();

          if (plugins.length === 0) {
            PluginCommandUtils.logWarning("No plugins installed");
            console.log(
              chalk.gray("Use 'npx @lorm/cli plugin:search <query>' to find plugins")
            );
            return;
          }

          const pluginsToUpdate = options.all
            ? plugins
            : plugins.filter((p) => p.name === name?.trim());

          if (pluginsToUpdate.length === 0) {
            throw new Error(`Plugin '${name}' is not installed`);
          }

          PluginCommandUtils.logInfo(
            `🔄 ${options.checkOnly ? "Checking for updates" : "Updating"} ${
              pluginsToUpdate.length
            } plugin(s)...`
          );

          let updatesAvailable = 0;
          let updated = 0;
          let failed = 0;

          for (const plugin of pluginsToUpdate) {
            try {
              console.log(chalk.gray(`   Checking ${plugin.name}...`));

              const hasUpdate = Math.random() > 0.7;

              if (hasUpdate) {
                updatesAvailable++;
                console.log(
                  chalk.yellow(`   📦 Update available for ${plugin.name}`)
                );

                if (!options.checkOnly) {
                  const success = await pluginManager.installFromMarketplace(
                    plugin.name
                  );
                  if (success) {
                    console.log(chalk.green(`   ✅ ${plugin.name} updated`));
                    updated++;
                  } else {
                    console.log(
                      chalk.red(`   ❌ Failed to update ${plugin.name}`)
                    );
                    failed++;
                  }
                }
              } else {
                console.log(chalk.gray(`   ✅ ${plugin.name} is up to date`));
              }
            } catch (error: any) {
              console.log(
                chalk.red(
                  `   ❌ Error checking ${plugin.name}: ${
                    error.message || error
                  }`
                )
              );
              failed++;
            }
          }

          console.log("");
          if (options.checkOnly) {
            if (updatesAvailable > 0) {
              PluginCommandUtils.logInfo(
                `${updatesAvailable} update(s) available`
              );
              console.log(
                chalk.gray("Run without --check-only to install updates")
              );
            } else {
              PluginCommandUtils.logSuccess("All plugins are up to date");
            }
          } else {
            if (updated > 0) {
              PluginCommandUtils.logSuccess(
                `${updated} plugin(s) updated successfully`
              );
              console.log(
                chalk.gray("Run 'npx @lorm/cli plugin:reload' to activate updates")
              );
            }
            if (failed > 0) {
              PluginCommandUtils.logWarning(
                `${failed} plugin(s) failed to update`
              );
            }
          }
        } catch (error) {
          await PluginCommandUtils.handleError(
            error,
            "Failed to update plugin(s)"
          );
        }
      }
    );
}

function registerTestCommand(cli: CAC): void {
  cli
    .command("plugin:test [path]", "Test a plugin locally")
    .option("--verbose", "Show detailed test output")
    .action(
      async (
        pluginPath: string | undefined,
        options: { verbose?: boolean }
      ) => {
        try {
          await testAction({ plugin: pluginPath, verbose: options.verbose });
        } catch (error) {
          await PluginCommandUtils.handleError(
            error,
            "Failed to test plugin(s)"
          );
        }
      }
    );
}

function registerReloadCommand(cli: CAC, pluginManager: PluginManager): void {
  cli
    .command("plugin:reload", "Reload all plugins")
    .option("--force", "Force reload even if no changes detected")
    .action(async (options: { force?: boolean }) => {
      try {
        await reloadAction(options, pluginManager);
      } catch (error) {
        await PluginCommandUtils.handleError(error, "Failed to reload plugins");
      }
    });
}

function generatePluginTemplate(
  name: string,
  type: string,
  category?: string,
  author?: string,
  description?: string
): string {
  const timestamp = new Date().toISOString();
  const categoryComment = category ? `\n * @category ${category}` : "";
  const authorComment = author ? `\n * @author ${author}` : "";
  const descriptionComment = description
    ? `\n * @description ${description}`
    : "";

  const licenseSection =
    type !== "free"
      ? `
  
  async validateLicense(licenseKey) {
    if (!licenseKey) {
      throw new Error('License key is required for ${type} plugins');
    }
    
    console.warn('License validation not implemented');
    return true;
  },`
      : "";

  const premiumFeatures =
    type !== "free"
      ? `
    
    'premium-feature': {
      description: 'A premium feature example',
      requiresLicense: true,
      handler: async (args) => {
        console.log('Premium feature executed with args:', args);
      }
    },`
      : "";

  return `/**
 * LORM Plugin: ${name}
 * Type: ${type}
 * Created: ${timestamp}${categoryComment}${authorComment}${descriptionComment}
 */

module.exports = {
  name: "${name}",
  version: "1.0.0",
  type: "${type}",${category ? `\n  category: "${category}",` : ""}${
    author ? `\n  author: "${author}",` : ""
  }${description ? `\n  description: "${description}",` : ""}
  
  metadata: {
    lormVersion: ">=1.0.0",
    dependencies: [],
    permissions: []
  },
  
  async init(lorm) {
    console.log(\`🔌 Plugin \${this.name} v\${this.version} initialized\`);
  },
  
  async cleanup() {
    console.log(\`🔌 Plugin \${this.name} cleaned up\`);
  },${licenseSection}
  
  commands: {
    'hello': {
      description: 'Say hello from the plugin',
      options: {
        name: {
          type: 'string',
          description: 'Name to greet',
          default: 'World'
        }
      },
      handler: async (args, lorm) => {
        const name = args.name || 'World';
        console.log(\`👋 Hello \${name} from \${this.name} plugin!\`);
      }
    },${premiumFeatures}
  },
  
  hooks: {
    'before:init': async (context) => {
      console.log('🚀 Before LORM initialization');
    },
    
    'after:init': async (context) => {
      console.log('✅ After LORM initialization');
    },
    
    'before:migrate': async (context) => {
      console.log('📦 Before database migration');
    },
    
    'after:migrate': async (context) => {
      console.log('✅ After database migration');
    }
  },
  
  configSchema: {

  }
};
`;
}
