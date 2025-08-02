/**
 * Cache Benchmarks - Export module for benchmarking and testing infrastructure
 */

export {
  CacheBenchmark,
  runCacheBenchmark,
  type BenchmarkResult,
  type BenchmarkSuite
} from './cache-benchmark.js';

export {
  TestRunner,
  runDefaultTestSuite,
  DEFAULT_TEST_CONFIGURATIONS,
  type TestConfiguration,
  type TestResult,
  type ComparisonReport
} from './test-runner.js';