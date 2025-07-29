import { typeTemplate, basicTypes } from "@lorm/lib";
import chokidar from "chokidar";
import { writeFile, mkdir, readFile, access } from "fs/promises";
import path from "path";

const routerPath = path.resolve("lorm.router.js");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

export async function generateTypeFile(): Promise<void> {
  try {
    await mkdir(lormDir, { recursive: true });

    try {
      await access(routerPath);
      console.log("[lorm] 🔄 Generating types from router...");

      await writeFile(typesPath, typeTemplate, "utf8");

      console.log("[lorm] ✅ Types generated successfully at .lorm/types.d.ts");
    } catch (routerError) {
      await writeFile(typesPath, basicTypes, "utf8");
      console.log(
        "[lorm] ⚠️  Router not found, created basic types. Create lorm.router.js to get full type safety."
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
    const watcher = chokidar.watch(routerPath, {
      ignoreInitial: false,
      persistent: true,
    });

    watcher.on("change", async () => {
      try {
        await generateTypeFile();
      } catch (error) {
        console.error("[lorm] ❌ Error during type generation:", error instanceof Error ? error.message : String(error));
      }
    });

    watcher.on("add", async () => {
      try {
        await generateTypeFile();
      } catch (error) {
        console.error("[lorm] ❌ Error during type generation:", error instanceof Error ? error.message : String(error));
      }
    });

    watcher.on("error", (error) => {
      console.error("[lorm] ❌ File watcher error:", error instanceof Error ? error.message : String(error));
    });

    console.log("[lorm] 👀 Watching lorm.router.js for changes...");

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
