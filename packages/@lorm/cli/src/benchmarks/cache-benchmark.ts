/**
 * Cache Benchmark - Core benchmarking framework for @lorm/core cache system
 * Provides comprehensive performance testing and baseline metrics collection
 */

import { performance } from 'perf_hooks';
import { BaseCache, CacheManager, type CacheOptions } from '@lorm/core';

export interface BenchmarkResult {
  operation: string;
  totalOperations: number;
  totalTime: number;
  averageTime: number;
  operationsPerSecond: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalDuration: number;
  timestamp: number;
}

export class CacheBenchmark {
  private cache: BaseCache;
  private results: BenchmarkResult[] = [];
  private warmupOperations = 100;
  private testOperations = 1000;

  constructor(options?: CacheOptions) {
    this.cache = new BaseCache({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 10 * 1024 * 1024, // 10MB
      enabled: true,
      compression: true,
      maxMemoryEntries: 1000,
      ...options
    });
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarkSuite(): Promise<BenchmarkSuite> {
    const startTime = performance.now();
    console.log('🚀 Starting cache benchmark suite...');

    // Clear cache before starting
    await this.cache.clear();

    // Run individual benchmarks
    await this.benchmarkSetOperations();
    await this.benchmarkGetOperations();
    await this.benchmarkMixedOperations();
    await this.benchmarkLargePayloads();
    await this.benchmarkConcurrentOperations();
    await this.benchmarkCompressionEfficiency();

    const totalDuration = performance.now() - startTime;
    
    const suite: BenchmarkSuite = {
      name: 'Cache Performance Benchmark',
      results: [...this.results],
      totalDuration,
      timestamp: Date.now()
    };

    this.printResults(suite);
    return suite;
  }

  /**
   * Benchmark cache set operations
   */
  private async benchmarkSetOperations(): Promise<void> {
    console.log('📝 Benchmarking SET operations...');
    
    // Warmup
    await this.warmup('set');
    
    const times: number[] = [];
    const startMemory = process.memoryUsage();
    
    for (let i = 0; i < this.testOperations; i++) {
      const key = `test-key-${i}`;
      const data = { id: i, data: `test-data-${i}`, timestamp: Date.now() };
      
      const start = performance.now();
      await this.cache.set(key, data);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    const endMemory = process.memoryUsage();
    
    this.results.push(this.calculateStats('SET', times, startMemory, endMemory));
  }

  /**
   * Benchmark cache get operations
   */
  private async benchmarkGetOperations(): Promise<void> {
    console.log('📖 Benchmarking GET operations...');
    
    // Populate cache first
    for (let i = 0; i < this.testOperations; i++) {
      const key = `get-test-key-${i}`;
      const data = { id: i, data: `get-test-data-${i}` };
      await this.cache.set(key, data);
    }
    
    const times: number[] = [];
    const startMemory = process.memoryUsage();
    
    for (let i = 0; i < this.testOperations; i++) {
      const key = `get-test-key-${i}`;
      
      const start = performance.now();
      await this.cache.get(key);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    const endMemory = process.memoryUsage();
    
    this.results.push(this.calculateStats('GET', times, startMemory, endMemory));
  }

  /**
   * Benchmark mixed read/write operations
   */
  private async benchmarkMixedOperations(): Promise<void> {
    console.log('🔄 Benchmarking MIXED operations...');
    
    const times: number[] = [];
    const startMemory = process.memoryUsage();
    
    for (let i = 0; i < this.testOperations; i++) {
      const key = `mixed-key-${i}`;
      const isRead = Math.random() > 0.3; // 70% reads, 30% writes
      
      const start = performance.now();
      
      if (isRead && i > 100) { // Ensure some data exists
        const readKey = `mixed-key-${Math.floor(Math.random() * (i - 100))}`;
        await this.cache.get(readKey);
      } else {
        const data = { id: i, data: `mixed-data-${i}`, timestamp: Date.now() };
        await this.cache.set(key, data);
      }
      
      const end = performance.now();
      times.push(end - start);
    }
    
    const endMemory = process.memoryUsage();
    
    this.results.push(this.calculateStats('MIXED', times, startMemory, endMemory));
  }

  /**
   * Benchmark large payload operations
   */
  private async benchmarkLargePayloads(): Promise<void> {
    console.log('📦 Benchmarking LARGE PAYLOAD operations...');
    
    const times: number[] = [];
    const startMemory = process.memoryUsage();
    const largeData = 'x'.repeat(10 * 1024); // 10KB payload
    
    for (let i = 0; i < Math.min(this.testOperations, 100); i++) {
      const key = `large-key-${i}`;
      const data = {
        id: i,
        largeField: largeData,
        metadata: { size: largeData.length, timestamp: Date.now() }
      };
      
      const start = performance.now();
      await this.cache.set(key, data);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    const endMemory = process.memoryUsage();
    
    this.results.push(this.calculateStats('LARGE_PAYLOAD', times, startMemory, endMemory));
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrentOperations(): Promise<void> {
    console.log('⚡ Benchmarking CONCURRENT operations...');
    
    const concurrency = 10;
    const operationsPerWorker = Math.floor(this.testOperations / concurrency);
    const times: number[] = [];
    const startMemory = process.memoryUsage();
    
    const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
      const workerTimes: number[] = [];
      
      for (let i = 0; i < operationsPerWorker; i++) {
        const key = `concurrent-${workerIndex}-${i}`;
        const data = { workerId: workerIndex, operationId: i, timestamp: Date.now() };
        
        const start = performance.now();
        await this.cache.set(key, data);
        const end = performance.now();
        
        workerTimes.push(end - start);
      }
      
      return workerTimes;
    });
    
    const allWorkerTimes = await Promise.all(workers);
    allWorkerTimes.forEach(workerTimes => times.push(...workerTimes));
    
    const endMemory = process.memoryUsage();
    
    this.results.push(this.calculateStats('CONCURRENT', times, startMemory, endMemory));
  }

  /**
   * Benchmark compression efficiency
   */
  private async benchmarkCompressionEfficiency(): Promise<void> {
    console.log('🗜️ Benchmarking COMPRESSION efficiency...');
    
    const times: number[] = [];
    const startMemory = process.memoryUsage();
    
    // Create compressible data (repeated patterns)
    const compressibleData = JSON.stringify({
      repeatedField: 'This is a repeated string that should compress well. '.repeat(100),
      metadata: { timestamp: Date.now(), version: '1.0.0' }
    });
    
    for (let i = 0; i < Math.min(this.testOperations, 200); i++) {
      const key = `compression-key-${i}`;
      
      const start = performance.now();
      await this.cache.set(key, compressibleData);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    const endMemory = process.memoryUsage();
    
    this.results.push(this.calculateStats('COMPRESSION', times, startMemory, endMemory));
  }

  /**
   * Warmup operations to stabilize performance
   */
  private async warmup(operation: 'set' | 'get' | 'mixed'): Promise<void> {
    for (let i = 0; i < this.warmupOperations; i++) {
      const key = `warmup-${operation}-${i}`;
      
      if (operation === 'set' || operation === 'mixed') {
        await this.cache.set(key, { warmup: true, id: i });
      }
      
      if (operation === 'get' || operation === 'mixed') {
        await this.cache.get(key);
      }
    }
  }

  /**
   * Calculate statistics from timing data
   */
  private calculateStats(
    operation: string,
    times: number[],
    startMemory: NodeJS.MemoryUsage,
    endMemory: NodeJS.MemoryUsage
  ): BenchmarkResult {
    const sortedTimes = times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    
    return {
      operation,
      totalOperations: times.length,
      totalTime,
      averageTime: totalTime / times.length,
      operationsPerSecond: (times.length / totalTime) * 1000,
      minTime: sortedTimes[0],
      maxTime: sortedTimes[sortedTimes.length - 1],
      p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
      p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      }
    };
  }

  /**
   * Print benchmark results
   */
  private printResults(suite: BenchmarkSuite): void {
    console.log('\n📊 Benchmark Results');
    console.log('='.repeat(80));
    console.log(`Suite: ${suite.name}`);
    console.log(`Total Duration: ${suite.totalDuration.toFixed(2)}ms`);
    console.log(`Timestamp: ${new Date(suite.timestamp).toISOString()}`);
    console.log('\n');
    
    suite.results.forEach(result => {
      console.log(`${result.operation} Operations:`);
      console.log(`  Total Operations: ${result.totalOperations}`);
      console.log(`  Average Time: ${result.averageTime.toFixed(3)}ms`);
      console.log(`  Operations/sec: ${result.operationsPerSecond.toFixed(0)}`);
      console.log(`  Min/Max: ${result.minTime.toFixed(3)}ms / ${result.maxTime.toFixed(3)}ms`);
      console.log(`  P50/P95/P99: ${result.p50.toFixed(3)}ms / ${result.p95.toFixed(3)}ms / ${result.p99.toFixed(3)}ms`);
      console.log(`  Memory Delta: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log('');
    });
  }

  /**
   * Export results to JSON
   */
  exportResults(suite: BenchmarkSuite): string {
    return JSON.stringify(suite, null, 2);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.cache.clear();
    if ('destroy' in this.cache && typeof this.cache.destroy === 'function') {
      (this.cache as any).destroy();
    }
  }
}

/**
 * Run benchmark with default settings
 */
export async function runCacheBenchmark(options?: CacheOptions): Promise<BenchmarkSuite> {
  const benchmark = new CacheBenchmark(options);
  
  try {
    return await benchmark.runBenchmarkSuite();
  } finally {
    await benchmark.cleanup();
  }
}