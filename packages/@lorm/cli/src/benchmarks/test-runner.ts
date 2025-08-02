/**
 * Test Runner - Comprehensive cache testing and benchmarking orchestrator
 * Integrates benchmarking, monitoring, and performance validation
 */

import { performance } from 'perf_hooks';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { CacheBenchmark, type BenchmarkSuite } from './cache-benchmark.js';
import type { CacheOptions } from '@lorm/core';

// Note: PerformanceMonitor will be implemented in CLI package
interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface MonitoringConfig {
  interval: number;
  duration: number;
  alerts: boolean;
}

// Simple PerformanceMonitor implementation for CLI package
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: any[] = [];
  private interval?: NodeJS.Timeout;
  private config?: Partial<MonitoringConfig>;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = config;
  }

  start(): void {
    if (this.config?.interval) {
      this.interval = setInterval(() => {
        this.metrics.push({
          timestamp: Date.now(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        });
      }, this.config.interval);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAllAlerts(): any[] {
    return [...this.alerts];
  }
}

export interface TestConfiguration {
  name: string;
  description: string;
  cacheOptions: CacheOptions;
  monitoringConfig?: Partial<MonitoringConfig>;
  iterations: number;
  warmupIterations: number;
  enableMonitoring: boolean;
  outputDirectory?: string;
}

export interface TestResult {
  configuration: TestConfiguration;
  benchmarkSuite: BenchmarkSuite;
  monitoringData?: {
    metrics: PerformanceMetrics[];
    alerts: any[];
  };
  performanceScore: number;
  recommendations: string[];
  timestamp: number;
  duration: number;
}

export interface ComparisonReport {
  baseline: TestResult;
  current: TestResult;
  improvements: {
    metric: string;
    baselineValue: number;
    currentValue: number;
    percentageChange: number;
    improved: boolean;
  }[];
  overallScore: number;
  summary: string;
}

export class TestRunner {
  private results: TestResult[] = [];
  private outputDirectory: string;

  constructor(outputDirectory: string = './cache-test-results') {
    this.outputDirectory = outputDirectory;
  }

  /**
   * Run a single test configuration
   */
  async runTest(config: TestConfiguration): Promise<TestResult> {
    console.log(`🧪 Running test: ${config.name}`);
    console.log(`📝 Description: ${config.description}`);
    
    const startTime = performance.now();
    let monitor: PerformanceMonitor | undefined;
    
    try {
      // Setup monitoring if enabled
      if (config.enableMonitoring) {
        monitor = new PerformanceMonitor(config.monitoringConfig);
        monitor.start();
        console.log('📊 Performance monitoring started');
      }
      
      // Run benchmark
      const benchmark = new CacheBenchmark(config.cacheOptions);
      const benchmarkSuite = await benchmark.runBenchmarkSuite();
      await benchmark.cleanup();
      
      // Collect monitoring data
      let monitoringData;
      if (monitor) {
        monitor.stop();
        monitoringData = {
          metrics: monitor.getMetricsHistory(),
          alerts: monitor.getAllAlerts()
        };
      }
      
      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(benchmarkSuite);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(benchmarkSuite, monitoringData);
      
      const result: TestResult = {
        configuration: config,
        benchmarkSuite,
        monitoringData,
        performanceScore,
        recommendations,
        timestamp: Date.now(),
        duration: performance.now() - startTime
      };
      
      this.results.push(result);
      
      // Save result to file
      await this.saveResult(result);
      
      console.log(`✅ Test completed in ${result.duration.toFixed(2)}ms`);
      console.log(`📊 Performance Score: ${performanceScore.toFixed(1)}/100`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Test failed: ${error}`);
      throw error;
    } finally {
      if (monitor) {
        monitor.stop();
      }
    }
  }

  /**
   * Run multiple test configurations
   */
  async runTestSuite(configurations: TestConfiguration[]): Promise<TestResult[]> {
    console.log(`🚀 Running test suite with ${configurations.length} configurations`);
    
    const results: TestResult[] = [];
    
    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i];
      console.log(`\n[${i + 1}/${configurations.length}] Starting test: ${config.name}`);
      
      try {
        const result = await this.runTest(config);
        results.push(result);
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Test ${config.name} failed:`, error);
        // Continue with other tests
      }
    }
    
    // Generate suite summary
    await this.generateSuiteSummary(results);
    
    console.log(`\n✅ Test suite completed. ${results.length}/${configurations.length} tests successful.`);
    
    return results;
  }

  /**
   * Compare two test results
   */
  compareResults(baseline: TestResult, current: TestResult): ComparisonReport {
    const improvements = [];
    
    // Compare benchmark results
    for (const currentResult of current.benchmarkSuite.results) {
      const baselineResult = baseline.benchmarkSuite.results.find(
        r => r.operation === currentResult.operation
      );
      
      if (baselineResult) {
        // Compare operations per second (higher is better)
        const opsImprovement = {
          metric: `${currentResult.operation}_ops_per_second`,
          baselineValue: baselineResult.operationsPerSecond,
          currentValue: currentResult.operationsPerSecond,
          percentageChange: ((currentResult.operationsPerSecond - baselineResult.operationsPerSecond) / baselineResult.operationsPerSecond) * 100,
          improved: currentResult.operationsPerSecond > baselineResult.operationsPerSecond
        };
        improvements.push(opsImprovement);
        
        // Compare average response time (lower is better)
        const timeImprovement = {
          metric: `${currentResult.operation}_avg_time`,
          baselineValue: baselineResult.averageTime,
          currentValue: currentResult.averageTime,
          percentageChange: ((currentResult.averageTime - baselineResult.averageTime) / baselineResult.averageTime) * 100,
          improved: currentResult.averageTime < baselineResult.averageTime
        };
        improvements.push(timeImprovement);
        
        // Compare memory usage (lower is better)
        const memoryImprovement = {
          metric: `${currentResult.operation}_memory_usage`,
          baselineValue: baselineResult.memoryUsage.heapUsed,
          currentValue: currentResult.memoryUsage.heapUsed,
          percentageChange: ((currentResult.memoryUsage.heapUsed - baselineResult.memoryUsage.heapUsed) / Math.abs(baselineResult.memoryUsage.heapUsed || 1)) * 100,
          improved: currentResult.memoryUsage.heapUsed < baselineResult.memoryUsage.heapUsed
        };
        improvements.push(memoryImprovement);
      }
    }
    
    // Calculate overall score
    const improvedCount = improvements.filter(i => i.improved).length;
    const overallScore = (improvedCount / improvements.length) * 100;
    
    // Generate summary
    const summary = this.generateComparisonSummary(improvements, overallScore);
    
    return {
      baseline,
      current,
      improvements,
      overallScore,
      summary
    };
  }

  /**
   * Calculate performance score based on benchmark results
   */
  private calculatePerformanceScore(suite: BenchmarkSuite): number {
    let totalScore = 0;
    let weightSum = 0;
    
    const weights = {
      SET: 0.25,
      GET: 0.30,
      MIXED: 0.20,
      LARGE_PAYLOAD: 0.10,
      CONCURRENT: 0.10,
      COMPRESSION: 0.05
    };
    
    for (const result of suite.results) {
      const weight = weights[result.operation as keyof typeof weights] || 0.1;
      
      // Score based on operations per second (normalized to 0-100)
      const opsScore = Math.min(result.operationsPerSecond / 1000 * 100, 100);
      
      // Score based on response time (lower is better, normalized to 0-100)
      const timeScore = Math.max(100 - (result.averageTime / 10), 0);
      
      // Score based on consistency (lower p99-p50 difference is better)
      const consistencyScore = Math.max(100 - ((result.p99 - result.p50) / result.p50 * 100), 0);
      
      const operationScore = (opsScore * 0.5 + timeScore * 0.3 + consistencyScore * 0.2);
      
      totalScore += operationScore * weight;
      weightSum += weight;
    }
    
    return weightSum > 0 ? totalScore / weightSum : 0;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    suite: BenchmarkSuite,
    monitoringData?: { metrics: PerformanceMetrics[]; alerts: any[] }
  ): string[] {
    const recommendations: string[] = [];
    
    // Analyze benchmark results
    for (const result of suite.results) {
      // Check for slow operations
      if (result.averageTime > 50) {
        recommendations.push(
          `${result.operation} operations are slow (${result.averageTime.toFixed(2)}ms avg). Consider enabling compression or optimizing data serialization.`
        );
      }
      
      // Check for high variability
      const variability = (result.p99 - result.p50) / result.p50;
      if (variability > 2) {
        recommendations.push(
          `${result.operation} operations show high variability (P99/P50 ratio: ${variability.toFixed(2)}). Consider implementing connection pooling or batch operations.`
        );
      }
      
      // Check for low throughput
      if (result.operationsPerSecond < 100) {
        recommendations.push(
          `${result.operation} throughput is low (${result.operationsPerSecond.toFixed(0)} ops/sec). Consider async operations or memory optimization.`
        );
      }
      
      // Check memory usage
      if (result.memoryUsage.heapUsed > 50 * 1024 * 1024) { // 50MB
        recommendations.push(
          `${result.operation} operations use significant memory (${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB). Consider implementing memory pooling or data compression.`
        );
      }
    }
    
    // Analyze monitoring data
    if (monitoringData && monitoringData.alerts.length > 0) {
      const criticalAlerts = monitoringData.alerts.filter(a => a.type === 'critical');
      if (criticalAlerts.length > 0) {
        recommendations.push(
          `Critical performance alerts detected. Review cache configuration and consider scaling resources.`
        );
      }
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Consider running load tests to validate under higher concurrency.');
    }
    
    return recommendations;
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(improvements: any[], overallScore: number): string {
    const significantImprovements = improvements.filter(i => i.improved && Math.abs(i.percentageChange) > 5);
    const significantRegressions = improvements.filter(i => !i.improved && Math.abs(i.percentageChange) > 5);
    
    let summary = `Overall performance score: ${overallScore.toFixed(1)}% of metrics improved.\n`;
    
    if (significantImprovements.length > 0) {
      summary += `\nSignificant improvements (>5%):\n`;
      significantImprovements.forEach(imp => {
        summary += `  • ${imp.metric}: ${imp.percentageChange.toFixed(1)}% improvement\n`;
      });
    }
    
    if (significantRegressions.length > 0) {
      summary += `\nSignificant regressions (>5%):\n`;
      significantRegressions.forEach(reg => {
        summary += `  • ${reg.metric}: ${Math.abs(reg.percentageChange).toFixed(1)}% regression\n`;
      });
    }
    
    if (overallScore >= 80) {
      summary += `\n✅ Excellent performance improvement!`;
    } else if (overallScore >= 60) {
      summary += `\n👍 Good performance improvement.`;
    } else if (overallScore >= 40) {
      summary += `\n⚠️ Mixed results - some improvements, some regressions.`;
    } else {
      summary += `\n❌ Performance regression detected - review changes.`;
    }
    
    return summary;
  }

  /**
   * Save test result to file
   */
  private async saveResult(result: TestResult): Promise<void> {
    try {
      await mkdir(this.outputDirectory, { recursive: true });
      
      const filename = `test-result-${result.configuration.name}-${result.timestamp}.json`;
      const filepath = join(this.outputDirectory, filename);
      
      await writeFile(filepath, JSON.stringify(result, null, 2));
      
      console.log(`💾 Test result saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to save test result:', error);
    }
  }

  /**
   * Generate test suite summary
   */
  private async generateSuiteSummary(results: TestResult[]): Promise<void> {
    try {
      const summary = {
        timestamp: Date.now(),
        totalTests: results.length,
        averageScore: results.reduce((sum, r) => sum + r.performanceScore, 0) / results.length,
        bestPerforming: results.reduce((best, current) => 
          current.performanceScore > best.performanceScore ? current : best
        ),
        worstPerforming: results.reduce((worst, current) => 
          current.performanceScore < worst.performanceScore ? current : worst
        ),
        results: results.map(r => ({
          name: r.configuration.name,
          score: r.performanceScore,
          duration: r.duration,
          recommendations: r.recommendations
        }))
      };
      
      const filename = `test-suite-summary-${summary.timestamp}.json`;
      const filepath = join(this.outputDirectory, filename);
      
      await writeFile(filepath, JSON.stringify(summary, null, 2));
      
      console.log(`📋 Test suite summary saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to save test suite summary:', error);
    }
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }
}

/**
 * Predefined test configurations
 */
export const DEFAULT_TEST_CONFIGURATIONS: TestConfiguration[] = [
  {
    name: 'default-config',
    description: 'Default cache configuration baseline test',
    cacheOptions: {
      ttl: 5 * 60 * 1000,
      maxSize: 10 * 1024 * 1024,
      enabled: true,
      compression: false,
      maxMemoryEntries: 1000
    },
    iterations: 1000,
    warmupIterations: 100,
    enableMonitoring: true
  },
  {
    name: 'compression-enabled',
    description: 'Test with compression enabled',
    cacheOptions: {
      ttl: 5 * 60 * 1000,
      maxSize: 10 * 1024 * 1024,
      enabled: true,
      compression: true,
      maxMemoryEntries: 1000
    },
    iterations: 1000,
    warmupIterations: 100,
    enableMonitoring: true
  },
  {
    name: 'high-memory',
    description: 'Test with increased memory allocation',
    cacheOptions: {
      ttl: 5 * 60 * 1000,
      maxSize: 50 * 1024 * 1024,
      enabled: true,
      compression: true,
      maxMemoryEntries: 5000
    },
    iterations: 1000,
    warmupIterations: 100,
    enableMonitoring: true
  },
  {
    name: 'short-ttl',
    description: 'Test with short TTL for high turnover scenarios',
    cacheOptions: {
      ttl: 30 * 1000, // 30 seconds
      maxSize: 10 * 1024 * 1024,
      enabled: true,
      compression: true,
      maxMemoryEntries: 1000
    },
    iterations: 1000,
    warmupIterations: 100,
    enableMonitoring: true
  }
];

/**
 * Run default test suite
 */
export async function runDefaultTestSuite(outputDirectory?: string): Promise<TestResult[]> {
  const runner = new TestRunner(outputDirectory);
  return await runner.runTestSuite(DEFAULT_TEST_CONFIGURATIONS);
}