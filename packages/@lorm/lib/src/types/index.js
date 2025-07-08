import { z } from "zod";
// Config schema and type
export const configSchema = z.object({
    db: z.object({ url: z.string().url() }),
});
//# sourceMappingURL=index.js.map