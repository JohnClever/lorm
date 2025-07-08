// import { createORPCClient } from "@orpc/client";
// import { RPCLink } from "@orpc/client/fetch";

// export function createClient(baseUrl = "http://localhost:3000") {
//   const link = new RPCLink({
//     url: baseUrl,
//     headers: {
//       "Content-Type": "application/json",
//       "X-lorm-Client": "true",
//     },
//   });

//   return createORPCClient<any>(link);
// }

import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

// Define the registry interface
export interface LormRouterRegistry {
  router?: any;
}

// Extract the router type from registry
type LormRouter = LormRouterRegistry extends { router: infer R } ? R : any;

export async function createClient(
  baseUrl = "http://127.0.0.1:3000"
): Promise<RouterClient<LormRouter>> {
  const link = new RPCLink({
    url: baseUrl,
    headers: {
      "Content-Type": "application/json",
      "X-lorm-Client": "true",
    },
  });

  return createORPCClient(link) as RouterClient<LormRouter>;
}