import { resolve } from "path";
import { pathToFileURL } from "url";
import { fileExists, lormConfig, configSchema } from "@lorm/lib";

let cached: lormConfig | null = null;

export const defineConfig = (config: lormConfig): lormConfig => config;

export async function loadConfig(): Promise<lormConfig> {
  if (cached) return cached;

  const configPath = resolve("lorm.config.js");

  if (!(await fileExists(configPath))) {
    throw new Error("[lorm] lorm.config.js not found in project root");
  }

  try {
    if (configPath.endsWith(".js")) {
      const { register } = await import("tsx/esm/api");
      register();
    }

    const configModule = await import(pathToFileURL(configPath).href);
    console.log("[lorm] Loading config from lorm.config.js", configModule);
    cached = configSchema.parse(configModule.default);
    return cached;
  } catch (e) {
    console.error("[lorm] Config error:", e);
    throw new Error("[lorm] Invalid lorm.config.js format");
  }
}
