import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import { loadConfig } from "@lorm/core";
import which from "which";
import { drizzleConfigTemplate } from "@lorm/lib";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDrizzleKitBin(): string {
  try {
    const drizzleKitPath = require.resolve("drizzle-kit/bin.js");
    return drizzleKitPath;
  } catch {
    try {
      const globalBin = which.sync("drizzle-kit", { nothrow: true });
      if (globalBin) return globalBin;
    } catch {}
    
    throw new Error(
      "[lorm] drizzle-kit not found. Please install it:\n" +
      "  - Globally: npm install -g drizzle-kit\n" +
      "  - In project: npm install drizzle-kit"
    );
  }
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
