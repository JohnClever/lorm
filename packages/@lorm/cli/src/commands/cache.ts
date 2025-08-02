import chalk from "chalk";
import { createCommand, initializeCommand, getCommandPrefix } from "@/utils";
import type { BaseCommandOptions, CommonCommandOptions } from "@/types";
import {
  clearCache,
  getCacheStatsWithFileSystem,
  warmupCache,
  getCacheHealth,
  formatCacheSize,
  formatCacheDuration
} from "@lorm/core";
import { join } from "path";
import { allCacheBenchmarkCommands } from "./cache-benchmark.js";

const commandPrefix = getCommandPrefix();


async function clearCacheCommand(options: CommonCommandOptions): Promise<void> {
  const { force, verbose } = options;
  const { lormDir } = await initializeCommand("cache:clear");
  console.log(chalk.blue("🧹 Clearing cache..."));
  
  if (!force) {
    console.log(chalk.yellow("⚠️  This will clear all cached data"));
    console.log(chalk.gray("Use --force to skip this confirmation"));
    return;
  }
  
  try {
    const cacheDir = join(lormDir, ".cache");
    const result = await clearCache(cacheDir);
    
    if (result.success) {
      console.log(chalk.green(`✅ ${result.message}`));
      if (verbose && result.clearedCaches.length > 0) {
        console.log(chalk.gray("   Cleared caches:"));
        result.clearedCaches.forEach(cache => {
          console.log(chalk.gray(`     - ${cache}`));
        });
      }
    } else {
      console.error(chalk.red(`❌ ${result.message}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to clear cache:"), error);
    process.exit(1);
  }
}
async function showCacheStatsCommand(options: CommonCommandOptions): Promise<void> {
  const { verbose, json } = options;
  const { lormDir } = await initializeCommand("cache:stats");
  console.log(chalk.blue("📊 Cache statistics..."));
  
  try {
    const cacheDir = join(lormDir, ".cache");
    const stats = await getCacheStatsWithFileSystem(cacheDir);
    const health = getCacheHealth();
    
    if (json) {
      console.log(JSON.stringify({ stats, health }, null, 2));
      return;
    }
    
    // Display global stats
    console.log(chalk.green("\n📈 Global Cache Summary:"));
    console.log(chalk.gray(`   Total caches: ${stats.global.totalCaches}`));
    console.log(chalk.gray(`   Total entries: ${stats.global.totalEntries}`));
    console.log(chalk.gray(`   Total size: ${formatCacheSize(stats.global.totalSize)}`));
    console.log(chalk.gray(`   Average hit rate: ${(stats.global.averageHitRate * 100).toFixed(2)}%`));
    console.log(chalk.gray(`   Total hits: ${stats.global.totalHits}`));
    console.log(chalk.gray(`   Total misses: ${stats.global.totalMisses}`));
    
    // Display individual cache stats
    if (verbose && Object.keys(stats.individual).length > 0) {
      console.log(chalk.green("\n📊 Individual Cache Stats:"));
      for (const [cacheName, cacheStats] of Object.entries(stats.individual)) {
        console.log(chalk.blue(`\n   ${cacheName} cache:`));
        console.log(chalk.gray(`     Entries: ${cacheStats.memoryEntries}`));
        console.log(chalk.gray(`     Size: ${formatCacheSize(cacheStats.totalSize)}`));
        console.log(chalk.gray(`     Hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`));
        console.log(chalk.gray(`     Hits: ${cacheStats.totalHits}`));
        console.log(chalk.gray(`     Misses: ${cacheStats.totalMisses}`));
        if (cacheStats.oldestEntry) {
          const age = Date.now() - cacheStats.oldestEntry;
          console.log(chalk.gray(`     Oldest entry: ${formatCacheDuration(age)} ago`));
        }
      }
    }
    
    // Display file system stats
    if (stats.fileSystem) {
      console.log(chalk.green("\n💾 File System Cache:"));
      console.log(chalk.gray(`   Total files: ${stats.fileSystem.totalFiles}`));
      console.log(chalk.gray(`   Total size: ${formatCacheSize(stats.fileSystem.totalSize)}`));
      if (stats.fileSystem.oldestFile) {
        console.log(chalk.gray(`   Oldest file: ${stats.fileSystem.oldestFile.toLocaleString()}`));
      }
      if (stats.fileSystem.newestFile) {
        console.log(chalk.gray(`   Newest file: ${stats.fileSystem.newestFile.toLocaleString()}`));
      }
    }
    
    // Display health status
    console.log(chalk.green("\n🏥 Cache Health:"));
    const statusColor = health.status === 'healthy' ? chalk.green : 
                       health.status === 'warning' ? chalk.yellow : chalk.red;
    console.log(chalk.gray(`   Status: ${statusColor(health.status.toUpperCase())}`));
    
    if (health.issues.length > 0) {
      console.log(chalk.yellow("\n⚠️  Issues:"));
      health.issues.forEach(issue => {
        console.log(chalk.gray(`     - ${issue}`));
      });
    }
    
    if (verbose && health.recommendations.length > 0) {
      console.log(chalk.blue("\n💡 Recommendations:"));
      health.recommendations.forEach(rec => {
        console.log(chalk.gray(`     - ${rec}`));
      });
    }
    
    if (verbose) {
      console.log(chalk.blue("\n🔍 Cache Details:"));
      console.log(chalk.gray(`   Cache directory: ${cacheDir}`));
      console.log(chalk.gray(`   Cache enabled: Yes`));
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to get cache stats:"), error);
    process.exit(1);
  }
}
async function warmupCacheCommand(options: CommonCommandOptions): Promise<void> {
  const { verbose } = options;
  const { lormDir } = await initializeCommand("cache:warmup");

  console.log(chalk.blue("🔥 Warming up cache..."));
  
  try {
    const result = await warmupCache({
      configValidation: true,
      preloadKeys: [
        "config:validate",
        "db:status",
        "health:check"
      ],
      cwd: process.cwd()
    });
    
    if (result.success) {
      console.log(chalk.green(`✅ ${result.message}`));
      if (verbose && result.warmedItems.length > 0) {
        console.log(chalk.gray("   Warmed up items:"));
        result.warmedItems.forEach(item => {
          console.log(chalk.gray(`     - ${item}`));
        });
      }
      if (verbose) {
        console.log(chalk.gray("\nCache is now ready for optimal performance"));
      }
    } else {
      console.error(chalk.red(`❌ ${result.message}`));
      if (verbose && result.warmedItems.length > 0) {
        console.log(chalk.yellow("   Partially warmed items:"));
        result.warmedItems.forEach(item => {
          console.log(chalk.gray(`     - ${item}`));
        });
      }
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to warm up cache:"), error);
    process.exit(1);
  }
}
// formatBytes function removed - using formatCacheSize from @lorm/core
export const cacheClearCommand = createCommand({
  name: "cache:clear",
  description: "Clear all cached data",
  aliases: ["clear-cache"],
  category: "utility",
  requiresConfig: true,
  options: [
    { flag: "--force", description: "Force clear without confirmation" },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:clear`,
    `${commandPrefix} @lorm/cli cache:clear --force`,
    `${commandPrefix} @lorm/cli cache:clear --verbose`,
  ],
  action: async (options: CommonCommandOptions) => {
    await clearCacheCommand(options);
  },
});
export const cacheStatsCommand = createCommand({
  name: "cache:stats",
  description: "Show cache statistics and usage",
  aliases: ["cache-stats"],
  category: "utility",
  requiresConfig: true,
  options: [{ flag: "--json", description: "Output stats in JSON format" }],
  examples: [
    `${commandPrefix} @lorm/cli cache:stats`,
    `${commandPrefix} @lorm/cli cache:stats --json`,
    `${commandPrefix} @lorm/cli cache:stats --verbose`,
  ],
  action: async (options: CommonCommandOptions) => {
    await showCacheStatsCommand(options);
  },
});
export const cacheWarmupCommand = createCommand({
  name: "cache:warmup",
  description: "Pre-load cache with common operations",
  aliases: ["warmup-cache"],
  category: "utility",
  requiresConfig: true,
  options: [
    {
      flag: "--operations <list>",
      description: "Specific operations to warm up",
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:warmup`,
    `${commandPrefix} @lorm/cli cache:warmup --verbose`,
  ],
  action: async (options: CommonCommandOptions) => {
    await warmupCacheCommand(options);
  },
});
export const allCacheCommands = [
  cacheClearCommand,
  cacheStatsCommand,
  cacheWarmupCommand,
  ...allCacheBenchmarkCommands,
];
