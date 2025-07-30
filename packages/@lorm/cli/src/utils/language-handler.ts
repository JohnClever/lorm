import path from "path";
import { FileUtils } from "./file-utils";

/**
 * Supported file extensions for different languages
 */
export const FILE_EXTENSIONS = {
  typescript: '.ts',
  javascript: '.js',
  module: '.mjs'
} as const;

/**
 * Language detection result
 */
export interface LanguageInfo {
  isTypeScript: boolean;
  preferredExtension: string;
  configExtension: string;
}

/**
 * File path configuration for different project structures
 */
export interface FilePathConfig {
  config: string;
  router: string;
  schema: string;
}

/**
 * Centralized language detection and file handling utility
 */
export class LanguageHandler {
  private static _instance: LanguageHandler;
  private _languageInfo: LanguageInfo | null = null;

  private constructor() {}

  static getInstance(): LanguageHandler {
    if (!LanguageHandler._instance) {
      LanguageHandler._instance = new LanguageHandler();
    }
    return LanguageHandler._instance;
  }

  /**
   * Detects if the project uses TypeScript by checking for tsconfig.json
   */
  async detectLanguage(): Promise<LanguageInfo> {
    if (this._languageInfo) {
      return this._languageInfo;
    }

    const rootDir = process.cwd();
    const tsconfigPath = path.join(rootDir, "tsconfig.json");
    
    try {
      const exists = await FileUtils.existsAsync(tsconfigPath);
      const isTypeScript = exists;
      
      this._languageInfo = {
        isTypeScript,
        preferredExtension: isTypeScript ? FILE_EXTENSIONS.typescript : FILE_EXTENSIONS.module,
        configExtension: isTypeScript ? FILE_EXTENSIONS.typescript : FILE_EXTENSIONS.module
      };

      if (isTypeScript) {
        console.log("✅ [lorm] TypeScript detected (tsconfig.json found)");
      } else {
        console.log("ℹ️ [lorm] JavaScript project detected (no tsconfig.json)");
      }

      return this._languageInfo;
    } catch (error) {
      console.log("ℹ️ [lorm] Defaulting to JavaScript (unable to detect TypeScript)");
      
      this._languageInfo = {
        isTypeScript: false,
        preferredExtension: FILE_EXTENSIONS.module,
        configExtension: FILE_EXTENSIONS.module
      };
      
      return this._languageInfo;
    }
  }

  /**
   * Gets file paths for the current language configuration
   */
  async getFilePaths(): Promise<FilePathConfig> {
    const languageInfo = await this.detectLanguage();
    
    return {
      config: `lorm.config${languageInfo.configExtension}`,
      router: `lorm/router/index${languageInfo.preferredExtension}`,
      schema: `lorm/schema/index${languageInfo.preferredExtension}`
    };
  }

  /**
   * Finds existing schema file in the project
   */
  async findSchemaFile(): Promise<string> {
    const rootDir = process.cwd();
    
    // Priority order for schema file detection
    const schemaPaths = [
      path.join(rootDir, "lorm/schema/index.ts"),
      path.join(rootDir, "lorm/schema/index.js"),
      path.join(rootDir, "lorm/schema/index.mjs"),
      path.join(rootDir, "lorm.schema.ts"),
      path.join(rootDir, "lorm.schema.js")
    ];

    for (const schemaPath of schemaPaths) {
      try {
        await FileUtils.access(schemaPath);
        
        // Log appropriate message based on file structure
        if (schemaPath.includes("lorm/schema/index")) {
          const fileType = schemaPath.endsWith('.ts') ? 'TypeScript' : 'JavaScript';
          console.log(`✅ [lorm] Schema file found (${fileType} structure)`);
        } else {
          const fileType = schemaPath.endsWith('.ts') ? 'TypeScript' : 'JavaScript';
          console.log(`✅ [lorm] Schema file found (legacy ${fileType})`);
          console.log("💡 [lorm] Consider migrating to new structure: lorm/schema/index.ts");
        }
        
        return schemaPath;
      } catch {
        // Continue to next path
      }
    }

    throw new Error(
      "[lorm] Schema file not found. Expected lorm/schema/index.ts, lorm/schema/index.js, lorm/schema/index.mjs, lorm.schema.js, or lorm.schema.ts.\n" +
      "Please create a schema file or run 'npx @lorm/cli init' first."
    );
  }

  /**
   * Finds existing router file in the project
   */
  async findRouterFile(): Promise<string> {
    const rootDir = process.cwd();
    
    // Priority order for router file detection
    const routerPaths = [
      path.join(rootDir, "lorm/router/index.ts"),
      path.join(rootDir, "lorm/router/index.js"),
      path.join(rootDir, "lorm/router/index.mjs"),
      path.join(rootDir, "lorm.router.js")
    ];

    for (const routerPath of routerPaths) {
      try {
        await FileUtils.access(routerPath);
        return routerPath;
      } catch {
        // Continue to next path
      }
    }

    throw new Error(
      "[lorm] Router not found. Expected lorm/router/index.ts, lorm/router/index.js, lorm/router/index.mjs, or lorm.router.js in project root"
    );
  }

  /**
   * Generates relative import path from one file to another
   */
  generateRelativeImport(fromPath: string, toPath: string): string {
    const relativePath = path.relative(path.dirname(fromPath), toPath)
      .replace(/\.ts$/, "")
      .replace(/\.js$/, "")
      .replace(/\.mjs$/, "")
      .replace(/\\/g, "/");
    
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  }

  /**
   * Determines if a file path is TypeScript
   */
  isTypeScriptFile(filePath: string): boolean {
    return filePath.endsWith('.ts');
  }

  /**
   * Determines if a file path is a module file
   */
  isModuleFile(filePath: string): boolean {
    return filePath.endsWith('.mjs');
  }

  /**
   * Gets the appropriate file extension for the current project
   */
  async getFileExtension(): Promise<string> {
    const languageInfo = await this.detectLanguage();
    return languageInfo.preferredExtension;
  }

  /**
   * Resets the cached language info (useful for testing)
   */
  reset(): void {
    this._languageInfo = null;
  }
}

/**
 * Convenience function to get the singleton instance
 */
export const languageHandler = LanguageHandler.getInstance();

/**
 * Legacy compatibility functions
 */
export async function detectTypeScript(): Promise<boolean> {
  const languageInfo = await languageHandler.detectLanguage();
  return languageInfo.isTypeScript;
}

export async function validateSchemaFile(): Promise<string> {
  return await languageHandler.findSchemaFile();
}