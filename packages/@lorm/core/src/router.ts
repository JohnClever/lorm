import { os } from "@orpc/server";
import type { ZodTypeAny, z } from "zod";
import { lormContext, lormDatabase } from "./types";

export function defineRouter<I extends ZodTypeAny, R>(def: {
  input: I;
  resolve: (opts: { input: z.infer<I>; db: lormDatabase }) => Promise<R>;
}) {
  return os
    .$context<lormContext>()
    .use(({ context, next }) => {
      if (!context.db) throw new Error("Missing DB in context");
      return next({ context });
    })
    .input(def.input)
    .handler(({ input, context }) => def.resolve({ input, db: context.db }));
}
