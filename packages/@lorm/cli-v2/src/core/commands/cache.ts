import { Logger, ICONS } from '../../utils/logger.js';
import { join } from 'path';
import { CacheCommandOptions } from './types.js';
import { createCacheCommand, getCommandPrefix } from '../../utils/command-factory.js';
import { getProjectCache, getCacheManager } from '../../utils/cli-cache-manager.js';
import { SafeCacheOperations, safeClear, safeGet } from '../../utils/safe-cache-operations.js';
import { CacheConfigResolver } from '../../utils/cache-config-resolver.js';
import { writeFileSync } from 'fs';

const commandPrefix = getCommandPrefix();

// Cache command implementations - migrated from v1
const cacheCommands = {
  async clearCache(options: CacheCommandOptions): Promise<void> {
    const { force, verbose } = options;
    Logger.withIcon(ICONS.tools, 'Clearing cache...');
    
    try {
      if (!force) {
        Logger.warning('This will clear all cached data');
        Logger.dim('Use --force to skip this confirmation');
        return;
      }
      
      // Get stats before clearing
      const statsResult = await SafeCacheOperations.safeGetStats();
      const statsBefore = statsResult.success ? statsResult.data : { entryCount: 0 };
      
      // Use safe cache operations
      const clearResult = await SafeCacheOperations.safeClear({
        maxRetries: 2,
        timeout: 10000,
        logErrors: verbose
      });
      
      if (!clearResult.success) {
        throw new Error(clearResult.error || 'Failed to clear cache');
      }
      
      if (verbose) {
        Logger.dim('   Cleared memory cache');
        Logger.dim('   Cleared file system cache');
        Logger.dim('   Cleared project-scoped cache');
        if (clearResult.retries && clearResult.retries > 0) {
          Logger.dim(`   Required ${clearResult.retries} retries`);
        }
      }
      
      Logger.success(`Cache cleared successfully (${statsBefore.entryCount || 0} items removed)`);
    } catch (error) {
      Logger.error(`Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },

  async showCacheStats(options: CacheCommandOptions): Promise<void> {
    const { json, verbose } = options;
    Logger.withIcon(ICONS.chart, 'Cache statistics...');
    
    try {
      // Get cache stats using safe operations
      const statsResult = await SafeCacheOperations.safeGetStats({
        timeout: 5000,
        maxRetries: 1
      });
      
      let stats = {
        entryCount: 0,
        memoryUsage: 0,
        hitRate: 0.0,
        diskUsage: 0,
        hits: 0,
        misses: 0
      };
      
      if (statsResult.success && statsResult.data) {
        stats = { ...stats, ...statsResult.data };
      }
      
      // Get manager stats if verbose
      let managerStats = null;
      if (verbose) {
        const managerResult = await SafeCacheOperations.safeGetManagerStats({
          timeout: 3000,
          maxRetries: 1
        });
        if (managerResult.success) {
          managerStats = managerResult.data;
        }
      }
      
      if (json) {
        const output = {
          cache: stats,
          manager: managerStats,
          config: CacheConfigResolver.getDefaultConfig()
        };
        console.log(JSON.stringify(output, null, 2));
        return;
      }
      
      Logger.withIcon(ICONS.success, 'Cache Statistics:');
      Logger.dim(`   Total entries: ${stats.entryCount || 0}`);
      Logger.dim(`   Memory usage: ${formatBytes(stats.memoryUsage || 0)}`);
      Logger.dim(`   Disk usage: ${formatBytes(stats.diskUsage || 0)}`);
      Logger.dim(`   Hit rate: ${Math.round((stats.hitRate || 0) * 100)}%`);
      Logger.dim(`   Miss rate: ${Math.round((1 - (stats.hitRate || 0)) * 100)}%`);
      Logger.dim(`   Total hits: ${stats.hits || 0}`);
      Logger.dim(`   Total misses: ${stats.misses || 0}`);
      
      if (verbose) {
        const projectRoot = process.cwd();
        const config = CacheConfigResolver.resolveConfig(projectRoot);
        
        Logger.withIcon(ICONS.chart, 'Cache Configuration:');
        Logger.dim(`   Cache directory: ${join(projectRoot, '.lorm', 'cache')}`);
        Logger.dim(`   Cache strategy: ${config.strategy}`);
        Logger.dim(`   Cache enabled: ${config.enabled ? 'Yes' : 'No'}`);
        Logger.dim(`   TTL: ${config.ttl}ms`);
        Logger.dim(`   Max size: ${formatBytes(config.maxSize || 0)}`);
        Logger.dim(`   Compression: ${config.compression ? 'Yes' : 'No'}`);
        
        if (managerStats) {
          Logger.withIcon(ICONS.chart, 'Cache Manager:');
          Logger.dim(`   Active instances: ${Object.keys(managerStats).length}`);
          
          for (const [key, instanceStats] of Object.entries(managerStats)) {
            if (typeof instanceStats === 'object' && instanceStats !== null) {
              const stats = instanceStats as any;
              Logger.dim(`   Instance ${key.split(':')[0].split('/').pop()}: ${stats.healthy ? 'Healthy' : 'Unhealthy'}`);
            }
          }
        }
      }
    } catch (error) {
      Logger.error(`Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },

  async warmupCache(options: CacheCommandOptions): Promise<void> {
    const { verbose } = options;
    Logger.withIcon(ICONS.fire, 'Warming up cache...');
    
    try {
      const operations = [
        'config:validate',
        'db:status',
        'health:check',
        'plugin:list',
      ];
      
      let warmed = 0;
      let failed = 0;
      
      for (const operation of operations) {
        // Use safe cached operations
        const result = await SafeCacheOperations.safeCached(
          `warmup:${operation}`,
          async () => {
            switch (operation) {
              case 'config:validate':
                return await cacheCommands.validateProjectConfig();
              case 'db:status':
                return await cacheCommands.checkDatabaseStatus();
              case 'health:check':
                return await cacheCommands.performHealthCheck();
              case 'plugin:list':
                return await cacheCommands.getInstalledPlugins();
              default:
                return { operation, timestamp: Date.now(), status: 'cached' };
            }
          },
          300000, // 5 minutes TTL
          {
            timeout: 10000,
            maxRetries: 1,
            logErrors: verbose
          }
        );
        
        if (result.success) {
          warmed++;
          if (verbose) {
            Logger.dim(`   ✓ Warmed up: ${operation}`);
            if (result.retries && result.retries > 0) {
              Logger.dim(`     (required ${result.retries} retries)`);
            }
          }
        } else {
          failed++;
          if (verbose) {
            Logger.dim(`   ✗ Failed: ${operation} - ${result.error}`);
          }
        }
      }
      
      if (failed === 0) {
        Logger.success(
          `Cache warmed up successfully (${warmed}/${operations.length} operations)`
        );
      } else {
        Logger.warning(
          `Cache warmup completed with issues (${warmed}/${operations.length} successful, ${failed} failed)`
        );
      }
      
      if (verbose) {
        Logger.dim('\nCache is now ready for optimal performance');
      }
    } catch (error) {
      Logger.error(`Failed to warm up cache: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },

  async exportCache(options: CacheCommandOptions): Promise<void> {
    const { output } = options;
    Logger.withIcon(ICONS.document, 'Exporting cache data...');
    
    try {
      const projectRoot = process.cwd();
      const config = CacheConfigResolver.resolveConfig(projectRoot);
      
      // Get cache stats safely
      const statsResult = await SafeCacheOperations.safeGetStats({
        timeout: 5000,
        maxRetries: 2
      });
      
      // Get manager stats
      const managerResult = await SafeCacheOperations.safeGetManagerStats({
        timeout: 3000,
        maxRetries: 1
      });
      
      // Perform health check
      const healthResult = await SafeCacheOperations.safeHealthCheck({
        timeout: 3000,
        maxRetries: 1
      });
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        cache: {
          stats: statsResult.success ? statsResult.data : null,
          healthy: healthResult.success ? healthResult.data : false,
          error: statsResult.success ? null : statsResult.error
        },
        manager: {
          stats: managerResult.success ? managerResult.data : null,
          error: managerResult.success ? null : managerResult.error
        },
        configuration: {
          resolved: config,
          default: CacheConfigResolver.getDefaultConfig(),
          environment: process.env.NODE_ENV || 'development'
        },
        metadata: {
          projectRoot,
          exportedAt: Date.now(),
          nodeVersion: process.version,
          platform: process.platform
        }
      };
      
      const filePath = typeof output === 'string' ? output : 'cache-export.json';
      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      
      Logger.success(`Cache data exported to ${filePath}`);
      
      // Log summary
      const cacheStats = exportData.cache.stats;
      if (cacheStats) {
        Logger.dim(`   Entries: ${cacheStats.entryCount || 0}`);
        Logger.dim(`   Memory: ${formatBytes(cacheStats.memoryUsage || 0)}`);
        Logger.dim(`   Disk: ${formatBytes(cacheStats.diskUsage || 0)}`);
        Logger.dim(`   Hit rate: ${Math.round((cacheStats.hitRate || 0) * 100)}%`);
      }
    } catch (error) {
      Logger.error(`Failed to export cache: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },

  async validateProjectConfig(): Promise<{ status: string; timestamp: number }> {
    try {
      const projectRoot = process.cwd();
      const configPath = join(projectRoot, '.lormrc.json');
      
      if (!require('fs').existsSync(configPath)) {
        return { status: 'no-config', timestamp: Date.now() };
      }
      
      const config = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
      const isValid = config.version && config.database;
      
      return { 
        status: isValid ? 'valid' : 'invalid', 
        timestamp: Date.now() 
      };
    } catch (error) {
      return { status: 'error', timestamp: Date.now() };
    }
  },

  async checkDatabaseStatus(): Promise<{ status: string; timestamp: number }> {
    try {
      const projectRoot = process.cwd();
      const configPath = join(projectRoot, '.lormrc.json');
      
      if (!require('fs').existsSync(configPath)) {
        return { status: 'no-config', timestamp: Date.now() };
      }
      
      const config = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
      const dbUrl = config.database?.url;
      
      if (!dbUrl) {
        return { status: 'no-database-url', timestamp: Date.now() };
      }
      
      // Basic connectivity check for SQLite
      if (dbUrl.startsWith('sqlite://')) {
        const dbPath = dbUrl.replace('sqlite://', '');
        const exists = require('fs').existsSync(dbPath);
        return { 
          status: exists ? 'connected' : 'file-missing', 
          timestamp: Date.now() 
        };
      }
      
      return { status: 'configured', timestamp: Date.now() };
    } catch (error) {
      return { status: 'error', timestamp: Date.now() };
    }
  },

  async performHealthCheck(): Promise<{ status: string; timestamp: number; checks: number }> {
    try {
      let passedChecks = 0;
      const totalChecks = 4;
      
      // Check Node.js version
      const nodeVersion = process.version;
      if (nodeVersion && parseInt(nodeVersion.slice(1)) >= 16) {
        passedChecks++;
      }
      
      // Check if package.json exists
      if (require('fs').existsSync(join(process.cwd(), 'package.json'))) {
        passedChecks++;
      }
      
      // Check if node_modules exists
      if (require('fs').existsSync(join(process.cwd(), 'node_modules'))) {
        passedChecks++;
      }
      
      // Check memory usage
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed < 500 * 1024 * 1024) { // Less than 500MB
        passedChecks++;
      }
      
      return {
        status: passedChecks === totalChecks ? 'healthy' : 'issues',
        timestamp: Date.now(),
        checks: passedChecks
      };
    } catch (error) {
      return { status: 'error', timestamp: Date.now(), checks: 0 };
    }
  },

  async getInstalledPlugins(): Promise<{ status: string; timestamp: number; count: number }> {
    try {
      const projectRoot = process.cwd();
      const nodeModulesPath = join(projectRoot, 'node_modules');
      
      if (!require('fs').existsSync(nodeModulesPath)) {
        return { status: 'no-node-modules', timestamp: Date.now(), count: 0 };
      }
      
      // Look for LORM plugins in node_modules
      const { readdirSync } = require('fs');
      const packages = readdirSync(nodeModulesPath, { withFileTypes: true })
        .filter((dirent: any) => dirent.isDirectory())
        .map((dirent: any) => dirent.name);
      
      const lormPlugins = packages.filter((pkg: string) => 
        pkg.startsWith('@lorm/') || pkg.includes('lorm-plugin')
      );
      
      return {
        status: 'success',
        timestamp: Date.now(),
        count: lormPlugins.length
      };
    } catch (error) {
      return { status: 'error', timestamp: Date.now(), count: 0 };
    }
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Cache clear command
export const cacheClearCommand = createCacheCommand({
  name: 'clear',
  description: 'Clear all cached data',
  aliases: ['clean'],
  category: 'cache',
  requiresConfig: true,
  options: [
    { flag: '--force', description: 'Force clear without confirmation' },
    { flag: '--verbose', description: 'Show detailed clearing process' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:clear`,
    `${commandPrefix} @lorm/cli cache:clear --force`,
    `${commandPrefix} @lorm/cli cache:clear --verbose`,
  ],
  action: async (options: CacheCommandOptions) => {
    await cacheCommands.clearCache(options);
  },
});

// Cache stats command
export const cacheStatsCommand = createCacheCommand({
  name: 'stats',
  description: 'Show cache statistics and usage information',
  aliases: ['info'],
  category: 'cache',
  requiresConfig: true,
  options: [
    { flag: '--json', description: 'Output stats in JSON format' },
    { flag: '--verbose', description: 'Show detailed cache information' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:stats`,
    `${commandPrefix} @lorm/cli cache:stats --json`,
    `${commandPrefix} @lorm/cli cache:stats --verbose`,
  ],
  action: async (options: CacheCommandOptions) => {
    await cacheCommands.showCacheStats(options);
  },
});

// Cache warmup command
export const cacheWarmupCommand = createCacheCommand({
  name: 'warmup',
  description: 'Pre-load cache with common operations for better performance',
  aliases: ['warm'],
  category: 'cache',
  requiresConfig: true,
  options: [
    { flag: '--verbose', description: 'Show detailed warmup process' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:warmup`,
    `${commandPrefix} @lorm/cli cache:warmup --verbose`,
  ],
  action: async (options: CacheCommandOptions) => {
    await cacheCommands.warmupCache(options);
  },
});

// Cache export command
export const cacheExportCommand = createCacheCommand({
  name: 'export',
  description: 'Export cache data and statistics to a file',
  category: 'cache',
  requiresConfig: true,
  options: [
    { flag: '--output <file>', description: 'Output file path (default: cache-export.json)' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:export`,
    `${commandPrefix} @lorm/cli cache:export --output my-cache.json`,
  ],
  action: async (options: CacheCommandOptions) => {
    await cacheCommands.exportCache(options);
  },
});

// Export all cache commands
export const getCacheCommands = () => [
  cacheClearCommand,
  cacheStatsCommand,
  cacheWarmupCommand,
  cacheExportCommand,
];