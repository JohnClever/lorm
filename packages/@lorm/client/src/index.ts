import { rpcClient } from "typed-rpc";
import type { LormRouter } from "./types";

export function createClient<T extends object = LormRouter>(baseUrl = "http://127.0.0.1:3000") {
  return rpcClient<T>(baseUrl);
}

export type {
  LormRouter,
  LormRouterRegistry,
  GlobalLormRouter,
  DynamicLormRouter,
  LoadedLormTypes,
} from "./types.js";
