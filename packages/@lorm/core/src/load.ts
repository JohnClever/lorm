import { pathToFileURL } from "url";
import { resolve } from "path";
import { loadConfig } from "./config.js";
import { fileExists } from "@lorm/lib";

export { loadConfig };

export async function loadProcedures() {
  const proceduresPath = resolve("lorm.procedures.js");

  if (!(await fileExists(proceduresPath))) {
    throw new Error("[lorm] lorm.procedures.js not found in project root");
  }

  const module = await import(pathToFileURL(proceduresPath).href);
  return module.default ?? module.router ?? module;
}

export async function loadSchema() {
  const schemaPath = resolve("lorm.schema.js");

  if (!(await fileExists(schemaPath))) {
    throw new Error("[lorm] lorm.schema.js not found in project root");
  }

  const module = await import(pathToFileURL(schemaPath).href);
  return module;
}
