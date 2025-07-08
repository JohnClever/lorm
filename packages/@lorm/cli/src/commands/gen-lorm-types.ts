import chokidar from "chokidar";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const proceduresPath = path.resolve("lorm.procedures.ts");
const lormDir = path.resolve(".lorm");
const typesPath = path.resolve(".lorm/types.d.ts");

export async function generateTypeFile() {
  await mkdir(lormDir, { recursive: true });
  
  // Generate module augmentation
  const typesContent = `import type { router } from "../lorm.procedures";

declare module "@lorm/client" {
  interface LormRouterRegistry {
    router: typeof router;
  }
}
`;
  await writeFile(typesPath, typesContent, "utf8");
  
  console.log("[lorm] ✅ Updated .lorm/types.d.ts");
}

export function watchProcedures() {
  const watcher = chokidar.watch(proceduresPath, {
    ignoreInitial: false,
  });

  watcher.on("change", generateTypeFile);
  watcher.on("add", generateTypeFile);

  console.log("[lorm] 👀 Watching lorm.procedures.ts for changes...");
}
