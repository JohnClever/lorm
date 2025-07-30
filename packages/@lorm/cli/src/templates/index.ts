import type { lormConfig } from "@lorm/core";

// JavaScript router template
export const routerTemplate = `import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "../schema";

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

// New TypeScript router template
export const routerTsTemplate = `import { defineRouter } from "@lorm/core";
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

// JavaScript schema template
export const getSchemaTemplate = (adapter: string) => {
  const imports = getSchemaImports(adapter);
  const tableDefinition = getTableDefinition(adapter);

  return `${imports}

export const users = ${tableDefinition};

export const schema = { users };`;
};

// JavaScript schema template (same as above, kept for clarity)
export const getSchemaJsTemplate = (adapter: string) => {
  const imports = getSchemaImports(adapter);
  const tableDefinition = getTableDefinition(adapter);

  return `${imports}

export const users = ${tableDefinition};

export const schema = { users };`;
};

// New TypeScript schema template
export const getSchemaTsTemplate = (adapter: string) => {
  const imports = getSchemaTsImports(adapter);
  const tableDefinition = getTsTableDefinition(adapter);

  return `${imports}

export const users = ${tableDefinition};

export const schema = { users };

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;`;
};

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

function getTableDefinition(adapter: string): string {
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

// TypeScript-specific functions
function getSchemaTsImports(adapter: string): string {
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

function getTsTableDefinition(adapter: string): string {
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

// TypeScript config template
export const getConfigTemplate = (adapter: string, url?: string) => {
  const defaultUrl = getDefaultUrl(adapter);
  const adapterOptions = getAdapterSpecificOptions(adapter);

  return `import { defineConfig } from "@lorm/core";

export default defineConfig({
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
};

// JavaScript config template (same structure, different file extension)
export const getConfigJsTemplate = (adapter: string, url?: string) => {
  const defaultUrl = getDefaultUrl(adapter);
  const adapterOptions = getAdapterSpecificOptions(adapter);

  return `const { defineConfig } = require("@lorm/core");

module.exports = defineConfig({
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
};

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

function getAdapterSpecificConfigOptions(adapter: string): string {
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

export const typeTemplate = `// Auto-generated types for Lorm


import type { router } from "../lorm.router";


export type LormRouter = typeof router;


type ExtractRouterMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
};


export type TypedLormRouter = ExtractRouterMethods<typeof router>;


declare module '@lorm/client' {
  interface LormRouterRegistry extends TypedLormRouter {}
  
  
  type LormRouter = TypedLormRouter;
}


export { router as default };
export type { router as RouterType };`;

// New TypeScript type template
export const typeTsTemplate = `// Auto-generated types for Lorm

import type { router } from "../lorm/router";

export type LormRouter = typeof router;

type ExtractRouterMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
};

export type TypedLormRouter = ExtractRouterMethods<typeof router>;

declare module '@lorm/client' {
  interface LormRouterRegistry extends TypedLormRouter {}
  type LormRouter = TypedLormRouter;
}

export { router as default };
export type { router as RouterType };`;

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

export const basicTypes = `export type User = {
  id: string;
  name: string;
};

export type CreateUserInput = {
  name: string;
};
`;