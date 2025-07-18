import { typeTemplate } from "@lorm/lib";
import chokidar from "chokidar";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const routerPath = path.resolve("lorm.router.js");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

export async function generateTypeFile() {
  try {
    await mkdir(lormDir, { recursive: true });
    await writeFile(typesPath, typeTemplate, "utf8");
    console.log("✅ [lorm] Generated types at .lorm/types.d.ts");
  } catch (error) {
    console.error("❌ [lorm] Failed to generate type file:", error);
    throw error;
  }
}

export function watchRouter() {
  if (!existsSync(routerPath)) {
    console.warn(
      `⚠️  [lorm] Router file not found: ${routerPath}\n💡 Run 'lorm init' to create it`
    );
    generateTypeFile().catch(console.error);
    return;
  }

  const watcher = chokidar.watch(routerPath, {
    ignoreInitial: false,
  });

  watcher.on("change", () => {
    generateTypeFile().catch((error) => {
      console.error("❌ [lorm] Failed to regenerate types on file change:", error);
    });
  });

  watcher.on("add", () => {
    generateTypeFile().catch((error) => {
      console.error("❌ [lorm] Failed to generate types on file add:", error);
    });
  });

  watcher.on("error", (error) => {
    console.error("❌ [lorm] File watcher error:", error);
  });

  console.log("[lorm] 👀 Watching lorm.router.js for changes...");

  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    watcher.close();
    process.exit(0);
  });
}
