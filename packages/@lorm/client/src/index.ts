import { rpcClient } from "typed-rpc";
import { findLormTypesPath, checkProjectSetup } from "./type-resolver.js";
import type { LormRouter } from "./types.js";

export function createClient(baseUrl = "http://127.0.0.1:3000") {
  const typesPath = findLormTypesPath();

  if (!typesPath && process.env.NODE_ENV === "development") {
    const setup = checkProjectSetup();

    if (setup.hasRouter && !setup.hasTypes) {
      console.warn(
        "[lorm] ⚠️  Router found but no types generated. Run `npx @lorm/cli dev` to generate types for full type safety."
      );
      console.info(
        "[lorm] 💡 This will enable auto-completion and type checking for your API calls."
      );
    } else if (!setup.hasRouter && !setup.hasLormDir) {
      console.warn(
        "[lorm] ⚠️  No Lorm project detected. Run `npx @lorm/cli init` to set up your project."
      );
      console.info(
        "[lorm] 💡 Then create routes in lorm.router.js and run `npx @lorm/cli dev` for type generation."
      );
    } else if (!setup.hasRouter) {
      console.warn(
        "[lorm] ⚠️  No router found. Create lorm.router.js and run `npx @lorm/cli dev` to get started."
      );
      console.info(
        "[lorm] 💡 Define your API routes using defineRouter() for type-safe client calls."
      );
    } else {
      console.warn(
        "[lorm] ⚠️  Types not found. Run `npx @lorm/cli dev` to generate types from your router."
      );
    }
  }

  return rpcClient<LormRouter>(baseUrl);
}

export type {
  LormRouter,
  LormRouterRegistry,
  GlobalLormRouter,
  DynamicLormRouter,
  LoadedLormTypes,
} from "./types.js";

export {
  findLormTypesPath,
  checkProjectSetup,
  loadLormTypes,
} from "./type-resolver.js";
