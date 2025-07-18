import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import { loadConfig } from "@lorm/core";
import which from "which";
import { drizzleConfigTemplate } from "@lorm/lib";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDrizzleKitBin(): string {
  const localBin = path.resolve(
    __dirname,
    "../../node_modules/.bin/drizzle-kit"
  );
  if (fssync.existsSync(localBin)) return localBin;

  const globalBin = which.sync("drizzle-kit", { nothrow: true });
  if (globalBin) return globalBin;

  throw new Error(
    "[lorm] drizzle-kit not found. Please make sure it’s installed in @lorm/cli."
  );
}

export interface PushOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

export async function push(options: PushOptions = {}) {
  const { verbose = false, dryRun = false } = options;
  const rootDir = process.cwd();
  const lormDir = path.join(rootDir, ".lorm");
  const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
  const schemaTargetPath = path.join(lormDir, "schema.js");
  const schemaSourcePath = path.join(rootDir, "lorm.schema.js");

  try {
    // Validate required files exist
    if (!fssync.existsSync(schemaSourcePath)) {
      throw new Error(
        `Schema file not found: ${schemaSourcePath}\n💡 Did you forget to run 'lorm init'?`
      );
    }

    if (verbose) {
      console.log(`[lorm] Loading config from ${rootDir}`);
    }

    const config = await loadConfig();

    if (verbose) {
      console.log(`[lorm] Creating .lorm directory: ${lormDir}`);
    }

    await fs.mkdir(lormDir, { recursive: true });

    const schemaImport = `export * from "${path
      .join(rootDir, "lorm.schema")
      .replace(/\\/g, "/")}";`;

    if (verbose) {
      console.log(`[lorm] Writing schema import: ${schemaTargetPath}`);
    }

    await fs.writeFile(schemaTargetPath, schemaImport);

    if (verbose) {
      console.log(`[lorm] Writing drizzle config: ${drizzleConfigPath}`);
    }

    await fs.writeFile(drizzleConfigPath, drizzleConfigTemplate(config));

    if (dryRun) {
      console.log("🔍 [lorm] Dry run - would execute:");
      console.log(`  drizzle-kit push (in ${lormDir})`);
      console.log("✅ [lorm] Dry run completed.");
      return;
    }

    const drizzleKitBin = resolveDrizzleKitBin();

    if (verbose) {
      console.log(`[lorm] Executing: ${drizzleKitBin} push`);
    }

    await execa(drizzleKitBin, ["push"], {
      cwd: lormDir,
      stdio: "inherit",
    });

    console.log("✅ [lorm] Schema pushed to database.");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to push schema: ${error.message}`);
    }
    throw error;
  }
}
