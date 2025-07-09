import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import { loadConfig } from "@lorm/core";
import { pathToFileURL } from "url";
import which from "which";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 🔍 Resolve drizzle-kit binary
function resolveDrizzleKitBin(): string {
  // 1. Check for local .bin
  const localBin = path.resolve(
    __dirname,
    "../../node_modules/.bin/drizzle-kit"
  );
  if (fssync.existsSync(localBin)) return localBin;

  // 2. Fallback to global binary
  const globalBin = which.sync("drizzle-kit", { nothrow: true });
  if (globalBin) return globalBin;

  // ❌ Neither found
  throw new Error(
    "[lorm] drizzle-kit not found. Please make sure it’s installed in @lorm/cli."
  );
}

export async function push() {
  const rootDir = process.cwd();
  const lormDir = path.join(rootDir, ".lorm");
  const drizzleConfigPath = path.join(lormDir, "drizzle.config.js");
  const schemaTargetPath = path.join(lormDir, "schema.js");

  // 1. Load config (get db url from lorm.config.js)
  const config = await loadConfig();

  // 2. Ensure .lorm directory exists
  await fs.mkdir(lormDir, { recursive: true });

  // 3. Generate schema.js in .lorm that re-exports user schema
  const schemaImport = `export * from "${path
    .join(rootDir, "lorm.schema")
    .replace(/\\/g, "/")}";`;
  await fs.writeFile(schemaTargetPath, schemaImport);

  // 4. Write drizzle.config.js
  const drizzleConfig = `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: './drizzle',
  schema: './schema.js',
  dialect: 'postgresql',
  dbCredentials: {
    url: "${config.db.url}",
  },
});`;
  await fs.writeFile(drizzleConfigPath, drizzleConfig);

  // 5. Resolve drizzle-kit binary
  const drizzleKitBin = resolveDrizzleKitBin();

  // 6. Execute drizzle-kit push
  await execa(drizzleKitBin, ["push"], {
    cwd: lormDir,
    stdio: "inherit",
  });

  console.log("✅ [lorm] Schema pushed to database.");
}
