import { PluginValidationConfig, PluginContext } from '@/types';

// Define PluginDiscoveryConfig locally since it's not exported from @lorm/core
interface PluginDiscoveryConfig {
  paths: string[];
  patterns: string[];
  exclude: string[];
  maxDepth: number;
  followSymlinks: boolean;
}

// Define PluginLifecycleHooks locally since it might not be exported from @lorm/core
interface PluginLifecycleHooks {
  beforeLoad?: (pluginName: string) => Promise<void>;
  afterLoad?: (pluginName: string, plugin: any) => Promise<void>;
  beforeExecute?: (context: PluginContext) => Promise<void>;
  afterExecute?: (context: PluginContext, result: any) => Promise<void>;
  onError?: (pluginName: string, error: Error) => Promise<void>;
  beforeUnload?: (pluginName: string) => Promise<void>;
  afterUnload?: (pluginName: string) => Promise<void>;
}

// Plugin Discovery Configuration
export const PLUGIN_DISCOVERY_CONFIG: PluginDiscoveryConfig = {
  paths: [
    './src/plugins',
    './plugins',
    './node_modules/@lorm/plugins-*',
    './node_modules/lorm-plugin-*',
  ],
  patterns: [
    '**/*-plugin.{js,ts}',
    '**/*-plugins.{js,ts}',
    '**/plugin.{js,ts}',
    '**/index.{js,ts}',
  ],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{js,ts}',
    '**/*.spec.{js,ts}',
  ],
  maxDepth: 3,
  followSymlinks: false,
};

// Plugin Validation Rules
export const PLUGIN_VALIDATION_CONFIG: PluginValidationConfig = {
  requireConfig: false,
  requireSchema: false,
  allowedCategories: [
    'core',
    'database',
    'development',
    'utility',
    'security',
  ],
  maxPlugins: 100,
};

// Plugin Lifecycle Hooks
export const PLUGIN_LIFECYCLE_HOOKS: PluginLifecycleHooks = {
  beforeLoad: async (pluginName: string) => {
    console.log(`🔌 Loading plugin: ${pluginName}`);
  },
  
  afterLoad: async (pluginName: string, plugin: any) => {
    console.log(`✅ Plugin loaded: ${pluginName}`);
    if (plugin.metadata?.version) {
      console.log(`   Version: ${plugin.metadata.version}`);
    }
  },
  
  beforeExecute: async (context: PluginContext) => {
    console.log(`🚀 Executing plugin: ${context.pluginName}`);
    if (context.category) {
      console.log(`   Category: ${context.category}`);
    }
  },
  
  afterExecute: async (context: PluginContext, result: any) => {
    const duration = Date.now() - context.timestamp;
    console.log(`✨ Plugin executed: ${context.pluginName} (${duration}ms)`);
    if (result?.success === false) {
      console.error(`❌ Plugin failed: ${result.error}`);
    }
  },
  
  onError: async (pluginName: string, error: Error) => {
    console.error(`💥 Plugin error in ${pluginName}:`, error.message);
  },
  
  beforeUnload: async (pluginName: string) => {
    console.log(`🔄 Unloading plugin: ${pluginName}`);
  },
  
  afterUnload: async (pluginName: string) => {
    console.log(`👋 Plugin unloaded: ${pluginName}`);
  },
};

// Plugin Performance Configuration
export const PLUGIN_PERFORMANCE_CONFIG = {
  enableTelemetry: true,
  enableProfiling: process.env.NODE_ENV === 'development',
  maxExecutionTime: 30000, // 30 seconds
  memoryThreshold: 100 * 1024 * 1024, // 100MB
  enableCaching: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// Plugin Security Configuration
export const PLUGIN_SECURITY_CONFIG = {
  enableSandbox: false, // Disabled for CLI plugins
  allowedModules: [
    'fs',
    'path',
    'os',
    'util',
    'crypto',
    'child_process',
    'chalk',
    'commander',
    'cac',
  ],
  blockedModules: [
    'vm',
    'cluster',
    'worker_threads',
  ],
  enableAuditLog: true,
  maxPluginSize: 10 * 1024 * 1024, // 10MB
};

// Plugin Development Configuration
export const PLUGIN_DEV_CONFIG = {
  enableHotReload: process.env.NODE_ENV === 'development',
  watchPaths: [
    './src/plugins',
    './plugins',
  ],
  watchExtensions: ['.js', '.ts', '.json'],
  debounceDelay: 300,
  enableSourceMaps: true,
};

// Combined Plugin Configuration
export const PLUGIN_CONFIG = {
  discovery: PLUGIN_DISCOVERY_CONFIG,
  validation: PLUGIN_VALIDATION_CONFIG,
  lifecycle: PLUGIN_LIFECYCLE_HOOKS,
  performance: PLUGIN_PERFORMANCE_CONFIG,
  security: PLUGIN_SECURITY_CONFIG,
  development: PLUGIN_DEV_CONFIG,
};

export default PLUGIN_CONFIG;