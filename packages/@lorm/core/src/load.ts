import { pathToFileURL } from "url";
import { resolve } from "path";
import { loadConfig } from "./config.js";
import { fileExists } from "./file-exists.js";

export { loadConfig };

export async function loadRouter() {
  const routerPaths = [
    resolve("lorm/router/index.js"),
    resolve("lorm/router/index.ts"),
    resolve("lorm/router/index.mjs")
  ];

  for (const routerPath of routerPaths) {
    if (await fileExists(routerPath)) {
      const module = await import(pathToFileURL(routerPath).href);
      return module.default ?? module.router ?? module;
    }
  }

  throw new Error("[lorm] Router not found. Expected lorm/router/index.{js,ts,mjs} in project root");
}

export async function loadSchema() {
  const schemaPaths = [
    resolve("lorm/schema/index.js"),
    resolve("lorm/schema/index.ts"),
    resolve("lorm/schema/index.mjs")
  ];

  for (const schemaPath of schemaPaths) {
    if (await fileExists(schemaPath)) {
      const module = await import(pathToFileURL(schemaPath).href);
      return module;
    }
  }

  throw new Error("[lorm] Schema not found. Expected lorm/schema/index.{js,ts,mjs} in project root");
}
