import picocolors from 'picocolors';

/**
 * Standardized logging utilities with consistent formatting
 * Consolidates repeated picocolors usage and status message patterns
 */

/**
 * Status icons for consistent messaging
 * Only includes icons that are actually used in the codebase
 */
export const ICONS = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  rocket: '🚀',
  search: '🔍',
  config: '⚙️',
  tools: '🔧',
  plugin: '🔌',
  build: '🛠️',
  mobile: '📱',
  database: '🗄️',
  fire: '🔥',
  wave: '👋',
  construction: '🚧',
  chart: '📊',
  document: '📝'
} as const;

/**
 * Log levels with consistent styling
 */
export const LOG_LEVELS = {
  success: (message: string) => console.log(picocolors.green(message)),
  warning: (message: string) => console.log(picocolors.yellow(message)),
  error: (message: string) => console.error(picocolors.red(message)),
  info: (message: string) => console.log(picocolors.cyan(message)),
  dim: (message: string) => console.log(picocolors.dim(message)),
  bold: (message: string) => console.log(picocolors.bold(message)),
  debug: (message: string) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(picocolors.gray(`[DEBUG] ${message}`));
    }
  }
} as const;

/**
 * Status message formatters
 */
export class Logger {
  /**
   * Log a success message with green checkmark
   */
  static success(message: string): void {
    LOG_LEVELS.success(`${ICONS.success} ${message}`);
  }

  /**
   * Log a warning message with yellow warning icon
   */
  static warning(message: string): void {
    LOG_LEVELS.warning(`${ICONS.warning} ${message}`);
  }

  /**
   * Log an error message with red X icon
   */
  static error(message: string): void {
    LOG_LEVELS.error(`${ICONS.error} ${message}`);
  }

  /**
   * Log an info message with cyan color
   */
  static info(message: string): void {
    LOG_LEVELS.info(message);
  }

  /**
   * Log a dim/subtle message
   */
  static dim(message: string): void {
    LOG_LEVELS.dim(message);
  }

  /**
   * Log a bold message
   */
  static bold(message: string): void {
    LOG_LEVELS.bold(message);
  }

  /**
   * Log a startup message
   */
  static startup(message: string): void {
    LOG_LEVELS.dim(`${ICONS.rocket} ${message}`);
  }

  /**
   * Log a progress message
   */
  static progress(message: string): void {
    LOG_LEVELS.dim(message);
  }

  /**
   * Log a completion message
   */
  static complete(message: string): void {
    LOG_LEVELS.dim(`${ICONS.success} ${message}`);
  }

  /**
   * Log a step in a process
   */
  static step(step: string, message: string): void {
    LOG_LEVELS.dim(`${step} ${message}`);
  }

  /**
   * Log a section header
   */
  static section(title: string): void {
    console.log(picocolors.bold(title));
  }

  /**
   * Log a goodbye message
   */
  static goodbye(): void {
    console.log(`\n${ICONS.wave} Goodbye!`);
  }

  /**
   * Log performance information
   */
  static performance(label: string, value: string | number): void {
    LOG_LEVELS.dim(`${label}: ${value}`);
  }

  /**
   * Log a debug message (only in development or when DEBUG env var is set)
   */
  static debug(message: string): void {
    LOG_LEVELS.debug(message);
  }

  /**
   * Log with custom icon
   */
  static withIcon(icon: string, message: string, level: keyof typeof LOG_LEVELS = 'info'): void {
    LOG_LEVELS[level](`${icon} ${message}`);
  }
}

/**
 * Progress indicator for multi-step operations
 */
export class ProgressIndicator {
  private steps: Array<{ name: string; completed: boolean }> = [];
  private currentStep = 0;

  /**
   * Start a new step
   */
  step(name: string): void {
    this.steps.push({ name, completed: false });
    Logger.step(`${this.getStepIcon()} `, name);
  }

  /**
   * Complete the current step
   */
  complete(message?: string): void {
    const currentStepData = this.steps[this.currentStep];
    if (currentStepData) {
      currentStepData.completed = true;
      if (message) {
        Logger.complete(message);
      }
      this.currentStep++;
    }
  }

  /**
   * Get step icon based on progress
   */
  private getStepIcon(): string {
    const stepNumber = this.currentStep + 1;
    return `${stepNumber}.`;
  }

  /**
   * Show final summary
   */
  summary(): void {
    const completed = this.steps.filter(s => s.completed).length;
    Logger.performance('Steps completed', `${completed}/${this.steps.length}`);
  }
}