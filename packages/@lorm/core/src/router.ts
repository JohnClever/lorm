import { lormDatabase } from "./types";
import type { ZodTypeAny, z } from "zod";

let globalDb: lormDatabase;

export function setDatabase(db: lormDatabase) {
  globalDb = db;
}

export function defineRouter<I extends ZodTypeAny, R>(def: {
  input: I;
  resolve: (opts: { input: z.infer<I>; db: lormDatabase }) => Promise<R>;
}) {
  return async (input: z.infer<I>) => {
    if (!globalDb) throw new Error("Missing DB in context");
    
    const validatedInput = def.input.parse(input);
    
    return def.resolve({ input: validatedInput, db: globalDb });
  };
}

export function createService(routes: Record<string, any>) {
  return routes;
}
