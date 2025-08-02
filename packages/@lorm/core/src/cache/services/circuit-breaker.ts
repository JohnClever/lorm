/**
 * Circuit Breaker Service for Cache Operations
 * Provides fault tolerance and graceful degradation for file system operations
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
  /** Timeout before attempting to close circuit (ms) */
  timeout: number;
  /** Monitor window for failure rate calculation (ms) */
  monitoringWindow: number;
  /** Enable detailed logging */
  enableLogging: boolean;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  circuitOpenCount: number;
  successRate: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private circuitOpenCount = 0;
  private nextAttempt = 0;
  private recentFailures: number[] = [];
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      monitoringWindow: 60000,
      enableLogging: false,
      ...options
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }
      // Transition to half-open
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      this.log('Circuit breaker transitioning to HALF_OPEN');
    }

    this.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;
    this.cleanupOldFailures();
    
    // Reset failure count on success
    this.failureCount = 0;
    this.recentFailures = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.log('Circuit breaker CLOSED after successful recovery');
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.totalFailures++;
    this.recentFailures.push(now);
    this.cleanupOldFailures();
    
    // Update failure count based on recent failures within monitoring window
    this.failureCount = this.recentFailures.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // Go back to open on any failure in half-open state
      this.openCircuit();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit based on recent failures
      if (this.failureCount >= this.options.failureThreshold) {
        this.openCircuit();
      }
    }
  }

  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.timeout;
    this.circuitOpenCount++;
    this.log(`Circuit breaker OPENED - next attempt at ${new Date(this.nextAttempt).toISOString()}`);
  }

  private getRecentFailureRate(): number {
    const now = Date.now();
    const windowStart = now - this.options.monitoringWindow;
    const recentFailures = this.recentFailures.filter(time => time >= windowStart);
    const recentRequests = Math.max(recentFailures.length, 1);
    return recentFailures.length / recentRequests;
  }

  private cleanupOldFailures(): void {
    const now = Date.now();
    const windowStart = now - this.options.monitoringWindow;
    this.recentFailures = this.recentFailures.filter(time => time >= windowStart);
  }

  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[CircuitBreaker] ${message}`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    const successRate = this.totalRequests > 0 ? this.totalSuccesses / this.totalRequests : 0;
    
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.totalSuccesses,
      requests: this.totalRequests,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime) : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      circuitOpenCount: this.circuitOpenCount,
      successRate
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttempt = 0;
    this.recentFailures = [];
    this.log('Circuit breaker reset to CLOSED state');
  }

  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.timeout;
    this.log('Circuit breaker forced to OPEN state');
  }

  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.log('Circuit breaker forced to CLOSED state');
  }
}

// Default circuit breaker instance for file operations
let defaultCircuitBreaker: CircuitBreaker | null = null;

export function getFileSystemCircuitBreaker(): CircuitBreaker {
  if (!defaultCircuitBreaker) {
    defaultCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000, // 30 seconds
      monitoringWindow: 60000, // 1 minute
      enableLogging: process.env.NODE_ENV === 'development'
    });
  }
  return defaultCircuitBreaker;
}

export function resetFileSystemCircuitBreaker(): void {
  if (defaultCircuitBreaker) {
    defaultCircuitBreaker.reset();
  }
}