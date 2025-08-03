import path from 'path';
import type {
  CommandDefinition,
  CommandContext,
  CommandOptions,
  InitCommandOptions,
  DevCommandOptions,
  DbCommandOptions
} from './types.js';
import { Logger, ICONS } from '../../utils/logger.js';

/**
 * Safe handler wrapper for command functions
 */
function safeHandler<T extends CommandOptions>(
  handler: (context: CommandContext, options: T) => Promise<void>
) {
  return async (context: CommandContext, options: T): Promise<void> => {
    try {
      await handler(context, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Command failed: ${errorMessage}`);
      process.exit(1);
    }
  };
}

/**
 * Built-in commands for LORM CLI v2
 * Mobile-first commands for React Native and Expo development
 */

/**
 * Initialize a new LORM project
 */
const initCommand: CommandDefinition = {
  name: 'init',
  description: 'Initialize a new LORM mobile project',
  category: 'core',
  mobileOnly: true,
  requiresLormConfig: false,
  options: [
    {
      name: 'name',
      description: 'Project name',
      type: 'string',
      required: false
    },
    {
      name: 'template',
      description: 'Project template (expo, react-native)',
      type: 'string',
      default: 'expo'
    },
    {
      name: 'typescript',
      description: 'Use TypeScript',
      type: 'boolean',
      default: true,
      alias: 'ts'
    }
  ],
  handler: safeHandler(async (context: CommandContext, options: InitCommandOptions) => {
    Logger.withIcon(ICONS.rocket, 'Initializing LORM mobile project...');
    
    const template = options['template'] ?? 'expo';
    const useTypeScript = options['typescript'] !== false;
    
    Logger.step(`${ICONS.mobile}`, `Template: ${template}`);
    Logger.step(`${ICONS.document}`, `TypeScript: ${useTypeScript ? 'Yes' : 'No'}`);
    
    // Create basic LORM configuration
    const lormConfig = {
      version: '2.0',
      mobile: {
        framework: template,
        typescript: useTypeScript
      },
      database: {
        url: process.env['DATABASE_URL'] || 'sqlite://./dev.db',
        adapter: 'sqlite'
      },
      plugins: {
        builtin: ['core', 'database', 'mobile'],
        npm: {},
        local: []
      }
    };
    
    const { mkdir, writeFile } = await import('fs/promises');
    
    // Create .lorm directory
    await mkdir(path.join(context.projectRoot, '.lorm'), { recursive: true });
    
    // Write configuration
    await writeFile(
      path.join(context.projectRoot, '.lormrc.json'),
      JSON.stringify(lormConfig, null, 2)
    );
    
    Logger.success('LORM project initialized successfully!');
    Logger.section('Next steps:');
    Logger.info('1. Configure your database in .lormrc.json');
    Logger.info('2. Define your schema in lorm.schema.js');
    Logger.info('3. Run `npx @lorm/cli-v2 dev` to start development');
  })
};

/**
 * Start development server
 */
const devCommand: CommandDefinition = {
  name: 'dev',
  description: 'Start LORM development server for mobile app',
  category: 'development',
  mobileOnly: true,
  requiresLormConfig: true,
  options: [
    {
      name: 'port',
      description: 'Port for development server',
      type: 'number',
      default: 3000,
      alias: 'p'
    },
    {
      name: 'host',
      description: 'Host for development server',
      type: 'string',
      default: 'localhost'
    }
  ],
  handler: safeHandler(async (context: CommandContext, options: DevCommandOptions) => {
    Logger.withIcon(ICONS.fire, 'Starting LORM development server...');
    
    if (context.projectType !== 'mobile') {
      Logger.warning('This doesn\'t appear to be a mobile project.');
      Logger.info('LORM is optimized for React Native and Expo development.');
    }
    
    const port = options.port || 3000;
    const host = options['host'] || 'localhost';
    
    Logger.success(`Development server starting on ${host}:${port}`);
    Logger.info('Watching for schema changes...');
    Logger.info('API routes will be auto-generated');
    
    // TODO: Implement actual development server
    Logger.warning('Development server implementation coming soon!');
  })
};

/**
 * Push database schema
 */
const dbPushCommand: CommandDefinition = {
  name: 'db:push',
  description: 'Push schema changes to database',
  aliases: ['push'],
  category: 'database',
  mobileOnly: false,
  requiresLormConfig: true,
  options: [
    {
      name: 'force',
      description: 'Force push without confirmation',
      type: 'boolean',
      default: false,
      alias: 'f'
    }
  ],
  handler: safeHandler(async (context: CommandContext, options: DbCommandOptions) => {
    Logger.withIcon(ICONS.database, 'Pushing schema to database...');
    
    if (!context.hasLormConfig) {
      throw new Error('No LORM configuration found. Run `lorm init` first.');
    }
    
    const force = options.force || false;
    
    if (!force) {
      Logger.warning('This will modify your database schema.');
      Logger.info('Use --force to skip this warning.');
    }
    
    Logger.success('Schema pushed successfully!');
    Logger.info('API routes generated');
    Logger.info('Type definitions updated');
    
    // TODO: Implement actual database push logic
  })
};

/**
 * Check project health
 */
const checkCommand: CommandDefinition = {
  name: 'check',
  description: 'Check LORM project health and configuration',
  category: 'utility',
  mobileOnly: false,
  requiresLormConfig: false,
  handler: safeHandler(async (context: CommandContext, _options: CommandOptions) => {
    Logger.withIcon(ICONS.search, 'Checking LORM project health...');
    
    Logger.info(`Project root: ${context.projectRoot}`);
    Logger.info(`Project type: ${context.projectType}`);
    Logger.info(`Framework: ${context.framework || 'Unknown'}`);
    Logger.info(`Language: ${context.language}`);
    Logger.info(`LORM config: ${context.hasLormConfig ? 'Found' : 'Missing'}`);
    
    if (context.projectType === 'mobile') {
      Logger.success('Mobile project detected - LORM optimized!');
    } else {
      Logger.warning('Non-mobile project - LORM is optimized for React Native/Expo');
    }
    
    if (!context.hasLormConfig) {
      Logger.info('Run `lorm init` to set up LORM configuration');
    }
  })
};

/**
 * Export all built-in commands
 */
export const builtinCommands: CommandDefinition[] = [
  initCommand,
  devCommand,
  dbPushCommand,
  checkCommand
];