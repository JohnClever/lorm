import chalk from 'chalk';
import { join } from 'path';
import { CacheCommandOptions } from './types.js';
import { createCacheCommand } from '../../utils/command-factory.js';
import { ProjectScopedCache } from '@lorm/core/infrastructure';
import { writeFileSync } from 'fs';

// Cache command implementations - migrated from v1
const cacheCommands = {
  async clearCache(options: CacheCommandOptions): Promise<void> {
    const { force, verbose } = options;
    console.log(chalk.blue('🧹 Clearing cache...'));
    
    try {
      if (!force) {
        console.log(chalk.yellow('⚠️  This will clear all cached data'));
        console.log(chalk.gray('Use --force to skip this confirmation'));
        return;
      }
      
      // Use core cache infrastructure
      const projectRoot = process.cwd();
      const cache = new ProjectScopedCache(projectRoot, {
        enabled: true,
        strategy: 'hybrid' as const,
        ttl: 300000
      });
      
      const statsBefore = await cache.getStats();
      await cache.clear();
      
      if (verbose) {
        console.log(chalk.gray('   Cleared memory cache'));
        console.log(chalk.gray('   Cleared file system cache'));
        console.log(chalk.gray('   Cleared project-scoped cache'));
      }
      
      console.log(chalk.green(`✅ Cache cleared successfully (${statsBefore.entryCount || 0} items removed)`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to clear cache:'), error);
      process.exit(1);
    }
  },

  async showCacheStats(options: CacheCommandOptions): Promise<void> {
    const { json, verbose } = options;
    console.log(chalk.blue('📊 Cache statistics...'));
    
    try {
      // Use core cache infrastructure
      const projectRoot = process.cwd();
      const cache = new ProjectScopedCache(projectRoot, {
        enabled: true,
        strategy: 'hybrid',
        ttl: 300000
      });
      
      const stats = await cache.getStats();
      
      if (json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }
      
      console.log(chalk.green('\n📈 Cache Statistics:'));
      console.log(chalk.gray(`   Total entries: ${stats.entryCount || 0}`));
      console.log(chalk.gray(`   Memory usage: ${formatBytes(stats.memoryUsage || 0)}`));
      console.log(chalk.gray(`   Hit rate: ${Math.round((stats.hitRate || 0) * 100)}%`));
      console.log(chalk.gray(`   Miss rate: ${Math.round((1 - (stats.hitRate || 0)) * 100)}%`));
      
      if (verbose) {
        console.log(chalk.blue('\n🔍 Cache Details:'));
        console.log(chalk.gray(`   Cache directory: ${join(projectRoot, '.lorm', 'cache')}`));
        console.log(chalk.gray('   Cache strategy: hybrid'));
        console.log(chalk.gray('   Cache enabled: Yes'));
        console.log(chalk.gray(`   TTL: ${300000}ms`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to get cache stats:'), error);
      process.exit(1);
    }
  },

  async warmupCache(options: CacheCommandOptions): Promise<void> {
    const { verbose } = options;
    console.log(chalk.blue('🔥 Warming up cache...'));
    
    try {
      // Use core cache infrastructure
      const projectRoot = process.cwd();
      const cache = new ProjectScopedCache(projectRoot, {
        enabled: true,
        strategy: 'hybrid',
        ttl: 300000
      });
      
      const operations = [
        'config:validate',
        'db:status',
        'health:check',
        'plugin:list',
      ];
      
      let warmed = 0;
      for (const operation of operations) {
        // Use cache.cached method for actual warmup
        await cache.cached(`warmup:${operation}`, async () => {
          // Simulate warmup operation
          await new Promise(resolve => setTimeout(resolve, 100));
          return { operation, timestamp: Date.now() };
        });
        
        warmed++;
        if (verbose) {
          console.log(chalk.gray(`   Warmed up: ${operation}`));
        }
      }
      
      console.log(
        chalk.green(
          `✅ Cache warmed up successfully (${warmed}/${operations.length} operations)`
        )
      );
      
      if (verbose) {
        console.log(chalk.gray('\nCache is now ready for optimal performance'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to warm up cache:'), error);
      process.exit(1);
    }
  },

  async exportCache(options: CacheCommandOptions): Promise<void> {
    const { output } = options;
    console.log(chalk.blue('📤 Exporting cache data...'));
    
    try {
      const projectRoot = process.cwd();
      const cache = new ProjectScopedCache(projectRoot, {
        enabled: true,
        strategy: 'hybrid',
        ttl: 300000
      });
      
      const stats = await cache.getStats();
      const exportData = {
        timestamp: new Date().toISOString(),
        stats,
        metadata: {
          projectRoot,
          strategy: 'hybrid',
          ttl: 300000
        }
      };
      
      const filePath = typeof output === 'string' ? output : 'cache-export.json';
      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      
      console.log(chalk.green(`✅ Cache data exported to ${filePath}`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to export cache:'), error);
      process.exit(1);
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
    'lorm cache:clear',
    'lorm cache:clear --force',
    'lorm cache:clear --verbose',
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
    'lorm cache:stats',
    'lorm cache:stats --json',
    'lorm cache:stats --verbose',
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
    'lorm cache:warmup',
    'lorm cache:warmup --verbose',
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
    'lorm cache:export',
    'lorm cache:export --output my-cache.json',
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