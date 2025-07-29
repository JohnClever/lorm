import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { handleRpc } from "typed-rpc/lib/server.js";
import { loadConfig, loadRouter, loadSchema } from "./load";
import { createDatabase } from "./database";
import { setDatabase } from "./router";

let started = false;

export async function startServer() {
  if (started) return;
  started = true;

  const [config, router, { schema }] = await Promise.all([
    loadConfig(),
    loadRouter(),
    loadSchema(),
  ]);

  const db = await createDatabase(config, schema);
  
  setDatabase(db);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Lorm-Client");
      
      if (req.method === "OPTIONS") {
        res.statusCode = 200;
        res.end();
        return;
      }

      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        
        req.on("end", async () => {
          try {
            const requestData = JSON.parse(body);
            const result = await handleRpc(requestData, router);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (error) {
            console.error("RPC error:", error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      } else {
        res.statusCode = 405;
        res.end("Method not allowed");
      }
    } catch (err) {
      console.error("Server error:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  server.listen(3000);
}
