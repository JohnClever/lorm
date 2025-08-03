import { parse as parseYaml } from 'yaml';
import type { ProjectContext } from '../utils/project-detection.js';
import { loadConfigFromSources, type ConfigParser } from '../utils/file-operations.js';

/**
 * LORM CLI v2 Configuration Interface
 */
export interface LormConfig {
  plugins: {
    builtin: string[];
    npm: Record<string, string>;
    local: string[];
    marketplace: Record<string, {
      version: string;
      license: 'free' | 'premium' | 'freemium';
      apiKey?: string;
    }>;
  };
  cache: {
    enabled: boolean;
    strategy: 'memory' | 'disk' | 'hybrid';
    ttl: number;
    maxSize?: number;
  };
  performance: {
    monitoring: boolean;
    profiling: boolean;
  };
  security: {
    sandboxing: boolean;
    allowedPaths: string[];
    allowedNetworkHosts: string[];
  };
}

/**
 * Default configuration for LORM CLI v2
 */
const DEFAULT_CONFIG: LormConfig = {
  plugins: {
    builtin: ['db', 'scaffold', 'dev'],
    npm: {},
    local: [],
    marketplace: {}
  },
  cache: {
    enabled: true,
    strategy: 'hybrid',
    ttl: 3600,
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  performance: {
    monitoring: process.env['NODE_ENV'] === 'development',
    profiling: false
  },
  security: {
    sandboxing: true,
    allowedPaths: [],
    allowedNetworkHosts: ['localhost', '127.0.0.1']
  }
};

/**
 * Load configuration from various sources
 * Priority: .lormrc.yml > .lormrc.json > package.json > defaults
 */
export async function loadConfig(projectContext: ProjectContext): Promise<LormConfig> {
  const configSources: ConfigParser<any>[] = [
    { file: '.lormrc.yml', parser: (content: string) => parseYaml(content) },
    { file: '.lormrc.yaml', parser: (content: string) => parseYaml(content) },
    { file: '.lormrc.json', parser: JSON.parse },
    { file: '.lormrc', parser: JSON.parse },
    { file: 'package.json', parser: JSON.parse, key: 'lorm' }
  ];

  const config = await loadConfigFromSources(
    projectContext.root,
    configSources,
    DEFAULT_CONFIG
  );

  // If we got a partial config, merge it with defaults
  if (config !== DEFAULT_CONFIG) {
    return mergeConfig(DEFAULT_CONFIG, config);
  }

  return DEFAULT_CONFIG;
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(defaultConfig: LormConfig, userConfig: Partial<LormConfig>): LormConfig {
  return {
    plugins: {
      builtin: userConfig.plugins?.builtin ?? defaultConfig.plugins.builtin,
      npm: { ...defaultConfig.plugins.npm, ...userConfig.plugins?.npm },
      local: userConfig.plugins?.local ?? defaultConfig.plugins.local,
      marketplace: { ...defaultConfig.plugins.marketplace, ...userConfig.plugins?.marketplace }
    },
    cache: {
      enabled: userConfig.cache?.enabled ?? defaultConfig.cache.enabled,
      strategy: userConfig.cache?.strategy ?? defaultConfig.cache.strategy,
      ttl: userConfig.cache?.ttl ?? defaultConfig.cache.ttl,
      ...(userConfig.cache?.maxSize !== undefined ? { maxSize: userConfig.cache.maxSize } : defaultConfig.cache.maxSize !== undefined ? { maxSize: defaultConfig.cache.maxSize } : {})
    },
    performance: {
      monitoring: userConfig.performance?.monitoring ?? defaultConfig.performance.monitoring,
      profiling: userConfig.performance?.profiling ?? defaultConfig.performance.profiling
    },
    security: {
      sandboxing: userConfig.security?.sandboxing ?? defaultConfig.security.sandboxing,
      allowedPaths: userConfig.security?.allowedPaths ?? defaultConfig.security.allowedPaths,
      allowedNetworkHosts: userConfig.security?.allowedNetworkHosts ?? defaultConfig.security.allowedNetworkHosts
    }
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: LormConfig): void {
  // Validate cache strategy
  if (!['memory', 'disk', 'hybrid'].includes(config.cache.strategy)) {
    throw new Error(`Invalid cache strategy: ${config.cache.strategy}`);
  }

  // Validate TTL
  if (config.cache.ttl < 0) {
    throw new Error('Cache TTL must be non-negative');
  }

  // Validate max size
  if (config.cache.maxSize && config.cache.maxSize < 0) {
    throw new Error('Cache max size must be non-negative');
  }
}