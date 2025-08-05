import { cac } from "cac";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";
import { init } from "./commands/init.js";
import { devCommand } from "./commands/dev.js";
import { push } from "./commands/db/push.js";
import { studio } from "./commands/db/studio.js";
import { getCommandPrefix } from "@/utils/package-manager";

const commandPrefix = getCommandPrefix();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJsonPath = resolve(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

const cli = cac("lorm");

// Register init command
cli
  .command("init", "Initialize a new LORM project")
  .option("--force", "Force initialization even if files exist")
  .option("--skip-install", "Skip dependency installation")
  .action(async (options) => {
    try {
      await init(options);
      process.exit(0);
    } catch (error) {
      console.error("Init command failed:", error);
      process.exit(1);
    }
  });

// Register dev command
cli
  .command("dev", "Start development server with type generation")
  .option("--port <port>", "Port for the development server", { default: 3000 })
  .option("--host <host>", "Host for the development server", {
    default: "localhost",
  })
  .option("--watch", "Enable file watching", { default: true })
  .action(async (options) => {
    try {
      await devCommand(options);
    } catch (error) {
      console.error("Dev command failed:", error);
      process.exit(1);
    }
  });

// Register db:push command
cli.command("db:push", "Push schema changes to database").action(async () => {
  try {
    await push();
    process.exit(0);
  } catch (error) {
    console.error("DB push command failed:", error);
    process.exit(1);
  }
});

// Register db:studio command
cli
  .command("db:studio", "Open database management UI")
  .action(async () => {
    try {
      await studio();
    } catch (error) {
      console.error("DB studio command failed:", error);
      process.exit(1);
    }
  });

// Handle help
cli.help();
cli.version(packageJson.version);

// Handle unknown commands
cli.on("command:*", () => {
  console.error(`Unknown command: ${cli.args[0]}`);
  console.log(
    `\nRun '${commandPrefix} @lorm/cli --help' to see available commands`
  );
  process.exit(1);
});

// Parse CLI arguments
cli.parse(process.argv);

// Show help if no command provided
if (process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}
