import fs from "fs";
import path from "path";
import which from "which";
import { execa } from "execa";

export function resolveDrizzleKitBin(): string {
  try {
    const localBin = path.join(process.cwd(), "node_modules/.bin/drizzle-kit");
    if (fs.existsSync(localBin)) {
      return localBin;
    }
  } catch {
  }

  try {
    return which.sync("drizzle-kit");
  } catch {
    throw new Error(
      "drizzle-kit not found. Please install it locally or globally:\n" +
      "  npm install drizzle-kit\n" +
      "  # or\n" +
      "  npm install -g drizzle-kit"
    );
  }
}

export async function executeDrizzleKit(
  command: string,
  lormDir: string,
  successMessage: string
): Promise<void> {
  const drizzleKitBin = resolveDrizzleKitBin();
  
  try {
    console.log(`🚀 [lorm] Running ${command}...`);
    
    await execa(drizzleKitBin, [command], {
      cwd: lormDir,
      stdio: "inherit",
    });
    
    console.log(`✅ [lorm] ${successMessage}`);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`[lorm] Failed to ${command}: ${error.message}`);
    }
    throw new Error(`[lorm] Failed to ${command}: ${error}`);
  }
}