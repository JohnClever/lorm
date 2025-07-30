import type {
  BaseCommandOptions,
  CommonCommandOptions,
  FixableCommandOptions,
  DryRunCommandOptions,
  ExportableCommandOptions,
  ClearableCommandOptions,
} from "./common.js";

export interface HelpCommandOptions extends BaseCommandOptions {
  command?: string;
  /** Positional arguments from CAC */
  _?: string[];
}

export interface InitCommandOptions extends CommonCommandOptions {
  "skip-install"?: boolean;
}

export interface CheckCommandOptions extends FixableCommandOptions {}

export interface HealthCommandOptions extends CommonCommandOptions {
  system?: boolean;
}

export interface PerformanceCommandOptions
  extends ExportableCommandOptions,
    ClearableCommandOptions {}

export interface CacheStatsCommandOptions extends BaseCommandOptions {}
