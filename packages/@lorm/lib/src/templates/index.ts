import { lormConfig } from "../types";

export const routerTemplate = `import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "./lorm.schema.js";

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

export const getSchemaTemplate = (adapter: string) => {
  const imports = getSchemaImports(adapter);
  const tableDefinition = getTableDefinition(adapter);

  return `${imports}

export const users = ${tableDefinition};

export const schema = { users };`;
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

export const typeTemplate = `import type { router } from "../lorm.router";

declare module "@lorm/client" {
  interface LormRouterRegistry {
    router: typeof router;
  }
}

export type LormRouter = typeof router;
`;

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

function getAdapterSpecificOptions(adapter: string): string {
  switch (adapter) {
    case "sqlite":
    case "turso":
      return `\n  driver: 'turso', // or 'better-sqlite3' for local SQLite`;
    case "mysql":
    case "planetscale":
      return `\n  tablesFilter: ["!*_temp"], // Exclude temporary tables`;
    case "postgres":
    case "neon":
      return `\n  schemaFilter: ["public"], // Only include public schema`;
    default:
      return "";
  }
}
