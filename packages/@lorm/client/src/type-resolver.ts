import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import type { LoadedLormTypes } from "./types.js";

let setupCache: {
  result: {
    hasRouter: boolean;
    hasTypes: boolean;
    hasLormDir: boolean;
    routerPath: string;
  } | null;
  timestamp: number;
} = { result: null, timestamp: 0 };

let typesCache: {
  types: LoadedLormTypes | null;
  timestamp: number;
  typesPath: string | null;
} = { types: null, timestamp: 0, typesPath: null };

const CACHE_TTL = 5000;
const TYPES_CACHE_TTL = 30000;
const DEBUG = process.env.LORM_DEBUG === "true";
const CACHE_FILE = join(process.cwd(), ".lorm", ".cache.json");

function debug(message: string, ...args: any[]) {
}

function loadPersistentCache(): void {
  try {
    if (existsSync(CACHE_FILE)) {
      const cacheData = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
      if (
        cacheData.typesCache &&
        Date.now() - cacheData.timestamp < TYPES_CACHE_TTL
      ) {
        typesCache = cacheData.typesCache;
        debug("Loaded persistent cache from disk");
      }
    }
  } catch (error) {
    debug("Failed to load persistent cache:", error);
  }
}

function savePersistentCache(): void {
  try {
    const lormDir = dirname(CACHE_FILE);
    if (existsSync(lormDir)) {
      const cacheData = {
        typesCache,
        timestamp: Date.now(),
      };
      writeFileSync(CACHE_FILE, JSON.stringify(cacheData), "utf-8");
      debug("Saved persistent cache to disk");
    }
  } catch (error) {
    debug("Failed to save persistent cache:", error);
  }
}

export function findLormTypesPath(): string | null {
  let currentDir = process.cwd();
  const root = resolve("/");

  while (currentDir !== root) {
    const lormDir = join(currentDir, ".lorm");
    const typesFile = join(lormDir, "types.d.ts");

    if (existsSync(typesFile)) {
      return typesFile;
    }

    currentDir = dirname(currentDir);
  }

  return null;
}

export function checkProjectSetup(): {
  hasRouter: boolean;
  hasTypes: boolean;
  hasLormDir: boolean;
  routerPath: string;
} {
  const now = Date.now();

  if (setupCache.result && now - setupCache.timestamp < CACHE_TTL) {
    debug("Using cached project setup result");
    return setupCache.result;
  }

  debug("Checking project setup...");

  const routerPath = resolve("lorm.router.js");
  const lormDir = resolve(".lorm");
  const typesPath = findLormTypesPath();

  const result = {
    hasRouter: existsSync(routerPath),
    hasTypes: !!typesPath,
    hasLormDir: existsSync(lormDir),
    routerPath,
  };

  setupCache = { result, timestamp: now };

  debug("Project setup check complete:", result);
  return result;
}

export async function loadLormTypes(): Promise<LoadedLormTypes> {
  const typesPath = findLormTypesPath();
  const now = Date.now();

  if (typesCache.timestamp === 0) {
    loadPersistentCache();
  }

  if (
    typesCache.types &&
    typesCache.typesPath === typesPath &&
    now - typesCache.timestamp < TYPES_CACHE_TTL
  ) {
    debug("Using cached types");
    return typesCache.types;
  }

  if (!typesPath) {
    debug("No types file found");
    const emptyTypes: LoadedLormTypes = {};
    typesCache = { types: emptyTypes, timestamp: now, typesPath: null };
    return emptyTypes;
  }

  debug("Loading types from:", typesPath);

  try {
    if (typeof require !== "undefined" && require.cache) {
      delete require.cache[typesPath];
    }

    const types = await import(`${typesPath}?t=${now}`);
    const result: LoadedLormTypes =
      types.TypedLormRouter || types.LormRouter || types.default || {};

    if (!result || Object.keys(result).length === 0) {
      console.warn(
        "[lorm] Types file found but no valid router types exported. Expected TypedLormRouter, LormRouter, or default export."
      );
      const emptyTypes: LoadedLormTypes = {};
      typesCache = { types: emptyTypes, timestamp: now, typesPath };
      savePersistentCache();
      return emptyTypes;
    }

    typesCache = { types: result, timestamp: now, typesPath };
    savePersistentCache();

    debug("Successfully loaded and cached types");
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[lorm] Failed to load types from .lorm directory:", {
      path: typesPath,
      message: errorMessage,
      stack: DEBUG && error instanceof Error ? error.stack : undefined,
    });

    const emptyTypes: LoadedLormTypes = {};
    typesCache = { types: emptyTypes, timestamp: now, typesPath };
    return emptyTypes;
  }
}