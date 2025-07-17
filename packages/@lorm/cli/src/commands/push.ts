import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { execa } from "execa";
import { loadConfig } from "@lorm/core";
import which from "which";
import { drizzleConfigTemplate } from "@lorm/lib";

// Cross-platform __dirname equivalent
function getCurrentDir(): string {
  try {
    // Try ES module approach first
    return path.dirname(new URL(import.meta.url).pathname);
  } catch {
    // Fallback to process.cwd() or relative resolution
    return path.resolve(__dirname || process.cwd());
  }
}

const currentDir = getCurrentDir();

function resolveDrizzleKitBin(): string {
  const localBin = path.resolve(
    currentDir,
    "../../node_modules/.bin/drizzle-kit"
  );
  if (fssync.existsSync(localBin)) return localBin;

  const globalBin = which.sync("drizzle-kit", { nothrow: true });
  if (globalBin) return globalBin;

  throw new Error(
    "[lorm] drizzle-kit not found. Please make sure it’s installed in @lorm/cli."
  );
}

export async function push() {
  const rootDir = process.cwd();
  const lormDir = path.join(rootDir, ".lorm");
  const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
  const schemaTargetPath = path.join(lormDir, "schema.js");

  const config = await loadConfig();

  await fs.mkdir(lormDir, { recursive: true });

  const schemaImport = `export * from "${path
    .join(rootDir, "lorm.schema")
    .replace(/\\/g, "/")}";`;
  await fs.writeFile(schemaTargetPath, schemaImport);

  await fs.writeFile(drizzleConfigPath, drizzleConfigTemplate(config));

  const drizzleKitBin = resolveDrizzleKitBin();

  await execa(drizzleKitBin, ["push"], {
    cwd: lormDir,
    stdio: "inherit",
  });

  console.log("✅ [lorm] Schema pushed to database.");
}
