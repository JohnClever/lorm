import { cac } from "cac";
import { startServer } from "@lorm/core";
import { push } from "./commands/push.js";
import { watchRouter } from "./commands/gen-lorm-types.js";
import { initProject } from "./commands/init.js";

const cli = cac("lorm");

cli.command("dev", "Start lorm dev server")
  .option("--verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log("⚡ [lorm] Starting dev server...");
      watchRouter();
      await startServer();
    } catch (error) {
      console.error("❌ [lorm] Failed to start dev server:", error);
      if (options.verbose) {
        console.error(error);
      } else {
        console.log("💡 Run with --verbose for more details");
      }
      process.exit(1);
    }
  });

cli.command("push", "Push schema to database")
  .option("--verbose", "Enable verbose logging")
  .option("--dry-run", "Show what would be pushed without executing")
  .action(async (options) => {
    try {
      console.log("[lorm] Pushing schema to database...");
      await push(options);
    } catch (error) {
      console.error("❌ [lorm] Failed to push schema:", error);
      if (options.verbose) {
        console.error(error);
      } else {
        console.log("💡 Run with --verbose for more details");
      }
      process.exit(1);
    }
  });

cli.command("init", "Initialize lorm project")
  .option("--force", "Overwrite existing files")
  .option("--skip-install", "Skip dependency installation")
  .option("--verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log("[lorm] Initializing lorm project...");
      await initProject(options);
    } catch (error) {
      console.error("❌ [lorm] Failed to initialize project:", error);
      if (options.verbose) {
        console.error(error);
      } else {
        console.log("💡 Run with --verbose for more details");
      }
      process.exit(1);
    }
  });

cli.help();

cli.parse();

