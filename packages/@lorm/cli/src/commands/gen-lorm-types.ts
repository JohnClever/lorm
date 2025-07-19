import { typeTemplate } from "@lorm/lib";
import chokidar from "chokidar";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const routerPath = path.resolve("lorm.router.js");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

export async function generateTypeFile() {
  await mkdir(lormDir, { recursive: true });
  

  await writeFile(typesPath, typeTemplate, "utf8");
  
}

export function watchRouter() {
  const watcher = chokidar.watch(routerPath, {
    ignoreInitial: false,
  });

  watcher.on("change", generateTypeFile);
  watcher.on("add", generateTypeFile);

  console.log("[lorm] 👀 Watching lorm.router.js for changes...");
}
