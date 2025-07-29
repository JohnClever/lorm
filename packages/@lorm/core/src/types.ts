import { z } from "zod";
import type { IncomingHttpHeaders } from "node:http";

export type lormDatabase = any; 

export type lormContext = {
  headers: IncomingHttpHeaders;
  db: lormDatabase;
};

export const configSchema = z.object({
  db: z.object({
    url: z.string().url(),
    adapter: z.enum(["neon", "postgres", "mysql", "sqlite", "planetscale", "turso"]).default("neon").optional(),
    options: z.record(z.any()).optional(),
  }),
});

export type lormConfig = z.infer<typeof configSchema>;