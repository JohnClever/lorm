import { detectLanguage } from './project-detection.js';
import {
  getRouterTemplate,
  getSchemaTemplate,
  getConfigTemplate,
  drizzleConfigTemplate,
} from './templates.js';

/**
 * Database adapter types
 */
export type DatabaseAdapter =
  | "neon"
  | "postgres"
  | "mysql"
  | "sqlite"
  | "planetscale"
  | "turso";

/**
 * Template generation options
 */
export interface TemplateOptions {
  adapter: DatabaseAdapter;
  url?: string;
  isMjs?: boolean;
}

/**
 * Centralized template manager that generates appropriate templates based on language detection
 * Migrated from v1 with improvements for v2
 */
export class TemplateManager {
  private static _instance: TemplateManager;

  private constructor() {}

  static getInstance(): TemplateManager {
    if (!TemplateManager._instance) {
      TemplateManager._instance = new TemplateManager();
    }
    return TemplateManager._instance;
  }

  /**
   * Generates router template based on detected language
   */
  async generateRouterTemplate(
    projectRoot: string = process.cwd(),
    options: { isMjs?: boolean } = {}
  ): Promise<string> {
    const language = await detectLanguage(projectRoot);
    return getRouterTemplate(language === 'typescript');
  }

  /**
   * Generates schema template based on detected language and adapter
   */
  async generateSchemaTemplate(
    adapter: DatabaseAdapter,
    projectRoot: string = process.cwd()
  ): Promise<string> {
    const language = await detectLanguage(projectRoot);
    return getSchemaTemplate(adapter);
  }

  /**
   * Generates config template based on detected language and adapter
   */
  async generateConfigTemplate(
    options: TemplateOptions,
    projectRoot: string = process.cwd()
  ): Promise<string> {
    const language = await detectLanguage(projectRoot);
    return getConfigTemplate(options.adapter, options.url);
  }

  /**
   * Get file paths based on detected language and module type
   */
  async getFilePaths(
    projectRoot: string = process.cwd()
  ): Promise<{
    config: string;
    router: string;
    schema: string;
  }> {
    const language = await detectLanguage(projectRoot);
    const isTypeScript = language === 'typescript';
    
    // For now, assume ES modules (can be enhanced later)
    const ext = isTypeScript ? 'ts' : 'js';
    const configExt = isTypeScript ? 'ts' : 'js';
    
    return {
      config: `lorm.config.${configExt}`,
      router: `lorm/router.${ext}`,
      schema: `lorm/schema.${ext}`,
    };
  }

  /**
   * Get schema imports based on adapter
   */
  getSchemaImports(adapter: DatabaseAdapter): string {
    switch (adapter) {
      case "mysql":
      case "planetscale":
        return `import { mysqlTable, varchar, int } from "@lorm/schema/mysql";`;
      case "sqlite":
      case "turso":
        return `import { sqliteTable, text, integer } from "@lorm/schema/sqlite";`;
      default:
        return `import { pgTable, uuid, varchar } from "@lorm/schema/pg";`;
    }
  }

  /**
   * Get JavaScript table definition based on adapter
   */
  getJavaScriptTableDefinition(adapter: DatabaseAdapter): string {
    switch (adapter) {
      case "mysql":
      case "planetscale":
        return `mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 })
})`;
      case "sqlite":
      case "turso":
        return `sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name")
})`;
      default:
        return `pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 })
})`;
    }
  }

  /**
   * Get TypeScript table definition based on adapter (with .notNull())
   */
  getTypeScriptTableDefinition(adapter: DatabaseAdapter): string {
    switch (adapter) {
      case "mysql":
      case "planetscale":
        return `mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull()
})`;
      case "sqlite":
      case "turso":
        return `sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull()
})`;
      default:
        return `pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull()
})`;
    }
  }

  /**
   * Get default database URL based on adapter
   */
  getDefaultUrl(adapter: DatabaseAdapter): string {
    switch (adapter) {
      case "neon":
        return "postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb";
      case "postgres":
        return "postgresql://username:password@localhost:5432/database";
      case "mysql":
        return "mysql://username:password@localhost:3306/database";
      case "planetscale":
        return 'mysql://username:password@aws.connect.psdb.cloud/database?ssl={"rejectUnauthorized":true}';
      case "sqlite":
        return "file:./dev.db";
      case "turso":
        return "libsql://database-username.turso.io?authToken=token";
      default:
        return "postgresql://username:password@localhost:5432/database";
    }
  }

  /**
   * Get adapter-specific configuration options
   */
  getAdapterSpecificOptions(adapter: DatabaseAdapter): string {
    switch (adapter) {
      case "planetscale":
        return `    ssl: { rejectUnauthorized: true },`;
      case "turso":
        return `    authToken: process.env.TURSO_AUTH_TOKEN,`;
      default:
        return "";
    }
  }
}

/**
 * Convenience function to get the singleton instance
 */
export const templateManager = TemplateManager.getInstance();