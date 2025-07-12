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

export const schemaTemplate = `import { pgTable, uuid, varchar } from "@lorm/schema";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 })
});

export const schema = { users };`;

export const configTemplate = `export default {
  db: {
    url: "your_neon_database_url_here"
  }
};`;

export const typeTemplate = `import type { router } from "../lorm.router";

declare module "@lorm/client" {
  interface LormRouterRegistry {
    router: typeof router;
  }
}

export type LormRouter = typeof router;
`;

export const drizzleConfigTemplate = (
  config: lormConfig
) => `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: './drizzle',
  schema: './schema.js',
  dialect: 'postgresql',
  dbCredentials: {
    url: "${config.db.url}",
  },
});`;
