/**
 * Plugin Command Manager
 * Handles plugin command registration, execution, and management
 */

import type {
  Plugin,
  PluginCommand,
  PluginContext,
  PluginTelemetry,
  CommandExample,
  CommandResult,
  PluginError
} from '../types';
import { PluginErrorCode } from '../types';
import { EventEmitter } from 'events';

interface RegisteredCommand {
  command: PluginCommand;
  pluginName: string;
  context: PluginContext;
  registrationTime: Date;
  executionCount: number;
  lastExecuted?: Date;
  averageExecutionTime: number;
}

interface CommandExecutionResult {
  success: boolean;
  result?: unknown;
  error?: Error;
  executionTime: number;
  timestamp: Date;
}

interface CommandMetrics {
  totalCommands: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  commandsByPlugin: Record<string, number>;
}

/**
 * Creates a plugin error with the specified code and message
 */
function createPluginError(
  code: PluginErrorCode,
  message: string,
  details?: { pluginName?: string; originalError?: Error; context?: Record<string, unknown> }
): PluginError {
  const error = new Error(message) as PluginError;
  error.code = code;
  error.plugin = details?.pluginName;
  error.details = {
    originalError: details?.originalError,
    context: details?.context
  };
  return error;
}

export class PluginCommandManager {
  private registeredCommands = new Map<string, RegisteredCommand>();
  private commandAliases = new Map<string, string>(); // alias -> command name
  private eventEmitter = new EventEmitter();
  private telemetry: PluginTelemetry;
  private metrics: CommandMetrics = {
    totalCommands: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    commandsByPlugin: {}
  };

  constructor(telemetry: PluginTelemetry) {
    this.telemetry = telemetry;
  }

  /**
   * Register commands for a plugin
   */
  async registerCommands(plugin: Plugin, context: PluginContext): Promise<void> {
    if (!plugin.commands || plugin.commands.length === 0) {
      return;
    }

    const registeredCount = this.metrics.commandsByPlugin[plugin.name] || 0;
    
    for (const command of plugin.commands) {
      try {
        await this.registerSingleCommand(plugin.name, command, context);
        this.metrics.totalCommands++;
      } catch (error) {
        throw createPluginError(
          PluginErrorCode.VALIDATION_ERROR,
          `Failed to register command '${command.name}' for plugin '${plugin.name}': ${error instanceof Error ? error.message : String(error)}`,
          { pluginName: plugin.name, originalError: error instanceof Error ? error : new Error(String(error)) }
        );
      }
    }

    this.metrics.commandsByPlugin[plugin.name] = registeredCount + plugin.commands.length;
    
    this.telemetry.track('plugin_commands_registered', {
      pluginName: plugin.name,
      commandCount: plugin.commands.length,
      totalCommands: this.metrics.totalCommands
    });
  }

  /**
   * Unregister all commands for a plugin
   */
  async unregisterCommands(pluginName: string): Promise<void> {
    const commandsToRemove: string[] = [];
    const aliasesToRemove: string[] = [];
    
    // Find commands and aliases to remove
    for (const [commandName, registeredCommand] of this.registeredCommands) {
      if (registeredCommand.pluginName === pluginName) {
        commandsToRemove.push(commandName);
      }
    }
    
    for (const [alias, commandName] of this.commandAliases) {
      const registeredCommand = this.registeredCommands.get(commandName);
      if (registeredCommand?.pluginName === pluginName) {
        aliasesToRemove.push(alias);
      }
    }
    
    // Remove commands and aliases
    for (const commandName of commandsToRemove) {
      this.registeredCommands.delete(commandName);
      this.metrics.totalCommands--;
    }
    
    for (const alias of aliasesToRemove) {
      this.commandAliases.delete(alias);
    }
    
    // Update metrics
    delete this.metrics.commandsByPlugin[pluginName];
    
    this.telemetry.track('plugin_commands_unregistered', {
      pluginName,
      removedCommands: commandsToRemove.length,
      removedAliases: aliasesToRemove.length
    });
  }

  /**
   * Execute a command by name
   */
  async executeCommand(
    commandName: string,
    args: string[] = [],
    options: Record<string, unknown> = {}
  ): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    this.metrics.totalExecutions++;
    
    try {
      // Resolve command name (handle aliases)
      const resolvedCommandName = this.resolveCommandName(commandName);
      const registeredCommand = this.registeredCommands.get(resolvedCommandName);
      
      if (!registeredCommand) {
        throw createPluginError(
          PluginErrorCode.NOT_FOUND,
          `Command '${commandName}' not found`,
          { context: { commandName, availableCommands: Array.from(this.registeredCommands.keys()) } }
        );
      }
      
      // Validate command arguments
      this.validateCommandArguments(registeredCommand.command, args, options);
      
      // Execute pre-command hooks
      await this.executePreCommandHooks(resolvedCommandName, args, options, registeredCommand.context);
      
      // Execute the command
      const result = await this.executeCommandHandler(
        registeredCommand,
        args,
        options
      );
      
      const executionTime = Date.now() - startTime;
      
      // Update command statistics
      this.updateCommandStatistics(registeredCommand, executionTime, true);
      
      // Execute post-command hooks
      await this.executePostCommandHooks(resolvedCommandName, result, registeredCommand.context);
      
      this.metrics.successfulExecutions++;
      
      this.telemetry.track('command_executed', {
        commandName: resolvedCommandName,
        pluginName: registeredCommand.pluginName,
        executionTime,
        success: true,
        argsCount: args.length
      });
      
      return {
        success: true,
        result,
        executionTime,
        timestamp: new Date()
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.metrics.failedExecutions++;
      
      this.telemetry.track('command_execution_failed', {
        commandName,
        error: err.message,
        executionTime,
        argsCount: args.length
      });
      
      return {
        success: false,
        error: err,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get all registered commands
   */
  getRegisteredCommands(): Array<{
    name: string;
    description: string;
    pluginName: string;
    aliases: string[];
    usage?: string;
    examples?: readonly CommandExample[];
  }> {
    const commands: Array<{
      name: string;
      description: string;
      pluginName: string;
      aliases: string[];
      usage?: string;
      examples?: readonly CommandExample[];
    }> = [];
    
    for (const [commandName, registeredCommand] of this.registeredCommands) {
      const aliases = this.getCommandAliases(commandName);
      
      commands.push({
        name: commandName,
        description: registeredCommand.command.description || '',
        pluginName: registeredCommand.pluginName,
        aliases,
        examples: registeredCommand.command.examples
      });
    }
    
    return commands.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get commands for a specific plugin
   */
  getPluginCommands(pluginName: string): PluginCommand[] {
    const commands: PluginCommand[] = [];
    
    for (const registeredCommand of this.registeredCommands.values()) {
      if (registeredCommand.pluginName === pluginName) {
        commands.push(registeredCommand.command);
      }
    }
    
    return commands;
  }

  /**
   * Check if a command exists
   */
  hasCommand(commandName: string): boolean {
    const resolvedName = this.resolveCommandName(commandName);
    return this.registeredCommands.has(resolvedName);
  }

  /**
   * Get command information
   */
  getCommandInfo(commandName: string): RegisteredCommand | null {
    const resolvedName = this.resolveCommandName(commandName);
    return this.registeredCommands.get(resolvedName) || null;
  }

  /**
   * Get command metrics
   */
  getCommandMetrics(): CommandMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed command statistics
   */
  getCommandStatistics(): Record<string, {
    executionCount: number;
    averageExecutionTime: number;
    lastExecuted?: Date;
    pluginName: string;
  }> {
    const stats: Record<string, {
      executionCount: number;
      averageExecutionTime: number;
      lastExecuted?: Date;
      pluginName: string;
    }> = {};
    
    for (const [commandName, registeredCommand] of this.registeredCommands) {
      stats[commandName] = {
        executionCount: registeredCommand.executionCount,
        averageExecutionTime: registeredCommand.averageExecutionTime,
        lastExecuted: registeredCommand.lastExecuted,
        pluginName: registeredCommand.pluginName
      };
    }
    
    return stats;
  }

  private async registerSingleCommand(
    pluginName: string,
    command: PluginCommand,
    context: PluginContext
  ): Promise<void> {
    // Validate command structure
    if (!command.name || typeof command.name !== 'string') {
      throw new Error('Command name is required and must be a string');
    }
    
    if (!command.handler || typeof command.handler !== 'function') {
      throw new Error('Command handler is required and must be a function');
    }
    
    // Check for name conflicts
    if (this.registeredCommands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`);
    }
    
    // Register the command
    this.registeredCommands.set(command.name, {
      command,
      pluginName,
      context,
      registrationTime: new Date(),
      executionCount: 0,
      averageExecutionTime: 0
    });
    
    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        if (this.commandAliases.has(alias) || this.registeredCommands.has(alias)) {
          throw new Error(`Command alias '${alias}' conflicts with existing command or alias`);
        }
        this.commandAliases.set(alias, command.name);
      }
    }
  }

  private resolveCommandName(commandName: string): string {
    return this.commandAliases.get(commandName) || commandName;
  }

  private getCommandAliases(commandName: string): string[] {
    const aliases: string[] = [];
    
    for (const [alias, targetCommand] of this.commandAliases) {
      if (targetCommand === commandName) {
        aliases.push(alias);
      }
    }
    
    return aliases;
  }

  private validateCommandArguments(
    command: PluginCommand,
    args: string[],
    options: Record<string, unknown>
  ): void {
    // Basic validation - can be extended based on command schema
    // Note: minArgs and maxArgs validation would need to be implemented
    // based on the actual PluginCommand interface structure
  }

  private async executeCommandHandler(
    registeredCommand: RegisteredCommand,
    args: string[],
    options: Record<string, unknown>
  ): Promise<unknown> {
    const { command, context } = registeredCommand;
    
    // Create command execution context
    const commandContext = {
      ...context,
      args,
      options,
      command: {
        name: command.name,
        description: command.description
      }
    };
    
    // Convert string[] args to StrictRecord format expected by PluginCommand
    const argsRecord: Record<string, unknown> = {};
    args.forEach((arg, index) => {
      argsRecord[index.toString()] = arg;
    });
    
    // Execute the command handler
    const result = await command.handler.call(commandContext, argsRecord, options, context);
    
    // Ensure result conforms to CommandResult interface
    if (result && typeof result === 'object' && 'success' in result) {
      return result as CommandResult;
    }
    
    // Wrap non-CommandResult returns
    return {
      success: true,
      data: result
    } as CommandResult;
  }

  private updateCommandStatistics(
    registeredCommand: RegisteredCommand,
    executionTime: number,
    success: boolean
  ): void {
    registeredCommand.executionCount++;
    registeredCommand.lastExecuted = new Date();
    
    // Update average execution time
    const totalTime = registeredCommand.averageExecutionTime * (registeredCommand.executionCount - 1) + executionTime;
    registeredCommand.averageExecutionTime = totalTime / registeredCommand.executionCount;
    
    // Update global metrics
    const globalTotalTime = this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + executionTime;
    this.metrics.averageExecutionTime = globalTotalTime / this.metrics.totalExecutions;
  }

  private async executePreCommandHooks(
    commandName: string,
    args: string[],
    options: Record<string, unknown>,
    context: PluginContext
  ): Promise<void> {
    this.eventEmitter.emit('preCommand', {
      commandName,
      args,
      options,
      context
    });
    
    this.eventEmitter.emit(`preCommand:${commandName}`, {
      args,
      options,
      context
    });
  }

  private async executePostCommandHooks(
    commandName: string,
    result: unknown,
    context: PluginContext
  ): Promise<void> {
    this.eventEmitter.emit('postCommand', {
      commandName,
      result,
      context
    });
    
    this.eventEmitter.emit(`postCommand:${commandName}`, {
      result,
      context
    });
  }
}

export type { RegisteredCommand, CommandExecutionResult, CommandMetrics };