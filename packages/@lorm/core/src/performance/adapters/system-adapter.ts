/**
 * System Performance Adapter - Monitors system-level metrics
 */

import type {
  ComputeAdapterConfig,
  AdapterStats,
  ComponentHealth,
  Metric,
  HealthCheck
} from '../types/index.js';
import { AdapterType, AdapterEventType, MetricType, HealthStatus } from '../types/index.js';
import { EnhancedBaseAdapter } from './base-adapter.js';

/**
 * Performance adapter for system-level monitoring
 */
export class SystemPerformanceAdapter extends EnhancedBaseAdapter {
  private _monitoringInterval?: NodeJS.Timeout;
  private _systemStats: SystemStats = {
    cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
    memory: { total: 0, used: 0, free: 0, available: 0 },
    disk: { total: 0, used: 0, free: 0 },
    network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 },
    process: { pid: 0, uptime: 0, memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 } }
  };
  private _previousStats?: SystemStats;
  private _isNode: boolean;
  private _isBrowser: boolean;
  private _lastNetworkStats: any = null;
  private _lastCpuStats: any = null;

  constructor(config: ComputeAdapterConfig) {
    super(config);
    this._isNode = typeof process !== 'undefined' && !!process.versions?.node;
    this._isBrowser = typeof window !== 'undefined';
  }

  // Abstract method implementations
  protected async onInitialize(): Promise<void> {
    // Initialize system information
    await this.initializeSystemInfo();
  }

  protected async onStart(): Promise<void> {
    this.startSystemMonitoring();
    
    await this.recordMetric(this.createMetric(
      'system.adapter.started',
      MetricType.COUNTER,
      1
    ));
  }

  protected async onStop(): Promise<void> {
    this.stopSystemMonitoring();
    
    await this.recordMetric(this.createMetric(
      'system.adapter.stopped',
      MetricType.COUNTER,
      1
    ));
  }

  protected async onDispose(): Promise<void> {
    this.stopSystemMonitoring();
  }

  protected async doCollectMetrics(): Promise<Metric[]> {
    return this.collectSystemMetrics();
  }

  protected async doGetHealth(): Promise<ComponentHealth> {
    const systemHealthChecks = await this.performSystemHealthChecks();
    
    return {
      status: HealthStatus.HEALTHY,
      score: 100,
      checks: systemHealthChecks,
      lastChecked: Date.now()
    };
  }

  // System metrics collection
  async collectSystemMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Update system stats
      await this.updateSystemStats();
      
      // CPU metrics
      if (this._systemStats.cpu) {
        metrics.push(
          this.createMetric('system.cpu.usage', MetricType.GAUGE, this._systemStats.cpu.usage, { unit: 'percent' }),
          this.createMetric('system.cpu.cores', MetricType.GAUGE, this._systemStats.cpu.cores)
        );
        
        if (this._systemStats.cpu.loadAverage) {
          metrics.push(
            this.createMetric('system.cpu.load_average.1m', MetricType.GAUGE, this._systemStats.cpu.loadAverage[0]),
            this.createMetric('system.cpu.load_average.5m', MetricType.GAUGE, this._systemStats.cpu.loadAverage[1]),
            this.createMetric('system.cpu.load_average.15m', MetricType.GAUGE, this._systemStats.cpu.loadAverage[2])
          );
        }
      }
      
      // Memory metrics
      if (this._systemStats.memory) {
        const memUsagePercent = this._systemStats.memory.total > 0 
          ? (this._systemStats.memory.used / this._systemStats.memory.total) * 100 
          : 0;
        
        metrics.push(
          this.createMetric('system.memory.total', MetricType.GAUGE, this._systemStats.memory.total, { unit: 'bytes' }),
          this.createMetric('system.memory.used', MetricType.GAUGE, this._systemStats.memory.used, { unit: 'bytes' }),
          this.createMetric('system.memory.free', MetricType.GAUGE, this._systemStats.memory.free, { unit: 'bytes' }),
          this.createMetric('system.memory.available', MetricType.GAUGE, this._systemStats.memory.available, { unit: 'bytes' }),
          this.createMetric('system.memory.usage_percent', MetricType.GAUGE, memUsagePercent, { unit: 'percent' })
        );
      }
      
      // Disk metrics
      if (this._systemStats.disk) {
        const diskUsagePercent = this._systemStats.disk.total > 0 
          ? (this._systemStats.disk.used / this._systemStats.disk.total) * 100 
          : 0;
        
        metrics.push(
          this.createMetric('system.disk.total', MetricType.GAUGE, this._systemStats.disk.total, { unit: 'bytes' }),
          this.createMetric('system.disk.used', MetricType.GAUGE, this._systemStats.disk.used, { unit: 'bytes' }),
          this.createMetric('system.disk.free', MetricType.GAUGE, this._systemStats.disk.free, { unit: 'bytes' }),
          this.createMetric('system.disk.usage_percent', MetricType.GAUGE, diskUsagePercent, { unit: 'percent' })
        );
      }
      
      // Network metrics (if available and previous stats exist)
      if (this._systemStats.network && this._previousStats?.network) {
        const bytesInDelta = this._systemStats.network.bytesIn - this._previousStats.network.bytesIn;
        const bytesOutDelta = this._systemStats.network.bytesOut - this._previousStats.network.bytesOut;
        
        metrics.push(
          this.createMetric('system.network.bytes_in', MetricType.COUNTER, this._systemStats.network.bytesIn, { unit: 'bytes' }),
          this.createMetric('system.network.bytes_out', MetricType.COUNTER, this._systemStats.network.bytesOut, { unit: 'bytes' }),
          this.createMetric('system.network.bytes_in_rate', MetricType.GAUGE, bytesInDelta, { unit: 'bytes_per_second' }),
          this.createMetric('system.network.bytes_out_rate', MetricType.GAUGE, bytesOutDelta, { unit: 'bytes_per_second' })
        );
      }
      
      // Process metrics
      if (this._systemStats.process) {
        metrics.push(
          this.createMetric('system.process.uptime', MetricType.GAUGE, this._systemStats.process.uptime, { unit: 'seconds' }),
          this.createMetric('system.process.pid', MetricType.GAUGE, this._systemStats.process.pid)
        );
        
        if (this._systemStats.process.memoryUsage) {
          const memUsage = this._systemStats.process.memoryUsage;
          metrics.push(
            this.createMetric('system.process.memory.rss', MetricType.GAUGE, memUsage.rss, { unit: 'bytes' }),
            this.createMetric('system.process.memory.heap_total', MetricType.GAUGE, memUsage.heapTotal, { unit: 'bytes' }),
            this.createMetric('system.process.memory.heap_used', MetricType.GAUGE, memUsage.heapUsed, { unit: 'bytes' }),
            this.createMetric('system.process.memory.external', MetricType.GAUGE, memUsage.external, { unit: 'bytes' })
          );
          
          const heapUsagePercent = memUsage.heapTotal > 0 
            ? (memUsage.heapUsed / memUsage.heapTotal) * 100 
            : 0;
          metrics.push(
            this.createMetric('system.process.memory.heap_usage_percent', MetricType.GAUGE, heapUsagePercent, { unit: 'percent' })
          );
        }
      }
      
      // Browser-specific metrics
      if (this._isBrowser) {
        const browserMetrics = await this.collectBrowserMetrics();
        metrics.push(...browserMetrics);
      }
      
      // Node.js-specific metrics
      if (this._isNode) {
        const nodeMetrics = await this.collectNodeMetrics();
        metrics.push(...nodeMetrics);
      }
      
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting system metrics:`, error);
    }
    
    return metrics;
  }

  async getStats(): Promise<AdapterStats> {
    const baseStats = await super.getStats();
    
    return {
      ...baseStats
    };
  }



  // Get current system snapshot
  getSystemSnapshot(): SystemStats {
    return JSON.parse(JSON.stringify(this._systemStats));
  }

  // Private methods
  private async initializeSystemInfo(): Promise<void> {
    try {
      if (this._isNode) {
        await this.initializeNodeSystemInfo();
      } else if (this._isBrowser) {
        await this.initializeBrowserSystemInfo();
      }
    } catch (error) {
      console.error(`[${this.getId()}] Error initializing system info:`, error);
    }
  }

  private async initializeNodeSystemInfo(): Promise<void> {
    if (!this._isNode) return;
    
    try {
      const os = await import('os');
      
      this._systemStats.cpu.cores = os.cpus().length;
      this._systemStats.memory.total = os.totalmem();
      this._systemStats.process.pid = process.pid;
    } catch (error) {
      console.error(`[${this.getId()}] Error initializing Node.js system info:`, error);
    }
  }

  private async initializeBrowserSystemInfo(): Promise<void> {
    if (!this._isBrowser) return;
    
    try {
      // Browser-specific initialization
      if ('navigator' in window && 'hardwareConcurrency' in navigator) {
        this._systemStats.cpu.cores = navigator.hardwareConcurrency;
      }
      
      // Memory API (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this._systemStats.memory.total = memory.jsHeapSizeLimit || 0;
      }
    } catch (error) {
      console.error(`[${this.getId()}] Error initializing browser system info:`, error);
    }
  }

  private startSystemMonitoring(): void {
    const config = this._config as ComputeAdapterConfig;
    const interval = config.collectionInterval || 10000; // 10 seconds default
    
    this._monitoringInterval = setInterval(() => {
      this.collectAndRecordMetrics().catch(error => {
        console.error(`[${this.getId()}] System monitoring error:`, error);
      });
    }, interval);
  }

  private stopSystemMonitoring(): void {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = undefined;
    }
  }

  private async collectAndRecordMetrics(): Promise<void> {
    try {
      const metrics = await this.collectSystemMetrics();
      await this.recordMetrics(metrics);
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting system metrics:`, error);
    }
  }

  private async updateSystemStats(): Promise<void> {
    // Store previous stats for delta calculations
    this._previousStats = JSON.parse(JSON.stringify(this._systemStats));
    
    if (this._isNode) {
      await this.updateNodeSystemStats();
    } else if (this._isBrowser) {
      await this.updateBrowserSystemStats();
    }
  }

  private async updateNodeSystemStats(): Promise<void> {
    if (!this._isNode) return;
    
    try {
      const os = await import('os');
      
      // CPU usage calculation
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);
      
      this._systemStats.cpu.usage = usage;
      this._systemStats.cpu.loadAverage = os.loadavg();
      
      // Memory stats
      this._systemStats.memory.total = os.totalmem();
      this._systemStats.memory.free = os.freemem();
      this._systemStats.memory.used = this._systemStats.memory.total - this._systemStats.memory.free;
      this._systemStats.memory.available = this._systemStats.memory.free;
      
      // Process stats
      this._systemStats.process.uptime = process.uptime();
      this._systemStats.process.memoryUsage = process.memoryUsage();
      
    } catch (error) {
      console.error(`[${this.getId()}] Error updating Node.js system stats:`, error);
    }
  }

  private async updateBrowserSystemStats(): Promise<void> {
    if (!this._isBrowser) return;
    
    try {
      // Memory API (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this._systemStats.memory.total = memory.jsHeapSizeLimit || 0;
        this._systemStats.memory.used = memory.usedJSHeapSize || 0;
        this._systemStats.memory.free = this._systemStats.memory.total - this._systemStats.memory.used;
        this._systemStats.memory.available = this._systemStats.memory.free;
      }
      
      // Process uptime (approximate)
      this._systemStats.process.uptime = performance.now() / 1000;
      
    } catch (error) {
      console.error(`[${this.getId()}] Error updating browser system stats:`, error);
    }
  }

  private async collectBrowserMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Performance timing metrics
      if ('timing' in performance) {
        const timing = performance.timing;
        const navigationStart = timing.navigationStart;
        
        if (navigationStart > 0) {
          metrics.push(
            this.createMetric('browser.page.load_time', MetricType.GAUGE, timing.loadEventEnd - navigationStart, { unit: 'milliseconds' }),
            this.createMetric('browser.page.dom_ready_time', MetricType.GAUGE, timing.domContentLoadedEventEnd - navigationStart, { unit: 'milliseconds' }),
            this.createMetric('browser.page.first_paint_time', MetricType.GAUGE, timing.responseStart - navigationStart, { unit: 'milliseconds' })
          );
        }
      }
      
      // Connection information
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          metrics.push(
            this.createMetric('browser.connection.downlink', MetricType.GAUGE, connection.downlink || 0, { unit: 'mbps' }),
            this.createMetric('browser.connection.rtt', MetricType.GAUGE, connection.rtt || 0, { unit: 'milliseconds' })
          );
        }
      }
      
      // Device memory (if available)
      if ('deviceMemory' in navigator) {
        metrics.push(
          this.createMetric('browser.device.memory', MetricType.GAUGE, (navigator as any).deviceMemory || 0, { unit: 'gb' })
        );
      }
      
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting browser metrics:`, error);
    }
    
    return metrics;
  }

  private async collectNodeMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // Event loop lag
      const eventLoopLag = await this.measureEventLoopLag();
      metrics.push(
        this.createMetric('node.event_loop.lag', MetricType.GAUGE, eventLoopLag, { unit: 'milliseconds' })
      );
      
      // Garbage collection stats (if available)
      if (this._isNode && typeof process !== 'undefined') {
        const gcStats = await this.getGCStats();
        if (gcStats) {
          metrics.push(...gcStats);
        }
      }
      
    } catch (error) {
      console.error(`[${this.getId()}] Error collecting Node.js metrics:`, error);
    }
    
    return metrics;
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    });
  }

  private async getGCStats(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    
    try {
      // This would require additional setup for GC monitoring
      // For now, we'll use basic memory usage as a proxy
      const memUsage = process.memoryUsage();
      
      metrics.push(
        this.createMetric('node.gc.heap_used_delta', MetricType.GAUGE, memUsage.heapUsed, { unit: 'bytes' })
      );
      
    } catch (error) {
      console.error(`[${this.getId()}] Error getting GC stats:`, error);
    }
    
    return metrics;
  }

  private async performSystemHealthChecks(): Promise<HealthCheck[]> {
    const healthChecks: HealthCheck[] = [];
    
    try {
      // CPU health
      const cpuStatus = this._systemStats.cpu.usage < 80 ? HealthStatus.HEALTHY : 
                       this._systemStats.cpu.usage < 95 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY;
      healthChecks.push({
        id: 'cpu_usage',
        name: 'CPU Usage Check',
        status: cpuStatus,
        message: `CPU usage: ${this._systemStats.cpu.usage.toFixed(1)}%`,
        duration: 0,
        metadata: {
          usage: this._systemStats.cpu.usage,
          cores: this._systemStats.cpu.cores
        }
      });
      
      // Memory health
      const memUsagePercent = this._systemStats.memory.total > 0 
        ? (this._systemStats.memory.used / this._systemStats.memory.total) * 100 
        : 0;
      const memStatus = memUsagePercent < 80 ? HealthStatus.HEALTHY : 
                       memUsagePercent < 95 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY;
      healthChecks.push({
        id: 'memory_usage',
        name: 'Memory Usage Check',
        status: memStatus,
        message: `Memory usage: ${memUsagePercent.toFixed(1)}%`,
        duration: 0,
        metadata: {
          usagePercent: memUsagePercent,
          total: this._systemStats.memory.total,
          used: this._systemStats.memory.used
        }
      });
      
      // Disk health (if available)
      if (this._systemStats.disk.total > 0) {
        const diskUsagePercent = (this._systemStats.disk.used / this._systemStats.disk.total) * 100;
        const diskStatus = diskUsagePercent < 85 ? HealthStatus.HEALTHY : 
                          diskUsagePercent < 95 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY;
        healthChecks.push({
          id: 'disk_usage',
          name: 'Disk Usage Check',
          status: diskStatus,
          message: `Disk usage: ${diskUsagePercent.toFixed(1)}%`,
          duration: 0,
          metadata: {
            usagePercent: diskUsagePercent,
            total: this._systemStats.disk.total,
            used: this._systemStats.disk.used
          }
        });
      }
      
      // Process health
      healthChecks.push({
        id: 'process_status',
        name: 'Process Status Check',
        status: HealthStatus.HEALTHY,
        message: `Process running for ${this._systemStats.process.uptime}s`,
        duration: 0,
        metadata: {
          uptime: this._systemStats.process.uptime,
          pid: this._systemStats.process.pid
        }
      });
      
      // Platform info
      healthChecks.push({
        id: 'platform_info',
        name: 'Platform Information',
        status: HealthStatus.HEALTHY,
        message: `Platform: ${this.getPlatform()}`,
        duration: 0,
        metadata: {
          platform: this.getPlatform(),
          isNode: this._isNode,
          isBrowser: this._isBrowser
        }
      });
      
    } catch (error) {
      healthChecks.push({
        id: 'system_error',
        name: 'System Health Error',
        status: HealthStatus.UNHEALTHY,
        message: (error as Error).message,
        duration: 0,
        metadata: {
          error: (error as Error).message
        }
      });
    }
    
    return healthChecks;
  }

  private getPlatform(): string {
    if (this._isNode) {
      return process.platform;
    } else if (this._isBrowser) {
      return navigator.platform || 'browser';
    }
    return 'unknown';
  }

  protected async validateConfig(config: ComputeAdapterConfig): Promise<void> {
    await super.validateConfig(config);
    
    if (config.collectionInterval && config.collectionInterval < 1000) {
      throw new Error('Monitoring interval must be at least 1000ms');
    }
  }
}

// Interfaces
interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

// Helper functions
export function createSystemAdapter(config: Partial<ComputeAdapterConfig> = {}): SystemPerformanceAdapter {
  const fullConfig: ComputeAdapterConfig = {
    id: config.id || 'system-adapter',
    name: config.name || 'System Adapter',
    type: AdapterType.COMPUTE,
    enabled: config.enabled !== false,
    config: {
      trackCPU: true,
      trackMemory: true,
      trackThreads: false,
      trackGC: false,
      ...config.config
    },
    ...config
  };
  return new SystemPerformanceAdapter(fullConfig);
}

export function getSystemInfo(): Promise<SystemStats> {
  const config: ComputeAdapterConfig = {
    id: 'temp-system-adapter',
    name: 'Temporary System Adapter',
    type: AdapterType.COMPUTE,
    enabled: true,
    config: {}
  };
  const adapter = new SystemPerformanceAdapter(config);
  return Promise.resolve(adapter.getSystemSnapshot());
}

// System monitoring utilities
export class SystemMonitor {
  private adapter: SystemPerformanceAdapter;
  
  constructor(config: Partial<ComputeAdapterConfig> = {}) {
    const fullConfig: ComputeAdapterConfig = {
      id: config.id || 'system-monitor',
      name: config.name || 'System Monitor',
      type: AdapterType.COMPUTE,
      enabled: config.enabled !== false,
      config: {
        trackCPU: true,
        trackMemory: true,
        trackThreads: false,
        trackGC: false,
        ...config.config
      },
      ...config
    };
    this.adapter = new SystemPerformanceAdapter(fullConfig);
  }
  
  async start(): Promise<void> {
    await this.adapter.initialize();
    await this.adapter.start();
  }
  
  async stop(): Promise<void> {
    await this.adapter.stop();
  }
  
  getSnapshot(): SystemStats {
    return this.adapter.getSystemSnapshot();
  }
  
  async getHealth(): Promise<ComponentHealth> {
    return this.adapter.getHealth();
  }
  
  onMetric(callback: (metric: Metric) => void): void {
    this.adapter.on(AdapterEventType.METRICS_COLLECTED, (event: any) => {
      if (event.payload && event.payload.metrics) {
        // Call callback for each metric in the collection
        Object.values(event.payload.metrics).forEach((metric: any) => {
          callback(metric);
        });
      }
    });
  }
}