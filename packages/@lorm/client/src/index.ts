import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
// @ts-ignore
import type { LormRouter } from ".lorm/types";

export function createClient(baseUrl = "http://127.0.0.1:3000") {
  const link = new RPCLink({
    url: baseUrl,
    headers: {
      "Content-Type": "application/json",
      "X-Lorm-Client": "true",
    },
  });

  return createORPCClient(link) as RouterClient<LormRouter>;
}
