import chalk from "chalk";
import { createCommand, initializeCommand, getCommandPrefix } from "@/utils";
import type { BaseCommandOptions, CommonCommandOptions } from "@/types";
import { join } from "path";
import { writeFile, mkdir, readFile } from "fs/promises";
import type { CacheOptions } from "@lorm/core";

const commandPrefix = getCommandPrefix();

// Benchmark functions are now imported dynamically when needed

/**
 * Get cache system information
 */
async function getCacheSystemInfo() {
  const os = require('os');
  
  return {
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cacheConfig: {
      defaultTtl: 300000, // 5 minutes default
      maxSize: 100 * 1024 * 1024, // 100MB default
      cleanupInterval: 60000, // 1 minute default
      enableCompression: true
    },
    availableAdapters: [
      {
        name: 'Memory Cache',
        description: 'In-memory caching with LRU eviction',
        available: true
      },
      {
        name: 'File System Cache',
        description: 'Persistent file-based caching',
        available: true
      },
      {
        name: 'Redis Cache',
        description: 'Redis-based distributed caching',
        available: false,
        reason: 'Redis client not configured'
      }
    ]
  };
}

/**
 * Run cache performance benchmarks
 */
async function benchmarkCommand(options: CommonCommandOptions & {
  output?: string;
  compression?: boolean;
  maxSize?: string;
  maxEntries?: string;
  ttl?: string;
  operations?: string;
  warmup?: string;
  json?: boolean;
}): Promise<void> {
  const { verbose, json } = options;
  const { lormDir } = await initializeCommand("cache:benchmark");
  
  try {
    console.log(chalk.blue("🚀 Starting cache benchmark..."));
    
    // Create benchmark instance
    const { CacheBenchmark } = await import('../benchmarks/cache-benchmark.js');
    const benchmark = new CacheBenchmark({
      ttl: options.ttl ? parseInt(options.ttl) * 1000 : undefined,
      maxSize: options.maxSize ? parseInt(options.maxSize) * 1024 * 1024 : undefined,
      compression: options.compression,
      maxMemoryEntries: options.maxEntries ? parseInt(options.maxEntries) : undefined,
    });
    
    const suite = await benchmark.runBenchmarkSuite();
    
    // Ensure output directory exists
    const outputDir = options.output || join(lormDir, 'benchmark-results');
    await mkdir(outputDir, { recursive: true });
    
    // Save results
    const filename = `benchmark-${Date.now()}.json`;
    const filepath = join(outputDir, filename);
    await writeFile(filepath, JSON.stringify(suite, null, 2));
    
    if (json) {
      console.log(JSON.stringify(suite, null, 2));
    } else {
      console.log(chalk.green(`\n✅ Benchmark completed!`));
      console.log(chalk.gray(`📊 Results saved to: ${filepath}`));
      console.log(chalk.gray(`⏱️  Total duration: ${suite.totalDuration.toFixed(2)}ms`));
      console.log(chalk.gray(`🔢 Total operations: ${suite.results.reduce((sum: number, r: any) => sum + r.totalOperations, 0)}`));
      
      if (verbose) {
        console.log(chalk.blue("\n📈 Performance Summary:"));
        suite.results.forEach((result: any) => {
          console.log(chalk.gray(`   ${result.name}: ${result.averageTime.toFixed(2)}ms avg`));
        });
      }
    }
    
  } catch (error) {
    console.error(chalk.red("❌ Benchmark failed:"), error);
    process.exit(1);
  }
}

/**
 * Run comprehensive test suite with multiple configurations
 */
async function testSuiteCommand(options: CommonCommandOptions & {
  output?: string;
  config?: string;
  monitoring?: boolean;
  json?: boolean;
}): Promise<void> {
  const { verbose, json } = options;
  const { lormDir } = await initializeCommand("cache:test-suite");
  
  try {
    console.log(chalk.blue("🧪 Starting test suite..."));
    
    const { TestRunner, DEFAULT_TEST_CONFIGURATIONS } = await import('../benchmarks/test-runner.js');
    let configurations = DEFAULT_TEST_CONFIGURATIONS;
    
    // Load custom configuration if provided
    if (options.config) {
      try {
        const configData = await readFile(options.config, 'utf-8');
        configurations = JSON.parse(configData);
        console.log(chalk.gray(`📋 Loaded ${configurations.length} test configurations from ${options.config}`));
      } catch (error) {
        console.error(chalk.red(`❌ Failed to load configuration file: ${error}`));
        process.exit(1);
      }
    }
    
    // Enable monitoring for all configurations if requested
    if (options.monitoring) {
      configurations = configurations.map((config: any) => ({
        ...config,
        enableMonitoring: true
      }));
    }
    
    const outputDir = options.output || join(lormDir, 'test-results');
    const runner = new TestRunner(outputDir);
    const results = await runner.runTestSuite(configurations);
    
    if (json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(chalk.green(`\n✅ Test suite completed!`));
      console.log(chalk.gray(`📊 ${results.length} tests executed`));
      console.log(chalk.gray(`📈 Average performance score: ${(results.reduce((sum: number, r: any) => sum + r.performanceScore, 0) / results.length).toFixed(1)}/100`));
      console.log(chalk.gray(`📁 Results saved to: ${outputDir}`));
      
      if (verbose) {
        console.log(chalk.blue("\n📋 Test Results:"));
        results.forEach((result: any, index: number) => {
          console.log(chalk.gray(`   Test ${index + 1}: Score ${result.performanceScore}/100`));
        });
      }
    }
    
  } catch (error) {
    console.error(chalk.red("❌ Test suite failed:"), error);
    process.exit(1);
  }
}

/**
 * Start real-time performance monitoring
 */
async function monitorCommand(options: CommonCommandOptions & {
  interval?: string;
  duration?: string;
  hitRateMin?: string;
  responseTimeMax?: string;
  errorRateMax?: string;
  memoryMax?: string;
  alerts?: boolean;
  log?: boolean;
}): Promise<void> {
  const { verbose } = options;
  
  try {
    console.log(chalk.blue("📊 Starting performance monitoring..."));
    console.log(chalk.yellow("⚠️  Performance monitoring is not yet implemented in CLI package."));
    console.log(chalk.gray("This feature will be available in a future release."));
    
    // TODO: Implement performance monitoring
    // const monitor = startPerformanceMonitoring({...});
    
    // Setup event listeners
    // monitor.on('metrics:collected', (metrics: any) => {
    //   if (!options.log) {
    //     // Simple progress indicator
    //     process.stdout.write('.');
    //   }
    // });
    
    // monitor.on('alert:triggered', (alert: any) => {
    //   console.log(chalk.red(`\n🚨 ${alert.type.toUpperCase()} ALERT: ${alert.message}`));
    // });
    
    // Handle duration
    // const duration = parseInt(options.duration || '0');
    // if (duration > 0) {
    //   const durationMs = duration * 60 * 1000;
    //   console.log(chalk.gray(`⏱️  Monitoring for ${duration} minutes...`));
    //   
    //   setTimeout(() => {
    //     stopPerformanceMonitoring();
    //     console.log(chalk.green('\n✅ Monitoring completed!'));
    //     
    //     const stats = monitor.getMonitoringStats();
    //     console.log(chalk.gray(`📊 Collected ${stats.metricsCount} metric samples`));
    //     console.log(chalk.gray(`🚨 Generated ${stats.totalAlertsCount} alerts`));
    //     
    //     process.exit(0);
    //   }, durationMs);
    // } else {
    //   console.log(chalk.gray('⏱️  Monitoring indefinitely... Press Ctrl+C to stop'));
    //   
    //   // Handle graceful shutdown
    //   process.on('SIGINT', () => {
    //     console.log(chalk.yellow('\n🛑 Stopping monitoring...'));
    //     stopPerformanceMonitoring();
    //     
    //     const stats = monitor.getMonitoringStats();
    //     console.log(chalk.gray(`📊 Collected ${stats.metricsCount} metric samples`));
    //     console.log(chalk.gray(`🚨 Generated ${stats.totalAlertsCount} alerts`));
    //     console.log(chalk.green('✅ Monitoring stopped!'));
    //     
    //     process.exit(0);
    //   });
    // }
    
  } catch (error) {
    console.error(chalk.red("❌ Monitoring failed:"), error);
    process.exit(1);
  }
}

/**
 * Compare two benchmark results
 */
async function compareCommand(options: CommonCommandOptions & {
  baseline: string;
  current: string;
  json?: boolean;
}): Promise<void> {
  try {
    console.log(chalk.blue("📊 Comparing benchmark results..."));
    
    // Load result files
    const baselineData = JSON.parse(await readFile(options.baseline, 'utf-8'));
    const currentData = JSON.parse(await readFile(options.current, 'utf-8'));
    
    // Create test runner for comparison
    const { TestRunner } = await import('../benchmarks/test-runner.js');
    const runner = new TestRunner();
    const comparison = runner.compareResults(baselineData, currentData);
    
    if (options.json) {
      console.log(JSON.stringify(comparison, null, 2));
    } else {
      console.log(chalk.green('\n📈 Comparison Results:'));
      console.log('='.repeat(50));
      console.log(comparison.summary);
      
      console.log(chalk.blue('\n📊 Detailed Metrics:'));
      comparison.improvements.forEach((imp: any) => {
        const icon = imp.improved ? '✅' : '❌';
        const direction = imp.improved ? 'improved' : 'regressed';
        const color = imp.improved ? chalk.green : chalk.red;
        console.log(`${icon} ${imp.metric}: ${color(direction)} by ${Math.abs(imp.percentageChange).toFixed(1)}%`);
      });
    }
    
  } catch (error) {
    console.error(chalk.red("❌ Comparison failed:"), error);
    process.exit(1);
  }
}

/**
 * Display cache system information and current status
 */
async function infoCommand(options: CommonCommandOptions & {
  benchmarks?: boolean;
}): Promise<void> {
  try {
    console.log(chalk.blue('ℹ️  LORM Cache System Information'));
    console.log('='.repeat(40));
    console.log(chalk.gray(`Node.js Version: ${process.version}`));
    console.log(chalk.gray(`Platform: ${process.platform}`));
    console.log(chalk.gray(`Architecture: ${process.arch}`));
    
    // Try to get cache manager status
    try {
      const { CacheManager } = await import('@lorm/core');
      const cacheManager = CacheManager.getInstance();
      const stats = await cacheManager.getStats();
      
      console.log(chalk.green('\n📊 Cache Status:'));
      console.log(chalk.gray(`Active Caches: ${Object.keys(stats).length}`));
      
      Object.entries(stats).forEach(([name, stat]: [string, any]) => {
        console.log(chalk.gray(`  ${name}: ${stat.size} entries, ${stat.hits} hits, ${stat.misses} misses`));
      });
      
    } catch (error) {
      console.log(chalk.yellow('\n📊 Cache Status: Not initialized'));
    }
    
    // Display performance benchmarks if requested
    if (options.benchmarks) {
      console.log(chalk.cyan('\n🚀 Quick Performance Test:'));
      try {
        const { CacheBenchmark } = await import('../benchmarks/cache-benchmark.js');
        const benchmark = new CacheBenchmark();
        const quickResults = await benchmark.runQuickBenchmark();
        
        console.log(`   Set Operations: ${quickResults.setOps.toFixed(0)} ops/sec`);
        console.log(`   Get Operations: ${quickResults.getOps.toFixed(0)} ops/sec`);
        console.log(`   Memory Usage: ${(quickResults.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.log(chalk.yellow('   Quick benchmark not available'));
      }
    }
    
    console.log(chalk.blue('\n🔧 Available Commands:'));
    console.log(chalk.gray('  cache:benchmark    - Run performance benchmarks'));
    console.log(chalk.gray('  cache:test-suite   - Run comprehensive test suite'));
    console.log(chalk.gray('  cache:monitor      - Start real-time monitoring'));
    console.log(chalk.gray('  cache:compare      - Compare benchmark results'));
    console.log(chalk.gray('  cache:info         - Display this information'));
    
  } catch (error) {
    console.error(chalk.red("❌ Failed to get system info:"), error);
    process.exit(1);
  }
}

// Export benchmark commands
export const cacheBenchmarkCommand = createCommand({
  name: "cache:benchmark",
  description: "Run cache performance benchmarks",
  aliases: ["benchmark-cache"],
  category: "utility",
  requiresConfig: false,
  options: [
    { flag: "--output <directory>", description: "Output directory for results" },
    { flag: "--compression", description: "Enable compression" },
    { flag: "--max-size <size>", description: "Maximum cache size in MB" },
    { flag: "--max-entries <entries>", description: "Maximum memory entries" },
    { flag: "--ttl <seconds>", description: "TTL in seconds" },
    { flag: "--operations <count>", description: "Number of operations per test" },
    { flag: "--warmup <count>", description: "Number of warmup operations" },
    { flag: "--json", description: "Output results in JSON format" },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:benchmark`,
    `${commandPrefix} @lorm/cli cache:benchmark --compression --max-size 20`,
    `${commandPrefix} @lorm/cli cache:benchmark --json --output ./results`,
  ],
  action: async (options: CommonCommandOptions) => {
    await benchmarkCommand(options as any);
  },
});

export const cacheTestSuiteCommand = createCommand({
  name: "cache:test-suite",
  description: "Run comprehensive test suite with multiple configurations",
  aliases: ["test-suite-cache"],
  category: "utility",
  requiresConfig: false,
  options: [
    { flag: "--output <directory>", description: "Output directory for results" },
    { flag: "--config <file>", description: "Custom test configuration file (JSON)" },
    { flag: "--monitoring", description: "Enable performance monitoring" },
    { flag: "--json", description: "Output results in JSON format" },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:test-suite`,
    `${commandPrefix} @lorm/cli cache:test-suite --monitoring`,
    `${commandPrefix} @lorm/cli cache:test-suite --config ./custom-config.json`,
  ],
  action: async (options: CommonCommandOptions) => {
    await testSuiteCommand(options as any);
  },
});

export const cacheMonitorCommand = createCommand({
  name: "cache:monitor",
  description: "Start real-time performance monitoring",
  aliases: ["monitor-cache"],
  category: "utility",
  requiresConfig: false,
  options: [
    { flag: "--interval <seconds>", description: "Collection interval in seconds" },
    { flag: "--duration <minutes>", description: "Monitoring duration in minutes (0 for indefinite)" },
    { flag: "--hit-rate-min <rate>", description: "Minimum hit rate threshold (0-1)" },
    { flag: "--response-time-max <ms>", description: "Maximum response time threshold" },
    { flag: "--error-rate-max <rate>", description: "Maximum error rate threshold (0-1)" },
    { flag: "--memory-max <mb>", description: "Maximum memory usage threshold in MB" },
    { flag: "--alerts", description: "Enable alerts" },
    { flag: "--no-log", description: "Disable logging" },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:monitor`,
    `${commandPrefix} @lorm/cli cache:monitor --duration 10 --alerts`,
    `${commandPrefix} @lorm/cli cache:monitor --interval 10 --hit-rate-min 0.9`,
  ],
  action: async (options: CommonCommandOptions) => {
    await monitorCommand(options as any);
  },
});

export const cacheCompareCommand = createCommand({
  name: "cache:compare",
  description: "Compare two benchmark results",
  aliases: ["compare-cache"],
  category: "utility",
  requiresConfig: false,
  options: [
    { flag: "--baseline <file>", description: "Baseline result file (JSON)", required: true },
    { flag: "--current <file>", description: "Current result file (JSON)", required: true },
    { flag: "--json", description: "Output comparison in JSON format" },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:compare --baseline baseline.json --current current.json`,
    `${commandPrefix} @lorm/cli cache:compare --baseline baseline.json --current current.json --json`,
  ],
  action: async (options: CommonCommandOptions) => {
    await compareCommand(options as any);
  },
});

export const cacheInfoCommand = createCommand({
  name: "cache:info",
  description: "Display cache system information and current status",
  aliases: ["info-cache"],
  category: "utility",
  requiresConfig: false,
  options: [
    { flag: "--benchmarks", description: "Run quick performance benchmarks" },
  ],
  examples: [
    `${commandPrefix} @lorm/cli cache:info`,
    `${commandPrefix} @lorm/cli cache:info --benchmarks`,
  ],
  action: async (options: CommonCommandOptions) => {
    await infoCommand(options as any);
  },
});

export const allCacheBenchmarkCommands = [
  cacheBenchmarkCommand,
  cacheTestSuiteCommand,
  cacheMonitorCommand,
  cacheCompareCommand,
  cacheInfoCommand,
];