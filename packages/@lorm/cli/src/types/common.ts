export interface BaseCommandOptions {
  _?: string[];
  help?: boolean;
  version?: boolean;
}

export interface CommonCommandOptions extends BaseCommandOptions {
  force?: boolean;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export interface FixableCommandOptions extends CommonCommandOptions {
  fix?: boolean;
}

export interface DryRunCommandOptions extends CommonCommandOptions {
  "dry-run"?: boolean;
}

export interface ExportableCommandOptions extends CommonCommandOptions {
  export?: string;
}

export interface ClearableCommandOptions extends CommonCommandOptions {
  clear?: boolean;
}
