export { BaseCache } from './base-cache';
export { ConfigCache } from './config-cache';
export { CacheManager, cacheManager } from './cache-manager';

// Export convenience instances
import { cacheManager as manager } from './cache-manager';
export const defaultCache = manager.getCache('default');
export const configCache = manager.getConfigCache();