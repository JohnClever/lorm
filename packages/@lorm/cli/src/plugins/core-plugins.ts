import { createSimplePlugin, SimplePlugin, SimplePluginBuilder } from "@lorm/core";
import { startServer } from "@lorm/core";
import { initProject } from "../commands/init.js";
import { getCommandPrefix } from "@/utils";

const commandPrefix = getCommandPrefix();

export const createCorePlugins = async (): Promise<SimplePlugin[]> => {
  const helpPlugin = new SimplePluginBuilder("core-help", "1.0.0")
    .description("Core help command plugin")
    .addCommand({
      name: "help [command]",
      description: "Show detailed help information with examples",
      category: "core",
      options: [],
      action: async (args: Record<string, unknown>) => {
        // For now, display basic help until we have access to plugin manager
        const command = args.command as string | undefined;
        if (command) {
          console.log(`Help for command: ${command}`);
          console.log('Command-specific help would be displayed here.');
        } else {
          console.log('LORM CLI - Available Commands:');
          console.log('  help [command]  - Show help information');
          console.log('  dev             - Start development server');
          console.log('  init            - Initialize new project');
          console.log('  check           - Check configuration');
        }
      },
    })
    .build();

  const devPlugin = new SimplePluginBuilder("core-dev", "1.0.0")
    .description("Development server plugin")
    .addCommand({
      name: "dev",
      description: "Start development server with file watching and type generation",
      category: "development",
      options: [
        {
          flag: "--port <port>",
          description: "Port to run the server on",
          defaultValue: 3000,
        },
      ],
      action: async (args: Record<string, unknown>) => {
        const port = (args.port as number) || 3000;
        await startServer(port, {
          host: "localhost",
        });
        console.log(`🚀 Dev server running on port ${port}`);
      },
    })
    .build();

  const initPlugin = new SimplePluginBuilder("core-init", "1.0.0")
    .description("Project initialization plugin")
    .addCommand({
      name: "init",
      description: "Initialize a new LORM project",
      category: "core",
      options: [
        {
          flag: "--force",
          description: "Overwrite existing files",
        },
        {
          flag: "--skip-install",
          description: "Skip dependency installation",
        },
      ],
      action: async (args: Record<string, unknown>) => {
        await initProject({
          force: args.force as boolean,
          skipInstall: args["skip-install"] as boolean,
        });
      },
    })
    .build();

  const checkPlugin = new SimplePluginBuilder("core-check", "1.0.0")
    .description("Configuration validation plugin")
    .addCommand({
      name: "check",
      description: "Check configuration and schema validity",
      category: "utility",
      options: [
        {
          flag: "--fix",
          description: "Attempt to fix common issues",
        },
      ],
      action: async (args: Record<string, unknown>) => {
        const { validateConfigOrExit } = await import(
          "../utils/config-validator.js"
        );
        await validateConfigOrExit();
      },
    })
    .build();

  return [helpPlugin, devPlugin, initPlugin, checkPlugin];
};