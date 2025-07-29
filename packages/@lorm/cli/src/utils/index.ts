// Package manager utilities
export { packageManager, installDependencies } from './package-manager';

// Drizzle Kit utilities
export { resolveDrizzleKitBin, executeDrizzleKit } from './drizzle-kit';


// Error recovery utilities
export { ErrorRecovery } from './error-recovery';

// Help system utilities
export { COMMAND_HELP, displayCommandHelp, displayGeneralHelp } from './help-system';

// Cache utilities
export { CommandCache } from './cache';

// Performance monitoring utilities
export type {
  PerformanceMetric,
  PerformanceReport
} from './performance';
export {
  PerformanceMonitor,
  PerformanceTracker
} from './performance';

// Plugin system utilities
export type {
  PluginContext,
  PluginCommand,
  PluginHook,
  Plugin,
  PluginConfig
} from './plugin-system';
export {
  PluginManager
} from './plugin-system';

export {
  initializeCommand,
  handleCommandError,
  validateSchemaFile,
  setupLormDirectory,
} from './setup';

export {
  initializeAdvancedCommand,
  handleAdvancedCommandError,
} from './advanced-setup';