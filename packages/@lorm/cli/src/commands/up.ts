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
    "[lorm] drizzle-kit not found. Please make sure it's installed in @lorm/cli."
  );
}

export async function up() {
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

  await execa(drizzleKitBin, ["up"], {
    cwd: lormDir,
    stdio: "inherit",
  });

  console.log("✅ [lorm] Schema upgrade completed.");
}