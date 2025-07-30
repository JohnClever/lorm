export interface LazyModule<T = any> {
  (): Promise<T>;
  _cached?: T;
  _loading?: Promise<T>;
  _error?: Error;
  _retryCount?: number;
}

export interface LazyLoaderOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export function createLazyLoader<T>(
  importFn: () => Promise<T>,
  options: LazyLoaderOptions = {}
): LazyModule<T> {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options;

  const loader = async (): Promise<T> => {
    const loaderWithMeta = loader as LazyModule<T>;

    // Return cached result if available
    if (loaderWithMeta._cached) {
      return loaderWithMeta._cached;
    }

    // Return ongoing loading promise if exists
    if (loaderWithMeta._loading) {
      return loaderWithMeta._loading;
    }

    // Create loading promise with retry logic
    loaderWithMeta._loading = (async (): Promise<T> => {
      const retryCount = loaderWithMeta._retryCount || 0;

      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Module import timeout after ${timeout}ms`)), timeout);
        });

        const result = await Promise.race([importFn(), timeoutPromise]);
        loaderWithMeta._cached = result;
        loaderWithMeta._retryCount = 0;
        delete loaderWithMeta._error;
        delete loaderWithMeta._loading;
        return result;
      } catch (error) {
        loaderWithMeta._error = error as Error;
        delete loaderWithMeta._loading;

        if (retryCount < maxRetries) {
          loaderWithMeta._retryCount = retryCount + 1;
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loader();
        }

        throw error;
      }
    })();

    return loaderWithMeta._loading;
  };

  return loader as LazyModule<T>;
}

export const lazyLoaders = {
  // Heavy dependencies with longer timeout
  drizzleKit: createLazyLoader(
    () => import("drizzle-kit"),
    { timeout: 45000, maxRetries: 2 }
  ),

  // File watching with standard timeout
  chokidar: createLazyLoader(
    () => import("chokidar"),
    { timeout: 15000 }
  ),

  // Interactive prompts - critical for UX
  inquirer: createLazyLoader(
    () => import("@inquirer/prompts"),
    { maxRetries: 5, retryDelay: 500 }
  ),

  // Process execution
  execa: createLazyLoader(
    () => import("execa"),
    { timeout: 10000 }
  ),

  // Core Lorm functionality
  lormCore: createLazyLoader(
    () => import("@lorm/core"),
    { timeout: 20000, maxRetries: 3 }
  ),

  // Styling - lightweight but essential
  chalk: createLazyLoader(
    () => import("chalk").then((m) => m.default),
    { timeout: 5000, maxRetries: 2 }
  ),
};

export type LazyLoaderKey = keyof typeof lazyLoaders;

// Module priority for cache warming
export const MODULE_PRIORITIES = {
  high: ['chalk', 'execa'] as LazyLoaderKey[],
  medium: ['inquirer', 'lormCore'] as LazyLoaderKey[],
  low: ['chokidar', 'drizzleKit'] as LazyLoaderKey[],
} as const;

export async function preloadModules(
  modules: LazyLoaderKey[]
): Promise<void> {
  const promises = modules.map((module) => lazyLoaders[module]());
  await Promise.allSettled(promises);
}

/**
 * Warm cache with prioritized module loading
 */
export async function warmCache(
  priority: 'high' | 'medium' | 'low' | 'all' = 'high'
): Promise<void> {
  const modulesToLoad: LazyLoaderKey[] = [];

  if (priority === 'all') {
    modulesToLoad.push(
      ...MODULE_PRIORITIES.high,
      ...MODULE_PRIORITIES.medium,
      ...MODULE_PRIORITIES.low
    );
  } else {
    modulesToLoad.push(...MODULE_PRIORITIES[priority]);
  }

  // Load high priority modules first, then others in parallel
  if (priority === 'all') {
    await preloadModules(MODULE_PRIORITIES.high);
    await Promise.allSettled([
      preloadModules(MODULE_PRIORITIES.medium),
      preloadModules(MODULE_PRIORITIES.low),
    ]);
  } else {
    await preloadModules(modulesToLoad);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  cached: LazyLoaderKey[];
  loading: LazyLoaderKey[];
  errors: Array<{ module: LazyLoaderKey; error: string }>;
} {
  const cached: LazyLoaderKey[] = [];
  const loading: LazyLoaderKey[] = [];
  const errors: Array<{ module: LazyLoaderKey; error: string }> = [];

  Object.entries(lazyLoaders).forEach(([key, loader]) => {
    const loaderWithMeta = loader as LazyModule;
    if (loaderWithMeta._cached) {
      cached.push(key as LazyLoaderKey);
    } else if (loaderWithMeta._loading) {
      loading.push(key as LazyLoaderKey);
    }
    if (loaderWithMeta._error) {
      errors.push({
        module: key as LazyLoaderKey,
        error: loaderWithMeta._error.message,
      });
    }
  });

  return { cached, loading, errors };
}

export function clearCache(modules?: LazyLoaderKey[]): void {
  const targetModules = modules || Object.keys(lazyLoaders) as LazyLoaderKey[];
  
  targetModules.forEach((module) => {
    const loader = lazyLoaders[module] as LazyModule;
    delete loader._cached;
    delete loader._loading;
    delete loader._error;
    delete loader._retryCount;
  });
}

/**
 * Check if a module is ready (cached)
 */
export function isModuleReady(module: LazyLoaderKey): boolean {
  return !!(lazyLoaders[module] as LazyModule)._cached;
}

/**
 * Get a module synchronously if cached, otherwise return null
 */
export function getModuleSync<T>(module: LazyLoaderKey): T | null {
  const cached = (lazyLoaders[module] as LazyModule)._cached;
  return cached || null;
}
