import { pathToFileURL } from "url";
import { resolve } from "path";
import { loadConfig } from "./config.js";
import { fileExists } from "@lorm/lib";

export { loadConfig };

export async function loadRouters() {
  const routersPath = resolve("lorm.routers.js");

  if (!(await fileExists(routersPath))) {
    throw new Error("[lorm] lorm.routers.js not found in project root");
  }

  const module = await import(pathToFileURL(routersPath).href);
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
