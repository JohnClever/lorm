import { z } from "zod";
import type { IncomingHttpHeaders } from "node:http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

export type lormContext = {
  headers: IncomingHttpHeaders;
  db: NeonHttpDatabase;
};

export const configSchema = z.object({
  db: z.object({ url: z.string().url() }),
});

export type lormConfig = z.infer<typeof configSchema>;

