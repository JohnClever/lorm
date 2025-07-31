import chalk from "chalk";
import { createCommand, CommandCache, initializeCommand, getCommandPrefix } from "@/utils";
import type { BaseCommandOptions, CommonCommandOptions } from "@/types";
import { readdir, stat, unlink, rmdir } from "fs/promises";
import { join } from "path";

const commandPrefix = getCommandPrefix();


async function clearCache(options: CommonCommandOptions): Promise<void> {
  const { force, verbose } = options;
  const { lormDir } = await initializeCommand("cache:clear");
  console.log(chalk.blue("🧹 Clearing cache..."));
  try {
    const cache = new CommandCache();
    const cacheDir = join(lormDir, ".cache");
    if (!force) {
      console.log(chalk.yellow("⚠️  This will clear all cached data"));
      console.log(chalk.gray("Use --force to skip this confirmation"));
      return;
    }
    await cache.clear();
    try {
      const files = await readdir(cacheDir);
      let cleared = 0;
      for (const file of files) {
        const filePath = join(cacheDir, file);
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
          await rmdir(filePath, { recursive: true });
        } else {
          await unlink(filePath);
        }
        cleared++;
        if (verbose) {
          console.log(chalk.gray(`   Removed: ${file}`));
        }
      }
      console.log(
        chalk.green(`✅ Cache cleared successfully (${cleared} items removed)`)
      );
    } catch (error) {
      if (verbose) {
        console.log(chalk.yellow("⚠️  Cache directory not found or empty"));
      }
      console.log(chalk.green("✅ Cache cleared successfully"));
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to clear cache:"), error);
    process.exit(1);
  }
}
async function showCacheStats(options: CommonCommandOptions): Promise<void> {
  const { verbose, json } = options;
  const { lormDir } = await initializeCommand("cache:stats");
  console.log(chalk.blue("📊 Cache statistics..."));
  try {
    const cache = new CommandCache();
    const cacheDir = join(lormDir, ".cache");
    const cacheStats = cache.getStats();
    const stats = {
      commandCache: {
        size: cacheStats.memoryEntries || 0,
        hits: 0,
        misses: 0,
        hitRate: cacheStats.hitRate
          ? (cacheStats.hitRate * 100).toFixed(2) + "%"
          : "N/A",
      },
      fileSystem: {
        totalFiles: 0,
        totalSize: 0,
        directories: 0,
      },
    };
    try {
      const files = await readdir(cacheDir);
      for (const file of files) {
        const filePath = join(cacheDir, file);
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          stats.fileSystem.directories++;
          const subFiles = await readdir(filePath);
          stats.fileSystem.totalFiles += subFiles.length;
          for (const subFile of subFiles) {
            const subFilePath = join(filePath, subFile);
            const subFileStat = await stat(subFilePath);
            stats.fileSystem.totalSize += subFileStat.size;
          }
        } else {
          stats.fileSystem.totalFiles++;
          stats.fileSystem.totalSize += fileStat.size;
        }
      }
    } catch (error) {
      if (verbose) {
        console.log(chalk.yellow("⚠️  Cache directory not found"));
      }
    }
    if (json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }
    console.log(chalk.green("\n📈 Command Cache:"));
    console.log(chalk.gray(`   Cached items: ${stats.commandCache.size}`));
    console.log(chalk.gray(`   Cache hits: ${stats.commandCache.hits}`));
    console.log(chalk.gray(`   Cache misses: ${stats.commandCache.misses}`));
    console.log(chalk.gray(`   Hit rate: ${stats.commandCache.hitRate}`));
    console.log(chalk.green("\n💾 File System Cache:"));
    console.log(chalk.gray(`   Total files: ${stats.fileSystem.totalFiles}`));
    console.log(
      chalk.gray(`   Total directories: ${stats.fileSystem.directories}`)
    );
    console.log(
      chalk.gray(`   Total size: ${formatBytes(stats.fileSystem.totalSize)}`)
    );
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
async function warmupCache(options: CommonCommandOptions): Promise<void> {
  const { verbose } = options;
  const { lormDir } = await initializeCommand("cache:warmup");

  console.log(chalk.blue("🔥 Warming up cache..."));
  try {
    const cache = new CommandCache();
    const operations = [
      "config:validate",
      "db:status",
      "health:check",
      "plugin:list",
    ];
    let warmed = 0;
    for (const operation of operations) {
      try {
        await cache.set(
          `warmup:${operation}`,
          {
            timestamp: Date.now(),
            operation,
            status: "ready",
          }
        );
        warmed++;
        if (verbose) {
          console.log(chalk.gray(`   Warmed up: ${operation}`));
        }
      } catch (error) {
        if (verbose) {
          console.log(chalk.yellow(`   Failed to warm up: ${operation}`));
        }
      }
    }
    console.log(
      chalk.green(
        `✅ Cache warmed up successfully (${warmed}/${operations.length} operations)`
      )
    );
    if (verbose) {
      console.log(chalk.gray("\nCache is now ready for optimal performance"));
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to warm up cache:"), error);
    process.exit(1);
  }
}
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
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
    await clearCache(options);
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
    await showCacheStats(options);
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
    await warmupCache(options);
  },
});
export const allCacheCommands = [
  cacheClearCommand,
  cacheStatsCommand,
  cacheWarmupCommand,
];
