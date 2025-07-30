import { z } from "zod";
import type { IncomingHttpHeaders } from "node:http";

export type lormDatabase = any; 

export type lormContext = {
  headers: IncomingHttpHeaders;
  db: lormDatabase;
};

export interface ServerOptions {
  port?: number;
  host?: string;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  security?: {
    maxRequestSize?: number;
    requestTimeout?: number;
  };
}

export const configSchema = z.object({
  db: z.object({
    url: z.string().url(),
    adapter: z.enum(["neon", "postgres", "mysql", "sqlite", "planetscale", "turso"]).default("neon").optional(),
    options: z.record(z.any()).optional(),
  }),
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3000).optional(),
    host: z.string().default("localhost").optional(),
    cors: z.object({
      origin: z.union([z.string(), z.array(z.string())]).default("*").optional(),
      credentials: z.boolean().default(false).optional(),
    }).optional(),
    security: z.object({
      maxRequestSize: z.number().int().min(1024).default(1024 * 1024).optional(), // 1MB default
      requestTimeout: z.number().int().min(1000).default(30000).optional(), // 30s default
    }).optional(),
  }).optional(),
  logging: z.object({
    level: z.enum(["error", "warn", "info", "debug"]).default("info").optional(),
    enableRequestLogging: z.boolean().default(false).optional(),
  }).optional(),
});

export type lormConfig = z.infer<typeof configSchema>;