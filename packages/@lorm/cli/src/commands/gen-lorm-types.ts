import chokidar from "chokidar";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const routerPath = path.resolve("lorm.router.js");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

export async function generateTypeFile() {
  await mkdir(lormDir, { recursive: true });
  
  const typesContent = `import type { router } from "../lorm.router";

declare module "@lorm/client" {
  interface LormRouterRegistry {
    router: typeof router;
  }
}
`;
  await writeFile(typesPath, typesContent, "utf8");
  
  // console.log("[lorm] ✅ Updated .lorm/types.d.ts");
}

export function watchRouter() {
  const watcher = chokidar.watch(routerPath, {
    ignoreInitial: false,
  });

  watcher.on("change", generateTypeFile);
  watcher.on("add", generateTypeFile);

  console.log("[lorm] 👀 Watching lorm.router.js for changes...");
}
