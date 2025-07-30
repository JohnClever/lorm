import path from "path";
import chokidar from "chokidar";
import { typeTemplate, typeTsTemplate, basicTypes } from "@/templates";
import { FileUtils } from "@/utils/file-utils";
import { languageHandler } from "@/utils/language-handler";

const routerDir = path.resolve("lorm/router");
const schemaDir = path.resolve("lorm/schema");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");
const legacyRouterPath = path.resolve("lorm.router.js");

export async function generateTypeFile(): Promise<void> {
  try {
    await FileUtils.ensureDir(lormDir);

    // Try to find router file using centralized logic
    try {
      const routerPath = await languageHandler.findRouterFile();
      
      if (languageHandler.isTypeScriptFile(routerPath)) {
        console.log("[lorm] 🔄 Generating types from TypeScript router...");
        await FileUtils.writeFile(typesPath, typeTsTemplate);
      } else {
        console.log("[lorm] 🔄 Generating types from JavaScript router...");
        await FileUtils.writeFile(typesPath, typeTemplate);
      }
      
      console.log("[lorm] ✅ Types generated successfully at .lorm/types.d.ts");
    } catch (routerError) {
      // No router found, create basic types
      await FileUtils.writeFile(typesPath, basicTypes);
      console.log(
        "[lorm] ⚠️  Router not found, created basic types. Create lorm/router/index.ts for full type safety."
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[lorm] ❌ Failed to generate type file:", errorMessage);
    throw new Error(`Type generation failed: ${errorMessage}`);
  }
}

export function watchRouter(): void {
  try {
    const watchPaths: string[] = [];
    
    // Watch the entire router directory if it exists
    try {
      require('fs').accessSync(routerDir);
      watchPaths.push(routerDir);
      console.log(`[lorm] 👀 Watching router directory: ${routerDir}`);
    } catch {}
    
    // Watch the entire schema directory if it exists
    try {
      require('fs').accessSync(schemaDir);
      watchPaths.push(schemaDir);
      console.log(`[lorm] 👀 Watching schema directory: ${schemaDir}`);
    } catch {}
    
    // Fallback to legacy router file
    try {
      require('fs').accessSync(legacyRouterPath);
      watchPaths.push(legacyRouterPath);
      console.log(`[lorm] 👀 Watching legacy router: ${legacyRouterPath}`);
    } catch {}
    
    if (watchPaths.length === 0) {
      console.log("[lorm] ⚠️  No router or schema files found to watch");
      return;
    }

    const watcher = chokidar.watch(watchPaths, {
      ignoreInitial: false,
      persistent: true,
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
    });

    watcher.on("change", async (path) => {
      try {
        console.log(`[lorm] 🔄 File changed: ${path}`);
        await generateTypeFile();
      } catch (error) {
        console.error(
          "[lorm] ❌ Error during type generation:",
          error instanceof Error ? error.message : String(error)
        );
      }
    });

    watcher.on("add", async (path) => {
      try {
        console.log(`[lorm] ➕ File added: ${path}`);
        await generateTypeFile();
      } catch (error) {
        console.error(
          "[lorm] ❌ Error during type generation:",
          error instanceof Error ? error.message : String(error)
        );
      }
    });

    watcher.on("unlink", async (path) => {
      try {
        console.log(`[lorm] ➖ File removed: ${path}`);
        await generateTypeFile();
      } catch (error) {
        console.error(
          "[lorm] ❌ Error during type generation:",
          error instanceof Error ? error.message : String(error)
        );
      }
    });

    watcher.on("addDir", (path) => {
      console.log(`[lorm] 📁 Directory added: ${path}`);
    });

    watcher.on("unlinkDir", async (path) => {
      try {
        console.log(`[lorm] 📁 Directory removed: ${path}`);
        await generateTypeFile();
      } catch (error) {
        console.error(
          "[lorm] ❌ Error during type generation:",
          error instanceof Error ? error.message : String(error)
        );
      }
    });

    watcher.on("error", (error) => {
      console.error(
        "[lorm] ❌ File watcher error:",
        error instanceof Error ? error.message : String(error)
      );
    });

    console.log("[lorm] 👀 Watching for changes in router and schema files...");
    console.log(`[lorm] 📁 Watching paths: ${watchPaths.join(", ")}`);

    process.on("SIGINT", () => {
      console.log("\n[lorm] 🛑 Stopping file watcher...");
      watcher.close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n[lorm] 🛑 Stopping file watcher...");
      watcher.close();
      process.exit(0);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[lorm] ❌ Failed to start file watcher:", errorMessage);
    throw new Error(`File watcher initialization failed: ${errorMessage}`);
  }
}
