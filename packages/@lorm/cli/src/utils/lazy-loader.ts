/**
 * Lazy loading utility for heavy dependencies
 * Improves CLI startup performance by loading modules only when needed
 */

export interface LazyModule<T = any> {
  (): Promise<T>;
  _cached?: T;
}

/**
 * Creates a lazy loader for a module
 */
export function createLazyLoader<T>(importFn: () => Promise<T>): LazyModule<T> {
  const loader = async (): Promise<T> => {
    if ((loader as LazyModule<T>)._cached) {
      return (loader as LazyModule<T>)._cached!;
    }
    
    try {
      (loader as LazyModule<T>)._cached = await importFn();
      return (loader as LazyModule<T>)._cached!;
    } catch (error) {
      delete (loader as LazyModule<T>)._cached;
      throw error;
    }
  };
  
  return loader as LazyModule<T>;
}

/**
 * Lazy loaders for heavy dependencies
 */
export const lazyLoaders = {
  drizzleKit: createLazyLoader(() => import('drizzle-kit')),
  
  chokidar: createLazyLoader(() => import('chokidar')),
  
  inquirer: createLazyLoader(() => import('@inquirer/prompts')),
  
  execa: createLazyLoader(() => import('execa')),
  
  lormCore: createLazyLoader(() => import('@lorm/core')),
  
  chalk: createLazyLoader(() => import('chalk').then(m => m.default))
};

/**
 * Preload specific modules for better performance
 */
export async function preloadModules(modules: (keyof typeof lazyLoaders)[]): Promise<void> {
  const promises = modules.map(module => lazyLoaders[module]());
  await Promise.allSettled(promises);
}

/**
 * Clear all cached modules (useful for testing)
 */
export function clearCache(): void {
  Object.values(lazyLoaders).forEach(loader => {
    delete (loader as LazyModule)._cached;
  });
}