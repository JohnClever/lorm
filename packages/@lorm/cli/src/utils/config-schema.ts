import { z } from 'zod/v4';
const DatabaseConfigSchema = z.object({
  provider: z.enum(['postgresql', 'mysql', 'sqlite', 'turso']),
  url: z.url().optional(),
  host: z.string().optional(),
  port: z.int().positive().optional(),
  database: z.string().min(1).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  ssl: z.boolean().optional(),
  migrations: z.object({
    directory: z.string().prefault('./migrations'),
    table: z.string().prefault('__drizzle_migrations'),
    schema: z.string().optional()
  }).optional()
});
const PluginConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  enabled: z.boolean().prefault(true),
  config: z.record(z.string(), z.unknown()).optional(),
  marketplace: z.object({
    enabled: z.boolean().prefault(true),
    registryUrl: z.string().optional(),
    apiKey: z.string().optional()
  }).optional()
});
const SecurityConfigSchema = z.object({
  encryption: z.object({
    algorithm: z.string(),
    keyLength: z.number()
  }),
  authentication: z.object({
    required: z.boolean(),
    methods: z.array(z.string())
  }),
  authorization: z.object({
    roles: z.array(z.string()),
    permissions: z.record(z.string(), z.array(z.string()))
  }),
  enableAuditLog: z.boolean().prefault(false),
  auditLogPath: z.string().prefault('./.lorm/audit.log'),
  commandSandbox: z.boolean().prefault(false),
  allowedCommands: z.array(z.string()).optional(),
  encryptionKey: z.string().optional(),
  sessionTimeout: z.int().positive().prefault(3600)
});
const PerformanceConfigSchema = z.object({
  enabled: z.boolean().prefault(true),
  logPath: z.string().prefault('./.lorm/performance.log'),
  maxLogSize: z.number().prefault(1024 * 1024),
  retentionDays: z.number().prefault(7),
  slowCommandThreshold: z.number().prefault(1000),
  memoryWarningThreshold: z.number().prefault(100 * 1024 * 1024)
});
const DevConfigSchema = z.object({
  watchMode: z.boolean().prefault(true),
  hotReload: z.boolean().prefault(false),
  debugMode: z.boolean().prefault(false),
  verboseLogging: z.boolean().prefault(false),
  sourceMap: z.boolean().prefault(true),
  typeChecking: z.boolean().prefault(true)
});
export const LormConfigSchema = z.object({
  version: z.string().prefault('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).prefault('development'),
  database: DatabaseConfigSchema,
  plugins: z.array(PluginConfigSchema).prefault([]),
  security: SecurityConfigSchema.optional(),
  performance: PerformanceConfigSchema.optional(),
  development: DevConfigSchema.optional(),
  customCommands: z.record(z.string(), z.object({
    description: z.string(),
    script: z.string(),
    category: z.string().optional()
  })).optional()
});
export const DevelopmentEnvConfigSchema = LormConfigSchema.extend({
  environment: z.literal('development'),
  development: DevConfigSchema.required()
});
export const ProductionEnvConfigSchema = LormConfigSchema.extend({
  environment: z.literal('production'),
  security: SecurityConfigSchema.required(),
  performance: PerformanceConfigSchema.required()
});
export const ConfigMigrationSchema = z.object({
  from: z.string(),
  to: z.string(),
  migrations: z.array(z.object({
    path: z.string(),
    transform: z.function()
  }))
});
import { 
  LormConfig, 
  DatabaseConfig, 
  SecurityConfig, 
  PerformanceConfig, 
  DevelopmentConfig, 
  ConfigMigration 
} from '../types.js';

export type { 
  LormConfig, 
  DatabaseConfig, 
  SecurityConfig, 
  PerformanceConfig, 
  DevelopmentConfig, 
  ConfigMigration 
};
export class ConfigValidator {
  static validate(config: unknown): LormConfig {
    return LormConfigSchema.parse(config);
  }
  static validatePartial(config: unknown): Partial<LormConfig> {
    return LormConfigSchema.partial().parse(config);
  }
  static validateEnvironment(config: unknown, environment: string): LormConfig {
    switch (environment) {
      case 'development':
        return DevelopmentEnvConfigSchema.parse(config);
      case 'production':
        return ProductionEnvConfigSchema.parse(config);
      default:
        return LormConfigSchema.parse(config);
    }
  }
  static getValidationErrors(config: unknown): z.ZodError | null {
    const result = LormConfigSchema.safeParse(config);
    return result.success ? null : result.error;
  }
  static formatValidationErrors(error: z.ZodError): string[] {
    return error.issues.map((err: z.ZodIssue) => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
  }
  static getDefaultConfig(environment: string = 'development'): LormConfig {
    const baseConfig = {
      version: '1.0.0',
      environment: environment as 'development' | 'staging' | 'production',
      database: {
        provider: 'postgresql' as const,
        migrations: {
          directory: './migrations',
          table: '__drizzle_migrations'
        }
      },
      plugins: [],
      security: {
        enableAuditLog: environment === 'production',
        commandSandbox: environment === 'production'
      },
      performance: {
        enableMetrics: true,
        cacheEnabled: true,
        bundleAnalysis: environment === 'production'
      },
      development: {
        watchMode: environment === 'development',
        debugMode: environment === 'development',
        verboseLogging: environment === 'development'
      }
    };
    return LormConfigSchema.parse(baseConfig);
  }
}