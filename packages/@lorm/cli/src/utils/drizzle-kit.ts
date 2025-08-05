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
  } catch {}

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

    const result = await execa(drizzleKitBin, [command], {
      cwd: lormDir,
      stdio: "pipe",
      reject: false, // Don't reject on non-zero exit codes
    });

    // Output the command's stdout and stderr
    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }

    // Check for specific error patterns in the output
    const hasErrors = result.exitCode !== 0 || 
      result.stderr?.includes('Error') ||
      result.stderr?.includes('LibsqlError') ||
      result.stderr?.includes('URL_SCHEME_NOT_SUPPORTED') ||
      result.stdout?.includes('Error') ||
      result.stdout?.includes('LibsqlError') ||
      result.stdout?.includes('URL_SCHEME_NOT_SUPPORTED');

    if (hasErrors) {
      const errorOutput = result.stderr || result.stdout || 'Unknown error occurred';
      throw new Error(`[lorm] ${command} failed: ${errorOutput}`);
    }

    console.log(`✅ [lorm] ${successMessage}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw our custom error
    }
    throw new Error(`[lorm] Failed to ${command}: ${error}`);
  }
}
