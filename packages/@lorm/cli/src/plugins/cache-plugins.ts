import { SimplePlugin, SimplePluginBuilder } from "@lorm/core";
import { allCacheCommands } from "../commands/cache.js";

export const createCachePlugins = async (): Promise<SimplePlugin[]> => {
  const cachePluginBuilder = new SimplePluginBuilder("core-cache", "1.0.0")
    .description("Cache management and benchmarking plugin");

  // Add all cache commands dynamically
  for (const command of allCacheCommands) {
    cachePluginBuilder.addCommand({
      name: command.name,
      description: command.description,
      category: command.category || "utility",
      options: command.options?.map(opt => ({
        flag: opt.flag,
        description: opt.description
      })) || [],
      action: async (args: Record<string, unknown>) => {
        await command.action(args as any);
      },
    });
  }

  const cachePlugin = cachePluginBuilder.build();

  return [cachePlugin];
};