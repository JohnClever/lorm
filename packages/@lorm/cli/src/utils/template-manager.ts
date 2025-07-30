import { languageHandler, LanguageInfo } from "./language-handler";

/**
 * Database adapter types
 */
export type DatabaseAdapter = "neon" | "postgres" | "mysql" | "sqlite" | "planetscale" | "turso";

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
  async generateRouterTemplate(options: { isMjs?: boolean } = {}): Promise<string> {
    const languageInfo = await languageHandler.detectLanguage();
    
    if (languageInfo.isTypeScript) {
      return this.getTypeScriptRouterTemplate();
    } else {
      return this.getJavaScriptRouterTemplate(options.isMjs || false);
    }
  }

  /**
   * Generates schema template based on detected language and adapter
   */
  async generateSchemaTemplate(adapter: DatabaseAdapter): Promise<string> {
    const languageInfo = await languageHandler.detectLanguage();
    
    if (languageInfo.isTypeScript) {
      return this.getTypeScriptSchemaTemplate(adapter);
    } else {
      return this.getJavaScriptSchemaTemplate(adapter);
    }
  }

  /**
   * Generates config template based on detected language and adapter
   */
  async generateConfigTemplate(options: TemplateOptions): Promise<string> {
    const languageInfo = await languageHandler.detectLanguage();
    
    if (languageInfo.isTypeScript) {
      return this.getTypeScriptConfigTemplate(options.adapter, options.url);
    } else {
      return this.getJavaScriptConfigTemplate(options.adapter, options.url);
    }
  }

  /**
   * TypeScript router template
   */
  private getTypeScriptRouterTemplate(): string {
    return `import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "../schema";
import type { Database } from "@lorm/core";

export const createUsers = defineRouter({
  input: z.object({
    name: z.string()
  }),
  resolve: async ({ input, db }: { input: { name: string }; db: Database }) => {
    try {
      const [users] = await db.insert(schema.users).values({
        name: input.name
      }).returning();
      return users;
    } catch (error) {
      throw new Error("Failed to create user: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }
});

export const getAllUsers = defineRouter({
  input: z.void(),
  resolve: async ({ db }: { db: Database }) => {
    try {
      const users = await db.select().from(schema.users);
      return users;
    } catch (error) {
      throw new Error("Failed to fetch users: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  },
});

export const router = {
  getAllUsers,
  createUsers
};`;
  }

  /**
   * JavaScript router template
   */
  private getJavaScriptRouterTemplate(isMjs: boolean): string {
    const schemaImport = isMjs ? '../schema/index.mjs' : '../schema';
    
    return `import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "${schemaImport}";

export const createUsers = defineRouter({
  input: z.object({
    name: z.string()
  }),
  resolve: async ({input, db}) => {
    try {
      const [users] = await db.insert(schema.users).values({
        name: input.name
      }).returning();
      return users;
    } catch (error) {
      throw new Error("Failed to create user: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }
});

export const getAllUsers = defineRouter({
  input: z.void(),
  resolve: async ({ db }) => {
    try {
      const users = await db.select().from(schema.users);
      return users;
    } catch (error) {
      throw new Error("Failed to fetch users: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  },
});

export const router = {
  getAllUsers,
  createUsers
};`;
  }

  /**
   * TypeScript schema template
   */
  private getTypeScriptSchemaTemplate(adapter: DatabaseAdapter): string {
    const imports = this.getSchemaImports(adapter);
    const tableDefinition = this.getTypeScriptTableDefinition(adapter);

    return `${imports}

export const users = ${tableDefinition};

export const schema = { users };

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;`;
  }

  /**
   * JavaScript schema template
   */
  private getJavaScriptSchemaTemplate(adapter: DatabaseAdapter): string {
    const imports = this.getSchemaImports(adapter);
    const tableDefinition = this.getJavaScriptTableDefinition(adapter);

    return `${imports}

export const users = ${tableDefinition};

export const schema = { users };`;
  }

  /**
   * TypeScript config template
   */
  private getTypeScriptConfigTemplate(adapter: DatabaseAdapter, url?: string): string {
    const defaultUrl = this.getDefaultUrl(adapter);
    const adapterOptions = this.getAdapterSpecificOptions(adapter);

    return `import { defineConfig } from "@lorm/core";

export default defineConfig({
  db: {
    adapter: "${adapter}",
    url: process.env.DATABASE_URL || "${url || defaultUrl}",
${adapterOptions}
  },
});`;
  }

  /**
   * JavaScript config template
   */
  private getJavaScriptConfigTemplate(adapter: DatabaseAdapter, url?: string): string {
    const defaultUrl = this.getDefaultUrl(adapter);
    const adapterOptions = this.getAdapterSpecificOptions(adapter);

    return `import { defineConfig } from "@lorm/core";

export default defineConfig({
  db: {
    adapter: "${adapter}",
    url: process.env.DATABASE_URL || "${url || defaultUrl}",
${adapterOptions}
  },
});`;
  }

  /**
   * Get schema imports based on adapter
   */
  private getSchemaImports(adapter: DatabaseAdapter): string {
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
  private getJavaScriptTableDefinition(adapter: DatabaseAdapter): string {
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
  private getTypeScriptTableDefinition(adapter: DatabaseAdapter): string {
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
  private getDefaultUrl(adapter: DatabaseAdapter): string {
    switch (adapter) {
      case "neon":
        return "postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb";
      case "postgres":
        return "postgresql://username:password@localhost:5432/database";
      case "mysql":
        return "mysql://username:password@localhost:3306/database";
      case "planetscale":
        return "mysql://username:password@aws.connect.psdb.cloud/database?ssl={\"rejectUnauthorized\":true}";
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
  private getAdapterSpecificOptions(adapter: DatabaseAdapter): string {
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