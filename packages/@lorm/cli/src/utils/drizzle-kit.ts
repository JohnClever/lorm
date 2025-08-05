import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import which from "which";
import { execa } from "execa";
import { createRequire } from "module";

export function resolveDrizzleKitBin(): string {
  // First, try to resolve drizzle-kit from the CLI's own context
  try {
    // Create a require function relative to this module
    const currentModuleUrl = import.meta.url;
    const currentModulePath = fileURLToPath(currentModuleUrl);
    const requireFromCli = createRequire(currentModulePath);
    
    const drizzleKitMainPath = requireFromCli.resolve('drizzle-kit');
    const drizzleKitDir = path.dirname(drizzleKitMainPath);
    const drizzleKitBin = path.join(drizzleKitDir, 'bin.cjs');
    
    if (fs.existsSync(drizzleKitBin)) {
      return drizzleKitBin;
    }
  } catch (error) {
    // Continue to fallback options
  }

  // Check if drizzle-kit is available in the user's project
  const localDrizzleKitBin = path.join(process.cwd(), 'node_modules', '.bin', 'drizzle-kit');
  if (fs.existsSync(localDrizzleKitBin)) {
    return localDrizzleKitBin;
  }

  // Finally, try to find drizzle-kit globally
  try {
    return which.sync('drizzle-kit');
  } catch (error) {
    throw new Error('drizzle-kit not found. This is likely a bundling issue with the lorm CLI.');
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

    // For studio command, use inherit stdio to show live output including URL
    if (command === "studio") {
      const result = await execa(drizzleKitBin, [command], {
        cwd: lormDir,
        stdio: "inherit",
        reject: false,
      });

      if (result.exitCode !== 0) {
        throw new Error(`[lorm] ${command} failed with exit code ${result.exitCode}`);
      }
      return; // Don't show success message for studio as it's a long-running process
    }

    // For other commands, use pipe to capture and process output
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
