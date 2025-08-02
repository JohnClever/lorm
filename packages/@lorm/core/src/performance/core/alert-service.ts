/**
 * Alert Service - Core service for managing alerts in the performance system
 */

import type {
  Alert,
  AlertRule,
  AlertSeverity,
  Threshold,
  NotificationChannel,
  AlertNotification,
  EscalationPolicy,
  AlertManager
} from '../types/index.js';
import type {
  AlertService,
  AlertServiceStats,
  AlertQuery,
  AlertStorage
} from './interfaces.js';
import { AlertStatus } from '../types/alerts.js';

/**
 * Default alert service implementation
 */
export class DefaultAlertService implements AlertService {
  private _storage: AlertStorage;
  private _rules: Map<string, AlertRule> = new Map();
  private _channels: Map<string, NotificationChannel> = new Map();
  private _escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private _stats: AlertServiceStats;
  private _eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private _checkInterval?: NodeJS.Timeout;

  constructor(storage: AlertStorage) {
    this._storage = storage;
    this._stats = this.initializeStats();
  }

  async initialize(): Promise<void> {
    // Start periodic alert checking
    this._checkInterval = setInterval(
      () => this.checkAlerts().catch(error => this.handleError(error)),
      30000 // Check every 30 seconds
    );
  }

  async shutdown(): Promise<void> {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = undefined;
    }
  }

  async createAlert(alert: Omit<Alert, 'id' | 'triggeredAt' | 'updatedAt'>): Promise<Alert> {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggeredAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await this._storage.store(newAlert);
      
      this._stats.totalAlerts++;
      this._stats.alertsBySeverity[alert.severity] = (this._stats.alertsBySeverity[alert.severity] || 0) + 1;
      this._stats.alertsByStatus[alert.status] = (this._stats.alertsByStatus[alert.status] || 0) + 1;
      
      this.emitEvent('alert:created', { alert: newAlert });
      
      // Send notifications if alert is triggered
      if (newAlert.status === AlertStatus.ACTIVE) {
        await this.sendNotifications(newAlert);
      }
      
      return newAlert;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<Alert | null> {
    try {
      const existingAlert = await this._storage.getById(alertId);
      if (!existingAlert) {
        return null;
      }

      const updatedAlert: Alert = {
        ...existingAlert,
        ...updates,
        id: alertId,
        updatedAt: Date.now()
      };

      const success = await this._storage.update(alertId, updatedAlert);
      if (!success) {
        return null;
      }

      // Update statistics
      if (updates.status && updates.status !== existingAlert.status) {
        this._stats.alertsByStatus[existingAlert.status] = Math.max(0, (this._stats.alertsByStatus[existingAlert.status] || 0) - 1);
        this._stats.alertsByStatus[updates.status] = (this._stats.alertsByStatus[updates.status] || 0) + 1;
      }

      this.emitEvent('alert:updated', { 
        alert: updatedAlert, 
        previousAlert: existingAlert,
        changes: updates
      });

      return updatedAlert;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getAlert(alertId: string): Promise<Alert | null> {
    try {
      return await this._storage.getById(alertId);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async queryAlerts(query: AlertQuery): Promise<Alert[]> {
    try {
      return await this._storage.query(query);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      const alert = await this._storage.getById(alertId);
      if (!alert) {
        return false;
      }

      const success = await this._storage.delete(alertId);
      if (success) {
        this._stats.totalAlerts--;
        this._stats.alertsBySeverity[alert.severity] = Math.max(0, (this._stats.alertsBySeverity[alert.severity] || 0) - 1);
        this._stats.alertsByStatus[alert.status] = Math.max(0, (this._stats.alertsByStatus[alert.status] || 0) - 1);
        
        this.emitEvent('alert:deleted', { alertId, alert });
      }

      return success;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const updates: Partial<Alert> = {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy,
      acknowledgedAt: Date.now()
    };

    const updatedAlert = await this.updateAlert(alertId, updates);
    if (updatedAlert) {
      this.emitEvent('alert:acknowledged', { 
        alert: updatedAlert, 
        acknowledgedBy
      });
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const updates: Partial<Alert> = {
      status: AlertStatus.RESOLVED,
      resolvedAt: Date.now()
    };

    const updatedAlert = await this.updateAlert(alertId, updates);
    if (updatedAlert) {
      // Calculate resolution time
      const resolutionTime = Date.now() - updatedAlert.triggeredAt;
      this._stats.averageResolutionTime = this.updateAverage(
        this._stats.averageResolutionTime,
        resolutionTime,
        this._stats.totalAlerts
      );

      this.emitEvent('alert:resolved', { 
        alert: updatedAlert, 
        resolutionTime
      });
    }
  }

  // AlertManager interface methods
  async addThreshold(threshold: Threshold): Promise<void> {
    // Implementation for adding threshold
    this.emitEvent('threshold:added', { threshold });
  }

  async removeThreshold(thresholdId: string): Promise<void> {
    // Implementation for removing threshold
    this.emitEvent('threshold:removed', { thresholdId });
  }

  async updateThreshold(thresholdId: string, updates: Partial<Threshold>): Promise<void> {
    // Implementation for updating threshold
    this.emitEvent('threshold:updated', { thresholdId, updates });
  }

  async getThresholds(): Promise<Threshold[]> {
    // Implementation for getting thresholds
    return [];
  }

  async evaluateThresholds(): Promise<Alert[]> {
    // Implementation for evaluating thresholds
    return [];
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return await this.queryAlerts({
      statuses: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]
    });
  }

  async suppressAlert(alertId: string, duration: number): Promise<void> {
    const updates: Partial<Alert> = {
      status: AlertStatus.SUPPRESSED,
      updatedAt: Date.now()
    };

    const updatedAlert = await this.updateAlert(alertId, updates);
    if (updatedAlert) {
      this.emitEvent('alert:suppressed', { alert: updatedAlert, duration });
    }
  }

  async addEscalationPolicy(policy: EscalationPolicy): Promise<void> {
    this._escalationPolicies.set(policy.id, policy);
    this.emitEvent('escalation:added', { policy });
  }

  async cleanup(olderThan: number): Promise<number> {
    // Implementation for cleanup
    return 0;
  }

  // Alert Rules Management
  async addRule(rule: AlertRule): Promise<void> {
    this._rules.set(rule.id, rule);
    this._stats.alertRulesCount++;
    
    this.emitEvent('rule:added', { rule });
  }

  async removeRule(ruleId: string): Promise<boolean> {
    const removed = this._rules.delete(ruleId);
    if (removed) {
      this._stats.alertRulesCount--;
      this.emitEvent('rule:removed', { ruleId });
    }
    return removed;
  }

  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const rule = this._rules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updatedRule = { ...rule, ...updates };
    this._rules.set(ruleId, updatedRule);
    
    this.emitEvent('rule:updated', { rule: updatedRule, updates });
    return true;
  }

  getRules(): AlertRule[] {
    return Array.from(this._rules.values());
  }

  getRule(ruleId: string): AlertRule | null {
    return this._rules.get(ruleId) || null;
  }

  // Notification Channels Management
  async addNotificationChannel(channel: NotificationChannel): Promise<void> {
    this._channels.set(channel.id, channel);
    this._stats.notificationChannels++;
    
    this.emitEvent('channel:added', { channel });
  }

  async removeNotificationChannel(channelId: string): Promise<boolean> {
    const removed = this._channels.delete(channelId);
    if (removed) {
      this._stats.notificationChannels--;
      this.emitEvent('channel:removed', { channelId });
    }
    return removed;
  }

  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this._channels.values());
  }

  // Escalation Policies Management

  async removeEscalationPolicy(policyId: string): Promise<boolean> {
    const removed = this._escalationPolicies.delete(policyId);
    if (removed) {
      this.emitEvent('escalation:removed', { policyId });
    }
    return removed;
  }

  getEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this._escalationPolicies.values());
  }

  async getStats(): Promise<AlertServiceStats> {
    try {
      const storageStats = await this._storage.getStats();
      
      return {
        ...this._stats,
        activeAlerts: await this.getActiveAlertsCount()
      };
    } catch (error) {
      this.handleError(error as Error);
      return this._stats;
    }
  }

  async export(format: string, filter?: AlertQuery): Promise<string> {
    try {
      const alerts = filter ? await this.queryAlerts(filter) : await this.queryAlerts({});
      
      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(alerts, null, 2);
        case 'csv':
          return this.exportToCsv(alerts);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async import(data: string, format: string): Promise<number> {
    try {
      let alerts: Alert[];
      
      switch (format.toLowerCase()) {
        case 'json':
          alerts = JSON.parse(data);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      let importedCount = 0;
      for (const alert of alerts) {
        try {
          await this._storage.store(alert);
          importedCount++;
        } catch (error) {
          this.handleError(error as Error);
        }
      }

      this.emitEvent('alerts:imported', { importedCount, totalCount: alerts.length });
      return importedCount;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  // Private methods
  private async checkAlerts(): Promise<void> {
    // This would typically check metrics against alert rules
    // and create new alerts when thresholds are exceeded
    
    for (const rule of Array.from(this._rules.values())) {
      if (!rule.enabled) {
        continue;
      }

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        this.handleError(error as Error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    // Placeholder for rule evaluation logic
    // In a real implementation, this would:
    // 1. Query metrics based on rule criteria
    // 2. Evaluate thresholds
    // 3. Create alerts if thresholds are exceeded
    
    this.emitEvent('rule:evaluated', { rule });
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    // Get notification channels from alert metadata or use default channels
    const channelIds = Array.isArray(alert.metadata?.notificationChannels) 
      ? alert.metadata.notificationChannels as string[] 
      : [];
    
    for (const channelId of channelIds) {
      const channel = this._channels.get(channelId);
      if (channel && channel.enabled) {
        try {
          await this.sendNotification(alert);
        } catch (error) {
          this.handleError(error as Error);
        }
      }
    }
  }

  async sendNotification(alert: Alert): Promise<void> {
    // Implementation for sending notification
    this.emitEvent('notification:sent', { alert });
  }

  private formatAlertMessage(alert: Alert): string {
    return `Alert: ${alert.title}\nSeverity: ${alert.severity}\nMessage: ${alert.message}\nTriggered at: ${new Date(alert.triggeredAt).toISOString()}`;
  }

  private async getActiveAlertsCount(): Promise<number> {
    const activeAlerts = await this.queryAlerts({
      statuses: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]
    });
    return activeAlerts.length;
  }

  private exportToCsv(alerts: Alert[]): string {
    if (alerts.length === 0) {
      return '';
    }

    const headers = ['id', 'title', 'message', 'severity', 'status', 'component', 'triggeredAt', 'updatedAt'];
    const rows = alerts.map(alert => [
      alert.id,
      alert.title,
      alert.message || '',
      alert.severity,
      alert.status,
      alert.component || '',
      new Date(alert.triggeredAt).toISOString(),
      new Date(alert.updatedAt).toISOString()
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private emitEvent(event: string, data: unknown): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }

    // Also emit to 'all' listeners
    const allListeners = this._eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener({ event, data });
        } catch (error) {
          this.handleError(error as Error);
        }
      });
    }
  }

  private handleError(error: Error): void {
    this.emitEvent('service:error', {
      service: 'alert',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });

    // Log error if logger is available
    if (console && console.error) {
      console.error('[AlertService] Error:', error);
    }
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private initializeStats(): AlertServiceStats {
    return {
      totalAlerts: 0,
      activeAlerts: 0,
      alertsBySeverity: {},
      alertsByStatus: {},
      alertRulesCount: 0,
      averageResolutionTime: 0,
      notificationChannels: 0
    };
  }

  // Event handling
  on(event: string, listener: (data: unknown) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: unknown) => void): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

/**
 * In-memory alert storage implementation
 */
export class InMemoryAlertStorage implements AlertStorage {
  private _alerts: Map<string, Alert> = new Map();
  private _stats = {
    totalAlerts: 0,
    storageSize: 0,
    alertsByStatus: {} as Record<string, number>,
    oldestAlert: 0,
    newestAlert: 0
  };

  async store(alert: Alert): Promise<void> {
    this._alerts.set(alert.id, alert);
    this._stats.totalAlerts++;
    this._stats.storageSize += this.estimateAlertSize(alert);
    this._stats.alertsByStatus[alert.status] = (this._stats.alertsByStatus[alert.status] || 0) + 1;
    
    if (this._stats.oldestAlert === 0 || alert.triggeredAt < this._stats.oldestAlert) {
      this._stats.oldestAlert = alert.triggeredAt;
    }
    if (alert.triggeredAt > this._stats.newestAlert) {
      this._stats.newestAlert = alert.triggeredAt;
    }
  }

  async storeBatch(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      await this.store(alert);
    }
  }

  async getById(alertId: string): Promise<Alert | null> {
    return this._alerts.get(alertId) || null;
  }

  async query(query: AlertQuery): Promise<Alert[]> {
    let results = Array.from(this._alerts.values());

    // Apply filters
    if (query.ids && query.ids.length > 0) {
      results = results.filter(a => query.ids!.includes(a.id));
    }

    if (query.severities && query.severities.length > 0) {
      results = results.filter(a => query.severities!.includes(a.severity));
    }

    if (query.statuses && query.statuses.length > 0) {
      results = results.filter(a => query.statuses!.includes(a.status));
    }

    if (query.componentIds && query.componentIds.length > 0) {
      results = results.filter(a => a.component && query.componentIds!.includes(a.component));
    }

    if (query.timeRange) {
      results = results.filter(a => 
        a.triggeredAt >= query.timeRange!.start && 
        a.triggeredAt <= query.timeRange!.end
      );
    }

    // Apply sorting (default by triggeredAt desc)
    results.sort((a, b) => b.triggeredAt - a.triggeredAt);

    // Apply limit and offset
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async update(alertId: string, updates: Partial<Alert>): Promise<boolean> {
    const alert = this._alerts.get(alertId);
    if (!alert) {
      return false;
    }

    // Update status statistics
    if (updates.status && updates.status !== alert.status) {
      this._stats.alertsByStatus[alert.status] = Math.max(0, (this._stats.alertsByStatus[alert.status] || 0) - 1);
      this._stats.alertsByStatus[updates.status] = (this._stats.alertsByStatus[updates.status] || 0) + 1;
    }

    const updatedAlert = { ...alert, ...updates };
    this._alerts.set(alertId, updatedAlert);
    
    return true;
  }

  async delete(alertId: string): Promise<boolean> {
    const alert = this._alerts.get(alertId);
    if (!alert) {
      return false;
    }

    this._alerts.delete(alertId);
    this._stats.totalAlerts--;
    this._stats.storageSize -= this.estimateAlertSize(alert);
    this._stats.alertsByStatus[alert.status] = Math.max(0, (this._stats.alertsByStatus[alert.status] || 0) - 1);
    
    return true;
  }

  async getStats(): Promise<typeof this._stats> {
    return { ...this._stats };
  }

  private estimateAlertSize(alert: Alert): number {
    // Rough estimation of alert size in bytes
    return JSON.stringify(alert).length * 2; // Assuming UTF-16 encoding
  }
}