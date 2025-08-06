import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import which from "which";
import { execa } from "execa";
import { createRequire } from "module";

export function resolveDrizzleKitBin(): string {
  const isDebug = process.env.LORM_DEBUG === 'true';
  
  // First, try to resolve drizzle-kit from the CLI's own context
  try {
    // Create a require function relative to this module
    const currentModuleUrl = import.meta.url;
    const currentModulePath = fileURLToPath(currentModuleUrl);
    const requireFromCli = createRequire(currentModulePath);
    
    const drizzleKitMainPath = requireFromCli.resolve('drizzle-kit');
    const drizzleKitDir = path.dirname(drizzleKitMainPath);
    const drizzleKitBin = path.join(drizzleKitDir, 'bin.cjs');
    
    if (isDebug) {
      console.log(`[DEBUG] Trying CLI bundled drizzle-kit at: ${drizzleKitBin}`);
    }
    
    if (fs.existsSync(drizzleKitBin)) {
      if (isDebug) {
        console.log(`[DEBUG] Found CLI bundled drizzle-kit: ${drizzleKitBin}`);
      }
      return drizzleKitBin;
    }
    
    // Also try the main entry point directly if bin.cjs doesn't exist
    if (isDebug) {
      console.log(`[DEBUG] Trying CLI bundled drizzle-kit main: ${drizzleKitMainPath}`);
    }
    
    if (fs.existsSync(drizzleKitMainPath)) {
      if (isDebug) {
        console.log(`[DEBUG] Found CLI bundled drizzle-kit main: ${drizzleKitMainPath}`);
      }
      return drizzleKitMainPath;
    }
  } catch (error) {
    if (isDebug) {
      console.log(`[DEBUG] CLI bundled drizzle-kit resolution failed:`, error);
    }
    // Continue to fallback options
  }

  // Check if drizzle-kit is available in the user's project
  const localDrizzleKitBin = path.join(process.cwd(), 'node_modules', '.bin', 'drizzle-kit');
  if (isDebug) {
    console.log(`[DEBUG] Trying local drizzle-kit at: ${localDrizzleKitBin}`);
  }
  
  if (fs.existsSync(localDrizzleKitBin)) {
    if (isDebug) {
      console.log(`[DEBUG] Found local drizzle-kit: ${localDrizzleKitBin}`);
    }
    return localDrizzleKitBin;
  }

  // Try to find drizzle-kit in workspace root (for monorepos)
  const workspaceRoot = findWorkspaceRoot();
  if (workspaceRoot) {
    const workspaceDrizzleKitBin = path.join(workspaceRoot, 'node_modules', '.bin', 'drizzle-kit');
    if (isDebug) {
      console.log(`[DEBUG] Trying workspace drizzle-kit at: ${workspaceDrizzleKitBin}`);
    }
    
    if (fs.existsSync(workspaceDrizzleKitBin)) {
      if (isDebug) {
        console.log(`[DEBUG] Found workspace drizzle-kit: ${workspaceDrizzleKitBin}`);
      }
      return workspaceDrizzleKitBin;
    }
  }

  // Finally, try to find drizzle-kit globally
  try {
    const globalPath = which.sync('drizzle-kit');
    if (isDebug) {
      console.log(`[DEBUG] Found global drizzle-kit: ${globalPath}`);
    }
    return globalPath;
  } catch (error) {
    if (isDebug) {
      console.log(`[DEBUG] Global drizzle-kit resolution failed:`, error);
    }
    throw new Error('drizzle-kit not found. Please ensure drizzle-kit is properly installed.');
  }
}

function findWorkspaceRoot(): string | null {
  let currentDir = process.cwd();
  
  while (currentDir !== path.dirname(currentDir)) {
    // Check for common workspace indicators
    const indicators = [
      'pnpm-workspace.yaml',
      'lerna.json',
      'rush.json',
      'nx.json'
    ];
    
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(currentDir, indicator))) {
        return currentDir;
      }
    }
    
    // Also check for package.json with workspaces field
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  return null;
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
