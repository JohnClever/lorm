import { describe, it, expect } from 'vitest';
import { LormConfigSchema, type LormConfig } from '../../src/utils/config-schema';
import { ZodError } from 'zod';

describe('Config Schema', () => {
  describe('valid configurations', () => {
    it('should validate minimal valid config', () => {
      const config: LormConfig = {
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql'
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate complete config', () => {
      const config: LormConfig = {
        version: '1.0.0',
        environment: 'production',
        database: {
          provider: 'postgresql',
          url: 'postgresql://localhost:5432/test',
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass',
          ssl: true,
          migrations: {
            directory: './migrations',
            table: '__drizzle_migrations',
            schema: 'public'
          }
        },
        security: {
          encryption: {
            algorithm: 'aes-256-gcm',
            keyLength: 256
          },
          authentication: {
            required: true,
            methods: ['jwt', 'oauth']
          },
          authorization: {
            roles: ['admin', 'user'],
            permissions: {
              admin: ['read', 'write', 'delete'],
              user: ['read']
            }
          },
          enableAuditLog: true,
          auditLogPath: './.lorm/audit.log',
          commandSandbox: true,
          allowedCommands: ['init', 'dev'],
          encryptionKey: 'test-key',
          sessionTimeout: 7200
        },
        performance: {
          enabled: true,
          logPath: './.lorm/performance.log',
          maxLogSize: 10485760,
          retentionDays: 30,
          slowCommandThreshold: 1000,
          memoryWarningThreshold: 0.8
        },
        plugins: [
          {
            name: 'test-plugin',
            version: '1.0.0',
            enabled: true,
            config: {
              option1: 'value1',
              option2: 42
            },
            marketplace: {
              verified: true,
              premium: false
            }
          }
        ],
        development: {
          watchMode: true,
          hotReload: true,
          debugMode: true,
          verboseLogging: true,
          sourceMap: true,
          typeChecking: true
        },
        customCommands: {
          'custom-cmd': {
            description: 'Custom command',
            script: 'echo hello',
            category: 'utility'
          }
        }
      };

      expect(() => LormConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate config with different database providers', () => {
      const configs = [
        {
          provider: 'postgresql' as const,
          url: 'postgresql://localhost:5432/test'
        },
        {
          provider: 'mysql' as const,
          url: 'mysql://localhost:3306/test'
        },
        {
          provider: 'sqlite' as const,
          url: 'file:./test.db'
        },
        {
          provider: 'turso' as const,
          url: 'libsql://localhost:8080/test'
        }
      ];
      
      configs.forEach(dbConfig => {
        const config: LormConfig = {
          version: '1.0.0',
          environment: 'development',
          database: dbConfig,
          plugins: []
        };

        expect(() => LormConfigSchema.parse(config)).not.toThrow();
      });
    });
  });

  describe('invalid configurations', () => {
    it('should reject config without database', () => {
      const config = {
        version: '1.0.0',
        environment: 'development',
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should reject config with invalid database provider', () => {
      const config = {
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'invalid-provider',
          url: 'postgresql://localhost:5432/test'
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should reject config with invalid environment', () => {
      const config = {
        version: '1.0.0',
        environment: 'invalid-env',
        database: {
          provider: 'postgresql'
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should accept any plugin structure since validation moved to @lorm/core', () => {
      const config = {
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql'
        },
        plugins: [
          {
            // any structure is allowed since plugins use z.unknown()
            enabled: true
          }
        ]
      };

      expect(() => LormConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject config with invalid security settings', () => {
      const config = {
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql'
        },
        security: {
          encryption: {
            algorithm: 'aes-256-gcm',
            keyLength: 256
          },
          authentication: {
            required: true,
            methods: ['jwt', 'oauth']
          },
          authorization: {
            roles: ['admin', 'user'],
            permissions: {
              admin: ['read', 'write', 'delete'],
              user: ['read']
            }
          },
          enableAuditLog: 'invalid', // should be boolean
          sessionTimeout: -1 // should be positive
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should reject config with invalid performance settings', () => {
      const config = {
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql'
        },
        performance: {
          enabled: 'invalid', // should be boolean
          maxLogSize: -1 // should be positive
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('default values', () => {
    it('should apply default values for optional fields', () => {
      const config = {
        database: {
          provider: 'postgresql' as const
        },
        plugins: []
      };

      const parsed = LormConfigSchema.parse(config);
      
      // Check that optional fields get default values
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.environment).toBe('development');
    });

    it('should preserve provided values over defaults', () => {
      const config = {
        version: '2.0.0',
        environment: 'production' as const,
        database: {
          provider: 'postgresql' as const,
          url: 'postgresql://localhost:5432/test',
          ssl: true
        },
        plugins: []
      };

      const parsed = LormConfigSchema.parse(config);
      
      expect(parsed.version).toBe('2.0.0');
      expect(parsed.environment).toBe('production');
      expect(parsed.database.ssl).toBe(true);
    });
  });

  describe('nested validation', () => {
    it('should validate nested security configuration', () => {
      const config = {
        version: '1.0.0',
        environment: 'development' as const,
        database: {
          provider: 'postgresql' as const
        },
        security: {
          encryption: {
            algorithm: 'aes-256-gcm',
            keyLength: 256
          },
          authentication: {
            required: true,
            methods: ['jwt', 'oauth']
          },
          authorization: {
            roles: ['admin', 'user'],
            permissions: {
              admin: ['read', 'write', 'delete'],
              user: ['read']
            }
          },
          enableAuditLog: true,
          auditLogPath: './.lorm/audit.log',
          commandSandbox: true,
          allowedCommands: ['init', 'dev'],
          encryptionKey: 'test-key',
          sessionTimeout: 3600
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate nested performance configuration', () => {
      const config = {
        version: '1.0.0',
        environment: 'development' as const,
        database: {
          provider: 'postgresql' as const
        },
        performance: {
          enabled: true,
          logPath: './.lorm/performance.log',
          maxLogSize: 1024 * 1024,
          retentionDays: 7,
          slowCommandThreshold: 1000,
          memoryWarningThreshold: 100 * 1024 * 1024
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate nested development configuration', () => {
      const config = {
        version: '1.0.0',
        environment: 'development' as const,
        database: {
          provider: 'postgresql' as const
        },
        development: {
          watchMode: true,
          hotReload: false,
          debugMode: true,
          verboseLogging: false,
          sourceMap: true,
          typeChecking: true
        },
        plugins: []
      };

      expect(() => LormConfigSchema.parse(config)).not.toThrow();
    });
  });
});