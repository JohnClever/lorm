/**
 * HTTP Performance Adapter - Monitors HTTP requests and responses
 */

import type {
  HttpAdapterConfig,
  AdapterStats,
  ComponentHealth,
  Metric,
  HealthCheck
} from '../types/index.js';
import { AdapterType, AdapterEventType, MetricType, HealthStatus } from '../types/index.js';
import { EnhancedBaseAdapter } from './base-adapter.js';

/**
 * Performance adapter for HTTP operations
 */
export class HttpPerformanceAdapter extends EnhancedBaseAdapter {
  private _requestStats: Map<string, RequestStats> = new Map();
  private _endpointStats: Map<string, EndpointStats> = new Map();
  private _activeRequests: Map<string, RequestContext> = new Map();
  private _monitoringInterval?: NodeJS.Timeout;

  constructor(config: HttpAdapterConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    await super.initialize();
  }

  // Abstract method implementations
  protected async onInitialize(): Promise<void> {
    // HTTP-specific initialization
    this._requestStats.clear();
    this._endpointStats.clear();
    this._activeRequests.clear();
  }

  protected async onStart(): Promise<void> {
    // Start HTTP monitoring
    this.startHttpMonitoring();
  }

  protected async onStop(): Promise<void> {
    // Stop HTTP monitoring
    this.stopHttpMonitoring();
  }

  protected async onDispose(): Promise<void> {
    // Clean up HTTP resources
    this._requestStats.clear();
    this._endpointStats.clear();
    this._activeRequests.clear();
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = undefined;
    }
  }

  protected async doCollectMetrics(): Promise<Metric[]> {
    return await this.collectHttpMetrics();
  }

  protected async doGetHealth(): Promise<ComponentHealth> {
    return await this.getHealth();
  }

  async start(): Promise<void> {
    await super.start();
    
    this.startHttpMonitoring();
    
    await this.recordMetric(this.createMetric(
      'http.adapter.started',
      'counter',
      1
    ));
  }

  async stop(): Promise<void> {
    this.stopHttpMonitoring();
    
    await this.recordMetric(this.createMetric(
      'http.adapter.stopped',
      'counter',
      1
    ));
    
    await super.stop();
  }

  // HTTP request instrumentation
  async instrumentRequest<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>,
    options: RequestInstrumentationOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const endpoint = this.normalizeEndpoint(method, url);
    
    // Create request context
    const context: RequestContext = {
      id: requestId,
      method,
      url,
      endpoint,
      startTime,
      userAgent: options.userAgent,
      clientIp: options.clientIp
    };
    
    this._activeRequests.set(requestId, context);
    
    try {
      // Record request start
      await this.recordMetric(this.createMetric(
          'http.request.started',
          'counter',
          1,
          {
            method,
            endpoint,
            request_id: requestId
          }
        ));
      
      // Execute request
      const result = await requestFn();
      
      // Extract response information
      const statusCode = this.extractStatusCode(result);
      const responseSize = this.extractResponseSize(result);
      
      // Record success metrics
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.updateRequestStats(endpoint, duration, statusCode, true);
      this.updateEndpointStats(endpoint, duration, statusCode);
      
      await this.recordMetrics([
        this.createTimerMetric(
          'http.request.duration',
          startTime,
          endTime,
          true,
          {
            method,
            endpoint,
            status_code: statusCode.toString(),
            request_id: requestId,
            status: 'success'
          }
        ),
        this.createMetric(
          'http.request.completed',
          'counter',
          1,
          {
            method,
            endpoint,
            status_code: statusCode.toString(),
            request_id: requestId
          }
        )
      ]);
      
      // Record response size if available
      if (responseSize > 0) {
        await this.recordMetric(this.createMetric(
          'http.response.size',
          'histogram',
          responseSize,
          {
            method,
            endpoint,
            status_code: statusCode.toString()
          }
        ));
      }
      
      return result;
    } catch (error) {
      // Record error metrics
      const duration = Date.now() - startTime;
      const statusCode = this.extractErrorStatusCode(error);
      
      this.updateRequestStats(endpoint, duration, statusCode, false);
      this.updateEndpointStats(endpoint, duration, statusCode);
      
      await this.recordMetrics([
        this.createTimerMetric(
          'http.request.duration',
          startTime,
          Date.now(),
          false,
          {
            method,
            endpoint,
            status_code: statusCode.toString(),
            request_id: requestId,
            status: 'error'
          }
        ),
        this.createMetric(
          'http.request.error',
          'counter',
          1,
          {
            method,
            endpoint,
            status_code: statusCode.toString(),
            request_id: requestId,
            error_type: (error as Error).name
          }
        )
      ]);
      
      throw error;
    } finally {
      this._activeRequests.delete(requestId);
    }
  }

  // Middleware for Express.js-like frameworks
  createMiddleware() {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      const method = req.method || 'UNKNOWN';
      const url = req.url || req.path || '/';
      const endpoint = this.normalizeEndpoint(method, url);
      
      // Add request ID to request object
      req.performanceRequestId = requestId;
      
      // Create request context
      const context: RequestContext = {
        id: requestId,
        method,
        url,
        endpoint,
        startTime,
        userAgent: req.headers?.['user-agent'],
        clientIp: req.ip || req.connection?.remoteAddress
      };
      
      this._activeRequests.set(requestId, context);
      
      // Record request start
      await this.recordMetric(this.createMetric(
        'http.request.started',
        'counter',
        1,
        {
          method,
          endpoint,
          request_id: requestId
        }
      ));
      
      // Hook into response finish event
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode || 500;
        
        this.updateRequestStats(endpoint, duration, statusCode, statusCode < 400);
        this.updateEndpointStats(endpoint, duration, statusCode);
        
        // Record completion metrics
        this.recordMetrics([
          this.createTimerMetric(
            'http.request.duration',
            startTime,
            Date.now(),
            statusCode < 400,
            {
              method,
              endpoint,
              status_code: statusCode.toString(),
              request_id: requestId,
              status: statusCode < 400 ? 'success' : 'error'
            }
          ),
          this.createMetric(
            'http.request.completed',
            'counter',
            1,
            {
              method,
              endpoint,
              status_code: statusCode.toString(),
              request_id: requestId
            }
          )
        ]).catch(error => {
          console.error(`[${this.getId()}] Error recording HTTP metrics:`, error);
        });
        
        this._activeRequests.delete(requestId);
        
        // Call original end method
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  // HTTP metrics collection
  async collectHttpMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Collect request statistics
      for (const [endpoint, stats] of Array.from(this._requestStats)) {
        const avgDuration = stats.totalDuration / stats.count;
        const errorRate = (stats.errorCount / stats.count) * 100;
        
        metrics.push(
          this.createMetric(
            'http.requests.total',
            'counter',
            stats.count,
            { endpoint }
          ),
          this.createMetric(
            'http.requests.avg_duration',
            'gauge',
            avgDuration,
            { endpoint }
          ),
          this.createMetric(
            'http.requests.max_duration',
            'gauge',
            stats.maxDuration,
            { endpoint }
          ),
          this.createMetric(
            'http.requests.error_rate',
            'gauge',
            errorRate,
            { endpoint }
          )
        );
      }
      
      // Collect endpoint statistics
      for (const [endpoint, stats] of Array.from(this._endpointStats)) {
        for (const [statusCode, count] of Array.from(stats.statusCodes)) {
          metrics.push(this.createMetric(
            'http.responses.by_status',
            'counter',
            count,
            {
              endpoint,
              status_code: statusCode
            }
          ));
        }
      }
      
      // Active requests
      metrics.push(this.createMetric(
        'http.requests.active',
        'gauge',
        this._activeRequests.size
      ));
      
      // Calculate percentiles for request durations
      const allDurations = Array.from(this._requestStats.values())
        .flatMap(stats => stats.durations);
      
      if (allDurations.length > 0) {
        const sortedDurations = allDurations.sort((a, b) => a - b);
        const p50 = this.calculatePercentile(sortedDurations, 50);
        const p95 = this.calculatePercentile(sortedDurations, 95);
        const p99 = this.calculatePercentile(sortedDurations, 99);
        
        metrics.push(
          this.createMetric('http.request.duration.p50', 'gauge', p50),
          this.createMetric('http.request.duration.p95', 'gauge', p95),
          this.createMetric('http.request.duration.p99', 'gauge', p99)
        );
      }
      
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting HTTP metrics:`, error);
    }
    
    return metrics;
  }

  async getStats(): Promise<AdapterStats> {
    const baseStats = await super.getStats();
    
    const totalRequests = Array.from(this._requestStats.values())
      .reduce((sum, stats) => sum + stats.count, 0);
    const totalErrors = Array.from(this._requestStats.values())
      .reduce((sum, stats) => sum + stats.errorCount, 0);
    
    return {
      ...baseStats
    };
  }

  async getHealth(): Promise<ComponentHealth> {
    const baseHealth = await super.getHealth();
    
    const httpHealthChecks = await this.performHttpHealthChecks();
    
    return {
      ...baseHealth,
      metadata: {
        ...baseHealth.metadata,
        http: httpHealthChecks
      }
    };
  }

  // Private methods
  private startHttpMonitoring(): void {
    const config = this._config as HttpAdapterConfig;
    const interval = config.monitoringInterval || 30000; // 30 seconds default
    
    this._monitoringInterval = setInterval(() => {
      this.collectAndRecordMetrics().catch(error => {
        console.error(`[${this.getId()}] HTTP monitoring error:`, error);
      });
    }, interval);
  }

  private stopHttpMonitoring(): void {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = undefined;
    }
  }

  private async collectAndRecordMetrics(): Promise<void> {
    try {
      const metrics = await this.collectHttpMetrics();
      await this.recordMetrics(metrics);
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting HTTP metrics:`, error);
    }
  }

  private async performHttpHealthChecks(): Promise<Record<string, any>> {
    const healthChecks: Record<string, any> = {};
    
    try {
      // Check active requests
      healthChecks.activeRequests = this._activeRequests.size;
      healthChecks.activeRequestsStatus = this._activeRequests.size < 100 ? 'healthy' : 'degraded';
      
      // Check error rates
      const totalRequests = Array.from(this._requestStats.values())
        .reduce((sum, stats) => sum + stats.count, 0);
      const totalErrors = Array.from(this._requestStats.values())
        .reduce((sum, stats) => sum + stats.errorCount, 0);
      
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
      healthChecks.errorRate = errorRate;
      healthChecks.errorRateStatus = errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'unhealthy';
      
      // Check for stuck requests (requests taking too long)
      const now = Date.now();
      const stuckRequests = Array.from(this._activeRequests.values())
        .filter(req => now - req.startTime > 30000); // 30 seconds
      
      healthChecks.stuckRequests = stuckRequests.length;
      healthChecks.stuckRequestsStatus = stuckRequests.length === 0 ? 'healthy' : 'degraded';
      
    } catch (error) {
      healthChecks.error = (error as Error).message;
    }
    
    return healthChecks;
  }

  private updateRequestStats(
    endpoint: string,
    duration: number,
    statusCode: number,
    success: boolean
  ): void {
    let stats = this._requestStats.get(endpoint);
    
    if (!stats) {
      stats = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        errorCount: 0,
        durations: []
      };
      this._requestStats.set(endpoint, stats);
    }
    
    stats.count++;
    stats.totalDuration += duration;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.durations.push(duration);
    
    // Keep only last 1000 durations to prevent memory growth
    if (stats.durations.length > 1000) {
      stats.durations.shift();
    }
    
    if (!success) {
      stats.errorCount++;
    }
  }

  private updateEndpointStats(endpoint: string, duration: number, statusCode: number): void {
    let stats = this._endpointStats.get(endpoint);
    
    if (!stats) {
      stats = {
        statusCodes: new Map(),
        lastAccess: Date.now()
      };
      this._endpointStats.set(endpoint, stats);
    }
    
    const statusCodeStr = statusCode.toString();
    const currentCount = stats.statusCodes.get(statusCodeStr) || 0;
    stats.statusCodes.set(statusCodeStr, currentCount + 1);
    stats.lastAccess = Date.now();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeEndpoint(method: string, url: string): string {
    // Remove query parameters and normalize path
    const path = url.split('?')[0];
    
    // Replace path parameters with placeholders
    const normalized = path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid');
    
    return `${method.toUpperCase()} ${normalized}`;
  }

  private extractStatusCode(result: any): number {
    if (typeof result === 'object' && result !== null) {
      if (result.status) return result.status;
      if (result.statusCode) return result.statusCode;
      if (result.code) return result.code;
    }
    return 200; // Default to 200 if no status found
  }

  private extractResponseSize(result: any): number {
    if (typeof result === 'string') {
      return result.length;
    }
    if (typeof result === 'object' && result !== null) {
      if (result.data && typeof result.data === 'string') {
        return result.data.length;
      }
      return JSON.stringify(result).length;
    }
    return 0;
  }

  private extractErrorStatusCode(error: any): number {
    if (error.status) return error.status;
    if (error.statusCode) return error.statusCode;
    if (error.code && typeof error.code === 'number') return error.code;
    return 500; // Default to 500 for errors
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  protected async validateConfig(config: HttpAdapterConfig): Promise<void> {
    await super.validateConfig(config);
    
    if (config.maxConcurrentRequests && config.maxConcurrentRequests < 1) {
      throw new Error('Max concurrent requests must be positive');
    }
    
    if (config.requestTimeout && config.requestTimeout < 0) {
      throw new Error('Request timeout must be non-negative');
    }
  }
}

// Interfaces
interface RequestStats {
  count: number;
  totalDuration: number;
  maxDuration: number;
  errorCount: number;
  durations: number[];
}

interface EndpointStats {
  statusCodes: Map<string, number>;
  lastAccess: number;
}

interface RequestContext {
  id: string;
  method: string;
  url: string;
  endpoint: string;
  startTime: number;
  userAgent?: string;
  clientIp?: string;
}

interface RequestInstrumentationOptions {
  userAgent?: string;
  clientIp?: string;
  timeout?: number;
}

// Helper functions
export function createHttpAdapter(config: Partial<HttpAdapterConfig> = {}): HttpPerformanceAdapter {
  const defaultConfig: HttpAdapterConfig = {
    id: config.id || 'http-adapter',
    name: config.name || 'HTTP Performance Adapter',
    type: AdapterType.HTTP,
    enabled: config.enabled ?? true,
    collectionInterval: config.collectionInterval || 30000,
    monitoringInterval: config.monitoringInterval || 30000,
    maxConcurrentRequests: config.maxConcurrentRequests || 100,
    requestTimeout: config.requestTimeout || 30000,
    config: {
      trackResponseTime: true,
      trackStatusCodes: true,
      trackRequestSize: true,
      trackResponseSize: true,
      ...config.config
    },
    ...config
  };
  
  return new HttpPerformanceAdapter(defaultConfig);
}

// Fetch API wrapper with monitoring
export function createMonitoredFetch(adapter: HttpPerformanceAdapter) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const method = options.method || 'GET';
    
    return adapter.instrumentRequest(
      method,
      url,
      () => fetch(url, options),
      {
        userAgent: (options.headers as Record<string, string>)?.['User-Agent']
      }
    );
  };
}

// Axios interceptor setup
export function setupAxiosMonitoring(axios: any, adapter: HttpPerformanceAdapter): void {
  // Request interceptor
  axios.interceptors.request.use(
    (config: any) => {
      config.metadata = {
        startTime: Date.now(),
        requestId: adapter['generateRequestId']()
      };
      return config;
    },
    (error: any) => Promise.reject(error)
  );
  
  // Response interceptor
  axios.interceptors.response.use(
    (response: any) => {
      const duration = Date.now() - response.config.metadata.startTime;
      const endpoint = adapter['normalizeEndpoint'](response.config.method?.toUpperCase(), response.config.url);
      
      adapter['updateRequestStats'](endpoint, duration, response.status, true);
      adapter['updateEndpointStats'](endpoint, duration, response.status);
      
      return response;
    },
    (error: any) => {
      if (error.config?.metadata) {
        const duration = Date.now() - error.config.metadata.startTime;
        const endpoint = adapter['normalizeEndpoint'](error.config.method?.toUpperCase(), error.config.url);
        const statusCode = error.response?.status || 500;
        
        adapter['updateRequestStats'](endpoint, duration, statusCode, false);
        adapter['updateEndpointStats'](endpoint, duration, statusCode);
      }
      
      return Promise.reject(error);
    }
  );
}