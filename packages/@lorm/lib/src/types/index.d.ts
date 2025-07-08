import { z } from "zod";
import type { IncomingHttpHeaders } from "node:http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
export type lormContext = {
    headers: IncomingHttpHeaders;
    db: NeonHttpDatabase;
};
export declare const configSchema: z.ZodObject<{
    db: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
}, "strip", z.ZodTypeAny, {
    db: {
        url: string;
    };
}, {
    db: {
        url: string;
    };
}>;
export type lormConfig = z.infer<typeof configSchema>;
export type ProcedureDefinition<I, R> = {
    input: I;
    resolve: (opts: {
        input: any;
        db: NeonHttpDatabase;
    }) => Promise<R>;
};
//# sourceMappingURL=index.d.ts.map