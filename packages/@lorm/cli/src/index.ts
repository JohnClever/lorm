import { cac } from "cac";
import { startServer } from "@lorm/core";
import { push } from "./commands/push.js";
import { watchRouter } from "./commands/gen-lorm-types.js";
import { initProject } from "./commands/init.js";

const cli = cac("lorm");

cli.command("dev", "Start lorm dev server").action(async () => {
  console.log("⚡ [lorm] Starting dev server...");
  watchRouter();
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

cli.parse();

