import { createSimplePlugin, SimplePlugin, SimplePluginBuilder } from "@lorm/core";
import {
  executeDrizzleKit,
  initializeCommand,
  initializeAdvancedCommand,
  handleCommandError,
  handleAdvancedCommandError,
  getCommandPrefix,
} from "@/utils";
import { DbCommandOptions } from '../types.js';

const commandPrefix = getCommandPrefix();

const dbCommands = {
  async push(options: DbCommandOptions): Promise<void> {
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
  async pull(options: DbCommandOptions): Promise<void> {
    const startTime = Date.now();
    try {
      const { lormDir } = await initializeAdvancedCommand("pull");
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
  async generate(options: DbCommandOptions): Promise<void> {
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
  async migrate(options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("migrate");
      await executeDrizzleKit(
        "migrate",
        lormDir,
        "Migration applied successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Migrate");
    }
  },
  async studio(options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("studio");
      await executeDrizzleKit(
        "studio",
        lormDir,
        "Drizzle Studio started successfully!"
      );
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Studio");
    }
  },
  async up(options: DbCommandOptions): Promise<void> {
    try {
      const { lormDir } = await initializeCommand("up");
      await executeDrizzleKit("up", lormDir, "Schema upgraded successfully!");
    } catch (error: unknown) {
      handleCommandError(error instanceof Error ? error : String(error), "Up");
    }
  },
  async drop(options: DbCommandOptions): Promise<void> {
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

export const createDbPlugins = async (): Promise<SimplePlugin[]> => {
  const dbPushPlugin = new SimplePluginBuilder("db-push", "1.0.0")
    .description("Database push plugin")
    .addCommand({
      name: "db:push",
      description: "Push schema changes directly to the database (destructive)",
      category: "database",
      options: [
        { flag: "--force", description: "Force push without confirmation" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.push(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "push",
      description: "Push schema changes directly to the database (destructive)",
      category: "database",
      options: [
        { flag: "--force", description: "Force push without confirmation" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.push(args as DbCommandOptions);
      },
    })
    .build();

  const dbPullPlugin = new SimplePluginBuilder("db-pull", "1.0.0")
    .description("Database pull plugin")
    .addCommand({
      name: "db:pull",
      description: "Pull schema from database and generate types",
      category: "database",
      options: [
        { flag: "--introspect", description: "Run introspection only" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.pull(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "pull",
      description: "Pull schema from database and generate types",
      category: "database",
      options: [
        { flag: "--introspect", description: "Run introspection only" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.pull(args as DbCommandOptions);
      },
    })
    .build();

  const dbGeneratePlugin = new SimplePluginBuilder("db-generate", "1.0.0")
    .description("Database generate plugin")
    .addCommand({
      name: "db:generate",
      description: "Generate migration files from schema changes",
      category: "database",
      options: [
        { flag: "--name", description: "Migration name" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.generate(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "generate",
      description: "Generate migration files from schema changes",
      category: "database",
      options: [
        { flag: "--name", description: "Migration name" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.generate(args as DbCommandOptions);
      },
    })
    .build();

  const dbMigratePlugin = new SimplePluginBuilder("db-migrate", "1.0.0")
    .description("Database migration plugin")
    .addCommand({
      name: "db:migrate",
      description: "Run pending migrations",
      category: "database",
      options: [
        { flag: "--to", description: "Migrate to specific version" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.migrate(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "migrate",
      description: "Run pending migrations",
      category: "database",
      options: [
        { flag: "--to", description: "Migrate to specific version" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.migrate(args as DbCommandOptions);
      },
    })
    .build();

  const dbStudioPlugin = new SimplePluginBuilder("db-studio", "1.0.0")
    .description("Database studio plugin")
    .addCommand({
      name: "db:studio",
      description: "Launch Drizzle Studio for database management",
      category: "database",
      options: [
        { flag: "--port", description: "Studio port" },
        { flag: "--host", description: "Studio host" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.studio(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "studio",
      description: "Launch Drizzle Studio for database management",
      category: "database",
      options: [
        { flag: "--port", description: "Studio port" },
        { flag: "--host", description: "Studio host" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.studio(args as DbCommandOptions);
      },
    })
    .build();

  const dbUpPlugin = new SimplePluginBuilder("db-up", "1.0.0")
    .description("Database up plugin")
    .addCommand({
      name: "db:up",
      description: "Apply next migration",
      category: "database",
      options: [
        { flag: "--steps", description: "Number of migrations to apply" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.up(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "up",
      description: "Apply next migration",
      category: "database",
      options: [
        { flag: "--steps", description: "Number of migrations to apply" },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.up(args as DbCommandOptions);
      },
    })
    .build();

  const dbDropPlugin = new SimplePluginBuilder("db-drop", "1.0.0")
    .description("Database drop plugin")
    .addCommand({
      name: "db:drop",
      description: "⚠️  Drop all tables and data (DANGER ZONE)",
      category: "database",
      options: [
        {
          flag: "--force",
          description: "Skip confirmation prompts (use with extreme caution)",
        },
        {
          flag: "--confirm",
          description: "Confirm destructive operation",
        },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.drop(args as DbCommandOptions);
      },
    })
    .addCommand({
      name: "drop",
      description: "⚠️  Drop all tables and data (DANGER ZONE)",
      category: "database",
      options: [
        {
          flag: "--force",
          description: "Skip confirmation prompts (use with extreme caution)",
        },
        {
          flag: "--confirm",
          description: "Confirm destructive operation",
        },
      ],
      action: async (args: Record<string, unknown>) => {
        await dbCommands.drop(args as DbCommandOptions);
      },
    })
    .build();

  return [
    dbPushPlugin,
    dbPullPlugin,
    dbGeneratePlugin,
    dbMigratePlugin,
    dbStudioPlugin,
    dbUpPlugin,
    dbDropPlugin,
  ];
};