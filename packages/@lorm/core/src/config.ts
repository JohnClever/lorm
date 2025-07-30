import { resolve } from "path";
import { pathToFileURL } from "url";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { fileExists } from "./file-exists";
import { configSchema } from "./types";
import type { lormConfig } from "./types";

let cached: lormConfig | null = null;

export const defineConfig = (config: lormConfig): lormConfig => config;

async function loadTypeScriptConfig(configPath: string): Promise<any> {
  try {
    // Use tsx directly with -e flag to evaluate the import
    const result = execSync(`npx tsx -e "import config from '${configPath}'; console.log(JSON.stringify(config));"`, { 
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const configData = JSON.parse(result.trim());
    return { default: configData };
  } catch (error) {
    throw new Error(`Failed to load TypeScript config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadConfig(): Promise<lormConfig> {
  if (cached) return cached;

  // Try TypeScript config first, then JavaScript, then ES modules
  const configTsPath = resolve("lorm.config.ts");
  const configJsPath = resolve("lorm.config.js");
  const configMjsPath = resolve("lorm.config.mjs");

  let configPath: string;
  let isTypeScript = false;
  
  if (await fileExists(configTsPath)) {
    configPath = configTsPath;
    isTypeScript = true;
  } else if (await fileExists(configJsPath)) {
    configPath = configJsPath;
  } else if (await fileExists(configMjsPath)) {
    configPath = configMjsPath;
  } else {
    throw new Error("[lorm] lorm.config.js, lorm.config.mjs, or lorm.config.ts not found in project root");
  }

  try {
    let configModule;
    
    if (isTypeScript) {
      configModule = await loadTypeScriptConfig(configPath);
    } else {
      configModule = await import(pathToFileURL(configPath).href);
    }
    
    cached = configSchema.parse(configModule.default);
    return cached;
  } catch (e) {
    console.error("[lorm] Config error:", e);
    const configType = configPath.endsWith('.ts') ? 'lorm.config.ts' : configPath.endsWith('.mjs') ? 'lorm.config.mjs' : 'lorm.config.js';
    throw new Error(`[lorm] Invalid ${configType} format`);
  }
}
