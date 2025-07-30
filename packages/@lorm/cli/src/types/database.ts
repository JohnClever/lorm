import type { CommonCommandOptions, DryRunCommandOptions } from "./common.js";

export interface DbPushCommandOptions extends CommonCommandOptions {}

export interface DbGenerateCommandOptions extends CommonCommandOptions {
  name?: string;
}

export interface DbMigrateCommandOptions extends CommonCommandOptions {
  to?: string;
}

export interface DbPullCommandOptions extends CommonCommandOptions {
  introspect?: boolean;
}

export interface DbUpCommandOptions extends DryRunCommandOptions {}

export interface DbStudioCommandOptions extends CommonCommandOptions {
  port?: number;
  host?: string;
}
