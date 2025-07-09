import { z } from "zod";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { fileExists, lormConfig, configSchema } from "@lorm/lib";

let cached: lormConfig | null = null;
let tsxRegistered = false;

async function ensureTsxRegistered() {
  if (!tsxRegistered) {
    const { register } = await import('tsx/esm/api');
    register();
    tsxRegistered = true;
  }
}

export const defineConfig = (config: lormConfig): lormConfig => config;

export async function loadConfig(): Promise<lormConfig> {
  if (cached) return cached;

  const configPath = resolve("lorm.config.ts");

  if (!(await fileExists(configPath))) {
    throw new Error("[lorm] lorm.config.ts not found in project root");
  }

  try {
    // Ensure tsx is registered once
    if (configPath.endsWith('.ts')) {
      await ensureTsxRegistered();
    }
    
    const configModule = await import(pathToFileURL(configPath).href);
    console.log("[lorm] Loading config from lorm.config.ts", configModule);
    cached = configSchema.parse(configModule.default);
    return cached;
  } catch (e) {
    throw new Error("[lorm] Invalid lorm.config.ts format");
  }
}
