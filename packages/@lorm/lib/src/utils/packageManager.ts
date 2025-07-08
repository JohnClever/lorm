import { existsSync } from "fs";
import path from "path";

export function packageManager(): "pnpm" | "yarn" | "npm" | "bun" {
  const cwd = process.cwd();

  if (existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(cwd, "package-lock.json"))) return "npm";

  return "npm";
}
