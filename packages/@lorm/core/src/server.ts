import { createServer } from "node:http";
import { RPCHandler } from "@orpc/server/node";
import { CORSPlugin } from "@orpc/server/plugins";
import { loadConfig, loadProcedures, loadSchema } from "./load.js";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

let started = false;

export async function startServer() {
  if (started) return;
  started = true;

  const [config, procedures, { schema }] = await Promise.all([
    loadConfig(),
    loadProcedures(),
    loadSchema(),
  ]);

  const db = drizzle(neon(config.db.url), { schema });

  const handler = new RPCHandler(procedures, {
    plugins: [new CORSPlugin()],
  });

  const server = createServer(async (req, res) => {
    try {
      await handler.handle(req, res, {
        context: { headers: req.headers, db },
      });
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  server.listen(3000, "127.0.0.1", () => {
    console.log("🚀 Server running on http://127.0.0.1:3000");
  });
}
