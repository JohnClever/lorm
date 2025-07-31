import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRegistry, type CommandConfig } from '../../src/utils/command-registry';
import type { BaseCommandOptions } from '../../src/types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command successfully', () => {
      const mockCommand: CommandConfig<BaseCommandOptions> = {
        name: 'test',
        description: 'Test command',
        action: vi.fn()
      };

      expect(() => registry.register(mockCommand)).not.toThrow();
    });

    it('should register command with all properties', () => {
      const mockCommand: CommandConfig<BaseCommandOptions> = {
        name: 'test',
        description: 'Test command',
        aliases: ['t', 'testing'],
        category: 'utility',
        requiresConfig: true,
        requiresSchema: false,
        options: [
          {
            flag: '--verbose',
            description: 'Enable verbose output'
          }
        ],
        examples: ['npx @lorm/cli test'],
        action: vi.fn()
      };

      expect(() => registry.register(mockCommand)).not.toThrow();
    });
  });

  describe('getCommand', () => {
    it('should return registered command', () => {
      const mockCommand: CommandConfig<BaseCommandOptions> = {
        name: 'test',
        description: 'Test command',
        action: vi.fn()
      };

      registry.register(mockCommand);
      const retrieved = registry.getCommand('test');
      expect(retrieved).toBe(mockCommand);
    });

    it('should return undefined for non-existent command', () => {
      const retrieved = registry.getCommand('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllCommands', () => {
    it('should return empty array when no commands registered', () => {
      const commands = registry.getAllCommands();
      expect(commands).toEqual([]);
    });

    it('should return all registered commands', () => {
      const command1: CommandConfig<BaseCommandOptions> = {
        name: 'test1',
        description: 'Test command 1',
        action: vi.fn()
      };
      const command2: CommandConfig<BaseCommandOptions> = {
        name: 'test2',
        description: 'Test command 2',
        action: vi.fn()
      };

      registry.register(command1);
      registry.register(command2);

      const commands = registry.getAllCommands();
      expect(commands).toHaveLength(2);
      expect(commands).toContain(command1);
      expect(commands).toContain(command2);
    });
  });

  describe('getCommandsByCategory', () => {
    it('should organize commands by category', () => {
      const coreCommand: CommandConfig<BaseCommandOptions> = {
        name: 'init',
        description: 'Initialize project',
        category: 'core',
        action: vi.fn()
      };
      const dbCommand: CommandConfig<BaseCommandOptions> = {
        name: 'migrate',
        description: 'Run migrations',
        category: 'database',
        action: vi.fn()
      };
      const utilityCommand: CommandConfig<BaseCommandOptions> = {
        name: 'help',
        description: 'Show help',
        category: 'utility',
        action: vi.fn()
      };

      registry.register(coreCommand);
      registry.register(dbCommand);
      registry.register(utilityCommand);

      const categories = registry.getCommandsByCategory();
      
      expect(categories.core).toContain(coreCommand);
      expect(categories.database).toContain(dbCommand);
      expect(categories.utility).toContain(utilityCommand);
    });

    it('should default to utility category for commands without category', () => {
      const command: CommandConfig<BaseCommandOptions> = {
        name: 'test',
        description: 'Test command',
        action: vi.fn()
      };

      registry.register(command);
      const categories = registry.getCommandsByCategory();
      
      expect(categories.utility).toContain(command);
    });
  });

  describe('getCommandsMap', () => {
    it('should return a map of commands', () => {
      const command: CommandConfig<BaseCommandOptions> = {
        name: 'test',
        description: 'Test command',
        action: vi.fn()
      };

      registry.register(command);
      const commandsMap = registry.getCommandsMap();
      
      expect(commandsMap).toBeInstanceOf(Map);
      expect(commandsMap.get('test')).toBe(command);
    });
  });

  describe('applyToCAC', () => {
    it('should apply commands to CAC instance', () => {
      const mockCAC = {
        command: vi.fn().mockReturnThis(),
        alias: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
        example: vi.fn().mockReturnThis(),
        action: vi.fn().mockReturnThis()
      };

      const command: CommandConfig<BaseCommandOptions> = {
        name: 'test',
        description: 'Test command',
        aliases: ['t'],
        options: [
          {
            flag: '--verbose',
            description: 'Enable verbose output'
          }
        ],
        examples: ['npx @lorm/cli test'],
        action: vi.fn()
      };

      registry.register(command);
      registry.applyToCAC(mockCAC as any);

      expect(mockCAC.command).toHaveBeenCalledWith('test', 'Test command');
      expect(mockCAC.alias).toHaveBeenCalledWith('t');
      expect(mockCAC.option).toHaveBeenCalledWith('--verbose', 'Enable verbose output', undefined);
      expect(mockCAC.example).toHaveBeenCalledWith('npx @lorm/cli test');
      expect(mockCAC.action).toHaveBeenCalled();
    });
  });
});