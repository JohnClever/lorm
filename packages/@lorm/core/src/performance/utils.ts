/**
 * Performance Utilities - Helper functions and common utilities
 */

import type {
  Metric,
  Alert,
  PerformanceEvent,
  MetricValue
} from './types/index.js';

// Define missing types locally
interface TimeRange {
  start: number;
  end: number;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PerformanceStats {
  totalMetrics: number;
  totalAlerts: number;
  totalEvents: number;
  uptime: number;
}

/**
 * Time utilities
 */
export class TimeUtils {
  /**
   * Get current timestamp in milliseconds
   */
  static now(): number {
    return Date.now();
  }
  
  /**
   * Get current timestamp in seconds
   */
  static nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }
  
  /**
   * Get current timestamp in microseconds
   */
  static nowMicros(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return Math.floor(performance.now() * 1000);
    }
    return Date.now() * 1000;
  }
  
  /**
   * Get high-resolution timestamp
   */
  static hrTime(): [number, number] {
    if (typeof process !== 'undefined' && process.hrtime) {
      return process.hrtime();
    }
    const now = Date.now();
    return [Math.floor(now / 1000), (now % 1000) * 1000000];
  }
  
  /**
   * Convert hrtime to milliseconds
   */
  static hrTimeToMs(hrtime: [number, number]): number {
    return hrtime[0] * 1000 + hrtime[1] / 1000000;
  }
  
  /**
   * Format timestamp to ISO string
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }
  
  /**
   * Parse time range
   */
  static parseTimeRange(range: string | TimeRange): TimeRange {
    if (typeof range === 'object') {
      return range;
    }
    
    const now = Date.now();
    const patterns = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const duration = patterns[range as keyof typeof patterns];
    if (duration) {
      return {
        start: now - duration,
        end: now
      };
    }
    
    throw new Error(`Invalid time range: ${range}`);
  }
  
  /**
   * Check if timestamp is within range
   */
  static isInRange(timestamp: number, range: TimeRange): boolean {
    return timestamp >= range.start && timestamp <= range.end;
  }
  
  /**
   * Get time bucket for aggregation
   */
  static getTimeBucket(timestamp: number, interval: number): number {
    return Math.floor(timestamp / interval) * interval;
  }
}

/**
 * Metric utilities
 */
export class MetricUtils {
  /**
   * Create a metric
   */
  static createMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {},
    timestamp?: number
  ): Metric {
    return {
      id: generateId(),
      name,
      type: 'gauge' as any,
      value,
      tags,
      timestamp: timestamp || TimeUtils.now(),
      component: 'system'
    } as Metric;
  }
  
  /**
   * Create a counter metric
   */
  static counter(
    name: string,
    value: number = 1,
    tags: Record<string, string> = {}
  ): Metric {
    return this.createMetric(name, value, tags);
  }
  
  /**
   * Create a gauge metric
   */
  static gauge(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): Metric {
    return this.createMetric(name, value, tags);
  }
  
  /**
   * Create a histogram metric
   */
  static histogram(
    name: string,
    value: number,
    buckets: number[] = [0.1, 0.5, 1, 2.5, 5, 10],
    tags: Record<string, string> = {}
  ): Metric {
    return this.createMetric(name, value, tags);
  }
  
  /**
   * Create a timer metric
   */
  static timer(
    name: string,
    duration: number,
    tags: Record<string, string> = {}
  ): Metric {
    return this.createMetric(name, duration, tags);
  }
  
  /**
   * Aggregate metrics
   */
  static aggregate(metrics: Metric[], functions: string[] = ['avg', 'min', 'max', 'count']): Record<string, number> {
    if (metrics.length === 0) {
      return {};
    }
    
    const values = metrics.map(m => {
      // Handle different metric types
      if ('value' in m) return m.value;
      if ('duration' in m) return m.duration;
      if ('count' in m) return m.count;
      return 0;
    });
    
    const result: Record<string, number> = {};
    
    if (functions.includes('count')) {
      result.count = values.length;
    }
    
    if (functions.includes('sum')) {
      result.sum = values.reduce((sum, val) => sum + val, 0);
    }
    
    if (functions.includes('avg')) {
      result.avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    if (functions.includes('min')) {
      result.min = Math.min(...values);
    }
    
    if (functions.includes('max')) {
      result.max = Math.max(...values);
    }
    
    if (functions.includes('p50')) {
      result.p50 = percentile(values, 0.5);
    }
    
    if (functions.includes('p95')) {
      result.p95 = percentile(values, 0.95);
    }
    
    if (functions.includes('p99')) {
      result.p99 = percentile(values, 0.99);
    }
    
    return result;
  }
  
  /**
   * Filter metrics by criteria
   */
  static filter(metrics: Metric[], criteria: {
    name?: string | RegExp;
    tags?: Record<string, string | RegExp>;
    timeRange?: TimeRange;
    type?: string;
  }): Metric[] {
    return metrics.filter(metric => {
      // Filter by name
      if (criteria.name) {
        if (typeof criteria.name === 'string') {
          if (metric.name !== criteria.name) return false;
        } else {
          if (!criteria.name.test(metric.name)) return false;
        }
      }
      
      // Filter by tags
      if (criteria.tags) {
        for (const [key, value] of Object.entries(criteria.tags)) {
          const tagValue = metric.tags[key];
          if (!tagValue) return false;
          
          if (typeof value === 'string') {
            if (tagValue !== value) return false;
          } else {
            if (!value.test(tagValue)) return false;
          }
        }
      }
      
      // Filter by time range
      if (criteria.timeRange) {
        if (!TimeUtils.isInRange(metric.timestamp, criteria.timeRange)) return false;
      }
      
      // Filter by type - since MetricValue is primitive, we can't determine type from value
      // This would need to be stored separately in the Metric interface if needed
      if (criteria.type) {
        // For now, skip type filtering since we don't have type information
        // This could be enhanced by adding a type field to the Metric interface
      }
      
      return true;
    });
  }
  
  /**
   * Group metrics by key
   */
  static groupBy(metrics: Metric[], keyFn: (metric: Metric) => string): Record<string, Metric[]> {
    const groups: Record<string, Metric[]> = {};
    
    for (const metric of metrics) {
      const key = keyFn(metric);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
    }
    
    return groups;
  }
}

/**
 * Alert utilities
 */
export class AlertUtils {
  /**
   * Create an alert
   */
  static createAlert(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'critical' | 'emergency' = 'warning',
    tags: Record<string, string> = {}
  ): Alert {
    return {
      id: generateId(),
      thresholdId: generateId(),
      title,
      message,
      severity: severity as any,
      status: 'active' as any,
      component: 'system',
      metricId: generateId(),
      triggerValue: 0,
      thresholdValue: 0,
      triggeredAt: TimeUtils.now(),
      updatedAt: TimeUtils.now(),
      tags,
      metadata: {}
    };
  }
  
  /**
   * Check if alert should be escalated
   */
  static shouldEscalate(alert: Alert, escalationConfig: {
    maxRetries: number;
    retryInterval: number;
  }): boolean {
    const retryCount = Number(alert.metadata?.retryCount) || 0;
    const lastRetry = Number(alert.metadata?.lastRetry) || alert.triggeredAt;
    const timeSinceLastRetry = TimeUtils.now() - lastRetry;
    
    return retryCount < escalationConfig.maxRetries && 
           timeSinceLastRetry >= escalationConfig.retryInterval;
  }
  
  /**
   * Filter alerts by criteria
   */
  static filter(alerts: Alert[], criteria: {
    name?: string | RegExp;
    severity?: string | string[];
    status?: string | string[];
    tags?: Record<string, string | RegExp>;
    timeRange?: TimeRange;
  }): Alert[] {
    return alerts.filter(alert => {
      // Filter by name (using title)
      if (criteria.name) {
        if (typeof criteria.name === 'string') {
          if (alert.title !== criteria.name) return false;
        } else {
          if (!criteria.name.test(alert.title)) return false;
        }
      }
      
      // Filter by severity
      if (criteria.severity) {
        const severities = Array.isArray(criteria.severity) ? criteria.severity : [criteria.severity];
        if (!severities.includes(alert.severity)) return false;
      }
      
      // Filter by status
      if (criteria.status) {
        const statuses = Array.isArray(criteria.status) ? criteria.status : [criteria.status];
        if (!statuses.includes(alert.status)) return false;
      }
      
      // Filter by tags
      if (criteria.tags) {
        for (const [key, value] of Object.entries(criteria.tags)) {
          const tagValue = alert.tags[key];
          if (!tagValue) return false;
          
          if (typeof value === 'string') {
            if (tagValue !== value) return false;
          } else {
            if (!value.test(tagValue)) return false;
          }
        }
      }
      
      // Filter by time range
      if (criteria.timeRange) {
        if (!TimeUtils.isInRange(alert.triggeredAt, criteria.timeRange)) return false;
      }
      
      return true;
    });
  }
}

/**
 * Event utilities
 */
export class EventUtils {
  /**
   * Create an event
   */
  static createEvent(
    type: string,
    payload: any,
    source?: string
  ): PerformanceEvent {
    return {
      id: generateId(),
      type: type as any, // Cast to satisfy union type
      payload,
      source,
      timestamp: TimeUtils.now(),
      metadata: {}
    } as PerformanceEvent;
  }
  
  /**
   * Filter events by criteria
   */
  static filter(events: PerformanceEvent[], criteria: {
    type?: string | RegExp;
    source?: string | RegExp;
    tags?: Record<string, string | RegExp>;
    timeRange?: TimeRange;
  }): PerformanceEvent[] {
    return events.filter(event => {
      // Filter by type
      if (criteria.type) {
        if (typeof criteria.type === 'string') {
          if (event.type !== criteria.type) return false;
        } else {
          if (!criteria.type.test(event.type)) return false;
        }
      }
      
      // Filter by source
      if (criteria.source && event.source) {
        if (typeof criteria.source === 'string') {
          if (event.source !== criteria.source) return false;
        } else {
          if (!criteria.source.test(event.source)) return false;
        }
      }
      
      // Filter by tags - PerformanceEvent doesn't have tags property
      // This would need to be implemented differently based on event payload
      if (criteria.tags) {
        // Skip tag filtering for now since PerformanceEvent doesn't have tags
        // This could be enhanced by checking event payload for tag-like properties
      }
      
      // Filter by time range
      if (criteria.timeRange) {
        if (!TimeUtils.isInRange(event.timestamp, criteria.timeRange)) return false;
      }
      
      return true;
    });
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceUtils {
  private static timers = new Map<string, number>();
  
  /**
   * Start a timer
   */
  static startTimer(name: string): void {
    this.timers.set(name, TimeUtils.now());
  }
  
  /**
   * End a timer and return duration
   */
  static endTimer(name: string): number {
    const start = this.timers.get(name);
    if (!start) {
      throw new Error(`Timer '${name}' not found`);
    }
    
    const duration = TimeUtils.now() - start;
    this.timers.delete(name);
    return duration;
  }
  
  /**
   * Measure function execution time
   */
  static async measure<T>(name: string, fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    const start = TimeUtils.now();
    const result = await fn();
    const duration = TimeUtils.now() - start;
    
    return { result, duration };
  }
  
  /**
   * Create a performance decorator
   */
  static createDecorator(metricName?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const name = metricName || `${target.constructor.name}.${propertyKey}`;
      
      descriptor.value = async function (...args: any[]) {
        const start = TimeUtils.now();
        try {
          const result = await originalMethod.apply(this, args);
          const duration = TimeUtils.now() - start;
          
          // Emit metric (would need access to metric service)
          console.debug(`Performance: ${name} took ${duration}ms`);
          
          return result;
        } catch (error) {
          const duration = TimeUtils.now() - start;
          console.debug(`Performance: ${name} failed after ${duration}ms`);
          throw error;
        }
      };
      
      return descriptor;
    };
  }
  
  /**
   * Calculate statistics from values
   */
  static calculateStats(values: number[]): PerformanceStats {
    if (values.length === 0) {
      return {
        totalMetrics: 0,
        totalAlerts: 0,
        totalEvents: 0,
        uptime: 0
      };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    
    return {
      totalMetrics: values.length,
      totalAlerts: 0,
      totalEvents: 0,
      uptime: sum / values.length
    };
  }
}

/**
 * Data utilities
 */
export class DataUtils {
  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }
  
  /**
   * Deep merge objects
   */
  static deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {} as any, source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
    
    return result;
  }
  
  /**
   * Serialize data to JSON
   */
  static serialize(data: any): string {
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    });
  }
  
  /**
   * Deserialize JSON data
   */
  static deserialize<T>(json: string): T {
    return JSON.parse(json);
  }
  
  /**
   * Compress data (simple implementation)
   */
  static compress(data: string): string {
    // Simple compression using repeated character replacement
    // In a real implementation, you might use a proper compression library
    return data.replace(/(.)\1{2,}/g, (match, char) => `${char}${match.length}`);
  }
  
  /**
   * Decompress data
   */
  static decompress(data: string): string {
    // Reverse of simple compression
    return data.replace(/(.)([0-9]+)/g, (match, char, count) => char.repeat(parseInt(count)));
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate metric name
   */
  static isValidMetricName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(name);
  }
  
  /**
   * Validate tag key
   */
  static isValidTagKey(key: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(key);
  }
  
  /**
   * Validate tag value
   */
  static isValidTagValue(value: string): boolean {
    return value.length > 0 && value.length <= 256;
  }
  
  /**
   * Sanitize metric name
   */
  static sanitizeMetricName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^[^a-zA-Z]/, 'm_');
  }
  
  /**
   * Sanitize tag key
   */
  static sanitizeTagKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^[^a-zA-Z]/, 't_');
  }
  
  /**
   * Sanitize tag value
   */
  static sanitizeTagValue(value: string): string {
    return value.substring(0, 256).replace(/[\r\n\t]/g, ' ');
  }
}

/**
 * Helper functions
 */

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate percentile
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout as any);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Create a circuit breaker
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
  } = {}
): T {
  const {
    failureThreshold = 5,
    resetTimeout = 60000,
    monitoringPeriod = 10000
  } = options;
  
  let state: 'closed' | 'open' | 'half-open' = 'closed';
  let failures = 0;
  let lastFailureTime = 0;
  let successes = 0;
  
  return (async (...args: Parameters<T>) => {
    const now = Date.now();
    
    // Reset failure count if monitoring period has passed
    if (now - lastFailureTime > monitoringPeriod) {
      failures = 0;
    }
    
    // Check if circuit should be half-open
    if (state === 'open' && now - lastFailureTime > resetTimeout) {
      state = 'half-open';
      successes = 0;
    }
    
    // Reject if circuit is open
    if (state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn(...args);
      
      // Success in half-open state
      if (state === 'half-open') {
        successes++;
        if (successes >= 3) {
          state = 'closed';
          failures = 0;
        }
      }
      
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = now;
      
      // Open circuit if threshold reached
      if (failures >= failureThreshold) {
        state = 'open';
      }
      
      throw error;
    }
  }) as T;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(2)}m`;
  }
  
  const hours = minutes / 60;
  return `${hours.toFixed(2)}h`;
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions && !!process.versions.node;
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Get environment info
 */
export function getEnvironmentInfo(): {
  platform: string;
  runtime: string;
  version?: string;
} {
  if (isNode()) {
    return {
      platform: process.platform,
      runtime: 'node',
      version: process.version
    };
  }
  
  if (isBrowser()) {
    return {
      platform: navigator.platform,
      runtime: 'browser',
      version: navigator.userAgent
    };
  }
  
  return {
    platform: 'unknown',
    runtime: 'unknown'
  };
}