/**
 * Event Service - Core service for managing events in the performance system
 */

import type {
  BasePerformanceEvent,
  PerformanceEvent,
  EventFilter
} from '../types/index.js';
import type {
  EventService,
  EventServiceStats
} from './interfaces.js';

// Simple interfaces for event service

interface EventSubscription {
  id: string;
  filter: EventFilter;
  listener: EventListener;
  createdAt: number;
  active: boolean;
}

interface EventListener {
  (event: PerformanceEvent): void | Promise<void>;
}

interface EventStore {
  store(event: BasePerformanceEvent): Promise<void>;
  storeBatch(events: BasePerformanceEvent[]): Promise<void>;
  query(filter: EventFilter, limit?: number): Promise<BasePerformanceEvent[]>;
  getStats(): Promise<{ storageSize: number }>;
}

interface EventEmitterStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  activeSubscriptions: number;
  totalSubscriptions: number;
  lastEventTimestamp: number;
  averageProcessingTime: number;
}

interface EventPipeline {
  process(event: BasePerformanceEvent): Promise<BasePerformanceEvent | null>;
}

interface EventProcessor {
  id: string;
  priority: number;
  shouldProcess(event: BasePerformanceEvent): boolean;
  process(event: BasePerformanceEvent): Promise<BasePerformanceEvent | null>;
}

interface EventPipelineStats {
  totalEvents: number;
  eventsByProcessor: Record<string, number>;
  averageTimeByProcessor: Record<string, number>;
  errors: number;
  uptime: number;
}

/**
 * Default event service implementation
 */
export class DefaultEventService implements EventService {
  private _store: EventStore;
  private _subscriptions: Map<string, EventSubscription> = new Map();
  private _pipeline?: EventPipeline;
  private _stats: EventEmitterStats;
  private _eventQueue: BasePerformanceEvent[] = [];
  private _processing = false;
  private _batchSize = 100;
  private _flushInterval = 1000; // 1 second
  private _flushTimer?: NodeJS.Timeout;

  constructor(store: EventStore, pipeline?: EventPipeline) {
    this._store = store;
    this._pipeline = pipeline;
    this._stats = this.initializeStats();
    
    // Start periodic flush
    this._flushTimer = setInterval(() => {
      this.flushEvents().catch(error => this.handleError(error));
    }, this._flushInterval);
  }

  async shutdown(): Promise<void> {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = undefined;
    }
    
    // Flush remaining events
    await this.flushEvents();
  }

  emit<T extends BasePerformanceEvent>(event: T): void {
    try {
      // Update statistics
      this._stats.totalEvents++;
      this._stats.eventsByType[event.type] = (this._stats.eventsByType[event.type] || 0) + 1;
      this._stats.lastEventTimestamp = event.timestamp;

      // Process event through pipeline if available
      if (this._pipeline) {
        this._pipeline.process(event)
          .then(processedEvent => {
            if (processedEvent) {
              this.handleProcessedEvent(processedEvent);
            }
          })
          .catch(error => this.handleError(error));
      } else {
        this.handleProcessedEvent(event);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  subscribe(filter: EventFilter, listener: (event: PerformanceEvent) => void | Promise<void>): { id: string } {
    const subscription: EventSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filter,
      listener,
      createdAt: Date.now(),
      active: true
    };

    this._subscriptions.set(subscription.id, subscription);
    this._stats.activeSubscriptions++;
    this._stats.totalSubscriptions++;

    return subscription;
  }

  unsubscribe(subscriptionId: string): boolean {
    const subscription = this._subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this._subscriptions.delete(subscriptionId);
      this._stats.activeSubscriptions--;
      return true;
    }
    return false;
  }

  getSubscriptions(): EventSubscription[] {
    return Array.from(this._subscriptions.values());
  }

  clearSubscriptions(): void {
    this._subscriptions.clear();
    this._stats.activeSubscriptions = 0;
  }

  getStore(): any {
    return this._store;
  }

  async query(filter: EventFilter, limit?: number): Promise<PerformanceEvent[]> {
    try {
      const events = await this._store.query(filter, limit);
      return events as PerformanceEvent[];
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getStats(): Promise<EventServiceStats> {
    try {
      const storeStats = await this._store.getStats();
      
      return {
        totalEvents: this._stats.totalEvents,
        eventsByType: { ...this._stats.eventsByType },
        eventsBySource: await this.getEventsBySource(),
        activeSubscriptions: this._stats.activeSubscriptions,
        averageProcessingTime: this._stats.averageProcessingTime,
        storageSize: storeStats.storageSize
      };
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalEvents: this._stats.totalEvents,
        eventsByType: { ...this._stats.eventsByType },
        eventsBySource: {},
        activeSubscriptions: this._stats.activeSubscriptions,
        averageProcessingTime: this._stats.averageProcessingTime,
        storageSize: 0
      };
    }
  }

  async export(format: string, filter?: EventFilter): Promise<string> {
    try {
      const events = filter ? await this.query(filter) : await this.query({});
      
      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(events, null, 2);
        case 'csv':
          return this.exportToCsv(events);
        case 'ndjson':
          return events.map(event => JSON.stringify(event)).join('\n');
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
      let events: BasePerformanceEvent[];
      
      switch (format.toLowerCase()) {
        case 'json':
          events = JSON.parse(data);
          break;
        case 'ndjson':
          events = data.split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      await this._store.storeBatch(events);
      return events.length;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  // Private methods
  private handleProcessedEvent(event: BasePerformanceEvent): void {
    // Add to queue for batch storage
    this._eventQueue.push(event);
    
    // Notify subscribers
    this.notifySubscribers(event);
    
    // Flush if queue is full
    if (this._eventQueue.length >= this._batchSize) {
      this.flushEvents().catch(error => this.handleError(error));
    }
  }

  private notifySubscribers(event: BasePerformanceEvent): void {
    const startTime = Date.now();
    let notifiedCount = 0;

    for (const subscription of Array.from(this._subscriptions.values())) {
      if (!subscription.active) {
        continue;
      }

      if (this.matchesFilter(event, subscription.filter)) {
        try {
          const result = subscription.listener(event as PerformanceEvent);
          if (result && typeof result === 'object' && 'then' in result) {
            (result as Promise<void>).catch(error => this.handleError(error));
          }
          notifiedCount++;
        } catch (error) {
          this.handleError(error as Error);
        }
      }
    }

    // Update processing time statistics
    const processingTime = Date.now() - startTime;
    this._stats.averageProcessingTime = this.updateAverage(
      this._stats.averageProcessingTime,
      processingTime,
      this._stats.totalEvents
    );
  }

  private matchesFilter(event: BasePerformanceEvent, filter: EventFilter): boolean {
    // Check event types
    if (filter.types && filter.types.length > 0 && !filter.types.includes(event.type as any)) {
      return false;
    }

    // Check time range
    if (filter.timeRange) {
      if (event.timestamp < filter.timeRange.start || event.timestamp > filter.timeRange.end) {
        return false;
      }
    }

    return true;
  }

  private async flushEvents(): Promise<void> {
    if (this._processing || this._eventQueue.length === 0) {
      return;
    }

    this._processing = true;
    const eventsToFlush = this._eventQueue.splice(0);

    try {
      await this._store.storeBatch(eventsToFlush);
    } catch (error) {
      this.handleError(error as Error);
      // Re-add events to queue for retry
      this._eventQueue.unshift(...eventsToFlush);
    } finally {
      this._processing = false;
    }
  }

  private async getEventsBySource(): Promise<Record<string, number>> {
    try {
      const events = await this.query({});
      const bySource: Record<string, number> = {};
      
      for (const event of events) {
        if (event.source) {
          bySource[event.source] = (bySource[event.source] || 0) + 1;
        }
      }
      
      return bySource;
    } catch (error) {
      this.handleError(error as Error);
      return {};
    }
  }

  private exportToCsv(events: BasePerformanceEvent[]): string {
    if (events.length === 0) {
      return '';
    }

    const headers = ['type', 'timestamp', 'metadata'];
    const rows = events.map(event => [
      event.type,
      new Date(event.timestamp).toISOString(),
      JSON.stringify(event.metadata || {})
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private handleError(error: Error): void {
    // Log error if logger is available
    if (console && console.error) {
      console.error('[EventService] Error:', error);
    }
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private initializeStats(): EventEmitterStats {
    return {
      totalEvents: 0,
      eventsByType: {},
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      averageProcessingTime: 0,
      lastEventTimestamp: 0
    };
  }
}

/**
 * In-memory event store implementation
 */
export class InMemoryEventStore implements EventStore {
  private _events: Map<string, BasePerformanceEvent> = new Map();
  private _stats = {
    totalEvents: 0,
    eventsByType: {} as Record<string, number>,
    storageSize: 0,
    oldestEvent: 0,
    newestEvent: 0
  };

  async store(event: BasePerformanceEvent): Promise<void> {
    const eventId = this.generateEventId(event);
    this._events.set(eventId, event);
    
    this._stats.totalEvents++;
    this._stats.eventsByType[event.type] = (this._stats.eventsByType[event.type] || 0) + 1;
    this._stats.storageSize += this.estimateEventSize(event);
    
    if (this._stats.oldestEvent === 0 || event.timestamp < this._stats.oldestEvent) {
      this._stats.oldestEvent = event.timestamp;
    }
    if (event.timestamp > this._stats.newestEvent) {
      this._stats.newestEvent = event.timestamp;
    }
  }

  async storeBatch(events: BasePerformanceEvent[]): Promise<void> {
    for (const event of events) {
      await this.store(event);
    }
  }

  async query(filter: EventFilter, limit?: number): Promise<BasePerformanceEvent[]> {
    let results = Array.from(this._events.values());

    // Apply filters
    if (filter.types && filter.types.length > 0) {
      results = results.filter(e => filter.types!.includes(e.type as any));
    }

    if (filter.timeRange) {
      results = results.filter(e => 
        e.timestamp >= filter.timeRange!.start && 
        e.timestamp <= filter.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async getById(eventId: string): Promise<BasePerformanceEvent | null> {
    return this._events.get(eventId) || null;
  }

  async delete(filter: EventFilter): Promise<number> {
    const eventsToDelete = await this.query(filter);
    let deletedCount = 0;

    for (const event of eventsToDelete) {
      const eventId = this.generateEventId(event);
      if (this._events.delete(eventId)) {
        this._stats.totalEvents--;
        this._stats.eventsByType[event.type] = Math.max(0, (this._stats.eventsByType[event.type] || 0) - 1);
        this._stats.storageSize -= this.estimateEventSize(event);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async getStats(): Promise<typeof this._stats> {
    return { ...this._stats };
  }

  async cleanup(olderThan: number): Promise<number> {
    const filter: EventFilter = {
      timeRange: {
        start: 0,
        end: olderThan
      }
    };
    
    return this.delete(filter);
  }

  private generateEventId(event: BasePerformanceEvent): string {
    return `${event.type}_${event.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateEventSize(event: BasePerformanceEvent): number {
    // Rough estimation of event size in bytes
    return JSON.stringify(event).length * 2; // Assuming UTF-16 encoding
  }
}

/**
 * Default event pipeline implementation
 */
export class DefaultEventPipeline implements EventPipeline {
  private _processors: EventProcessor[] = [];
  private _stats: EventPipelineStats;

  constructor() {
    this._stats = this.initializeStats();
  }

  addProcessor(processor: EventProcessor): void {
    this._processors.push(processor);
    this._processors.sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  removeProcessor(processorId: string): boolean {
    const index = this._processors.findIndex(p => p.id === processorId);
    if (index > -1) {
      this._processors.splice(index, 1);
      return true;
    }
    return false;
  }

  async process(event: BasePerformanceEvent): Promise<BasePerformanceEvent | null> {
    const startTime = Date.now();
    let currentEvent: BasePerformanceEvent | null = event;
    
    this._stats.totalEvents++;

    try {
      for (const processor of this._processors) {
        if (!currentEvent) {
          break;
        }

        if (processor.shouldProcess(currentEvent)) {
          const processorStartTime = Date.now();
          
          try {
            currentEvent = await processor.process(currentEvent);
            
            const processingTime = Date.now() - processorStartTime;
            this._stats.eventsByProcessor[processor.id] = (this._stats.eventsByProcessor[processor.id] || 0) + 1;
            this._stats.averageTimeByProcessor[processor.id] = this.updateAverage(
              this._stats.averageTimeByProcessor[processor.id] || 0,
              processingTime,
              this._stats.eventsByProcessor[processor.id]
            );
          } catch (error) {
            this._stats.errors++;
            console.error(`[EventPipeline] Processor ${processor.id} error:`, error);
            // Continue with next processor
          }
        }
      }

      return currentEvent;
    } catch (error) {
      this._stats.errors++;
      console.error('[EventPipeline] Pipeline error:', error);
      return null;
    }
  }

  getProcessors(): EventProcessor[] {
    return [...this._processors];
  }

  getStats(): EventPipelineStats {
    return {
      ...this._stats,
      uptime: Date.now() - this._stats.uptime
    };
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private initializeStats(): EventPipelineStats {
    return {
      totalEvents: 0,
      eventsByProcessor: {},
      averageTimeByProcessor: {},
      errors: 0,
      uptime: Date.now()
    };
  }
}