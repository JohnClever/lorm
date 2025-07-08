import { z } from "zod";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { fileExists, lormConfig, configSchema } from "@lorm/lib";

let cached: lormConfig | null = null;

export const defineConfig = (config: lormConfig): lormConfig => config;

export async function loadConfig(): Promise<lormConfig> {
  if (cached) return cached;

  const configPath = resolve("lorm.config.ts");

  if (!(await fileExists(configPath))) {
    throw new Error("[lorm] lorm.config.ts not found in project root");
  }

  try {
    const configModule = await import(pathToFileURL(configPath).href);
    cached = configSchema.parse(configModule.default);
    return cached;
  } catch (e) {
    throw new Error("[lorm] Invalid lorm.config.ts format");
  }
}
