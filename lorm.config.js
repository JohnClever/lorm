import { defineConfig } from "@lorm/core";

export default defineConfig({
  db: {
    url: "postgresql://username:password@localhost:5432/database",
    adapter: "postgres",
    options: {
  schemaFilter: ["public"], // Only include public schema
    }
  }
});