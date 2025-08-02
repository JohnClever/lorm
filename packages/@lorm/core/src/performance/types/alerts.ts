/**
 * Alert Types - Alert system definitions for the performance monitoring framework
 */

import type { MetricValue, MetricType } from './metrics.js';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Alert status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
  ACKNOWLEDGED = 'acknowledged'
}

/**
 * Threshold comparison operators
 */
export enum ThresholdOperator {
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'ne',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between'
}

/**
 * Threshold definition
 */
export interface Threshold {
  /** Threshold identifier */
  id: string;
  /** Threshold name */
  name: string;
  /** Metric to monitor */
  metricId: string;
  /** Comparison operator */
  operator: ThresholdOperator;
  /** Threshold value(s) */
  value: number | [number, number];
  /** Alert severity when threshold is breached */
  severity: AlertSeverity;
  /** Time window for evaluation (ms) */
  evaluationWindow: number;
  /** Number of consecutive breaches required */
  consecutiveBreaches?: number;
  /** Component this threshold applies to */
  component?: string;
  /** Tags to filter metrics */
  tags?: Record<string, string>;
  /** Whether threshold is enabled */
  enabled: boolean;
  /** Threshold description */
  description?: string;
}

/**
 * Alert instance
 */
export interface Alert {
  /** Unique alert identifier */
  id: string;
  /** Threshold that triggered this alert */
  thresholdId: string;
  /** Alert severity */
  severity: AlertSeverity;
  /** Alert status */
  status: AlertStatus;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Component that triggered the alert */
  component: string;
  /** Metric that triggered the alert */
  metricId: string;
  /** Metric value that triggered the alert */
  triggerValue: number;
  /** Threshold value that was breached */
  thresholdValue: number | [number, number];
  /** When the alert was first triggered */
  triggeredAt: number;
  /** When the alert was last updated */
  updatedAt: number;
  /** When the alert was resolved (if resolved) */
  resolvedAt?: number;
  /** Who acknowledged the alert */
  acknowledgedBy?: string;
  /** When the alert was acknowledged */
  acknowledgedAt?: number;
  /** Alert tags */
  tags: Record<string, string>;
  /** Additional alert metadata */
  metadata?: Record<string, MetricValue>;
}

/**
 * Alert rule for dynamic threshold calculation
 */
export interface AlertRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description?: string;
  /** Component this rule applies to */
  component?: string;
  /** Metric type this rule applies to */
  metricType?: MetricType;
  /** Tags to filter metrics */
  tags?: Record<string, string>;
  /** Rule expression for threshold calculation */
  expression: string;
  /** Alert severity */
  severity: AlertSeverity;
  /** Evaluation interval (ms) */
  evaluationInterval: number;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Rule metadata */
  metadata?: Record<string, MetricValue>;
}

/**
 * Alert notification channel
 */
export interface NotificationChannel {
  /** Channel identifier */
  id: string;
  /** Channel name */
  name: string;
  /** Channel type (email, webhook, slack, etc.) */
  type: string;
  /** Channel configuration */
  config: Record<string, MetricValue>;
  /** Severity levels this channel handles */
  severityLevels: AlertSeverity[];
  /** Components this channel monitors */
  components?: string[];
  /** Whether channel is enabled */
  enabled: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    maxNotifications: number;
    windowMs: number;
  };
}

/**
 * Alert notification
 */
export interface AlertNotification {
  /** Notification identifier */
  id: string;
  /** Alert that triggered this notification */
  alertId: string;
  /** Channel used for notification */
  channelId: string;
  /** Notification status */
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  /** When notification was created */
  createdAt: number;
  /** When notification was sent */
  sentAt?: number;
  /** Number of retry attempts */
  retryCount: number;
  /** Last error message (if failed) */
  lastError?: string;
  /** Notification payload */
  payload: Record<string, MetricValue>;
}

/**
 * Alert escalation policy
 */
export interface EscalationPolicy {
  /** Policy identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Escalation steps */
  steps: EscalationStep[];
  /** Components this policy applies to */
  components?: string[];
  /** Severity levels this policy handles */
  severityLevels: AlertSeverity[];
  /** Whether policy is enabled */
  enabled: boolean;
}

/**
 * Escalation step
 */
export interface EscalationStep {
  /** Step order */
  order: number;
  /** Delay before this step (ms) */
  delay: number;
  /** Notification channels for this step */
  channels: string[];
  /** Whether to repeat this step */
  repeat?: {
    interval: number;
    maxRepeats: number;
  };
}

/**
 * Alert manager interface
 */
export interface AlertManager {
  /** Add a threshold */
  addThreshold(threshold: Threshold): Promise<void>;
  /** Remove a threshold */
  removeThreshold(thresholdId: string): Promise<void>;
  /** Update a threshold */
  updateThreshold(thresholdId: string, updates: Partial<Threshold>): Promise<void>;
  /** Get all thresholds */
  getThresholds(): Promise<Threshold[]>;
  /** Evaluate thresholds against metrics */
  evaluateThresholds(): Promise<Alert[]>;
  /** Get active alerts */
  getActiveAlerts(): Promise<Alert[]>;
  /** Get alert by ID */
  getAlert(alertId: string): Promise<Alert | null>;
  /** Acknowledge an alert */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  /** Resolve an alert */
  resolveAlert(alertId: string): Promise<void>;
  /** Suppress an alert */
  suppressAlert(alertId: string, duration: number): Promise<void>;
  /** Add notification channel */
  addNotificationChannel(channel: NotificationChannel): Promise<void>;
  /** Send alert notification */
  sendNotification(alert: Alert): Promise<void>;
  /** Add escalation policy */
  addEscalationPolicy(policy: EscalationPolicy): Promise<void>;
  /** Clean up old alerts */
  cleanup(olderThan: number): Promise<number>;
}

/**
 * Alert query interface
 */
export interface AlertQuery {
  /** Component filter */
  component?: string;
  /** Severity filter */
  severity?: AlertSeverity;
  /** Status filter */
  status?: AlertStatus;
  /** Time range */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Tag filters */
  tags?: Record<string, string>;
  /** Limit number of results */
  limit?: number;
  /** Sort order */
  sortBy?: 'triggeredAt' | 'updatedAt' | 'severity';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}