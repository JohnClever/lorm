import { pathToFileURL } from "url";
import { resolve } from "path";
import { loadConfig } from "./config";
import { fileExists } from "./file-exists";

export { loadConfig };

export async function loadRouter() {
  const routerPath = resolve("lorm.router.js");

  if (!(await fileExists(routerPath))) {
    throw new Error("[lorm] lorm.router.js not found in project root");
  }

  const module = await import(pathToFileURL(routerPath).href);
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
