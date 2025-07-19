import { cac } from "cac";
import { startServer } from "@lorm/core";
import { push } from "./commands/push.js";
import { generate } from "./commands/generate.js";
import { migrate } from "./commands/migrate.js";
import { pull } from "./commands/pull.js";
import { check } from "./commands/check.js";
import { up } from "./commands/up.js";
import { studio } from "./commands/studio.js";
import { watchRouter } from "./commands/gen-lorm-types.js";
import { initProject } from "./commands/init.js";

const cli = cac("lorm");

cli.command("dev", "Start lorm dev server").action(async () => {
  console.log("⚡ [lorm] Starting dev server...");
  watchRouter();
  await startServer();
});

cli.command("init", "Initialize lorm project").action(async () => {
  console.log("[lorm] Initializing lorm project...");
  await initProject();
});

// Database commands
cli.command("push", "Push schema to database").action(async () => {
  console.log("[lorm] Pushing schema to database...");
  await push();
});

cli.command("generate", "Generate migration files").action(async () => {
  console.log("[lorm] Generating migration files...");
  await generate();
});

cli.command("migrate", "Apply database migrations").action(async () => {
  console.log("[lorm] Applying database migrations...");
  await migrate();
});

cli.command("pull", "Pull schema from database").action(async () => {
  console.log("[lorm] Pulling schema from database...");
  await pull();
});

cli.command("check", "Check schema consistency").action(async () => {
  console.log("[lorm] Checking schema consistency...");
  await check();
});

cli.command("up", "Upgrade schema").action(async () => {
  console.log("[lorm] Upgrading schema...");
  await up();
});

cli.command("studio", "Start Drizzle Studio").action(async () => {
  console.log("[lorm] Starting Drizzle Studio...");
  await studio();
});

cli.help();
cli.parse();

