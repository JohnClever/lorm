import { pathToFileURL } from "url";
import { resolve } from "path";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { loadConfig } from "./config.js";
import { fileExists } from "./file-exists.js";

export { loadConfig };

async function loadTypeScriptModule(filePath: string): Promise<any> {
  // Use tsx to execute TypeScript files directly
  try {
    const result = execSync(`npx tsx "${filePath}"`, { 
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // For now, we'll use a simpler approach - just try to import the file directly
    // This assumes the user has tsx installed and configured properly
    const module = await import(pathToFileURL(filePath).href);
    return module;
  } catch (error) {
    throw new Error(`Failed to load TypeScript module: ${filePath}. Please ensure tsx is installed: npm install --save-dev tsx. Error: ${error}`);
  }
}

export async function loadRouter() {
  const routerPaths = [
    resolve("lorm/router/index.js"),
    resolve("lorm/router/index.ts"),
    resolve("lorm/router/index.mjs")
  ];

  for (const routerPath of routerPaths) {
    if (await fileExists(routerPath)) {
      let module;
      if (routerPath.endsWith('.ts')) {
        module = await loadTypeScriptModule(routerPath);
      } else {
        module = await import(pathToFileURL(routerPath).href);
      }
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
      let module;
      if (schemaPath.endsWith('.ts')) {
        module = await loadTypeScriptModule(schemaPath);
      } else {
        module = await import(pathToFileURL(schemaPath).href);
      }
      return module;
    }
  }

  throw new Error("[lorm] Schema not found. Expected lorm/schema/index.{js,ts,mjs} in project root");
}
