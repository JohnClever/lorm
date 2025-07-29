import path from "path";
import { existsSync } from "fs";
import { spawn } from "child_process";

export function packageManager(): "pnpm" | "yarn" | "npm" | "bun" {
  const cwd = process.cwd();

  if (existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(cwd, "package-lock.json"))) return "npm";

  return "npm";
}

export const getPackageManager = packageManager;

export async function installDependencies(
  dependencies: string[],
  options: {
    dev?: boolean;
    cwd?: string;
    packageManager?: "pnpm" | "yarn" | "npm" | "bun";
  } = {}
): Promise<void> {
  if (dependencies.length === 0) return;

  const pm = options.packageManager || packageManager();
  const cwd = options.cwd || process.cwd();
  const isDev = options.dev || false;

  let command: string;
  let args: string[];

  switch (pm) {
    case "pnpm":
      command = "pnpm";
      args = ["add", ...(isDev ? ["-D"] : []), ...dependencies];
      break;
    case "yarn":
      command = "yarn";
      args = ["add", ...(isDev ? ["-D"] : []), ...dependencies];
      break;
    case "bun":
      command = "bun";
      args = ["add", ...(isDev ? ["-d"] : []), ...dependencies];
      break;
    case "npm":
    default:
      command = "npm";
      args = [
        "install",
        ...(isDev ? ["--save-dev"] : ["--save"]),
        ...dependencies,
      ];
      break;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code}`
          )
        );
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}
