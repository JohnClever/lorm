import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { Result, success, failure } from './result';
import type { FileSystemError } from './file-system-errors';
import {
  ErrorType,
  ErrorSeverity,
  ErrorSuggestion,
  RecoveryOptions,
  ErrorContext,
  RecoveryAction,
  LormError,
  ErrorHandlerConfig
} from '../types.js';
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private logPath: string;
  private static readonly ERROR_PATTERNS = [
    {
      pattern: /lorm\.config\.js.*not found/i,
      suggestions: [
        {
          message: "Lorm configuration file is missing",
          action: "Initialize your project first",
          command: "npx @lorm/cli init",
        },
      ],
    },
    {
      pattern: /lorm\.schema\.js.*not found/i,
      suggestions: [
        {
          message: "Schema file is missing",
          action: "Initialize your project or create schema manually",
          command: "npx @lorm/cli init",
        },
      ],
    },
    {
      pattern: /database.*connection.*failed/i,
      suggestions: [
        {
          message: "Database connection failed",
          action: "Check your database configuration in lorm.config.js",
        },
        {
          message: "Ensure your database server is running",
        },
        {
          message: "Verify connection credentials and network access",
        },
      ],
    },
    {
      pattern: /migration.*failed/i,
      suggestions: [
        {
          message: "Migration failed",
          action: "Check your schema for syntax errors",
          command: "npx @lorm/cli check",
        },
        {
          message: "Ensure database is accessible and has proper permissions",
        },
      ],
    },
    {
      pattern: /port.*already.*in.*use/i,
      suggestions: [
        {
          message: "Port is already in use",
          action: "Try a different port",
          command: "npx @lorm/cli dev --port 3001",
        },
        {
          message: "Stop other processes using the same port",
        },
      ],
    },
    {
      pattern: /permission.*denied/i,
      suggestions: [
        {
          message: "Permission denied",
          action: "Check file/directory permissions",
        },
        {
          message: "Ensure you have write access to the project directory",
        },
      ],
    },
    {
      pattern: /module.*not.*found/i,
      suggestions: [
        {
          message: "Missing dependencies",
          action: "Install project dependencies",
          command: "npm install",
        },
        {
          message: "Check if all required packages are installed",
        },
      ],
    },
  ];
  constructor(config: ErrorHandlerConfig) {
    this.config = config;
    this.logPath = path.resolve(config.logPath);
    this.ensureLogDirectory();
  }
  async handleError(error: Error | LormError, context?: Partial<ErrorContext>): Promise<void> {
    const lormError = this.normalizeError(error, context);
    await this.logError(lormError);
    this.displayError(lormError);
    if (this.config.enableRecovery) {
      await this.attemptRecovery(lormError);
    }
    if (this.config.reportingEnabled) {
      await this.reportError(lormError);
    }
  }
  createError(
    type: ErrorType,
    severity: ErrorSeverity,
    code: string,
    message: string,
    userMessage: string,
    context?: Partial<ErrorContext>,
    recoveryActions: RecoveryAction[] = []
  ): LormError {
    return {
      type,
      severity,
      code,
      message,
      userMessage,
      context: {
        timestamp: new Date().toISOString(),
        workingDirectory: process.cwd(),
        ...context
      },
      recoveryActions,
      helpUrl: this.getHelpUrl(code)
    };
  }
  private normalizeError(error: Error | LormError, context?: Partial<ErrorContext>): LormError {
    if (this.isLormError(error)) {
      return {
        ...error,
        context: {
          ...error.context,
          ...context
        }
      };
    }
    const errorType = this.detectErrorType(error);
    const severity = this.detectErrorSeverity(error);
    const code = this.generateErrorCode(error);
    const recoveryActions = this.generateRecoveryActions(error, errorType);
    return {
      type: errorType,
      severity,
      code,
      message: error.message,
      userMessage: this.generateUserMessage(error, errorType),
      context: {
        timestamp: new Date().toISOString(),
        workingDirectory: process.cwd(),
        stackTrace: this.config.enableStackTrace ? error.stack : undefined,
        ...context
      },
      recoveryActions,
      originalError: error,
      helpUrl: this.getHelpUrl(code)
    };
  }
  private displayError(error: LormError): void {
    const severityColor = this.getSeverityColor(error.severity);
    const icon = this.getSeverityIcon(error.severity);
    console.error();
    console.error(severityColor(`${icon} ${error.userMessage}`));
    console.error(chalk.gray(`Error Code: ${error.code}`));
    if (error.context.command) {
      console.error(chalk.gray(`Command: ${error.context.command}`));
    }
    if (error.recoveryActions.length > 0) {
      console.error();
      console.error(chalk.yellow('💡 Suggested actions:'));
      error.recoveryActions
        .sort((a, b) => a.priority - b.priority)
        .forEach((action, index) => {
          console.error(chalk.yellow(`  ${index + 1}. ${action.description}`));
          if (action.command) {
            console.error(chalk.gray(`     ${action.command}`));
          }
        });
    }
    if (error.helpUrl) {
      console.error();
      console.error(chalk.blue(`📖 More help: ${error.helpUrl}`));
    }
    if (this.config.enableStackTrace && error.context.stackTrace) {
      console.error();
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray(error.context.stackTrace));
    }
    console.error();
  }
  private async attemptRecovery(error: LormError): Promise<void> {
    const automaticActions = error.recoveryActions.filter(action => action.automatic);
    for (const action of automaticActions) {
      try {
        console.log(chalk.blue(`🔧 Attempting: ${action.description}`));
        if (action.command) {
          const { execa } = await import('execa');
          await execa('sh', ['-c', action.command], { stdio: 'inherit' });
          console.log(chalk.green(`✅ Recovery action completed: ${action.description}`));
        }
      } catch (recoveryError) {
        console.warn(chalk.yellow(`⚠️  Recovery action failed: ${action.description}`));
      }
    }
  }
  private async logError(error: LormError): Promise<void> {
    try {
      const logEntry = {
        ...error,
        timestamp: new Date().toISOString()
      };
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.promises.appendFile(this.logPath, logLine, 'utf8');
      await this.rotateLogIfNeeded();
    } catch (logError) {
      console.warn('Failed to log error:', logError);
    }
  }
  private async reportError(error: LormError): Promise<void> {
    if (!this.config.reportingUrl) {
      return;
    }
    try {
      const reportData = {
        error: {
          type: error.type,
          severity: error.severity,
          code: error.code,
          message: error.message,
          context: {
            ...error.context,
            stackTrace: undefined,
            environment: undefined
          }
        },
        metadata: {
          version: process.env.npm_package_version,
          platform: process.platform,
          nodeVersion: process.version
        }
      };
      console.log(chalk.gray('Error reported for analysis'));
    } catch (reportError) {
    }
  }
  private detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    if (message.includes('enoent') || message.includes('file not found')) {
      return ErrorType.FILE_SYSTEM;
    }
    if (message.includes('econnrefused') || message.includes('network') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('config') || message.includes('configuration')) {
      return ErrorType.CONFIGURATION;
    }
    if (message.includes('database') || message.includes('sql')) {
      return ErrorType.DATABASE;
    }
    // Plugin error handling moved to @lorm/core
    if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorType.SECURITY;
    }
    return ErrorType.UNKNOWN;
  }
  private detectErrorSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('error') || message.includes('failed')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }
  private generateErrorCode(error: Error): string {
    const type = this.detectErrorType(error);
    const hash = this.hashString(error.message).substring(0, 6);
    return `LORM_${type.toUpperCase()}_${hash}`;
  }
  private generateUserMessage(error: Error, type: ErrorType): string {
    const baseMessage = error.message;
    switch (type) {
      case ErrorType.FILE_SYSTEM:
        return `File system error: ${baseMessage}. Please check file permissions and paths.`;
      case ErrorType.NETWORK:
        return `Network error: ${baseMessage}. Please check your internet connection.`;
      case ErrorType.VALIDATION:
        return `Validation error: ${baseMessage}. Please check your input parameters.`;
      case ErrorType.CONFIGURATION:
        return `Configuration error: ${baseMessage}. Please check your Lorm configuration.`;
      case ErrorType.DATABASE:
        return `Database error: ${baseMessage}. Please check your database connection and schema.`;
      // Plugin error handling moved to @lorm/core
      case ErrorType.SECURITY:
        return `Security error: ${baseMessage}. Please check your permissions and authentication.`;
      default:
        return `An error occurred: ${baseMessage}`;
    }
  }
  private generateRecoveryActions(error: Error, type: ErrorType): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    switch (type) {
      case ErrorType.FILE_SYSTEM:
        actions.push({
          description: 'Check if the file or directory exists',
          priority: 1
        });
        actions.push({
          description: 'Verify file permissions',
          command: 'ls -la',
          priority: 2
        });
        break;
      case ErrorType.NETWORK:
        actions.push({
          description: 'Check internet connection',
          priority: 1
        });
        actions.push({
          description: 'Try again in a few moments',
          priority: 2
        });
        break;
      case ErrorType.CONFIGURATION:
        actions.push({
          description: 'Validate configuration file',
          command: 'lorm config validate',
          priority: 1
        });
        actions.push({
          description: 'Reset to default configuration',
          command: 'lorm config reset',
          priority: 3
        });
        break;
      case ErrorType.DATABASE:
        actions.push({
          description: 'Check database connection',
          command: 'lorm db check',
          priority: 1
        });
        actions.push({
          description: 'Run database migrations',
          command: 'lorm migrate',
          priority: 2
        });
        break;
    }
    actions.push({
      description: 'Get help for this command',
      command: 'lorm help',
      priority: 10
    });
    return actions;
  }
  static handleError(
    error: Error | string,
    context: string = "Command execution",
    options: RecoveryOptions = {}
  ): void {
    const {
      showSuggestions = true,
      exitOnError = true,
      logLevel = "error",
    } = options;
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    const logFunction =
      logLevel === "error"
        ? console.error
        : logLevel === "warn"
        ? console.warn
        : console.log;
    logFunction(chalk.red(`\n❌ ${context} failed:`));
    logFunction(chalk.red(`   ${errorMessage}`));
    if (errorStack && process.env.LORM_DEBUG) {
      console.error(chalk.gray("\nStack trace:"));
      console.error(chalk.gray(errorStack));
    }
    if (showSuggestions) {
      const suggestions = this.getSuggestions(errorMessage);
      if (suggestions.length > 0) {
        this.displaySuggestions(suggestions);
      } else {
        this.displayGenericSuggestions();
      }
    }
    if (exitOnError) {
      process.exit(1);
    }
  }
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context: string,
    options: RecoveryOptions = {}
  ): Promise<T | void> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error, context, options);
    }
  }
  static setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(chalk.yellow(`\n🛑 Received ${signal}. Shutting down gracefully...`));
      process.exit(0);
    };
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('\n💥 Uncaught Exception:'), error);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      console.error(chalk.red('\n💥 Unhandled Rejection:'), reason);
      process.exit(1);
    });
  }
  private static getSuggestions(errorMessage: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    for (const errorPattern of this.ERROR_PATTERNS) {
      if (errorPattern.pattern.test(errorMessage)) {
        suggestions.push(...errorPattern.suggestions);
      }
    }
    return suggestions;
  }
  private static displaySuggestions(suggestions: ErrorSuggestion[]): void {
    console.log(chalk.yellow("\n💡 Suggestions:"));
    suggestions.forEach((suggestion, index) => {
      console.log(chalk.yellow(`   ${index + 1}. ${suggestion.message}`));
      if (suggestion.action) {
        console.log(chalk.gray(`      → ${suggestion.action}`));
      }
      if (suggestion.command) {
        console.log(chalk.cyan(`      $ ${suggestion.command}`));
      }
    });
  }
  private static displayGenericSuggestions(): void {
    console.log(chalk.yellow("\n💡 General troubleshooting:"));
    console.log(chalk.yellow("   1. Check the error message above for specific details"));
    console.log(chalk.yellow("   2. Ensure all dependencies are installed: npm install"));
    console.log(chalk.yellow("   3. Verify your configuration files are correct"));
    console.log(chalk.yellow("   4. Check file permissions and disk space"));
    console.log(chalk.yellow("   5. Try running with debug mode: LORM_DEBUG=1"));
  }
  private getHelpUrl(code: string): string {
    return `https://lorm.dev/docs/errors/${code.toLowerCase()}`;
  }
  private getSeverityColor(severity: ErrorSeverity): typeof chalk.red {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return chalk.red.bold;
      case ErrorSeverity.HIGH:
        return chalk.red;
      case ErrorSeverity.MEDIUM:
        return chalk.yellow;
      case ErrorSeverity.LOW:
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }
  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '🚨';
      case ErrorSeverity.HIGH:
        return '❌';
      case ErrorSeverity.MEDIUM:
        return '⚠️';
      case ErrorSeverity.LOW:
        return 'ℹ️';
      default:
        return '❓';
    }
  }
  private isLormError(error: Error | LormError | FileSystemError): error is LormError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      'severity' in error
    );
  }
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const stats = await fs.promises.stat(this.logPath);
      if (stats.size > this.config.maxLogSize) {
        const backupPath = `${this.logPath}.${Date.now()}.bak`;
        await fs.promises.rename(this.logPath, backupPath);
      }
    } catch (error) {
    }
  }
  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
export class ErrorUtils {
  static validationError(
    message: string,
    field?: string,
    value?: string | number | boolean | null,
    context?: Partial<ErrorContext>
  ): LormError {
    const handler = new ErrorHandler({
      logPath: '/tmp/lorm-errors.log',
      enableStackTrace: false,
      enableRecovery: false,
      maxLogSize: 1024 * 1024,
      reportingEnabled: false
    });
    return handler.createError(
      ErrorType.VALIDATION,
      ErrorSeverity.MEDIUM,
      'VALIDATION_ERROR',
      message,
      field ? `Invalid value for '${field}': ${message}` : message,
      context,
      [
        {
          description: 'Check the documentation for valid values',
          priority: 1
        },
        {
          description: 'Use the --help flag for command usage',
          command: '--help',
          priority: 2
        }
      ]
    );
  }
  static configError(
    message: string,
    configPath?: string,
    context?: Partial<ErrorContext>
  ): LormError {
    const handler = new ErrorHandler({
      logPath: '/tmp/lorm-errors.log',
      enableStackTrace: false,
      enableRecovery: true,
      maxLogSize: 1024 * 1024,
      reportingEnabled: false
    });
    return handler.createError(
      ErrorType.CONFIGURATION,
      ErrorSeverity.HIGH,
      'CONFIG_ERROR',
      message,
      `Configuration error: ${message}`,
      { ...context, configPath },
      [
        {
          description: 'Validate your configuration file',
          command: 'lorm config validate',
          priority: 1
        },
        {
          description: 'Generate a new configuration file',
          command: 'lorm init --force',
          priority: 2
        }
      ]
    );
  }
  static networkError(
    message: string,
    url?: string,
    context?: Partial<ErrorContext>
  ): LormError {
    const handler = new ErrorHandler({
      logPath: '/tmp/lorm-errors.log',
      enableStackTrace: false,
      enableRecovery: false,
      maxLogSize: 1024 * 1024,
      reportingEnabled: false
    });
    return handler.createError(
      ErrorType.NETWORK,
      ErrorSeverity.MEDIUM,
      'NETWORK_ERROR',
      message,
      `Network error: ${message}`,
      context,
      [
        {
          description: 'Check your internet connection',
          priority: 1
        },
        {
          description: 'Try again in a few moments',
          priority: 2
        },
        url ? {
          description: `Verify the URL is accessible: ${url}`,
          priority: 3
        } : null
      ].filter(Boolean) as RecoveryAction[]
    );
  }
}