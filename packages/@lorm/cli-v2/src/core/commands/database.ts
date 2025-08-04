import { DbCommandOptions } from './types';
import { createDbCommand, getCommandPrefix } from '../../utils/command-factory';

const commandPrefix = getCommandPrefix();
import { 
  executeDrizzleKit,
  initializeCommand,
  initializeAdvancedCommand,
  handleCommandError,
  handleAdvancedCommandError
} from '../../utils/drizzle-utils';

// Database command implementations - migrated from v1
const dbCommands = {
  async push(_options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("schema push");
      await executeDrizzleKit(
        "push",
        lormDir,
        "Schema pushed to database successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Push");
    }
  },

  async pull(_options: DbCommandOptions): Promise<void> {
    const startTime = Date.now();
    try {
      const { lormDir } = await initializeAdvancedCommand();
      console.log("🔄 [lorm] Pulling schema from database...");
      await executeDrizzleKit("pull", lormDir, "Schema pull successfully!");
      const duration = Date.now() - startTime;
      console.log(
        `✅ [lorm] Schema pulled from database successfully! (${duration}ms)`
      );
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      handleAdvancedCommandError(error instanceof Error ? error : String(error), "Pull", duration);
    }
  },

  async generate(_options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("generate migration");
      await executeDrizzleKit(
        "generate",
        lormDir,
        "Migration generated successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Generate");
    }
  },

  async migrate(_options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeAdvancedCommand();
      await executeDrizzleKit(
        "migrate",
        lormDir,
        "Migration applied successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Migrate");
    }
  },

  async studio(_options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeAdvancedCommand();
      await executeDrizzleKit(
        "studio",
        lormDir,
        "Drizzle Studio started successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Studio");
    }
  },

  async up(_options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("up");
      await executeDrizzleKit("up", lormDir, "Schema upgraded successfully!");
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Up");
    }
  },

  async drop(_options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("drop");
      await executeDrizzleKit(
        "drop",
        lormDir,
        "⚠️  Database dropped successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Drop");
    }
  },
};

// Database command definitions
export const dbPushCommand = createDbCommand({
  name: 'db:push',
  description: 'Push schema changes directly to the database (destructive)',
  aliases: ['push'],
  requiresSchema: true,
  options: [
    { flag: '--force', description: 'Force push without confirmation' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli db:push`,
    `${commandPrefix} @lorm/cli push`,
    `${commandPrefix} @lorm/cli db:push --force`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.push(options);
  },
});

export const dbPullCommand = createDbCommand({
  name: 'db:pull',
  description: 'Pull database schema and generate types',
  aliases: ['pull'],
  requiresSchema: true,
  options: [
    {
      flag: '--introspect',
      description: 'Only introspect, don\'t generate types',
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli db:pull`,
    `${commandPrefix} @lorm/cli pull`,
    `${commandPrefix} @lorm/cli db:pull --introspect`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.pull(options);
  },
});

export const dbGenerateCommand = createDbCommand({
  name: 'db:generate',
  description: 'Generate migration files from schema changes',
  aliases: ['generate'],
  requiresSchema: true,
  options: [{ flag: '--name <name>', description: 'Custom migration name' }],
  examples: [
    `${commandPrefix} @lorm/cli db:generate`,
    `${commandPrefix} @lorm/cli generate`,
    `${commandPrefix} @lorm/cli db:generate --name add_users_table`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.generate(options);
  },
});

export const dbMigrateCommand = createDbCommand({
  name: 'db:migrate',
  description: 'Apply pending database migrations',
  aliases: ['migrate'],
  requiresSchema: true,
  options: [
    { flag: '--to <target>', description: 'Migrate to specific migration' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli db:migrate`,
    `${commandPrefix} @lorm/cli migrate`,
    `${commandPrefix} @lorm/cli db:migrate --to 20231201_001`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.migrate(options);
  },
});

export const dbStudioCommand = createDbCommand({
  name: 'db:studio',
  description: 'Open database studio for visual management',
  aliases: ['studio'],
  requiresSchema: true,
  options: [
    {
      flag: '--port <port>',
      description: 'Port for studio server',
      defaultValue: 4983,
    },
    {
      flag: '--host <host>',
      description: 'Host for studio server',
      defaultValue: 'localhost',
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli db:studio`,
    `${commandPrefix} @lorm/cli studio`,
    `${commandPrefix} @lorm/cli db:studio --port 5000`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.studio(options);
  },
});

export const dbUpCommand = createDbCommand({
  name: 'db:up',
  description: 'Upgrade schema to latest version',
  aliases: ['up'],
  requiresSchema: true,
  options: [
    {
      flag: '--dry-run',
      description: 'Show what would be upgraded without applying',
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli db:up`,
    `${commandPrefix} @lorm/cli up`,
    `${commandPrefix} @lorm/cli db:up --dry-run`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.up(options);
  },
});

export const dbDropCommand = createDbCommand({
  name: 'db:drop',
  description: '⚠️  Drop all tables and data (DANGER ZONE)',
  aliases: ['drop'],
  requiresSchema: false,
  options: [
    {
      flag: '--force',
      description: 'Skip confirmation prompts (use with extreme caution)',
    },
    {
      flag: '--confirm',
      description: 'Confirm destructive operation',
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli db:drop`,
    `${commandPrefix} @lorm/cli drop`,
    `${commandPrefix} @lorm/cli db:drop --force`,
  ],
  action: async (options: DbCommandOptions) => {
    await dbCommands.drop(options);
  },
});

// Export all database commands
export const getDatabaseCommands = () => [
  dbPushCommand,
  dbPullCommand,
  dbGenerateCommand,
  dbMigrateCommand,
  dbStudioCommand,
  dbUpCommand,
  dbDropCommand,
];