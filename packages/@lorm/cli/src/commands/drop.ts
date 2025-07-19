// import { loadConfig } from "@lorm/core";
// import { drizzle } from "drizzle-orm/node-postgres";
// import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
// import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
// import { sql } from "drizzle-orm";
// import { Pool } from "pg";
// import mysql from "mysql2/promise";
// import Database from "better-sqlite3";
// import { confirm } from "@inquirer/prompts";
// import chalk from "chalk";

// interface TableInfo {
//   TABLE_SCHEMA?: string;
//   TABLE_NAME: string;
//   TABLE_TYPE?: string;
//   name?: string; // for SQLite
// }

// export async function drop() {
//   const config = await loadConfig();
//   const dbUrl = config.db.url;

//   // Safety check for non-local databases
//   if (!dbUrl?.includes("127.0.0.1") && 
//       !dbUrl?.includes("localhost") && 
//       !dbUrl?.includes(":memory:") &&
//       !dbUrl?.includes("file:")) {
//     throw new Error("❌ [lorm] Can't clear non-local database for safety reasons");
//   }

//   // Confirm with user
//   const confirmed = await confirm({
//     message: chalk.red("⚠️  This will permanently delete ALL tables and data. Are you sure?"),
//     default: false,
//   });

//   if (!confirmed) {
//     console.log("❌ [lorm] Drop operation cancelled.");
//     return;
//   }

//   console.log("🗑️  [lorm] Dropping all tables...");

//   try {
//     if (config.db.driver === "pg" || config.db.driver === "postgres") {
//       await dropPostgresTables(dbUrl, config.db.schema || "public");
//     } else if (config.db.driver === "mysql" || config.db.driver === "mysql2") {
//       await dropMysqlTables(dbUrl);
//     } else if (config.db.driver === "sqlite" || config.db.driver === "better-sqlite3") {
//       await dropSqliteTables(dbUrl);
//     } else {
//       throw new Error(`❌ [lorm] Unsupported database driver: ${config.db.driver}`);
//     }

//     console.log("✅ [lorm] All tables dropped successfully.");
//   } catch (error) {
//     console.error("❌ [lorm] Error dropping tables:", error);
//     throw error;
//   }
// }

// async function dropPostgresTables(dbUrl: string, schema: string = "public") {
//   const pool = new Pool({ connectionString: dbUrl });
//   const db = drizzle(pool);

//   try {
//     const query = sql<TableInfo>`
//       SELECT table_schema, table_name, table_type 
//       FROM information_schema.tables 
//       WHERE table_type = 'BASE TABLE' 
//         AND table_schema = ${schema}
//     `;

//     const result = await db.execute(query);
//     const tables = result as TableInfo[];

//     if (tables.length === 0) {
//       console.log("ℹ️  [lorm] No tables found to drop.");
//       return;
//     }

//     console.log(`🔍 [lorm] Found ${tables.length} tables to drop.`);

//     // Disable foreign key checks and drop tables
//     await db.transaction(async (tx) => {
//       // Drop tables in reverse dependency order by disabling FK checks
//       await tx.execute(sql`SET session_replication_role = replica`);
      
//       for (const table of tables) {
//         const dropQuery = sql.raw(`DROP TABLE IF EXISTS "${schema}"."${table.TABLE_NAME}" CASCADE`);
//         await tx.execute(dropQuery);
//         console.log(`  ✓ Dropped table: ${table.TABLE_NAME}`);
//       }
      
//       await tx.execute(sql`SET session_replication_role = DEFAULT`);
//     });
//   } finally {
//     await pool.end();
//   }
// }

// async function dropMysqlTables(dbUrl: string) {
//   const connection = await mysql.createConnection(dbUrl);
//   const db = drizzleMysql(connection);

//   try {
//     const [rows] = await connection.execute(
//       "SELECT table_name as TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
//     );
    
//     const tables = rows as TableInfo[];

//     if (tables.length === 0) {
//       console.log("ℹ️  [lorm] No tables found to drop.");
//       return;
//     }

//     console.log(`🔍 [lorm] Found ${tables.length} tables to drop.`);

//     await db.transaction(async (tx) => {
//       // Disable foreign key checks
//       await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
      
//       for (const table of tables) {
//         const dropQuery = sql.raw(`DROP TABLE IF EXISTS \`${table.TABLE_NAME}\``);
//         await tx.execute(dropQuery);
//         console.log(`  ✓ Dropped table: ${table.TABLE_NAME}`);
//       }
      
//       // Re-enable foreign key checks
//       await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
//     });
//   } finally {
//     await connection.end();
//   }
// }

// async function dropSqliteTables(dbUrl: string) {
//   // Extract file path from SQLite URL
//   const dbPath = dbUrl.replace(/^sqlite:/, '').replace(/^file:/, '');
//   const sqlite = new Database(dbPath);
//   const db = drizzleSqlite(sqlite);

//   try {
//     const result = await db.execute(
//       sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
//     );
    
//     const tables = result as { name: string }[];

//     if (tables.length === 0) {
//       console.log("ℹ️  [lorm] No tables found to drop.");
//       return;
//     }

//     console.log(`🔍 [lorm] Found ${tables.length} tables to drop.`);

//     await db.transaction(async (tx) => {
//       // Disable foreign key checks
//       await tx.execute(sql`PRAGMA foreign_keys = OFF`);
      
//       for (const table of tables) {
//         const dropQuery = sql.raw(`DROP TABLE IF EXISTS "${table.name}"`);
//         await tx.execute(dropQuery);
//         console.log(`  ✓ Dropped table: ${table.name}`);
//       }
      
//       // Re-enable foreign key checks
//       await tx.execute(sql`PRAGMA foreign_keys = ON`);
//     });
//   } finally {
//     sqlite.close();
//   }
// }