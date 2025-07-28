import type { lormConfig } from "@lorm/lib";

export async function createDatabase(config: lormConfig, schema: any): Promise<any> {
  const { url, adapter = "neon", options = {} } = config.db;

  switch (adapter) {
    case "neon": {
      const { drizzle } = await import("drizzle-orm/neon-http");
      const { neon } = await import("@neondatabase/serverless");
      return drizzle(neon(url), { schema, ...options });
    }
    
    case "postgres": {
      const { drizzle: drizzlePg } = await import("drizzle-orm/postgres-js");
      const postgres = (await import("postgres")).default;
      const client = postgres(url, options);
      return drizzlePg(client, { schema });
    }
    
    case "mysql": {
      const { drizzle: drizzleMysql } = await import("drizzle-orm/mysql2");
      const mysql = await import("mysql2/promise");
      const connection = await mysql.createConnection(url);
      return drizzleMysql(connection, { schema, mode: "default", ...options });
    }
    
    case "sqlite": {
      const { drizzle: drizzleSqlite } = await import("drizzle-orm/better-sqlite3");
      const Database = (await import("better-sqlite3")).default;
      const sqlite = new Database(url);
      return drizzleSqlite(sqlite, { schema, ...options });
    }
    
    case "planetscale": {
      const { drizzle: drizzlePlanetscale } = await import("drizzle-orm/planetscale-serverless");
      const { Client } = await import("@planetscale/database");
      const client = new Client({ url, ...options });
      return drizzlePlanetscale(client, { schema });
    }
    
    case "turso": {
      const { drizzle: drizzleTurso } = await import("drizzle-orm/libsql");
      const { createClient } = await import("@libsql/client");
      const client = createClient({ url, ...options });
      return drizzleTurso(client, { schema });
    }
    
    default:
      throw new Error(`Unsupported database adapter: ${adapter}`);
  }
}