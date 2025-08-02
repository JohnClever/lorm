import { BaseCommandOptions, CommandFactoryConfig } from "@/types";
import { CommandConfig, createCommand } from "./command-registry";
export function createDbCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCommand({
    ...config,
    name: `db:${config.name}`,
    category: "database",
    requiresConfig: config.requiresConfig ?? true,
    requiresSchema: config.requiresSchema ?? true,
    examples: config.examples?.map((example) =>
      example.includes("npx @lorm/cli")
        ? example
        : `npx @lorm/cli db:${config.name} ${example}`.trim()
    ) || [`npx @lorm/cli db:${config.name}`],
  });
}
// Plugin commands have been moved to @lorm/core package
export function createSecurityCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCommand({
    ...config,
    name: `security:${config.name}`,
    category: "security",
    requiresConfig: config.requiresConfig ?? false,
    examples: config.examples?.map((example) =>
      example.includes("npx @lorm/cli")
        ? example
        : `npx @lorm/cli security:${config.name} ${example}`.trim()
    ) || [`npx @lorm/cli security:${config.name}`],
  });
}
export function createCacheCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCommand({
    ...config,
    name: `cache:${config.name}`,
    category: "utility",
    requiresConfig: config.requiresConfig ?? false,
    examples: config.examples?.map((example) =>
      example.includes("npx @lorm/cli")
        ? example
        : `npx @lorm/cli cache:${config.name} ${example}`.trim()
    ) || [`npx @lorm/cli cache:${config.name}`],
  });
}
export function createUtilityCommand<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): CommandConfig<T> {
  return createCommand({
    ...config,
    category: "utility",
    requiresConfig: config.requiresConfig ?? false,
    examples: config.examples || [`npx @lorm/cli ${config.name}`],
  });
}
export function registerCommands<T extends BaseCommandOptions>(
  commands: CommandConfig<T>[],
  registry: { register: (command: CommandConfig<T>) => void }
): void {
  commands.forEach((command) => registry.register(command));
}
import { CommandGroup } from "@/types";
export function createCommandGroup<T extends BaseCommandOptions>(
  group: CommandGroup<T>
): CommandConfig<T>[] {
  return group.commands.map((cmd) =>
    createCommand({
      ...group.defaultOptions,
      ...cmd,
      name: group.prefix ? `${group.prefix}:${cmd.name}` : cmd.name,
      category: group.category,
    })
  );
}
