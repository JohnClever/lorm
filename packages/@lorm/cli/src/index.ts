#!/usr/bin/env tsx
import { cac } from "cac";
import { startServer } from "@lorm/core";
import { push } from "./commands/push";
import { watchProcedures } from "./commands/gen-lorm-types";
import { initProject } from "./commands/init";

const cli = cac("lorm");

cli.command("dev", "Start lorm dev server").action(async () => {
  console.log("⚡ [lorm] Starting dev server...");
  watchProcedures();
  await startServer();
});

cli.command("push", "Push schema to database").action(async () => {
  console.log("[lorm] Pushing schema to database...");
  await push();
});

cli.command("init", "Initialize lorm project").action(async () => {
  console.log("[lorm] Initializing lorm project...");
  await initProject();
});

cli.help();

// Parse the CLI arguments
const parsed = cli.parse();

// 🧠 If no subcommand (like "dev") was passed, run `startServer()` manually
// if (parsed.args.length === 0) {
//   console.log("[lorm] No command provided, defaulting to `dev`");
//   await startServer();
// }
