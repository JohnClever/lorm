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
    // First try to use tsx if available
    try {
      const result = execSync(`npx tsx -e "import config from '${configPath}'; console.log(JSON.stringify(config));"`, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const configData = JSON.parse(result.trim());
      return { default: configData };
    } catch (tsxError) {
      // If tsx fails, try to compile and run with node using a simpler approach
      const tempJsPath = configPath.replace('.ts', '.temp.mjs');
      
      try {
        const { readFileSync } = await import('fs');
        // Simple TypeScript to JavaScript conversion for config files
        const tsContent = readFileSync(configPath, 'utf8');
        
        // Create a simple defineConfig function and convert the config
        const jsContent = `
// Simple defineConfig implementation
const defineConfig = (config) => config;

${tsContent
  .replace(/import\s+{[^}]+}\s+from\s+["'][^"']+["'];?/g, '') // Remove imports
  .replace(/export\s+default\s+/, 'export default ')}
`;
        
        writeFileSync(tempJsPath, jsContent);
        
        // Import the module
        const configModule = await import(pathToFileURL(tempJsPath).href);
        
        // Clean up temp file
        unlinkSync(tempJsPath);
        
        return configModule;
      } catch (fallbackError) {
        // Clean up temp file if it exists
        try {
          unlinkSync(tempJsPath);
        } catch {}
        
        throw new Error(`Failed to load TypeScript config. Please install tsx: npm install --save-dev tsx`);
      }
    }
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
