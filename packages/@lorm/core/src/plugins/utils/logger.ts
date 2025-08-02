// Logger Utility for LORM Framework
// Provides a simple logging interface for plugin operations

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
}

/**
 * Create a logger instance with a specific prefix
 */
export function createLogger(prefix: string): Logger {
  return {
    debug: (message: string, ...args: unknown[]) => {
      console.debug(`[DEBUG][${prefix}] ${message}`, ...args);
    },
    
    info: (message: string, ...args: unknown[]) => {
      console.info(`[INFO][${prefix}] ${message}`, ...args);
    },
    
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[WARN][${prefix}] ${message}`, ...args);
    },
    
    error: (message: string, ...args: unknown[]) => {
      console.error(`[ERROR][${prefix}] ${message}`, ...args);
    },
    
    trace: (message: string, ...args: unknown[]) => {
      console.trace(`[TRACE][${prefix}] ${message}`, ...args);
    }
  };
}

/**
 * Default logger instance
 */
export const defaultLogger = createLogger('LORM');