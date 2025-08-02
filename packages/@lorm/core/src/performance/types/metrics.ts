/**
 * Metrics Types - Core metric definitions for the performance system
 */

/**
 * Metric value types
 */
export type MetricValue = number | string | boolean;

/**
 * Metric types supported by the performance system
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
  RATE = 'rate'
}

/**
 * Base metric interface
 */
export interface BaseMetric {
  /** Unique metric identifier */
  id: string;
  /** Human-readable metric name */
  name: string;
  /** Metric description */
  description?: string;
  /** Metric type */
  type: MetricType;
  /** Metric tags for categorization */
  tags: Record<string, string>;
  /** Timestamp when metric was recorded */
  timestamp: number;
  /** Component that generated this metric */
  component: string;
}

/**
 * Counter metric - monotonically increasing value
 */
export interface CounterMetric extends BaseMetric {
  type: MetricType.COUNTER;
  value: number;
  /** Previous value for delta calculation */
  previousValue?: number;
}

/**
 * Gauge metric - point-in-time value that can go up or down
 */
export interface GaugeMetric extends BaseMetric {
  type: MetricType.GAUGE;
  value: number;
  /** Minimum value in the current period */
  min?: number;
  /** Maximum value in the current period */
  max?: number;
}

/**
 * Histogram metric - distribution of values
 */
export interface HistogramMetric extends BaseMetric {
  type: MetricType.HISTOGRAM;
  /** Histogram buckets */
  buckets: HistogramBucket[];
  /** Total count of observations */
  count: number;
  /** Sum of all observed values */
  sum: number;
}

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  /** Upper bound of the bucket */
  upperBound: number;
  /** Count of observations in this bucket */
  count: number;
}

/**
 * Timer metric - measures duration of operations
 */
export interface TimerMetric extends BaseMetric {
  type: MetricType.TIMER;
  /** Duration in milliseconds */
  duration: number;
  /** Operation start time */
  startTime: number;
  /** Operation end time */
  endTime: number;
  /** Whether the operation was successful */
  success: boolean;
}

/**
 * Rate metric - measures rate of events over time
 */
export interface RateMetric extends BaseMetric {
  type: MetricType.RATE;
  /** Number of events */
  count: number;
  /** Time window in milliseconds */
  window: number;
  /** Rate per second */
  rate: number;
}

/**
 * Union type for all metric types
 */
export type Metric = CounterMetric | GaugeMetric | HistogramMetric | TimerMetric | RateMetric;

/**
 * Metric collection - group of related metrics
 */
export interface MetricCollection {
  /** Collection identifier */
  id: string;
  /** Collection name */
  name: string;
  /** Component that owns this collection */
  component: string;
  /** Metrics in this collection */
  metrics: Metric[];
  /** Collection timestamp */
  timestamp: number;
  /** Collection metadata */
  metadata?: Record<string, MetricValue>;
}

/**
 * Metric aggregation functions
 */
export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  PERCENTILE = 'percentile'
}

/**
 * Aggregated metric result
 */
export interface AggregatedMetric {
  /** Original metric ID */
  metricId: string;
  /** Aggregation type used */
  aggregationType: AggregationType;
  /** Aggregated value */
  value: number;
  /** Time window for aggregation */
  timeWindow: {
    start: number;
    end: number;
  };
  /** Number of data points aggregated */
  dataPoints: number;
  /** Additional aggregation parameters */
  parameters?: Record<string, MetricValue>;
}

/**
 * Metric query interface
 */
export interface MetricQuery {
  /** Component filter */
  component?: string;
  /** Metric type filter */
  type?: MetricType;
  /** Tag filters */
  tags?: Record<string, string>;
  /** Time range */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Limit number of results */
  limit?: number;
  /** Aggregation to apply */
  aggregation?: {
    type: AggregationType;
    window: number;
    parameters?: Record<string, MetricValue>;
  };
}

/**
 * Metric storage interface
 */
export interface MetricStorage {
  /** Store a metric */
  store(metric: Metric): Promise<void>;
  /** Store multiple metrics */
  storeBatch(metrics: Metric[]): Promise<void>;
  /** Get metric by ID */
  getById(metricId: string): Promise<Metric | null>;
  /** Query metrics */
  query(query: MetricQuery): Promise<Metric[]>;
  /** Get aggregated metrics */
  aggregate(query: MetricQuery): Promise<AggregatedMetric[]>;
  /** Clean up old metrics */
  cleanup(olderThan: number): Promise<number>;
  /** Get storage statistics */
  getStats(): Promise<{
    totalMetrics: number;
    oldestMetric: number;
    newestMetric: number;
    storageSize: number;
  }>;
}