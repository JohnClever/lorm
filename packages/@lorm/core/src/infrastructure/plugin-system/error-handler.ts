import {
  PluginError
} from './types.js';
import type {
  PluginErrorContext,
  PluginOperationContext,
  IPlugin
} from './types.js';

/**
 * Plugin Error Handler for centralized error management
 */
export class PluginErrorHandler {
  private errorHistory: PluginError[] = [];
  private maxHistorySize = 100;

  /**
   * Static method to handle plugin errors
   */
  static handlePluginError(
    error: Error,
    context: PluginErrorContext,
    operation?: PluginOperationContext
  ): PluginError {
    const instance = new PluginErrorHandler();
    return instance.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin error with context
   */
  handleError(
    error: Error,
    context: PluginErrorContext,
    operation?: PluginOperationContext
  ): PluginError {
    const pluginError = new PluginError(
      error.message,
      {
        pluginId: context.pluginId,
        operation: context.operation,
        originalError: error
      }
    );
    
    // Add to history
    this.addToHistory(pluginError);
    
    // Log error based on severity
    this.logError(pluginError);
    
    return pluginError;
  }
  
  /**
   * Handle plugin installation error
   */
  handleInstallError(
    error: Error,
    pluginName: string,
    source: string,
    operation: PluginOperationContext
  ): PluginError {
    const context: PluginErrorContext = {
      pluginId: pluginName,
      operation: 'install'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin loading error
   */
  handleLoadError(
    error: Error,
    plugin: IPlugin | string,
    operation: PluginOperationContext
  ): PluginError {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.metadata.name;
    
    const context: PluginErrorContext = {
      pluginId: pluginName,
      operation: 'load'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin validation error
   */
  handleValidationError(
    error: Error,
    plugin: IPlugin | string,
    operation: PluginOperationContext
  ): PluginError {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.metadata.name;
    
    const context: PluginErrorContext = {
      pluginId: pluginName,
      operation: 'validation'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin security error
   */
  handleSecurityError(
    error: Error,
    plugin: IPlugin | string,
    operation: PluginOperationContext,
    violations?: string[]
  ): PluginError {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.metadata.name;
    
    const context: PluginErrorContext = {
      pluginId: pluginName,
      operation: 'security'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin dependency error
   */
  handleDependencyError(
    error: Error,
    plugin: IPlugin | string,
    dependency: string,
    operation: PluginOperationContext
  ): PluginError {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.metadata.name;
    
    const context: PluginErrorContext = {
      pluginId: pluginName,
      operation: 'dependency'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin runtime error
   */
  handleRuntimeError(
    error: Error,
    plugin: IPlugin,
    operation: PluginOperationContext,
    command?: string
  ): PluginError {
    const context: PluginErrorContext = {
      pluginId: plugin.metadata.name,
      operation: 'runtime'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Handle plugin configuration error
   */
  handleConfigError(
    error: Error,
    plugin: IPlugin | string,
    operation: PluginOperationContext,
    configKey?: string
  ): PluginError {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.metadata.name;
    
    const context: PluginErrorContext = {
      pluginId: pluginName,
      operation: 'config'
    };
    
    return this.handleError(error, context, operation);
  }
  
  /**
   * Get error history
   */
  getErrorHistory(filter?: {
    plugin?: string;
    operation?: string;
  }): PluginError[] {
    let errors = [...this.errorHistory];
    
    if (filter) {
      if (filter.plugin) {
        errors = errors.filter(e => e.pluginId === filter.plugin);
      }
      
      if (filter.operation) {
        errors = errors.filter(e => e.operation === filter.operation);
      }
    }
    
    return errors; // Return in order they were added
  }
  
  /**
   * Get error statistics
   */
  getErrorStats(timeframe?: { start: Date; end: Date }) {
    let errors = this.errorHistory;
    
    // Note: timeframe filtering disabled since we don't have timestamps
    
    const stats = {
      total: errors.length,
      bySeverity: {
        info: 0,
        warning: 0,
        error: errors.length, // All errors are treated as 'error' severity
        critical: 0
      },
      byCode: {} as Record<string, number>,
      byPlugin: {} as Record<string, number>,
      mostCommon: [] as Array<{ code: string; count: number }>
    };
    
    errors.forEach(error => {
      // Count by error name as code
      const code = error.name || 'UNKNOWN_ERROR';
      stats.byCode[code] = (stats.byCode[code] || 0) + 1;
      
      // Count by plugin
      if (error.pluginId) {
        stats.byPlugin[error.pluginId] = (stats.byPlugin[error.pluginId] || 0) + 1;
      }
    });
    
    // Calculate most common errors
    stats.mostCommon = Object.entries(stats.byCode)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return stats;
  }
  
  /**
   * Clear error history
   */
  clearHistory(filter?: {
    plugin?: string;
    operation?: string;
  }): number {
    const originalLength = this.errorHistory.length;
    
    if (!filter) {
      this.errorHistory = [];
      return originalLength;
    }
    
    this.errorHistory = this.errorHistory.filter(error => {
      if (filter.plugin && error.pluginId === filter.plugin) {
        return false;
      }
      
      if (filter.operation && error.operation === filter.operation) {
        return false;
      }
      
      return true;
    });
    
    return originalLength - this.errorHistory.length;
  }
  
  /**
   * Format error for display
   */
  formatError(error: PluginError, includeStack = false): string {
    const timestamp = new Date().toISOString();
    const plugin = error.pluginId || 'unknown';
    const operation = error.operation || 'unknown';
    
    let formatted = `[${timestamp}] ERROR ${error.name}: ${error.message}`;
    formatted += `\n  Plugin: ${plugin}`;
    formatted += `\n  Operation: ${operation}`;
    
    if (includeStack && error.stack) {
      formatted += `\n  Stack: ${error.stack}`;
    }
    
    return formatted;
  }
  
  /**
   * Create recovery suggestions for common errors
   */
  getRecoverySuggestions(error: PluginError): string[] {
    const suggestions: string[] = [];
    
    // Use error name or operation to provide suggestions
    const errorType = error.name || error.operation || 'UNKNOWN';
    
    if (errorType.includes('INSTALL') || errorType.includes('install')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify the plugin name and source');
      suggestions.push('Try installing with --force flag');
      suggestions.push('Check if you have proper permissions');
    } else if (errorType.includes('LOAD') || errorType.includes('load')) {
      suggestions.push('Verify the plugin is properly installed');
      suggestions.push('Check plugin dependencies');
      suggestions.push('Try reinstalling the plugin');
      suggestions.push('Check plugin compatibility with current LORM version');
    } else if (errorType.includes('VALIDATION') || errorType.includes('validation')) {
      suggestions.push('Check plugin metadata and structure');
      suggestions.push('Verify plugin exports the correct interface');
      suggestions.push('Update plugin to latest version');
    } else if (errorType.includes('SECURITY') || errorType.includes('security')) {
      suggestions.push('Review plugin permissions');
      suggestions.push('Contact plugin author about security issues');
      suggestions.push('Consider using a different plugin');
      suggestions.push('Run plugin in restricted mode');
    } else if (errorType.includes('DEPENDENCY') || errorType.includes('dependency')) {
      suggestions.push('Install missing dependencies');
      suggestions.push('Update dependencies to compatible versions');
      suggestions.push('Check dependency conflicts');
    } else if (errorType.includes('RUNTIME') || errorType.includes('runtime')) {
      suggestions.push('Check plugin configuration');
      suggestions.push('Review plugin logs for more details');
      suggestions.push('Try disabling and re-enabling the plugin');
      suggestions.push('Report issue to plugin author');
    } else if (errorType.includes('CONFIG') || errorType.includes('config')) {
      suggestions.push('Check plugin configuration syntax');
      suggestions.push('Verify required configuration values');
      suggestions.push('Reset plugin configuration to defaults');
    } else {
      suggestions.push('Check plugin documentation');
      suggestions.push('Try restarting the application');
      suggestions.push('Contact support if issue persists');
    }
    
    return suggestions;
  }
  
  /**
   * Add error to history
   */
  private addToHistory(error: PluginError): void {
    this.errorHistory.unshift(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }
  
  /**
   * Log error based on severity
   */
  private logError(error: PluginError): void {
    const formatted = this.formatError(error);
    
    // All errors are logged as errors since we don't have severity context
    console.error('❌ PLUGIN ERROR:', formatted);
  }
}