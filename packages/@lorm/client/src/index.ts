import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

// Global type declaration - no import needed
type LormRouter = {
  [key: string]: any;
};

// This will be augmented by the generated types via typesVersions
declare global {
  namespace LormTypes {
    interface Router extends LormRouter {}
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

  return createORPCClient(link) as RouterClient<LormTypes.Router>;
}
