import chalk from "chalk";

export interface ErrorSuggestion {
  message: string;
  action?: string;
  command?: string;
}

export interface RecoveryOptions {
  showSuggestions?: boolean;
  exitOnError?: boolean;
  logLevel?: "error" | "warn" | "info";
}

/**
 * Enhanced error handler with recovery suggestions
 */
export class ErrorRecovery {
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

  /**
   * Handle error with recovery suggestions
   */
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

  /**
   * Wrap async function with error handling
   */
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

  /**
   * Setup graceful shutdown handlers
   */
  static setupGracefulShutdown(): void {
    const cleanup = () => {
      console.log(chalk.yellow("\n🛑 Gracefully shutting down..."));
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  /**
   * Get suggestions based on error message
   */
  private static getSuggestions(errorMessage: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];

    for (const pattern of this.ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage)) {
        suggestions.push(...pattern.suggestions);
      }
    }

    return suggestions;
  }

  /**
   * Display recovery suggestions
   */
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

  /**
   * Display generic suggestions when no specific ones are found
   */
  private static displayGenericSuggestions(): void {
    console.log(chalk.yellow("\n💡 General troubleshooting:"));
    console.log(chalk.yellow("   1. Check your project configuration"));
    console.log(chalk.cyan("      $ npx @lorm/cli check"));
    console.log(chalk.yellow("   2. Ensure all dependencies are installed"));
    console.log(chalk.cyan("      $ npm install"));
    console.log(chalk.yellow("   3. Verify your database connection"));
    console.log(chalk.yellow("   4. Check file permissions and paths"));

    console.log(
      chalk.gray(
        "\n   For more help, visit: https://lorm.dev/docs/troubleshooting"
      )
    );
  }
}
