import path from "path";
import which from "which";
import { execa } from "execa";
import { FileUtils } from "./file-utils";

export function resolveDrizzleKitBin(): string {
  try {
    const localBin = path.join(process.cwd(), "node_modules/.bin/drizzle-kit");
    if (FileUtils.exists(localBin)) {
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
      reject: true,
    });

    const output = result.stdout + result.stderr;
    if (
      output.includes("ECONNREFUSED") ||
      output.includes("connection refused") ||
      output.includes("Connection refused") ||
      output.includes("connect ECONNREFUSED")
    ) {
      throw new Error(
        `Database connection failed: Unable to connect to database. Please ensure your database server is running and the DATABASE_URL is correct.`
      );
    }

    if (
      output.includes("authentication failed") ||
      output.includes("password authentication failed") ||
      output.includes("Access denied")
    ) {
      throw new Error(
        `Database authentication failed: Please check your database credentials in DATABASE_URL.`
      );
    }

    if (output.includes("database") && output.includes("does not exist")) {
      throw new Error(
        `Database does not exist: Please create the database first or check your DATABASE_URL.`
      );
    }

    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }

    console.log(`✅ [lorm] ${successMessage}`);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("Database connection failed") ||
        error.message.includes("Database authentication failed") ||
        error.message.includes("Database does not exist")
      ) {
        throw error;
      }

      if ("exitCode" in error && "stdout" in error && "stderr" in error) {
        const execaError = error as any;
        const output = (execaError.stdout || "") + (execaError.stderr || "");

        if (
          output.includes("ECONNREFUSED") ||
          output.includes("connection refused") ||
          output.includes("Connection refused")
        ) {
          throw new Error(
            `Database connection failed: Unable to connect to database. Please ensure your database server is running and the DATABASE_URL is correct.`
          );
        }

        throw new Error(
          `[lorm] Failed to ${command}: ${execaError.message}\n${output}`
        );
      }

      throw new Error(`[lorm] Failed to ${command}: ${error.message}`);
    }
    throw new Error(`[lorm] Failed to ${command}: ${error}`);
  }
}
