/**
 * Fetch request options for controlled network access
 */
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams | ReadableStream | ArrayBuffer;
  timeout?: number;
  redirect?: 'follow' | 'error' | 'manual';
  credentials?: 'omit' | 'same-origin' | 'include';
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache';
  referrer?: string;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
}

/**
 * Fetch response interface for type safety
 */
export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  redirected: boolean;
  type: 'basic' | 'cors' | 'error' | 'opaque' | 'opaqueredirect';
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
  formData(): Promise<FormData>;
  clone(): FetchResponse;
}

/**
 * Security configuration for plugin sandboxing and auditing
 */
export interface SecurityConfig {
  // Sandbox settings
  sandboxing: boolean;
  allowedPaths: string[];
  allowedNetworkHosts: string[];
  maxExecutionTime?: number; // in milliseconds
  maxMemoryUsage?: number; // in bytes
  
  // Audit rule configuration
  auditRules: {
    environment: EnvironmentAuditConfig;
    database: DatabaseAuditConfig;
    filesystem: FileSystemAuditConfig;
    dependencies: DependencyAuditConfig;
  };
  
  // Auto-fix settings
  autoFix: {
    enabled: boolean;
    categories: AuditCategory[];
    backupBeforeFix: boolean;
  };
}

/**
 * Plugin permissions
 */
export interface PluginPermissions {
  filesystem: {
    read: string[]; // Allowed read paths
    write: string[]; // Allowed write paths
    execute: string[]; // Allowed executable paths
  };
  network: {
    hosts: string[]; // Allowed network hosts
    ports: number[]; // Allowed ports
  };
  process: {
    spawn: boolean; // Can spawn child processes
    env: string[]; // Allowed environment variables
  };
  system: {
    exit: boolean; // Can call process.exit
    signals: boolean; // Can handle signals
  };
}

/**
 * Plugin execution context
 */
export interface PluginContext {
  pluginId: string;
  pluginName: string;
  version: string;
  permissions: PluginPermissions;
  workingDirectory: string;
  tempDirectory: string;
  configDirectory: string;
  cacheDirectory: string;
}

/**
 * Sandbox violation types
 */
export type ViolationType = 
  | 'filesystem_read'
  | 'filesystem_write'
  | 'filesystem_execute'
  | 'network_access'
  | 'process_spawn'
  | 'environment_access'
  | 'system_call'
  | 'memory_limit'
  | 'execution_timeout';

/**
 * Security violation details
 */
export interface SecurityViolation {
  type: ViolationType;
  pluginId: string;
  operation: string;
  target: string;
  timestamp: number;
  blocked: boolean;
  message: string;
}

/**
 * Sandbox execution result
 */
export interface SandboxResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: Error;
  violations: SecurityViolation[];
  executionTime: number;
  memoryUsage: number;
}

/**
 * Plugin sandbox interface
 */
export interface IPluginSandbox {
  execute<T>(
    pluginContext: PluginContext,
    operation: () => Promise<T>
  ): Promise<SandboxResult<T>>;
  
  validatePermissions(
    pluginContext: PluginContext,
    operation: string,
    target: string
  ): boolean;
  
  getViolations(pluginId?: string): SecurityViolation[];
  clearViolations(pluginId?: string): void;
}

/**
 * File system operation types
 */
export type FileSystemOperation = 
  | 'read'
  | 'write'
  | 'delete'
  | 'create'
  | 'list'
  | 'stat'
  | 'watch';

/**
 * Network operation types
 */
export type NetworkOperation = 
  | 'http_request'
  | 'https_request'
  | 'tcp_connect'
  | 'udp_send'
  | 'dns_lookup';

/**
 * Process operation types
 */
export type ProcessOperation = 
  | 'spawn'
  | 'exec'
  | 'fork'
  | 'kill'
  | 'signal';

/**
 * Restricted CLI context for plugins
 */
export interface RestrictedCLIContext {
  // Safe operations only
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  
  // Controlled file system access
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  
  // Controlled network access
  fetch: (url: string, options?: FetchOptions) => Promise<FetchResponse>;
  
  // Plugin metadata
  getPluginInfo: () => PluginContext;
  
  // Cache access
  cache: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<boolean>;
  };
}

/**
 * Audit category types
 */
export type AuditCategory = 
  | 'environment'
  | 'database'
  | 'filesystem'
  | 'dependencies'
  | 'sandbox'
  | 'configuration';

/**
 * Audit options for security scanning
 */
export interface AuditOptions {
  verbose?: boolean;
  fix?: boolean;
  output?: string;
  categories?: AuditCategory[];
  format?: 'json' | 'table' | 'summary';
}

/**
 * Individual audit result
 */
export interface AuditResult {
  category: AuditCategory;
  status: 'pass' | 'warning' | 'error';
  message: string;
  details: string[];
  fixable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Audit summary statistics
 */
export interface AuditSummary {
  total: number;
  passed: number;
  warnings: number;
  errors: number;
  fixable: number;
  duration: number; // milliseconds
}

/**
 * Comprehensive audit report
 */
export interface AuditReport {
  timestamp: string;
  projectPath: string;
  configUsed: SecurityConfig;
  summary: AuditSummary;
  results: AuditResult[];
  violations: SecurityViolation[];
  recommendations: string[];
}

/**
 * Security fix result
 */
export interface FixResult {
  category: AuditCategory;
  success: boolean;
  message: string;
  error?: string;
  appliedAt: string;
  backupCreated?: string;
  changesApplied: FixChange[];
}

/**
 * Individual fix change
 */
export interface FixChange {
  type: 'file_modify' | 'file_create' | 'file_delete' | 'config_update' | 'env_update';
  target: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * Environment audit configuration
 */
export interface EnvironmentAuditConfig {
  enabled: boolean;
  sensitivePatterns: RegExp[];
  excludePatterns: RegExp[];
  checkHardcodedSecrets: boolean;
  strictMode: boolean; // When true, flags development values as potential issues in production
}

/**
 * Database audit configuration
 */
export interface DatabaseAuditConfig {
  enabled: boolean;
  checkCredentials: boolean;
  allowedHosts: string[];
  requireSSL: boolean;
  checkConnectionStrings: boolean;
}

/**
 * File system audit configuration
 */
export interface FileSystemAuditConfig {
  enabled: boolean;
  sensitiveFiles: string[];
  excludePaths: string[];
  checkPermissions: boolean;
  scanForSecrets: boolean;
}

/**
 * Dependency audit configuration
 */
export interface DependencyAuditConfig {
  enabled: boolean;
  vulnerabilityThreshold: 'low' | 'medium' | 'high' | 'critical';
  excludePackages: string[];
  checkLicenses: boolean;
  allowedLicenses: string[];
}