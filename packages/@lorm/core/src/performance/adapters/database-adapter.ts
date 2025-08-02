/**
 * Database Performance Adapter - Monitors database operations and performance
 */

import type {
  DatabaseAdapterConfig,
  AdapterStats,
  ComponentHealth,
  Metric,
  CounterMetric,
  GaugeMetric,
  TimerMetric,
  RateMetric
} from '../types/index.js';
import { AdapterType, MetricType, HealthStatus } from '../types/index.js';
import { EnhancedBaseAdapter } from './base-adapter.js';

// Missing type definitions
interface QueryStats {
  count: number;
  totalDuration: number;
  maxDuration: number;
  errorCount: number;
}

interface ConnectionPoolStats {
  activeConnections?: number;
  idleConnections?: number;
  totalConnections?: number;
  waitingRequests?: number;
}

/**
 * Performance adapter for database systems
 */
export class DatabasePerformanceAdapter extends EnhancedBaseAdapter {
  private _dbInstance: any;
  private _queryStats: Map<string, QueryStats> = new Map();
  private _connectionPool?: ConnectionPoolStats;
  private _slowQueryThreshold: number;
  private _monitoringInterval?: NodeJS.Timeout;

  constructor(config: Partial<DatabaseAdapterConfig> = {}) {
    const fullConfig: DatabaseAdapterConfig = {
      id: config.id || 'database-adapter',
      name: config.name || 'Database Performance Adapter',
      type: AdapterType.DATABASE,
      enabled: config.enabled ?? true,
      ...config,
      config: config.config || {}
    };
    super(fullConfig);
    this._slowQueryThreshold = config.slowQueryThreshold || 1000; // 1 second default
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    const dbConfig = this._config as DatabaseAdapterConfig;
    
    if (dbConfig.dbInstance) {
      this._dbInstance = dbConfig.dbInstance;
      await this.instrumentDatabaseInstance();
    }
    
    this._slowQueryThreshold = dbConfig.slowQueryThreshold || this._slowQueryThreshold;
  }

  async start(): Promise<void> {
    await super.start();
    
    this.startDatabaseMonitoring();
    
    await this.recordMetric(this.createMetric(
      'database.adapter.started',
      'counter',
      1,
      { db_type: this.getDatabaseType() }
    ));
  }

  async stop(): Promise<void> {
    this.stopDatabaseMonitoring();
    
    await this.recordMetric(this.createMetric(
      'database.adapter.stopped',
      'counter',
      1,
      { db_type: this.getDatabaseType() }
    ));
    
    await super.stop();
  }

  // Database operation instrumentation
  async instrumentQuery<T>(
    query: string,
    params: any[] = [],
    operation: string = 'query'
  ): Promise<T> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(query);
    const queryHash = this.hashQuery(query);
    
    try {
      // Record query start
      await this.recordMetric(this.createMetric(
        'database.query.started',
        'counter',
        1,
        {
          operation,
          query_hash: queryHash,
          query_id: queryId
        }
      ));
      
      // Execute query (this would be implemented by the specific database adapter)
      const result = await this.executeQuery<T>(query, params);
      
      // Record success metrics
      const duration = Date.now() - startTime;
      this.updateQueryStats(queryHash, duration, true);
      
      const isSlowQuery = duration > this._slowQueryThreshold;
      
      await this.recordMetrics([
        this.createTimerMetric(
          'database.query.duration',
          startTime,
          Date.now(),
          true,
          {
            operation,
            query_hash: queryHash,
            query_id: queryId,
            status: 'success',
            slow_query: isSlowQuery.toString()
          }
        ),
        this.createMetric(
          'database.query.completed',
          'counter',
          1,
          {
            operation,
            query_hash: queryHash,
            query_id: queryId,
            status: 'success'
          }
        )
      ]);
      
      // Record slow query if applicable
      if (isSlowQuery) {
        await this.recordMetric(this.createMetric(
          'database.slow_query',
          'counter',
          1,
          {
            operation,
            query_hash: queryHash,
            duration: duration.toString()
          }
        ));
      }
      
      return result;
    } catch (error) {
      // Record error metrics
      const duration = Date.now() - startTime;
      this.updateQueryStats(queryHash, duration, false);
      
      await this.recordMetrics([
        this.createTimerMetric(
          'database.query.duration',
          startTime,
          Date.now(),
          false,
          {
            operation,
            query_hash: queryHash,
            query_id: queryId,
            status: 'error'
          }
        ),
        this.createMetric(
          'database.query.error',
          'counter',
          1,
          {
            operation,
            query_hash: queryHash,
            query_id: queryId,
            error_type: (error as Error).name,
            error_code: this.extractErrorCode(error)
          }
        )
      ]);
      
      throw error;
    }
  }

  // Connection pool monitoring
  async monitorConnectionPool(): Promise<void> {
    if (!this._dbInstance || typeof this._dbInstance.getPoolStats !== 'function') {
      return;
    }
    
    try {
      const poolStats = await this._dbInstance.getPoolStats();
      this._connectionPool = poolStats;
      
      await this.recordMetrics([
        this.createMetric(
          'database.pool.active_connections',
          'gauge',
          poolStats.activeConnections || 0,
          { db_type: this.getDatabaseType() }
        ),
        this.createMetric(
          'database.pool.idle_connections',
          'gauge',
          poolStats.idleConnections || 0,
          { db_type: this.getDatabaseType() }
        ),
        this.createMetric(
          'database.pool.total_connections',
          'gauge',
          poolStats.totalConnections || 0,
          { db_type: this.getDatabaseType() }
        ),
        this.createMetric(
          'database.pool.waiting_requests',
          'gauge',
          poolStats.waitingRequests || 0,
          { db_type: this.getDatabaseType() }
        )
      ]);
      
      // Calculate pool utilization
      if (poolStats.totalConnections > 0) {
        const utilization = (poolStats.activeConnections / poolStats.totalConnections) * 100;
        await this.recordMetric(this.createMetric(
          'database.pool.utilization',
          'gauge',
          utilization,
          { db_type: this.getDatabaseType() }
        ));
      }
    } catch (error) {
      console.error(`[${this.getId()}] Error monitoring connection pool:`, error);
    }
  }

  // Database metrics collection
  async collectDatabaseMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Collect query statistics
      for (const [queryHash, stats] of this._queryStats) {
        const avgDuration = stats.totalDuration / stats.count;
        
        metrics.push(
          this.createMetric(
            'database.query.count',
            'counter',
            stats.count,
            { query_hash: queryHash }
          ),
          this.createMetric(
            'database.query.avg_duration',
            'gauge',
            avgDuration,
            { query_hash: queryHash }
          ),
          this.createMetric(
            'database.query.max_duration',
            'gauge',
            stats.maxDuration,
            { query_hash: queryHash }
          ),
          this.createMetric(
            'database.query.error_count',
            'counter',
            stats.errorCount,
            { query_hash: queryHash }
          )
        );
        
        // Calculate error rate
        if (stats.count > 0) {
          const errorRate = (stats.errorCount / stats.count) * 100;
          metrics.push(this.createMetric(
            'database.query.error_rate',
            'gauge',
            errorRate,
            { query_hash: queryHash }
          ));
        }
      }
      
      // Collect database-specific metrics
      if (this._dbInstance) {
        const dbMetrics = await this.collectDatabaseInstanceMetrics();
        metrics.push(...dbMetrics);
      }
      
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting database metrics:`, error);
    }
    
    return metrics;
  }

  async getStats(): Promise<AdapterStats> {
    const baseStats = await super.getStats();
    
    const totalQueries = Array.from(this._queryStats.values())
      .reduce((sum, stats) => sum + stats.count, 0);
    const totalErrors = Array.from(this._queryStats.values())
      .reduce((sum, stats) => sum + stats.errorCount, 0);
    
    return {
      ...baseStats,
      databaseSpecific: {
        totalQueries,
        totalErrors,
        uniqueQueries: this._queryStats.size,
        connectionPool: this._connectionPool,
        slowQueryThreshold: this._slowQueryThreshold,
        databaseType: this.getDatabaseType()
      }
    };
  }

  async getHealth(): Promise<ComponentHealth> {
    const baseHealth = await super.getHealth();
    
    const dbHealthChecks = await this.performDatabaseHealthChecks();
    
    return {
      ...baseHealth,
      details: {
        ...baseHealth.details,
        database: dbHealthChecks
      }
    };
  }

  // Private methods
  private async instrumentDatabaseInstance(): Promise<void> {
    if (!this._dbInstance) {
      return;
    }
    
    // Instrument common database methods
    const methodsToInstrument = ['query', 'execute', 'prepare'];
    
    for (const method of methodsToInstrument) {
      if (typeof this._dbInstance[method] === 'function') {
        const originalMethod = this._dbInstance[method].bind(this._dbInstance);
        
        this._dbInstance[method] = async (...args: any[]) => {
          const query = args[0] || '';
          const params = args[1] || [];
          return this.instrumentQuery(query, params, method);
        };
      }
    }
  }

  private async executeQuery<T>(query: string, params: any[]): Promise<T> {
    // This would be implemented by specific database adapters
    // For now, we'll simulate the execution
    if (this._dbInstance && typeof this._dbInstance.query === 'function') {
      return this._dbInstance.query(query, params);
    }
    
    throw new Error('Database instance not available or query method not found');
  }

  private startDatabaseMonitoring(): void {
    const config = this._config as DatabaseAdapterConfig;
    const interval = config.monitoringInterval || 30000; // 30 seconds default
    
    this._monitoringInterval = setInterval(() => {
      this.collectAndRecordMetrics().catch(error => {
        console.error(`[${this.getId()}] Database monitoring error:`, error);
      });
    }, interval);
  }

  private stopDatabaseMonitoring(): void {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = undefined;
    }
  }

  private async collectAndRecordMetrics(): Promise<void> {
    try {
      const metrics = await this.collectDatabaseMetrics();
      await this.recordMetrics(metrics);
      
      // Monitor connection pool
      await this.monitorConnectionPool();
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting database metrics:`, error);
    }
  }

  private async collectDatabaseInstanceMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Try to get database statistics if available
      if (typeof this._dbInstance.getStats === 'function') {
        const stats = await this._dbInstance.getStats();
        
        if (stats.uptime !== undefined) {
          metrics.push(this.createMetric(
            'database.uptime',
            'gauge',
            stats.uptime,
            { db_type: this.getDatabaseType() }
          ));
        }
        
        if (stats.memoryUsage !== undefined) {
          metrics.push(this.createMetric(
            'database.memory_usage',
            'gauge',
            stats.memoryUsage,
            { db_type: this.getDatabaseType() }
          ));
        }
      }
      
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting database instance metrics:`, error);
    }
    
    return metrics;
  }

  private async performDatabaseHealthChecks(): Promise<Record<string, any>> {
    const healthChecks: Record<string, any> = {};
    
    try {
      // Check database connectivity
      if (this._dbInstance) {
        try {
          // Try a simple query to test connectivity
          await this.executeQuery('SELECT 1', []);
          healthChecks.connectivity = 'healthy';
        } catch (error) {
          healthChecks.connectivity = 'unhealthy';
          healthChecks.connectivityError = (error as Error).message;
        }
      } else {
        healthChecks.connectivity = 'unavailable';
      }
      
      // Check connection pool health
      if (this._connectionPool) {
        const poolUtilization = this._connectionPool?.totalConnections && this._connectionPool.totalConnections > 0
          ? ((this._connectionPool.activeConnections || 0) / this._connectionPool.totalConnections) * 100
          : 0;
        
        healthChecks.poolUtilization = poolUtilization;
        healthChecks.poolStatus = poolUtilization < 80 ? 'healthy' : poolUtilization < 95 ? 'degraded' : 'critical';
        healthChecks.waitingRequests = this._connectionPool.waitingRequests;
      }
      
      // Check error rates
      const totalQueries = Array.from(this._queryStats.values())
        .reduce((sum, stats) => sum + stats.count, 0);
      const totalErrors = Array.from(this._queryStats.values())
        .reduce((sum, stats) => sum + stats.errorCount, 0);
      
      const errorRate = totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0;
      healthChecks.errorRate = errorRate;
      healthChecks.errorRateStatus = errorRate < 1 ? 'healthy' : errorRate < 5 ? 'degraded' : 'unhealthy';
      
    } catch (error) {
      healthChecks.error = (error as Error).message;
    }
    
    return healthChecks;
  }

  private updateQueryStats(queryHash: string, duration: number, success: boolean): void {
    let stats = this._queryStats.get(queryHash);
    
    if (!stats) {
      stats = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        errorCount: 0
      };
      this._queryStats.set(queryHash, stats);
    }
    
    stats.count++;
    stats.totalDuration += duration;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    
    if (!success) {
      stats.errorCount++;
    }
  }

  private generateQueryId(query: string): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashQuery(query: string): string {
    // Normalize query by removing parameters and whitespace
    const normalized = query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+|\?/g, '?')
      .trim()
      .toLowerCase();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private extractErrorCode(error: any): string {
    // Try to extract database-specific error codes
    if (error.code) {
      return error.code.toString();
    }
    if (error.errno) {
      return error.errno.toString();
    }
    if (error.sqlState) {
      return error.sqlState;
    }
    return 'unknown';
  }

  private getDatabaseType(): string {
    const config = this._config as DatabaseAdapterConfig;
    return config.databaseType || 'unknown';
  }

  protected async validateConfig(config: DatabaseAdapterConfig): Promise<void> {
    // Base class doesn't have validateConfig, so we implement our own
    if (config.slowQueryThreshold && config.slowQueryThreshold < 0) {
      throw new Error('Slow query threshold must be non-negative');
    }
    
    if (config.maxConnections && config.maxConnections < 1) {
      throw new Error('Max connections must be positive');
    }
  }

  private getConnectionPoolStats(): { active: number; idle: number; total: number; waiting: number } {
    if (!this._connectionPool) {
      return {
        active: 0,
        idle: 0,
        total: 0,
        waiting: 0
      };
    }
    
    return {
      active: this._connectionPool.activeConnections || 0,
      idle: this._connectionPool.idleConnections || 0,
      total: this._connectionPool.totalConnections || 0,
      waiting: this._connectionPool.waitingRequests || 0
    };
  }

  // Abstract methods implementation
  protected async onInitialize(): Promise<void> {
    // Database-specific initialization
  }

  protected async onStart(): Promise<void> {
    // Database-specific start logic
  }

  protected async onStop(): Promise<void> {
    // Database-specific stop logic
  }

  protected async onDispose(): Promise<void> {
    // Database-specific disposal logic
  }

  protected async doCollectMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    // Collect connection pool metrics if available
    if (this._connectionPool) {
      const poolStats = this.getConnectionPoolStats();
      metrics.push(
        this.createMetric('db_connections_active', 'gauge', poolStats.active),
        this.createMetric('db_connections_idle', 'gauge', poolStats.idle),
        this.createMetric('db_connections_total', 'gauge', poolStats.total)
      );
    }
    
    return metrics;
  }

  protected async doGetHealth(): Promise<ComponentHealth> {
    return {
      status: HealthStatus.HEALTHY,
      score: 1.0,
      checks: [{
        id: 'db_connection',
        name: 'Database Connection',
        status: HealthStatus.HEALTHY,
        duration: 0,
        metadata: {}
      }],
      lastChecked: Date.now()
    };
  }

  // Missing methods that are called in the class
  protected createTimerMetric(
    name: string,
    startTime: number,
    endTime: number = Date.now(),
    success: boolean = true,
    tags?: Record<string, string>
  ): Metric {
    const duration = endTime - startTime;
    return {
      id: `${this._config.id}-${name}-${Date.now()}`,
      name,
      type: MetricType.TIMER,
      timestamp: Date.now(),
      component: this._config.id,
      duration,
      startTime,
      endTime,
      success,
      tags: {
        adapter: this._config.id,
        adapterType: this.type,
        ...tags
      }
    } as Metric;
  }

  protected createMetric(
    name: string,
    type: 'counter' | 'gauge' | 'histogram' | 'timer' | 'rate',
    value: number,
    tags?: Record<string, string>
  ): Metric {
    const baseMetric = {
      id: `${this._config.id}-${name}-${Date.now()}`,
      name,
      timestamp: Date.now(),
      component: this._config.id,
      tags: {
        adapter: this._config.id,
        adapterType: this.type,
        ...tags
      }
    };

    switch (type) {
      case 'counter':
        return {
          ...baseMetric,
          type: MetricType.COUNTER,
          value
        } as CounterMetric;
      case 'gauge':
        return {
          ...baseMetric,
          type: MetricType.GAUGE,
          value
        } as GaugeMetric;
      case 'timer':
        return {
          ...baseMetric,
          type: MetricType.TIMER,
          duration: value,
          startTime: Date.now() - value,
          endTime: Date.now(),
          success: true
        } as TimerMetric;
      case 'rate':
        return {
          ...baseMetric,
          type: MetricType.RATE,
          count: value,
          window: 1000,
          rate: value
        } as RateMetric;
      default:
        return {
          ...baseMetric,
          type: MetricType.GAUGE,
          value
        } as GaugeMetric;
    }
  }
}

// Helper functions
export function createDatabaseAdapter(
  dbInstance: any,
  config: Partial<DatabaseAdapterConfig> = {}
): DatabasePerformanceAdapter {
  return new DatabasePerformanceAdapter({
    dbInstance,
    databaseType: detectDatabaseType(dbInstance),
    ...config
  });
}

export function detectDatabaseType(dbInstance: any): string {
  if (!dbInstance) {
    return 'unknown';
  }
  
  const constructorName = dbInstance.constructor?.name?.toLowerCase();
  
  if (constructorName) {
    if (constructorName.includes('postgres') || constructorName.includes('pg')) {
      return 'postgresql';
    }
    if (constructorName.includes('mysql')) {
      return 'mysql';
    }
    if (constructorName.includes('sqlite')) {
      return 'sqlite';
    }
    if (constructorName.includes('mongo')) {
      return 'mongodb';
    }
    if (constructorName.includes('redis')) {
      return 'redis';
    }
  }
  
  // Check for specific properties or methods
  if (typeof dbInstance.query === 'function' && typeof dbInstance.connect === 'function') {
    return 'sql';
  }
  
  if (typeof dbInstance.collection === 'function') {
    return 'mongodb';
  }
  
  return 'generic';
}