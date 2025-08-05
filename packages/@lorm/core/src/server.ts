import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { handleRpc } from "typed-rpc/lib/server.js";
import { loadConfig, loadRouter, loadSchema } from "./load";
import { createDatabase } from "./database";
import { setDatabase } from "./router";
import { ServerOptions } from "./types";

let started = false;

export async function startServer(port?: number, options?: ServerOptions) {
  if (started) return;
  started = true;

  const [config, router, { schema }] = await Promise.all([
    loadConfig(),
    loadRouter(),
    loadSchema(),
  ]);

  // Basic configuration
  const serverPort = port || config.server?.port || (process.env.PORT ? parseInt(process.env.PORT) : 3000);
  const serverHost = options?.host || config.server?.host || process.env.HOST || 'localhost';
  const corsOrigin = options?.cors?.origin || config.server?.cors?.origin || "*";

  // Simple logger
  const logger = {
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  };

  const db = await createDatabase(config, schema);
  
  setDatabase(db);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // Basic CORS headers
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      
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
            logger.error("RPC error:", error instanceof Error ? error.message : error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
        
        req.on("error", (error) => {
          logger.error("Request error:", error.message);
          if (!res.headersSent) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Bad request" }));
          }
        });
      } else {
        res.statusCode = 405;
        res.end("Method not allowed");
      }
    } catch (err) {
      logger.error("Server error:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  server.listen(serverPort, serverHost, () => {
    logger.info(`🚀 Lorm server running on http://${serverHost}:${serverPort}`);
  });
  
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${serverPort} is already in use. Please choose a different port.`);
      process.exit(1);
    } else {
      logger.error('Server error:', error.message);
      process.exit(1);
    }
  });
}
