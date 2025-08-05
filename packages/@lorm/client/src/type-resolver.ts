import { existsSync } from "fs";
import { resolve, dirname, join } from "path";
import type { LoadedLormTypes } from "./types";

export function findLormTypesPath(): string | null {
  // Check for new TypeScript structure first
  const newTypesFile = join(process.cwd(), "lorm", "types", "index.d.ts");
  if (existsSync(newTypesFile)) {
    return newTypesFile;
  }
  
  // Fallback to legacy structure
  const legacyTypesFile = join(process.cwd(), ".lorm", "types.d.ts");
  if (existsSync(legacyTypesFile)) {
    return legacyTypesFile;
  }

  return null;
}

export function checkProjectSetup(): {
  hasRouter: boolean;
  hasTypes: boolean;
  hasLormDir: boolean;
  routerPath: string;
} {
  // Check for new TypeScript structure first
  const newRouterPath = resolve("lorm/router/index.ts");
  const newRouterPathJs = resolve("lorm/router/index.js");
  
  // Fallback to legacy JavaScript structure
  const legacyRouterPath = resolve("lorm.router.js");
  
  let routerPath = legacyRouterPath;
  let hasRouter = false;
  
  if (existsSync(newRouterPath)) {
    routerPath = newRouterPath;
    hasRouter = true;
  } else if (existsSync(newRouterPathJs)) {
    routerPath = newRouterPathJs;
    hasRouter = true;
  } else if (existsSync(legacyRouterPath)) {
    hasRouter = true;
  }
  
  const lormDir = resolve(".lorm");
  const typesPath = findLormTypesPath();

  return {
    hasRouter,
    hasTypes: !!typesPath,
    hasLormDir: existsSync(lormDir),
    routerPath,
  };
}

export async function loadLormTypes(): Promise<LoadedLormTypes> {
  const typesPath = findLormTypesPath();

  if (!typesPath) {
    return {};
  }

  try {
    const types = await import(typesPath);
    const result: LoadedLormTypes =
      types.TypedLormRouter || types.LormRouter || types.default || {};

    return result;
  } catch (error) {
    return {};
  }
}

export async function getRouterPath(): Promise<string | null> {
  // Try new TypeScript structure first
  const newRouterPath = resolve("lorm/router/index.ts");
  const newRouterPathJs = resolve("lorm/router/index.js");
  
  // Fallback to legacy JavaScript structure
  const legacyRouterPath = resolve("lorm.router.js");
  
  if (existsSync(newRouterPath)) {
    return newRouterPath;
  } else if (existsSync(newRouterPathJs)) {
    return newRouterPathJs;
  } else if (existsSync(legacyRouterPath)) {
    return legacyRouterPath;
  }
  
  return null;
}

export async function getSchemaPath(): Promise<string | null> {
  // Try new TypeScript structure first
  const newSchemaPath = resolve("lorm/schema/index.ts");
  const newSchemaPathJs = resolve("lorm/schema/index.js");
  
  // Fallback to legacy JavaScript structure
  const legacySchemaPath = resolve("lorm.schema.js");
  
  if (existsSync(newSchemaPath)) {
    return newSchemaPath;
  } else if (existsSync(newSchemaPathJs)) {
    return newSchemaPathJs;
  } else if (existsSync(legacySchemaPath)) {
    return legacySchemaPath;
  }
  
  return null;
}