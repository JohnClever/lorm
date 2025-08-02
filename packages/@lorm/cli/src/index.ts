import { cac } from "cac";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";
import * as path from "path";
import * as util from "util";
import * as https from "https";
import * as http from "http";
import * as urlModule from "url";
import * as crypto from "crypto";
import {
  PluginManager,
  PluginContextFactory,
  PluginValidationService,
  OptimizedPluginLoader,
  PerformanceManager,
  PerformanceMonitor,
  PluginLifecycleManager,
  SimplePluginBuilder,
  createSimplePlugin,
  DEFAULT_PERFORMANCE_CONFIG
} from "@lorm/core";
import {
  warmCache,
  getCommandPrefix,
} from "@/utils";

import { createCorePlugins } from "./plugins/core-plugins";
import { createCachePlugins } from "./plugins/cache-plugins";
import { createDbPlugins } from "./plugins/db-plugins";
import { createPluginManagementPlugin } from "./plugins/plugin-management";
import { createSecurityPlugins } from "./plugins/security-plugins";
import { createUtilityPlugins } from "./plugins/utility-plugins";
import { convertSimplePlugin } from "@lorm/core";
// Initialize plugin system
const performanceConfig = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  enabled: true,
  logPath: "./logs/performance.log",
  maxLogSize: 10 * 1024 * 1024,
  retentionDays: 30,
  slowCommandThreshold: 1000,
  memoryWarningThreshold: 100 * 1024 * 1024,
};

const performanceManager = new PerformanceManager(performanceConfig);
const pluginLoader = new OptimizedPluginLoader(performanceConfig);
const validationService = new PluginValidationService();
// Create a mock telemetry service for lifecycle manager
const mockTelemetry = {
  track: () => {},
  identify: () => {},
  group: () => {},
  page: () => {},
  increment: () => {},
  gauge: () => {},
  timing: () => {},
  createSpan: () => ({ 
    end: () => {}, 
    setTag: () => {}, 
    setStatus: () => {},
    setError: () => {},
    finish: () => {},
    getDuration: () => 0
  }),
  recordMetric: () => {},
  recordEvent: () => {},
  flush: async () => {},
  configure: () => {}
};
const lifecycleManager = new PluginLifecycleManager(mockTelemetry);

// Create a mock runtime adapter for PluginManager
const mockRuntimeAdapter = {
  registerCommand: () => {},
  unregisterCommand: () => {},
  executeCommand: async () => ({ success: true, data: null }),
  registerHook: () => {},
  unregisterHook: () => {},
  cleanup: async () => {},
  lifecycle: {
    getCurrentState: () => lifecycleManager.getState('default'),
    getState: () => lifecycleManager.getState('default'),
    transition: async (newState: any) => await lifecycleManager.transition('default', newState),
    onStateChange: (callback: any) => lifecycleManager.onStateChange('default', callback),
    executeLifecycleHook: async (hook: any, ...args: any[]) => {
      // Mock implementation
      return Promise.resolve();
    }
  },
  state: {
    keys: () => [],
    get: () => undefined,
    set: () => {},
    delete: () => false,
    has: () => false,
    clear: () => {},
    size: 0
  },
  dependencies: undefined,
  createLogger: () => {
    const createLoggerInstance = (): any => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      trace: () => {},
      child: createLoggerInstance
    });
    return createLoggerInstance();
  },
  logger: undefined,
  getPluginsDirectory: () => './plugins',
  getPluginCacheDirectory: () => './cache',
  getPluginConfigDirectory: () => './config',
  loadConfig: async <T>(): Promise<T> => ({} as T),
  saveConfig: async () => {},
  getEnvironmentInfo: () => ({
    platform: 'cli',
    version: '1.0.0',
    runtime: 'cli' as const
  }),
  environment: {
    cwd: process.cwd(),
    fs: {},
    path: {
      join: (...paths: string[]) => path.join(...paths),
      resolve: (...paths: string[]) => path.resolve(...paths),
      dirname: (pathStr: string) => path.dirname(pathStr),
      basename: (pathStr: string, ext?: string) => path.basename(pathStr, ext),
      extname: (pathStr: string) => path.extname(pathStr),
      isAbsolute: (pathStr: string) => path.isAbsolute(pathStr),
      relative: (from: string, to: string) => path.relative(from, to),
      normalize: (pathStr: string) => path.normalize(pathStr)
    },
    crypto: {
      randomBytes: (size: number) => crypto.randomBytes(size),
      createHash: (algorithm: string) => crypto.createHash(algorithm),
      createHmac: (algorithm: string, key: string) => crypto.createHmac(algorithm, key),
      pbkdf2: async (password: string, salt: string, iterations: number, keylen: number, digest: string): Promise<Buffer> => {
        return new Promise<Buffer>((resolve, reject) => {
          crypto.pbkdf2(password, salt, iterations, keylen, digest, (err: any, derivedKey: Buffer) => {
            if (err) reject(err);
            else resolve(derivedKey);
          });
        });
      }
    },
    http: {
      get: async (url: string, options?: any): Promise<any> => {
         const parsedUrl = urlModule.parse(url);
         const client = parsedUrl.protocol === 'https:' ? https : http;
         return new Promise((resolve, reject) => {
           const req = client.request(url, { method: 'GET', ...options }, (res: any) => {
             let data = '';
             res.on('data', (chunk: any) => data += chunk);
             res.on('end', () => resolve({ 
               status: res.statusCode, 
               statusText: res.statusMessage || '', 
               data, 
               headers: res.headers || {} 
             }));
           });
           req.on('error', reject);
           req.end();
         });
       },
      post: async (url: string, data?: unknown, options?: any): Promise<any> => {
         const parsedUrl = urlModule.parse(url);
         const client = parsedUrl.protocol === 'https:' ? https : http;
         const postData = JSON.stringify(data);
         return new Promise((resolve, reject) => {
           const req = client.request(url, { method: 'POST', ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } }, (res: any) => {
             let responseData = '';
             res.on('data', (chunk: any) => responseData += chunk);
             res.on('end', () => resolve({ 
               status: res.statusCode, 
               statusText: res.statusMessage || '', 
               data: responseData, 
               headers: res.headers || {} 
             }));
           });
           req.on('error', reject);
           if (postData) req.write(postData);
           req.end();
         });
       },
      put: async (url: string, data?: unknown, options?: any): Promise<any> => {
         const parsedUrl = urlModule.parse(url);
         const client = parsedUrl.protocol === 'https:' ? https : http;
         const putData = JSON.stringify(data);
         return new Promise((resolve, reject) => {
           const req = client.request(url, { method: 'PUT', ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } }, (res: any) => {
             let responseData = '';
             res.on('data', (chunk: any) => responseData += chunk);
             res.on('end', () => resolve({ 
               status: res.statusCode, 
               statusText: res.statusMessage || '', 
               data: responseData, 
               headers: res.headers || {} 
             }));
           });
           req.on('error', reject);
           if (putData) req.write(putData);
           req.end();
         });
       },
      delete: async (url: string, options?: any): Promise<any> => {
         const parsedUrl = urlModule.parse(url);
         const client = parsedUrl.protocol === 'https:' ? https : http;
         return new Promise((resolve, reject) => {
           const req = client.request(url, { method: 'DELETE', ...options }, (res: any) => {
             let data = '';
             res.on('data', (chunk: any) => data += chunk);
             res.on('end', () => resolve({ 
               status: res.statusCode, 
               statusText: res.statusMessage || '', 
               data, 
               headers: res.headers || {} 
             }));
           });
           req.on('error', reject);
           req.end();
         });
       }
    },
    chalk: {
       red: (text: string) => `\x1b[31m${text}\x1b[0m`,
       green: (text: string) => `\x1b[32m${text}\x1b[0m`,
       blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
       yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
       cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
       magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
       white: (text: string) => `\x1b[37m${text}\x1b[0m`,
       gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
       bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
       italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
       underline: (text: string) => `\x1b[4m${text}\x1b[0m`
     }
  },
  cli: undefined,
  path: {
    join: (...paths: string[]) => {
      return path.join(...paths);
    },
    resolve: (...paths: string[]) => {
      return path.resolve(...paths);
    },
    dirname: (p: string) => {
      return path.dirname(p);
    },
    basename: (p: string, ext?: string) => {
      return path.basename(p, ext);
    },
    extname: (p: string) => {
      return path.extname(p);
    },
    isAbsolute: (p: string) => {
      return path.isAbsolute(p);
    },
    relative: (from: string, to: string) => {
      return path.relative(from, to);
    },
    normalize: (p: string) => {
      return path.normalize(p);
    },
    sep: path.sep,
    delimiter: path.delimiter
  },
  utils: {
    executeHook: async (name: string, ...args: unknown[]) => {
      // Mock implementation - return empty array
      return [];
    },
    validateConfig: <T extends Record<string, unknown>>(config: T, schema?: any) => {
      // Mock implementation - always return valid
      return { valid: true, errors: [] };
    },
    createCommand: (command: any) => {
      // Mock implementation - return command with pluginName
      return { ...command, pluginName: 'mock-plugin' };
    },
    createHook: (hook: any) => {
      // Mock implementation - return hook with pluginName
      return { ...hook, pluginName: 'mock-plugin' };
    }
  },
  telemetry: mockTelemetry,
  sandbox: undefined,
  emit: () => {},
  on: () => {},
  off: () => {},
  loader: pluginLoader,
  validator: validationService,
  performanceManager: performanceManager,
  contextFactory: null as any
};

const contextFactory = new PluginContextFactory(mockRuntimeAdapter, './plugins');
(mockRuntimeAdapter as any).contextFactory = contextFactory;
const pluginManager = new PluginManager(mockRuntimeAdapter);

const getChalk = async () => {
  const chalk = await import("chalk");
  return chalk.default;
};

const cli = cac("lorm");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8")
);
// Register plugins
const registerPlugins = async () => {
  try {
    // Initialize plugin manager first
    await pluginManager.initialize();
    // Plugin manager initialized

    // Helper function to register a plugin
    const registerPlugin = (simplePlugin: any) => {
      // Registering plugin
      const fullPlugin = convertSimplePlugin(simplePlugin);
      (pluginManager as any).plugins.set(fullPlugin.name, fullPlugin);
      (pluginManager as any).pluginStates.set(fullPlugin.name, 'enabled');
      // Plugin added to manager
      
      // Register commands
      if (fullPlugin.commands) {
        for (const command of fullPlugin.commands) {
          pluginManager.registerCommand(command);
        }
      }
    };

    // Create and register core plugins
    // Creating core plugins
    const corePlugins = await createCorePlugins();
    // Created core plugins
    for (const plugin of corePlugins) {
      registerPlugin(plugin);
    }

    // Create and register database plugins
    // Creating database plugins
    const dbPlugins = await createDbPlugins();
    // Created database plugins
    for (const plugin of dbPlugins) {
      registerPlugin(plugin);
    }

    // Create and register utility plugins
    // Creating utility plugins
    const utilityPlugins = await createUtilityPlugins();
    // Created utility plugins
    for (const plugin of utilityPlugins) {
      registerPlugin(plugin);
    }

    // Create and register security plugins
    // Creating security plugins
    const securityPlugins = await createSecurityPlugins();
    // Created security plugins
    for (const plugin of securityPlugins) {
      registerPlugin(plugin);
    }

    // Create and register cache plugins
    // Creating cache plugins
    const cachePlugins = await createCachePlugins();
    // Created cache plugins
    for (const plugin of cachePlugins) {
      registerPlugin(plugin);
    }

    // Create and register plugin management plugin
    // Creating plugin management plugin
    const pluginManagementPlugin = createPluginManagementPlugin();
    // Created plugin management plugin
    registerPlugin(pluginManagementPlugin);
  } catch (error) {
    console.error('Failed to register plugins:', error);
    throw error;
  }
};

// Flag to prevent main() from running when help is requested
let isHelpRequested = false;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  isHelpRequested = true;
  (async () => {
    await registerPlugins();
    const { createPluginDynamicHelp } = await import("./utils/plugin-dynamic-help.js");
    const helpGenerator = createPluginDynamicHelp(pluginManager);

    // Check if help is requested for a specific command
    const helpIndex = process.argv.findIndex(
      (arg) => arg === "--help" || arg === "-h"
    );
    const commandName = helpIndex > 0 ? process.argv[helpIndex - 1] : null;

    // Filter out file paths and invalid command names
    const isValidCommandName =
      commandName &&
      commandName !== "lorm" &&
      !commandName.startsWith("-") &&
      !commandName.includes("/") &&
      !commandName.endsWith(".js");

    if (isValidCommandName) {
      // Try to find the command in registered plugins
      const pluginInfos = await pluginManager.list();
      let foundCommand = null;

      for (const pluginInfo of pluginInfos) {
        const plugin = pluginManager.getPlugin(pluginInfo.name as any);
        if (plugin && plugin.commands) {
          for (const command of plugin.commands) {
            if (command.name === commandName || 
                command.name.startsWith(commandName + " ") ||
                command.name.startsWith(commandName + ":")) {
              foundCommand = { plugin, command };
              break;
            }
          }
        }
        if (foundCommand) break;
      }

      if (foundCommand) {
        await helpGenerator.displayCommandHelp(foundCommand.command.name);
      } else {
        await helpGenerator.displayCommandHelp(commandName);
      }
    } else {
      await helpGenerator.displayGeneralHelp();
    }
    process.exit(0);
  })();
}
cli.on("command:*", async () => {
  const chalk = await getChalk();
  const commandPrefix = getCommandPrefix();
  console.error(chalk.red(`Unknown command: ${cli.args[0]}`));
  console.log(
    chalk.gray(
      `\nRun '${commandPrefix} @lorm/cli help' to see available commands`
    )
  );
  process.exit(1);
});
cli.version(packageJson.version);
const main = async () => {
  // Don't run main if help was requested
  if (isHelpRequested) {
    return;
  }

  try {
    await warmCache("high");

    // Register all plugins before parsing CLI
    await registerPlugins();

    // Register plugin commands with CLI
    const pluginInfos = await pluginManager.list();
    // Found plugins
    
    for (const pluginInfo of pluginInfos) {
      const plugin = pluginManager.getPlugin(pluginInfo.name as any);
      // Processing plugin
      
      if (plugin && plugin.commands) {
        for (const command of plugin.commands) {
          // Registering command
          
          // Check if command expects positional arguments based on description or name
          let commandSignature = command.name as string;
          if (command.name === 'plugin:install') {
            commandSignature = 'plugin:install <plugin-name>';
          } else if (command.name === 'plugin:uninstall') {
            commandSignature = 'plugin:uninstall <plugin-name>';
          } else if (command.name === 'plugin:info') {
            commandSignature = 'plugin:info <plugin-name>';
          } else if (command.name === 'plugin:search') {
            commandSignature = 'plugin:search [query]';
          } else if (command.name === 'db:generate') {
            commandSignature = 'db:generate <migration-name>';
          }
          
          const cliCommand = cli.command(commandSignature, command.description || '');
          
          // Add options if available
          if (command.options) {
            for (const option of command.options) {
              const flags = option.flags ? option.flags.join(', ') : `--${option.name}`;
              if (option.default !== undefined) {
                 cliCommand.option(flags, option.description, { default: option.default });
               } else {
                 cliCommand.option(flags, option.description);
               }
            }
          }
          
          // Set action handler with proper exit handling
          cliCommand.action(async (...allArgs) => {
            try {
              // Create context using the async method
              const context = await contextFactory.createContext(
                plugin.name as any,
                plugin as any,
                {}
              );
              
              // Extract options (last argument) and positional arguments
              const options = allArgs[allArgs.length - 1] || {};
              const positionalArgs = allArgs.slice(0, -1);
              
              // Create args object with positional arguments and options
              const argsObject = {
                ...options,
                _: positionalArgs // Store positional args in underscore property
              };
              
              // Execute the command handler
              await command.handler(argsObject, options, context);
              
              // Exit cleanly after command completion
              process.exit(0);
            } catch (error) {
              console.error(`Command '${command.name}' failed:`, error);
              process.exit(1);
            }
          });
        }
      }
    }

    // Register the check command
    cli.command('check', 'Run configuration validation checks')
      .action(async () => {
        try {
          await check();
        } catch (error) {
          console.error('Check command failed:', error);
          process.exit(1);
        }
      });

    // Parse CLI after all commands are registered
    cli.parse(process.argv);

    if (process.argv.length <= 2) {
      console.log("LORM CLI - Use --help for available commands");
      process.exit(0);
    }
    // Note: Removed automatic exit to allow commands to complete and display output
  } catch (error) {
    throw error;
  }
};
main().catch(console.error);
export const check = async () => {
  const { validateConfig, displayValidationResults } = await import("./utils/config-validator.js");
  console.log("🔍 Running configuration check...");
  
  const result = await validateConfig({
    requireConfig: false,
    requireSchema: false,
    requireRouter: false,
    checkDatabase: false,
    checkDependencies: true,
    checkEnvironment: true,
    autoFix: false,
  });
  
  displayValidationResults(result);
  
  if (!result.isValid) {
    console.error("\nConfiguration check failed.");
    process.exit(1);
  } else {
    console.log("\n✅ Configuration check completed successfully.");
    process.exit(0);
  }
  
  return result;
};
export const performanceMonitor = PerformanceMonitor.getInstance();
