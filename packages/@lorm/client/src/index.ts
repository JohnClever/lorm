import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import "./types.js";

// Type-safe import with fallback
type LormRouter = any; // Will be overridden by generated types when available

// Check if types are available at runtime
function checkTypesAvailable(): boolean {
  try {
    // Try to access the types module path
    const fs = eval('require')('fs');
    const path = eval('require')('path');
    const typesPath = path.resolve('.lorm/types.d.ts');
    return fs.existsSync(typesPath);
  } catch {
    return false;
  }
}

export function createClient(baseUrl = "http://127.0.0.1:3000") {
  const link = new RPCLink({
    url: baseUrl,
    headers: {
      "Content-Type": "application/json",
      "X-Lorm-Client": "true",
    },
  });

  const client = createORPCClient(link);

  // Warn if types aren't available (only in development)
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if (!checkTypesAvailable()) {
      console.warn(
        "⚠️  [lorm] Generated types not found. Run 'lorm dev' to generate them.\n" +
        "    Client will work but without full type safety."
      );
    }
  }

  return client as RouterClient<LormRouter>;
}
