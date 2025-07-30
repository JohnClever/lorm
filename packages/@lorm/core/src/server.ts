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

  // Merge configuration sources: CLI params > config file > env vars > defaults
  const serverPort = port || config.server?.port || (process.env.PORT ? parseInt(process.env.PORT) : 3000);
  const serverHost = options?.host || config.server?.host || process.env.HOST || 'localhost';
  const corsConfig = {
    origin: options?.cors?.origin || config.server?.cors?.origin || "*",
    credentials: options?.cors?.credentials || config.server?.cors?.credentials || false,
  };
  const securityConfig = {
    maxRequestSize: options?.security?.maxRequestSize || config.server?.security?.maxRequestSize || 1024 * 1024,
    requestTimeout: options?.security?.requestTimeout || config.server?.security?.requestTimeout || 30000,
  };
  const loggingConfig = {
    level: config.logging?.level || 'info',
    enableRequestLogging: config.logging?.enableRequestLogging || false,
  };

  // Simple logger
  const logger = {
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => loggingConfig.level !== 'error' && console.log(`[INFO] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => loggingConfig.level === 'debug' && console.log(`[DEBUG] ${msg}`, ...args),
  };

  const db = await createDatabase(config, schema);
  
  setDatabase(db);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const startTime = Date.now();
    
    // Request logging
    if (loggingConfig.enableRequestLogging) {
      logger.info(`${req.method} ${req.url} - ${req.headers['user-agent'] || 'Unknown'}`);
    }
    
    // Set request timeout
    req.setTimeout(securityConfig.requestTimeout, () => {
      if (!res.headersSent) {
        logger.warn(`Request timeout for ${req.method} ${req.url}`);
        res.statusCode = 408;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Request timeout" }));
      }
    });

    try {
      // Enhanced CORS configuration
      res.setHeader("Access-Control-Allow-Origin", Array.isArray(corsConfig.origin) ? corsConfig.origin.join(", ") : corsConfig.origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Lorm-Client");
      res.setHeader("Access-Control-Allow-Credentials", corsConfig.credentials.toString());
      
      // Security headers
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      
      if (req.method === "OPTIONS") {
        res.statusCode = 200;
        res.end();
        return;
      }

      // Health check endpoint
      if (req.url === '/health' && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }));
        return;
      }

      if (req.method === "POST") {
        let body = "";
        let bodySize = 0;
        
        req.on("data", (chunk: Buffer) => {
          bodySize += chunk.length;
          
          // Check request size limit
          if (bodySize > securityConfig.maxRequestSize) {
            logger.warn(`Request size limit exceeded: ${bodySize} bytes from ${req.socket.remoteAddress}`);
            res.statusCode = 413;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Request entity too large" }));
            return;
          }
          
          body += chunk.toString();
        });
        
        req.on("end", async () => {
          try {
            if (!body.trim()) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Empty request body" }));
              return;
            }
            
            const requestData = JSON.parse(body);
            const result = await handleRpc(requestData, router);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (error) {
            // Enhanced error handling - don't expose internal details
            if (error instanceof SyntaxError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
            } else {
              logger.error("RPC error:", error instanceof Error ? error.message : error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal server error" }));
            }
          }
          
          // Log response time
          if (loggingConfig.enableRequestLogging) {
            const responseTime = Date.now() - startTime;
            logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`);
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



  // Graceful shutdown handling
  const gracefulShutdown = () => {
    logger.info('Received shutdown signal, closing server gracefully...');
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.warn('Forcing server shutdown...');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  
  server.listen(serverPort, serverHost, () => {
    logger.info(`🚀 Lorm server running on http://${serverHost}:${serverPort}`);
    logger.debug(`Configuration: CORS=${JSON.stringify(corsConfig)}, Security=${JSON.stringify(securityConfig)}`);
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
