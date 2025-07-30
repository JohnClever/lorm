import type { BaseCommandOptions, CommonCommandOptions } from "./common.js";

export interface PluginListCommandOptions extends BaseCommandOptions {
  installed?: boolean;
  enabled?: boolean;
}

export interface PluginInstallCommandOptions extends CommonCommandOptions {}

export interface PluginUninstallCommandOptions extends BaseCommandOptions {}

export interface PluginEnableCommandOptions extends BaseCommandOptions {}

export interface PluginDisableCommandOptions extends BaseCommandOptions {}

export interface PluginUpdateCommandOptions extends BaseCommandOptions {}

export interface PluginSearchCommandOptions extends BaseCommandOptions {}
