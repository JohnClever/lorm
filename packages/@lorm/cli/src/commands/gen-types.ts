import path from "path";
import chokidar from "chokidar";
import { typeTsTemplate, basicTypes } from "@/templates";
import { writeFile, mkdir } from "fs/promises";
import { languageHandler } from "@/utils";

const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

export async function generateTypeFile(): Promise<void> {
  try {
    await mkdir(lormDir, { recursive: true });

    try {
      console.log("[lorm] 🔄 Generating types from router...");

      await writeFile(typesPath, typeTsTemplate, "utf8");

      console.log("[lorm] ✅ Types generated successfully at .lorm/types.d.ts");
    } catch (routerError) {
      await writeFile(typesPath, basicTypes, "utf8");
      const filePaths = await languageHandler.getFilePaths();
      console.log(
        `[lorm] ⚠️  Router not found, created basic types. Create ${filePaths.router} to get full type safety.`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[lorm] ❌ Failed to generate type file:", errorMessage);
    throw new Error(`Type generation failed: ${errorMessage}`);
  }
}

export async function watchRouter(): Promise<void> {
  try {
    const filePaths = await languageHandler.getFilePaths();
    const routerPath = path.resolve(filePaths.router);
    
    const watcher = chokidar.watch(routerPath, {
      ignoreInitial: false,
      persistent: true,
    });

    watcher.on("change", async () => {
      try {
        await generateTypeFile();
      } catch (error) {
        console.error(
          "[lorm] ❌ Error during type generation:",
          error instanceof Error ? error.message : String(error)
        );
      }
    });

    watcher.on("add", async () => {
      try {
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

    console.log(`[lorm] 👀 Watching ${filePaths.router} for changes...`);

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
