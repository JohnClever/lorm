import fs from "fs/promises";
import path from "path";
import {

  initializeCommand,
  handleCommandError,
} from "../../utils/index";
import { executeDrizzleKit } from "../../utils/index";

async function validateMigrations(migrationsDir: string): Promise<void> {
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql"));

    if (migrationFiles.length === 0) {
      console.warn(
        "⚠️ [lorm] No migration files found.\n" +
          "Run 'lorm generate' first to create migration files."
      );
    } else {
      console.log(`📄 [lorm] Found ${migrationFiles.length} migration file(s)`);
    }
  } catch {
    console.warn(
      "⚠️ [lorm] Migrations directory not found.\n" +
        "Run 'lorm generate' first to create migration files."
    );
  }
}

export async function migrate(): Promise<void> {
  try {
    const { lormDir } = await initializeCommand("database migration");

    const migrationsDir = path.join(lormDir, "migrations");
    await validateMigrations(migrationsDir);

    await executeDrizzleKit(
      "migrate",
      lormDir,
      "Database migrations applied successfully!"
    );
  } catch (error) {
    handleCommandError(error, "Migration");
  }
}
