/**
 * Cache Adapters - Integration adapters for external systems
 * Provides adapters for connecting cache operations to monitoring and other systems
 */

export {
  CachePerformanceAdapter,
  getCachePerformanceAdapter,
  createCachePerformanceAdapter,
  type CachePerformanceMetrics,
} from './performance-bridge.js';