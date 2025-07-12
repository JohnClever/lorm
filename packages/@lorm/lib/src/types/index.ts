import { z } from "zod";
import type { Procedure } from "@orpc/server";
import type { IncomingHttpHeaders } from "node:http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

// lorm Context type used across packages
export type lormContext = {
  headers: IncomingHttpHeaders;
  db: NeonHttpDatabase;
};

// Config schema and type
export const configSchema = z.object({
  db: z.object({ url: z.string().url() }),
});

export type lormConfig = z.infer<typeof configSchema>;

// Procedure definition type
export type ProcedureDefinition<I, R> = {
  input: I;
  resolve: (opts: { input: any; db: NeonHttpDatabase }) => Promise<R>;
};
