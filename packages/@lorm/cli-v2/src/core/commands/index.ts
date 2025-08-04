// Export all command modules
export * from './core';
export * from './database';
export * from './utility';
export * from './security';
export * from './cache';
export * from './plugin';
export * from './types';
export * from './type-generation';
export * from './registry';

// Export command collections
import { getCoreCommands } from './core';
import { getDatabaseCommands } from './database';
import { getUtilityCommands } from './utility';
import { getSecurityCommands } from './security';
import { getCacheCommands } from './cache';
import { getTypeCommands } from './type-generation';
import { getPluginCommands } from './plugin';

// Collect all commands
export const getAllCommands = (commandRegistry: any) => [
  ...getCoreCommands(commandRegistry),
  ...getDatabaseCommands(),
  ...getUtilityCommands(),
  ...getSecurityCommands(),
  ...getCacheCommands(),
  ...getTypeCommands(),
  ...getPluginCommands(),
];