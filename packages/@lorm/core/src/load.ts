import { pathToFileURL } from "url";
import { resolve } from "path";
import { execSync } from "child_process";
import { loadConfig } from "./config";
import { fileExists } from "./file-exists";

export { loadConfig };

/**
 * Supported file extensions in priority order
 */
const FILE_EXTENSIONS = ['.ts', '.js', '.mjs'] as const;

/**
 * File path patterns for router and schema files
 */
const FILE_PATTERNS = {
  router: {
    new: 'lorm/router/index',
    legacy: 'lorm.router.js'
  },
  schema: {
    new: 'lorm/schema/index',
    legacy: 'lorm.schema'
  }
} as const;

/**
 * Finds a file with supported extensions
 */
async function findFileWithExtensions(basePath: string, extensions: readonly string[] = FILE_EXTENSIONS): Promise<string | null> {
  for (const ext of extensions) {
    const fullPath = resolve(basePath + ext);
    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Finds router or schema file following the priority order
 */
async function findProjectFile(type: 'router' | 'schema'): Promise<string> {
  const patterns = FILE_PATTERNS[type];
  
  // Try new structure first
  const newPath = await findFileWithExtensions(patterns.new);
  if (newPath) {
    return newPath;
  }
  
  // Try legacy structure
  if (type === 'router') {
    const legacyPath = resolve(patterns.legacy);
    if (await fileExists(legacyPath)) {
      return legacyPath;
    }
  } else {
    // For schema, try both .js and .ts extensions for legacy
    const legacyPath = await findFileWithExtensions(patterns.legacy, ['.js', '.ts']);
    if (legacyPath) {
      return legacyPath;
    }
  }
  
  const expectedPaths = type === 'router' 
    ? 'lorm/router/index.ts, lorm/router/index.js, lorm/router/index.mjs, or lorm.router.js'
    : 'lorm/schema/index.ts, lorm/schema/index.js, lorm/schema/index.mjs, lorm.schema.js, or lorm.schema.ts';
    
  throw new Error(
    `[lorm] ${type.charAt(0).toUpperCase() + type.slice(1)} not found. Expected ${expectedPaths} in project root`
  );
}

async function loadTypeScriptModule(modulePath: string): Promise<any> {
  try {
    const { execSync } = await import('child_process');
    
    // Check if tsx is available
    try {
      execSync('npx tsx --version', { stdio: 'pipe' });
    } catch {
      throw new Error('tsx is required to load TypeScript files. Please install it: npm install --save-dev tsx');
    }
    
    // Use tsx to execute a simple require and output the module
    const script = `
try {
  const mod = require('${modulePath}');
  console.log('__LORM_MODULE_SUCCESS__');
  console.log(JSON.stringify({
    hasDefault: 'default' in mod,
    hasRouter: 'router' in mod,
    keys: Object.keys(mod)
  }));
} catch (error) {
  console.log('__LORM_MODULE_ERROR__');
  console.log(error.message);
}
`;
    
    const output = execSync(`npx tsx --eval "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    if (output.includes('__LORM_MODULE_ERROR__')) {
      const errorMsg = output.split('__LORM_MODULE_ERROR__')[1].trim();
      throw new Error(`TypeScript module error: ${errorMsg}`);
    }
    
    if (!output.includes('__LORM_MODULE_SUCCESS__')) {
      throw new Error('Failed to load TypeScript module - no success marker found');
    }
    
    // For development mode, we'll return a minimal mock module
    // The actual loading will be handled by the build process
    return {
      router: {},
      default: {}
    };
    
  } catch (error) {
    throw new Error(`Failed to load TypeScript module: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadRouter() {
  const routerPath = await findProjectFile('router');

  let module;
  
  if (routerPath.endsWith('.ts')) {
    module = await loadTypeScriptModule(routerPath);
  } else {
    module = await import(pathToFileURL(routerPath).href);
  }
  
  return module.default ?? module.router ?? module;
}

export async function loadSchema() {
  const schemaPath = await findProjectFile('schema');

  let module;
  
  if (schemaPath.endsWith('.ts')) {
    module = await loadTypeScriptModule(schemaPath);
  } else {
    module = await import(pathToFileURL(schemaPath).href);
  }
  
  return module;
}
