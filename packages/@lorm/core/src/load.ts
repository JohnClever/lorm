import { pathToFileURL } from "url";
import { resolve } from "path";
import { loadConfig } from "./config.js";
import { fileExists } from "@lorm/lib";

// Register tsx once at module level
let tsxRegistered = false;
async function ensureTsxRegistered() {
  if (!tsxRegistered) {
    const { register } = await import('tsx/esm/api');
    register();
    tsxRegistered = true;
  }
}

export { loadConfig };

export async function loadProcedures() {
  const proceduresPath = resolve("lorm.procedures.ts");

  if (!(await fileExists(proceduresPath))) {
    throw new Error("[lorm] lorm.procedures.ts not found in project root");
  }

  // Ensure tsx is registered once
  if (proceduresPath.endsWith('.ts')) {
    await ensureTsxRegistered();
  }

  const module = await import(pathToFileURL(proceduresPath).href);
  return module.default ?? module.router ?? module;
}

export async function loadSchema() {
  const schemaPath = resolve("lorm.schema.ts");

  if (!(await fileExists(schemaPath))) {
    throw new Error("[lorm] lorm.schema.ts not found in project root");
  }

  // Ensure tsx is registered once
  if (schemaPath.endsWith('.ts')) {
    await ensureTsxRegistered();
  }

  const module = await import(pathToFileURL(schemaPath).href);
  return module;
}
