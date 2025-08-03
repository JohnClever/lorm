import type { CommandDefinition, CommandContext, CommandOptions } from './types.js';
import { Logger } from '../../utils/logger.js';

/**
 * Base command class with common functionality
 * Consolidates repeated error handling and validation patterns
 */
export abstract class BaseCommand {
  protected abstract definition: CommandDefinition;

  /**
   * Get the command definition
   */
  getDefinition(): CommandDefinition {
    return {
      ...this.definition,
      handler: this.safeHandler.bind(this)
    };
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract execute(context: CommandContext, options: CommandOptions): Promise<void>;

  /**
   * Safe handler with standardized error handling
   */
  private async safeHandler(context: CommandContext, options: CommandOptions): Promise<void> {
    try {
      // Validate context if command requires it
      this.validateContext(context);
      
      // Execute the command
      await this.execute(context, options);
      
      // Ensure process exits after successful command execution
      this.exitSuccess();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Validate command context
   */
  protected validateContext(context: CommandContext): void {
    // Check if LORM config is required
    if (this.definition.requiresLormConfig && !context.hasLormConfig) {
      throw new Error('No LORM configuration found. Run `lorm init` first.');
    }

    // Check if mobile project is required
    if (this.definition.mobileOnly && context.projectType !== 'mobile') {
      Logger.warning('This doesn\'t appear to be a mobile project.');
      Logger.dim('LORM is optimized for React Native and Expo development.');
    }
  }

  /**
   * Handle command errors with consistent formatting
   */
  protected handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Command '${this.definition.name}' failed: ${errorMessage}`);
    this.exitError();
  }

  /**
   * Exit with success code
   */
  protected exitSuccess(): void {
    process.exit(0);
  }

  /**
   * Exit with error code
   */
  protected exitError(): void {
    process.exit(1);
  }

  /**
   * Check if force flag is provided
   */
  protected isForced(options: CommandOptions): boolean {
    return !!(options as any).force;
  }

  /**
   * Show force warning if not forced
   */
  protected showForceWarning(message: string): void {
    Logger.warning(message);
    Logger.dim('Use --force to skip this warning.');
  }

  /**
   * Log command start
   */
  protected logStart(message: string): void {
    Logger.info(message);
  }

  /**
   * Log command success
   */
  protected logSuccess(message: string): void {
    Logger.success(message);
  }

  /**
   * Log command progress
   */
  protected logProgress(message: string): void {
    Logger.progress(message);
  }
}

/**
 * Utility function to create command definition from BaseCommand
 */
export function createCommandDefinition(commandClass: new () => BaseCommand): CommandDefinition {
  const instance = new commandClass();
  return instance.getDefinition();
}

/**
 * Helper to register multiple commands
 */
export function registerCommands(
  registry: { register: (cmd: CommandDefinition) => void },
  commandClasses: Array<new () => BaseCommand>
): void {
  for (const CommandClass of commandClasses) {
    const definition = createCommandDefinition(CommandClass);
    registry.register(definition);
  }
}