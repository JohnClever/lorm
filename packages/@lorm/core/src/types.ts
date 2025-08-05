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
}

export const configSchema = z.object({
  db: z.object({
    url: z.string().refine(
      (val) => {
        // Allow environment variable expressions or valid URLs
        if (val.includes("process.env") || val.startsWith("$")) {
          return true;
        }
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be a valid URL or environment variable expression" }
    ),
    adapter: z
      .enum(["neon", "postgres", "mysql", "sqlite", "planetscale", "turso"])
      .optional()
      .default("neon"),
    options: z.record(z.string(), z.any()).optional(),
  }),
  server: z
    .object({
      port: z.number().int().min(1).max(65535).optional().default(3000),
      host: z.string().optional().default("localhost"),
      cors: z
        .object({
          origin: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .default("*"),
          credentials: z.boolean().optional().default(false),
        })
        .optional(),
    })
    .optional(),
});

export type lormConfig = z.infer<typeof configSchema>;
