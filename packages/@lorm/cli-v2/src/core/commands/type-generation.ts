// Removed chalk import - using Logger utility instead
import { BaseCommandOptions } from './types.js';
import { createCommand, getCommandPrefix } from '../../utils/command-factory.js';

const commandPrefix = getCommandPrefix();
import { generateTypeFile, watchRouter, initializeTypeGeneration } from '../../utils/type-generation.js';
import { Logger, ICONS } from '../../utils/logger.js';

/**
 * Type generation command options
 */
export interface TypesCommandOptions extends BaseCommandOptions {
  watch?: boolean;
  init?: boolean;
}

/**
 * Generate types command implementation
 */
const typesCommands = {
  async generateTypes(options: TypesCommandOptions): Promise<void> {
    const { watch, init } = options;
    
    try {
      if (init) {
        await initializeTypeGeneration();
        return;
      }

      if (watch) {
        Logger.withIcon(ICONS.search, 'Starting type generation watcher...', 'info');
        
        // Generate initial types
        await generateTypeFile();
        
        // Start watching
        const watcher = watchRouter();
        
        Logger.success('Type generation watcher started. Press Ctrl+C to stop.');
        
        // Keep process alive
        return new Promise((resolve) => {
          process.on('SIGINT', () => {
            watcher.close();
            Logger.goodbye();
            resolve();
          });
        });
      }

      // Default: generate types once
      await generateTypeFile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Type generation failed: ${errorMessage}`);
      process.exit(1);
    }
  }
};

/**
 * Types generation command
 */
export const typesCommand = createCommand({
  name: 'types',
  description: 'Generate TypeScript types from LORM router definitions',
  category: 'development',
  requiresConfig: false,
  requiresSchema: false,
  options: [
    { flag: '--watch', description: 'Watch for changes and regenerate types automatically' },
    { flag: '--init', description: 'Initialize type generation for the project' },
    { flag: '--verbose', description: 'Show detailed generation process' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli types`,
    `${commandPrefix} @lorm/cli types --watch`,
    `${commandPrefix} @lorm/cli types --init`,
    `${commandPrefix} @lorm/cli types --verbose`,
  ],
  action: async (options: TypesCommandOptions) => {
    await typesCommands.generateTypes(options);
  },
});

/**
 * Generate types command (alias)
 */
export const generateTypesCommand = createCommand({
  name: 'gen-types',
  description: 'Alias for types command - generate TypeScript types',
  category: 'development',
  requiresConfig: false,
  requiresSchema: false,
  action: async (options: TypesCommandOptions) => {
    await typesCommands.generateTypes(options);
  },
});

/**
 * Export all type generation commands
 */
export const getTypeCommands = () => [
  typesCommand,
  generateTypesCommand,
];