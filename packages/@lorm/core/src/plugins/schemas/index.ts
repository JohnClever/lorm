import { z } from "zod";

// Plugin Manager Configuration Schema
export const PluginManagerConfigSchema = z.object({
  maxPlugins: z.number().min(1).default(100),
  allowedSources: z
    .array(z.enum(["npm", "git", "local"]))
    .default(["npm", "git", "local"]),
  autoUpdate: z.boolean().default(false),
  autoLoad: z.boolean().default(true),
  allowRemotePlugins: z.boolean().default(true),
  updateCheckInterval: z.number().min(0).default(86400000), // 24 hours
  sandboxMode: z.boolean().default(true),
  trustedPlugins: z.array(z.string()).default([]),
  enableHooks: z.boolean().default(true),
  requireAuth: z.boolean().default(false),
  authorizedUsers: z.array(z.string()).optional(),
  enableTelemetry: z.boolean().default(false),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  premium: z
    .object({
      enabled: z.boolean().default(false),
      licenseKey: z.string().optional(),
    })
    .optional(),
  marketplace: z
    .object({
      enabled: z.boolean().default(true),
      registryUrl: z.string().optional(),
      apiKey: z.string().optional(),
    })
    .default({ enabled: true }),
});

// Validation Configuration Schema
export const ValidationConfigSchema = z.object({
  strict: z.boolean().default(true),
  allowUnknownFields: z.boolean().default(false),
  validateDependencies: z.boolean().default(true),
  validateEngines: z.boolean().default(true),
  validateCommands: z.boolean().default(true),
  validateHooks: z.boolean().default(true),
  validateConfig: z.boolean().default(true),
  validatePermissions: z.boolean().default(true),
  validateLicense: z.boolean().default(true),
  maxErrors: z.number().min(1).default(10),
  timeout: z.number().min(0).default(30000),
});

// Hook System Configuration Schema
export const HookSystemConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxHooks: z.number().min(1).default(100),
  timeout: z.number().min(0).default(5000),
  retries: z.number().min(0).default(3),
  parallel: z.boolean().default(true),
  errorHandling: z.enum(["throw", "log", "ignore"]).default("log"),
  middleware: z
    .object({
      enabled: z.boolean().default(true),
      timeout: z.number().min(0).default(1000),
    })
    .default({ enabled: true, timeout: 1000 }),
});

// Lifecycle Configuration Schema
export const LifecycleConfigSchema = z.object({
  timeout: z.number().min(0).default(30000),
  retries: z.number().min(0).default(3),
  parallel: z.boolean().default(false),
  errorHandling: z.enum(["throw", "log", "ignore"]).default("log"),
  hooks: z
    .object({
      onInstall: z.boolean().default(true),
      onUninstall: z.boolean().default(true),
      onActivate: z.boolean().default(true),
      onDeactivate: z.boolean().default(true),
      onUpdate: z.boolean().default(true),
      onConfigChange: z.boolean().default(true),
    })
    .default({
      onInstall: true,
      onUninstall: true,
      onActivate: true,
      onDeactivate: true,
      onUpdate: true,
      onConfigChange: true,
    }),
});

// Security Configuration Schema
export const SecurityConfigSchema = z.object({
  sandboxMode: z.boolean().default(true),
  allowedPermissions: z.array(z.string()).default([]),
  deniedPermissions: z.array(z.string()).default([]),
  trustedPlugins: z.array(z.string()).default([]),
  requireSignature: z.boolean().default(false),
  allowRemoteCode: z.boolean().default(false),
  maxMemoryUsage: z
    .number()
    .min(0)
    .default(512 * 1024 * 1024), // 512MB
  maxCpuUsage: z.number().min(0).max(100).default(80), // 80%
  networkAccess: z
    .object({
      enabled: z.boolean().default(false),
      allowedDomains: z.array(z.string()).default([]),
      deniedDomains: z.array(z.string()).default([]),
    })
    .default({ enabled: false, allowedDomains: [], deniedDomains: [] }),
  fileSystemAccess: z
    .object({
      enabled: z.boolean().default(true),
      allowedPaths: z.array(z.string()).default([]),
      deniedPaths: z.array(z.string()).default([]),
    })
    .default({ enabled: true, allowedPaths: [], deniedPaths: [] }),
});

// Performance Configuration Schema
export const PerformanceConfigSchema = z.object({
  monitoring: z
    .object({
      enabled: z.boolean().default(true),
      interval: z.number().min(1000).default(5000), // 5 seconds
      metrics: z.array(z.string()).default(["memory", "cpu", "execution-time"]),
    })
    .default({
      enabled: true,
      interval: 5000,
      metrics: ["memory", "cpu", "execution-time"],
    }),
  limits: z
    .object({
      maxMemoryUsage: z
        .number()
        .min(0)
        .default(512 * 1024 * 1024), // 512MB
      maxCpuUsage: z.number().min(0).max(100).default(80), // 80%
      maxExecutionTime: z.number().min(0).default(30000), // 30 seconds
      maxFileSize: z
        .number()
        .min(0)
        .default(10 * 1024 * 1024), // 10MB
    })
    .default({
      maxMemoryUsage: 512 * 1024 * 1024,
      maxCpuUsage: 80,
      maxExecutionTime: 30000,
      maxFileSize: 10 * 1024 * 1024,
    }),
  optimization: z
    .object({
      caching: z.boolean().default(true),
      compression: z.boolean().default(true),
      minification: z.boolean().default(false),
    })
    .default({ caching: true, compression: true, minification: false }),
});

// Main Plugin System Configuration Schema
export const PluginSystemConfigSchema = z.object({
  manager: PluginManagerConfigSchema,
  validation: ValidationConfigSchema,
  hookSystem: HookSystemConfigSchema,
  lifecycle: LifecycleConfigSchema,
  security: SecurityConfigSchema,
  performance: PerformanceConfigSchema,
});

// Plugin Performance Configuration Schema
export const PluginPerformanceConfigSchema = z.object({
  lazyLoading: z.boolean().default(true),
  cacheSize: z.number().min(1).max(1000).default(50),
  memoryThreshold: z.number().min(1).max(1000).default(100),
  preloadCritical: z.boolean().default(true),
  criticalPlugins: z.array(z.string()).default([]),
  monitoring: z.boolean().default(true),
  cleanupInterval: z.number().min(1000).default(300000), // 5 minutes
  enableMetrics: z.boolean().default(true),
  metricsInterval: z.number().min(1000).default(60000), // 1 minute
  maxConcurrentLoads: z.number().min(1).max(10).default(3),
  loadTimeout: z.number().min(1000).default(30000), // 30 seconds
});

// Simple Plugin Schemas
export const SimplePluginCommandOptionSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean().optional(),
  default: z.any().optional(),
});

export const SimplePluginCommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  action: z.any(), // Functions can't be validated by Zod
  options: z.array(SimplePluginCommandOptionSchema).optional(),
});

export const SimplePluginHookSchema = z.object({
  name: z.string(),
  handler: z.any(), // Functions can't be validated by Zod
});

export const SimplePluginSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  commands: z.array(SimplePluginCommandSchema).optional(),
  hooks: z.array(SimplePluginHookSchema).optional(),
  onActivate: z.any().optional(), // Functions can't be validated by Zod
  onDeactivate: z.any().optional(), // Functions can't be validated by Zod
});

// Plugin Test Configuration Schema
export const PluginTestConfigSchema = z.object({
  testTimeout: z.number().min(1000).default(5000),
  enableCoverage: z.boolean().default(true),
  mockDependencies: z.boolean().default(true),
  isolateTests: z.boolean().default(true),
  maxRetries: z.number().min(0).max(5).default(2),
  parallelTests: z.boolean().default(false),
});

// Type exports
export type PluginManagerConfig = z.infer<typeof PluginManagerConfigSchema>;
export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;
export type HookSystemConfig = z.infer<typeof HookSystemConfigSchema>;
export type LifecycleConfig = z.infer<typeof LifecycleConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type PluginSystemConfig = z.infer<typeof PluginSystemConfigSchema>;
export type PluginPerformanceConfig = z.infer<typeof PluginPerformanceConfigSchema>;
export type SimplePluginCommandOption = z.infer<typeof SimplePluginCommandOptionSchema>;
export type SimplePluginCommand = z.infer<typeof SimplePluginCommandSchema>;
export type SimplePluginHook = z.infer<typeof SimplePluginHookSchema>;
export type SimplePlugin = z.infer<typeof SimplePluginSchema>;
export type PluginTestConfig = z.infer<typeof PluginTestConfigSchema>;