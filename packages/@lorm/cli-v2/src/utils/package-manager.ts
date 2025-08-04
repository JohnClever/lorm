import { detectPackageManagerFromLockFiles } from './file-utils.js';
import { spawn } from 'child_process';

/**
 * Package manager types supported by LORM
 */
export type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun';

/**
 * Detect package manager based on lock files in the current directory
 */
export function packageManager(cwd: string = process.cwd()): PackageManager {
  return detectPackageManagerFromLockFiles(cwd);
}

/**
 * Alias for packageManager function
 */
export const getPackageManager = packageManager;

/**
 * Get command prefix for running packages (npx, yarn, bunx, pnpm dlx)
 */
export function getCommandPrefix(cwd?: string): string {
  const pm = packageManager(cwd);
  switch (pm) {
    case 'npm':
      return 'npx';
    case 'yarn':
      return 'yarn';
    case 'bun':
      return 'bunx';
    case 'pnpm':
      return 'pnpm dlx';
    default:
      return 'npx';
  }
}

/**
 * Install dependencies using the detected package manager
 */
export async function installDependencies(
  dependencies: string[],
  options: {
    dev?: boolean;
    cwd?: string;
    packageManager?: PackageManager;
  } = {}
): Promise<void> {
  if (dependencies.length === 0) return;
  
  const pm = options.packageManager || packageManager(options.cwd);
  const cwd = options.cwd || process.cwd();
  const isDev = options.dev || false;
  
  let command: string;
  let args: string[];
  
  switch (pm) {
    case 'pnpm':
      command = 'pnpm';
      args = ['add', ...(isDev ? ['-D'] : []), ...dependencies];
      break;
    case 'yarn':
      command = 'yarn';
      args = ['add', ...(isDev ? ['-D'] : []), ...dependencies];
      break;
    case 'bun':
      command = 'bun';
      args = ['add', ...(isDev ? ['-d'] : []), ...dependencies];
      break;
    case 'npm':
    default:
      command = 'npm';
      args = [
        'install',
        ...(isDev ? ['--save-dev'] : ['--save']),
        ...dependencies,
      ];
      break;
  }
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with exit code ${code}`
          )
        );
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}