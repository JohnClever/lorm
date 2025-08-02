import { SimplePluginBuilder, Plugin, convertSimplePlugin } from '@lorm/core';
import { BaseCommandOptions, CommandFactoryConfig } from '@/types';

export function createDbPlugin<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): Plugin {
  const simplePlugin = new SimplePluginBuilder(`db:${config.name}`, '1.0.0')
    .description(config.description || `Database plugin: ${config.name}`)
    .addCommand({
      name: config.name,
      description: config.description || `Database command: ${config.name}`,
      category: 'database',
      action: async (args: Record<string, unknown>) => {
        await config.action(args as T);
      }
    })
    .build();
  
  return convertSimplePlugin(simplePlugin);
}

export function createSecurityPlugin<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): Plugin {
  const simplePlugin = new SimplePluginBuilder(`security:${config.name}`, '1.0.0')
    .description(config.description || `Security plugin: ${config.name}`)
    .addCommand({
      name: config.name,
      description: config.description || `Security command: ${config.name}`,
      category: 'security',
      action: async (args: Record<string, unknown>) => {
        await config.action(args as T);
      }
    })
    .build();
  
  return convertSimplePlugin(simplePlugin);
}

export function createCachePlugin<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): Plugin {
  const simplePlugin = new SimplePluginBuilder(`cache:${config.name}`, '1.0.0')
    .description(config.description || `Cache plugin: ${config.name}`)
    .addCommand({
      name: config.name,
      description: config.description || `Cache command: ${config.name}`,
      category: 'utility',
      action: async (args: Record<string, unknown>) => {
        await config.action(args as T);
      }
    })
    .build();
  
  return convertSimplePlugin(simplePlugin);
}

export function createUtilityPlugin<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): Plugin {
  const simplePlugin = new SimplePluginBuilder(config.name, '1.0.0')
    .description(config.description || `Utility plugin: ${config.name}`)
    .addCommand({
      name: config.name,
      description: config.description || `Utility command: ${config.name}`,
      category: 'utility',
      action: async (args: Record<string, unknown>) => {
        await config.action(args as T);
      }
    })
    .build();
  
  return convertSimplePlugin(simplePlugin);
}

export function createCorePlugin<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): Plugin {
  const simplePlugin = new SimplePluginBuilder(config.name, '1.0.0')
    .description(config.description || `Core plugin: ${config.name}`)
    .addCommand({
      name: config.name,
      description: config.description || `Core command: ${config.name}`,
      category: 'core',
      action: async (args: Record<string, unknown>) => {
        await config.action(args as T);
      }
    })
    .build();
  
  return convertSimplePlugin(simplePlugin);
}

export function createDevelopmentPlugin<T extends BaseCommandOptions>(
  config: CommandFactoryConfig<T>
): Plugin {
  const simplePlugin = new SimplePluginBuilder(config.name, '1.0.0')
    .description(config.description || `Development plugin: ${config.name}`)
    .addCommand({
      name: config.name,
      description: config.description || `Development command: ${config.name}`,
      category: 'development',
      action: async (args: Record<string, unknown>) => {
        await config.action(args as T);
      }
    })
    .build();
  
  return convertSimplePlugin(simplePlugin);
}

export async function registerPlugins(
  plugins: Plugin[],
  pluginManager: { register: (plugin: Plugin) => Promise<void> }
): Promise<void> {
  for (const plugin of plugins) {
    await pluginManager.register(plugin);
  }
}

import { PluginGroup } from '@/types';

export function createPluginGroup<T extends BaseCommandOptions>(
  group: PluginGroup<T>
): Plugin[] {
  return group.plugins.map((pluginConfig) => {
    const pluginName = group.prefix ? `${group.prefix}:${pluginConfig.name}` : pluginConfig.name;
    const simplePlugin = new SimplePluginBuilder(pluginName, '1.0.0')
      .description(pluginConfig.description || `Plugin: ${pluginName}`)
      .addCommand({
        name: pluginConfig.name,
        description: pluginConfig.description || `Command: ${pluginConfig.name}`,
        action: async (args: Record<string, unknown>) => {
          await pluginConfig.action(args as T);
        }
      })
      .build();
    
    return convertSimplePlugin(simplePlugin);
  });
}

export function createPluginFactory(category: string) {
  return function<T extends BaseCommandOptions>(
    config: CommandFactoryConfig<T>
  ): Plugin {
    const simplePlugin = new SimplePluginBuilder(config.name, '1.0.0')
      .description(config.description || `${category} plugin: ${config.name}`)
      .addCommand({
        name: config.name,
        description: config.description || `${category} command: ${config.name}`,
        category: category,
        action: async (args: Record<string, unknown>) => {
          await config.action(args as T);
        }
      })
      .build();
    
    return convertSimplePlugin(simplePlugin);
  };
}

// Pre-configured factory functions for common categories
export const createDatabasePlugin = createPluginFactory('database');
export const createSecurityPluginFactory = createPluginFactory('security');
export const createUtilityPluginFactory = createPluginFactory('utility');
export const createCorePluginFactory = createPluginFactory('core');
export const createDevelopmentPluginFactory = createPluginFactory('development');