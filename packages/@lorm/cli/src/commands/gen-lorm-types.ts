import { typeTemplate } from "@lorm/lib";
import chokidar, { type FSWatcher } from "chokidar";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const routerPath = path.resolve("lorm.router.js");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

/**
 * Validates that the router file exists
 * @param routerFilePath The path to the router file
 * @throws Error if router file doesn't exist
 */
async function validateRouterFile(routerFilePath: string): Promise<void> {
  try {
    await access(routerFilePath);
    console.log("✅ [lorm] Router file found");
  } catch {
    console.warn(
      `⚠️ [lorm] Router file not found at ${routerFilePath}.\n` +
        "Creating types.d.ts anyway. Create lorm.router.js to enable full type generation."
    );
  }
}

/**
 * Generates the TypeScript definition file
 * @throws Error if type generation fails
 */
export async function generateTypeFile(): Promise<void> {
  try {
    console.log("🔄 [lorm] Generating TypeScript definitions...");

    // Create .lorm directory if it doesn't exist
    await mkdir(lormDir, { recursive: true });
    console.log("📁 [lorm] Ensured .lorm directory exists");

    // Validate router file (non-blocking)
    await validateRouterFile(routerPath);

    // Write the types file
    await writeFile(typesPath, typeTemplate, "utf8");
    console.log("📝 [lorm] Generated types.d.ts successfully");
  } catch (error) {
    console.error("❌ [lorm] Failed to generate type file:");
    if (error instanceof Error) {
      console.error(error.message);
      throw new Error(`[lorm] Type generation failed: ${error.message}`);
    } else {
      console.error(String(error));
      throw new Error(`[lorm] Type generation failed: ${error}`);
    }
  }
}

/**
 * Sets up file watching for the router file
 * @returns The chokidar watcher instance
 */
export function watchRouter(): FSWatcher {
  try {
    console.log("🔍 [lorm] Setting up router file watcher...");

    // Check if router file exists before watching
    if (!existsSync(routerPath)) {
      console.warn(
        `⚠️ [lorm] Router file ${routerPath} doesn't exist yet.\n` +
          "Watcher will activate when the file is created."
      );
    }

    const watcher = chokidar.watch(routerPath, {
      ignoreInitial: false,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Handle file events
    watcher.on("change", async () => {
      console.log("📝 [lorm] Router file changed, regenerating types...");
      try {
        await generateTypeFile();
      } catch (error) {
        console.error("❌ [lorm] Failed to regenerate types on change:", error);
      }
    });

    watcher.on("add", async () => {
      console.log("➕ [lorm] Router file created, generating types...");
      try {
        await generateTypeFile();
      } catch (error) {
        console.error(
          "❌ [lorm] Failed to generate types on file creation:",
          error
        );
      }
    });

    watcher.on("unlink", () => {
      console.log("🗑️ [lorm] Router file deleted, types may be outdated");
    });

    watcher.on("error", (error) => {
      console.error("❌ [lorm] Watcher error:", error);
    });

    watcher.on("ready", () => {
      console.log("👀 [lorm] Watching lorm.router.js for changes...");
    });

    return watcher;
  } catch (error) {
    console.error("❌ [lorm] Failed to setup router watcher:");
    if (error instanceof Error) {
      console.error(error.message);
      throw new Error(`[lorm] Watcher setup failed: ${error.message}`);
    } else {
      console.error(String(error));
      throw new Error(`[lorm] Watcher setup failed: ${error}`);
    }
  }
}

/**
 * Stops the router file watcher
 * @param watcher The chokidar watcher instance to stop
 */
export async function stopWatcher(watcher: FSWatcher): Promise<void> {
  try {
    await watcher.close();
    console.log("🛑 [lorm] Stopped watching router file");
  } catch (error) {
    console.error("❌ [lorm] Failed to stop watcher:", error);
  }
}
