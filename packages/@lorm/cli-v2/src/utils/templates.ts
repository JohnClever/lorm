import type { lormConfig } from "@lorm/core";

/**
 * Generate router template with language-specific typing
 */
export function getRouterTemplate(isTypeScript: boolean = false): string {
  const typeImports = isTypeScript ? '\nimport type { Database } from "@lorm/core";' : '';
  const createUsersParams = isTypeScript ? ': { input: { name: string }; db: Database }' : '';
  const getAllUsersParams = isTypeScript ? ': { db: Database }' : '';
  
  return `import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "../schema";${typeImports}

export const createUsers = defineRouter({
  input: z.object({
    name: z.string()
  }),
  resolve: async ({ input, db }${createUsersParams}) => {
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
  resolve: async ({ db }${getAllUsersParams}) => {
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
 * Generate schema template with language-specific features
 */
export function getSchemaTemplate(adapter: string, isTypeScript: boolean = false): string {
  const imports = getSchemaImports(adapter);
  const tableDefinition = getTableDefinition(adapter, isTypeScript);
  const typeExports = isTypeScript ? '\n\nexport type User = typeof users.$inferSelect;\nexport type NewUser = typeof users.$inferInsert;' : '';

  return `${imports}

export const users = ${tableDefinition};

export const schema = { users };${typeExports}`;
}



function getSchemaImports(adapter: string): string {
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

function getTableDefinition(adapter: string, isTypeScript: boolean = false): string {
  const notNull = isTypeScript ? '.notNull()' : '';
  
  switch (adapter) {
    case "mysql":
    case "planetscale":
      return `mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 })${notNull}
})`;
    case "sqlite":
    case "turso":
      return `sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name")${notNull}
})`;
    default:
      return `pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 })${notNull}
})`;
  }
}

/**
 * Generate config template with language-specific import/export syntax
 */
export function getConfigTemplate(adapter: string, url?: string, isTypeScript: boolean = true): string {
  const defaultUrl = getDefaultUrl(adapter);
  const adapterOptions = getAdapterSpecificOptions(adapter);
  
  const importStatement = isTypeScript 
    ? 'import { defineConfig } from "@lorm/core";'
    : 'const { defineConfig } = require("@lorm/core");';
    
  const exportStatement = isTypeScript 
    ? 'export default defineConfig({'
    : 'module.exports = defineConfig({';

  return `${importStatement}

${exportStatement}
  db: {
    url: "${url || defaultUrl}",
    adapter: "${adapter}",
    options: {${adapterOptions}
    }
  },
  server: {
    port: 3000,
    host: "localhost",
    cors: {
      origin: "*", // Configure for production
      credentials: false
    },
    security: {
      maxRequestSize: 1024 * 1024, // 1MB
      requestTimeout: 30000 // 30 seconds
    }
  },
  logging: {
    level: "info",
    enableRequestLogging: false // Enable for debugging
  }
});`;
}



function getDefaultUrl(adapter: string): string {
  switch (adapter) {
    case "neon":
      return "postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb";
    case "postgres":
      return "postgresql://username:password@localhost:5432/database";
    case "mysql":
      return "mysql://username:password@localhost:3306/database";
    case "planetscale":
      return 'mysql://username:password@aws.connect.psdb.cloud/database?ssl={"rejectUnauthorized":true}';
    case "sqlite":
      return "file:./local.db";
    case "turso":
      return "libsql://your-database.turso.io";
    default:
      return "postgresql://username:password@localhost:5432/database";
  }
}



function getAdapterSpecificOptions(adapter: string): string {
  switch (adapter) {
    case "turso":
      return `\n      // authToken: process.env.TURSO_AUTH_TOKEN`;
    case "planetscale":
      return `\n      // ssl: { rejectUnauthorized: true }`;
    case "neon":
      return `\n      // connectionTimeoutMillis: 5000,\n      // ssl: true`;
    case "postgres":
      return `\n      // ssl: false,\n      // connectionTimeoutMillis: 5000`;
    case "mysql":
      return `\n      // ssl: false,\n      // acquireTimeout: 60000`;
    case "sqlite":
      return `\n      // busyTimeout: 5000`;
    default:
      return "";
  }
}

/**
 * Generate type template with configurable router path
 */
export function getTypeTemplate(routerPath: string = "../lorm.router"): string {
  return `// Auto-generated types for Lorm

import type { router } from "${routerPath}";

export type LormRouter = typeof router;

type ExtractRouterMethods<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? T[K] : never;
};

export type TypedLormRouter = ExtractRouterMethods<typeof router>;

declare module '@lorm/client' {
  interface LormRouterRegistry extends TypedLormRouter {}
  type LormRouter = TypedLormRouter;
}

export { router as default };
export type { router as RouterType };`;
}



export const drizzleConfigTemplate = (config: lormConfig) => {
  const adapter = config.db.adapter || "neon";

  const dialectMap = {
    neon: "postgresql",
    postgres: "postgresql",
    mysql: "mysql",
    sqlite: "sqlite",
    planetscale: "mysql",
    turso: "sqlite",
  };

  const dialect =
    dialectMap[adapter as keyof typeof dialectMap] || "postgresql";

  return `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: './drizzle',
  schema: './schema.js',
  dialect: '${dialect}',
  dbCredentials: {
    url: "${config.db.url}",${getAdapterSpecificCredentials(adapter)}
  },${getAdapterSpecificOptions(adapter)}
});`;
};

function getAdapterSpecificCredentials(adapter: string): string {
  switch (adapter) {
    case "turso":
      return `\n    authToken: process.env.TURSO_AUTH_TOKEN,`;
    case "planetscale":
      return `\n    // Add any PlanetScale-specific credentials here`;
    default:
      return "";
  }
}

export const basicTypes = `import { LormRouter, ExtractRouterMethods, TypedLormRouter, User, CreateUserInput } from '../types.js';

export type { LormRouter, ExtractRouterMethods, TypedLormRouter, User, CreateUserInput };`;