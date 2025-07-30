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

export interface SecurityLogsCommandOptions extends BaseCommandOptions {
  lines?: number;
  level?: 'info' | 'warn' | 'error' | 'critical';
  follow?: boolean;
  json?: boolean;
  search?: string;
}

export interface SecurityAuditCommandOptions extends BaseCommandOptions {
  verbose?: boolean;
  json?: boolean;
  fix?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}
