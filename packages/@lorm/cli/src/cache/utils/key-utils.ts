/**
 * Cache key utilities
 * 
 * Provides utilities for cache key validation, normalization,
 * and manipulation across the unified caching system.
 */

export interface CacheKeyOptions {
  namespace?: string;
  prefix?: string;
  suffix?: string;
  normalize?: boolean;
}

/**
 * Utility class for cache key operations
 */
export class CacheKeyUtils {
  private static readonly INVALID_CHARS = /[\s\n\r\t\0]/g;
  private static readonly MAX_KEY_LENGTH = 250;
  private static readonly NAMESPACE_SEPARATOR = ':';

  /**
   * Validate a cache key
   */
  static validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string');
    }

    if (key.length > this.MAX_KEY_LENGTH) {
      throw new Error(`Cache key length exceeds maximum of ${this.MAX_KEY_LENGTH} characters`);
    }

    if (this.INVALID_CHARS.test(key)) {
      throw new Error('Cache key contains invalid characters (whitespace, newlines, null)');
    }
  }

  /**
   * Normalize a cache key
   */
  static normalizeKey(key: string, options: CacheKeyOptions = {}): string {
    let normalizedKey = key;

    if (options.normalize !== false) {
      normalizedKey = normalizedKey.toLowerCase().trim();
    }

    if (options.prefix) {
      normalizedKey = `${options.prefix}${normalizedKey}`;
    }

    if (options.suffix) {
      normalizedKey = `${normalizedKey}${options.suffix}`;
    }

    if (options.namespace) {
      normalizedKey = `${options.namespace}${this.NAMESPACE_SEPARATOR}${normalizedKey}`;
    }

    this.validateKey(normalizedKey);
    return normalizedKey;
  }

  /**
   * Extract namespace from a namespaced key
   */
  static extractNamespace(key: string): { namespace: string | null; key: string } {
    const separatorIndex = key.indexOf(this.NAMESPACE_SEPARATOR);
    
    if (separatorIndex === -1) {
      return { namespace: null, key };
    }

    return {
      namespace: key.substring(0, separatorIndex),
      key: key.substring(separatorIndex + 1)
    };
  }

  /**
   * Generate a hash for a key (useful for disk storage)
   */
  static hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if a key matches a pattern
   */
  static matchesPattern(key: string, pattern: string): boolean {
    // Convert glob-like pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Instance methods for convenience
   */
  validateKey(key: string): void {
    CacheKeyUtils.validateKey(key);
  }

  normalizeKey(key: string, options: CacheKeyOptions = {}): string {
    return CacheKeyUtils.normalizeKey(key, options);
  }

  extractNamespace(key: string): { namespace: string | null; key: string } {
    return CacheKeyUtils.extractNamespace(key);
  }

  hashKey(key: string): string {
    return CacheKeyUtils.hashKey(key);
  }

  matchesPattern(key: string, pattern: string): boolean {
    return CacheKeyUtils.matchesPattern(key, pattern);
  }
}