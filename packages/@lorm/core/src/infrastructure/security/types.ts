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
 * Security configuration for plugin sandboxing
 */
export interface SecurityConfig {
  sandboxing: boolean;
  allowedPaths: string[];
  allowedNetworkHosts: string[];
  maxExecutionTime?: number; // in milliseconds
  maxMemoryUsage?: number; // in bytes
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