import { defineConfig } from 'vitest/config';
import { vi } from 'vitest';
import path from 'path';

/**
 * Test configuration for LORM CLI
 * This file contains shared test utilities and configurations
 */

export const testConfig = {
  // Test directories
  testDir: path.resolve(__dirname),
  unitTestDir: path.resolve(__dirname, 'unit'),
  integrationTestDir: path.resolve(__dirname, 'integration'),
  e2eTestDir: path.resolve(__dirname, 'e2e'),
  mocksDir: path.resolve(__dirname, '__mocks__'),
  
  // Test data
  fixtures: {
    validConfig: {
      version: '1.0.0',
      environment: 'development' as const,
      database: {
        provider: 'postgresql' as const,
        url: 'postgresql://localhost:5432/test'
      },
      plugins: []
    },
    
    invalidConfig: {
      version: '1.0.0',
      // Missing required database field
      plugins: []
    },
    
    productionConfig: {
      version: '1.0.0',
      environment: 'production' as const,
      database: {
        provider: 'postgresql' as const,
        url: 'postgresql://prod-server:5432/app',
        ssl: true,
        poolSize: 20
      },
      security: {
        enableAuditLog: true,
        auditLogPath: './.lorm/audit.log',
        commandSandbox: true,
        allowedCommands: ['migrate', 'build'],
        sessionTimeout: 3600
      },
      performance: {
        enableMetrics: true,
        metricsPath: './.lorm/metrics.json',
        cacheEnabled: true,
        bundleAnalysis: true
      },
      plugins: [
        {
          name: 'auth-plugin',
          version: '1.0.0',
          enabled: true,
          config: {
            provider: 'jwt',
            secret: 'production-secret'
          }
        }
      ]
    },
    
    pluginConfig: {
      name: 'test-plugin',
      version: '1.0.0',
      enabled: true,
      config: {
        option1: 'value1',
        option2: 42,
        nested: {
          setting: true
        }
      },
      marketplace: {
        verified: true,
        premium: false
      }
    }
  },
  
  // Mock data
  mocks: {
    fileSystem: {
      existingFiles: [
        '/project/lorm.config.json',
        '/project/package.json',
        '/project/src/index.ts'
      ],
      
      directories: [
        '/project',
        '/project/src',
        '/project/src/models',
        '/project/src/migrations',
        '/project/tests'
      ]
    },
    
    commands: {
      successful: {
        init: 'Project initialized successfully',
        dev: 'Development server started on http://localhost:3000',
        build: 'Build completed successfully',
        migrate: 'Migrations completed successfully'
      },
      
      errors: {
        invalidConfig: 'Invalid configuration file',
        missingDependency: 'Missing required dependency',
        permissionDenied: 'Permission denied',
        networkError: 'Network connection failed'
      }
    },
    
    processes: {
      devServer: {
        pid: 12345,
        port: 3000,
        status: 'running'
      },
      
      buildProcess: {
        pid: 12346,
        status: 'completed',
        exitCode: 0
      }
    }
  },
  
  // Test utilities
  timeouts: {
    short: 1000,
    medium: 5000,
    long: 10000
  },
  
  // Environment variables for testing
  testEnv: {
    NODE_ENV: 'test',
    LORM_TEST_MODE: 'true',
    LORM_LOG_LEVEL: 'silent',
    LORM_DISABLE_TELEMETRY: 'true'
  }
};

/**
 * Helper functions for tests
 */
export const testHelpers = {
  /**
   * Create a temporary test directory path
   */
  createTempPath: (suffix: string = '') => {
    const timestamp = Date.now();
    return path.join('/tmp', `lorm-test-${timestamp}${suffix}`);
  },
  
  /**
   * Generate mock file content
   */
  generateMockFileContent: (type: 'config' | 'package' | 'model' | 'migration') => {
    switch (type) {
      case 'config':
        return JSON.stringify(testConfig.fixtures.validConfig, null, 2);
      
      case 'package':
        return JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@lorm/core': '^1.0.0',
            '@lorm/cli': '^1.0.0'
          }
        }, null, 2);
      
      case 'model':
        return `
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const testModel = pgTable('test_model', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 })
});
`;
      
      case 'migration':
        return `
import { sql } from 'drizzle-orm';

export async function up() {
  await sql\`CREATE TABLE test_table (id SERIAL PRIMARY KEY)\`;
}

export async function down() {
  await sql\`DROP TABLE test_table\`;
}
`;
      
      default:
        return '';
    }
  },
  
  /**
   * Create mock command output
   */
  createMockOutput: (command: string, success: boolean = true) => {
    if (success) {
      return testConfig.mocks.commands.successful[command as keyof typeof testConfig.mocks.commands.successful] || 'Command executed successfully';
    } else {
      return testConfig.mocks.commands.errors[command as keyof typeof testConfig.mocks.commands.errors] || 'Command failed';
    }
  },
  
  /**
   * Wait for a specified amount of time (for async testing)
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a mock child process
   */
  createMockProcess: () => ({
    stdout: {
      on: vi.fn(),
      pipe: vi.fn()
    },
    stderr: {
      on: vi.fn()
    },
    on: vi.fn(),
    kill: vi.fn(),
    pid: Math.floor(Math.random() * 10000) + 10000
  }),
  
  /**
   * Validate configuration object
   */
  isValidConfig: (config: any) => {
    return config &&
           typeof config.version === 'string' &&
           typeof config.environment === 'string' &&
           config.database &&
           typeof config.database.provider === 'string' &&
           Array.isArray(config.plugins);
  },
  
  /**
   * Generate test file paths
   */
  generateFilePaths: (projectPath: string) => ({
    config: path.join(projectPath, 'lorm.config.json'),
    package: path.join(projectPath, 'package.json'),
    gitignore: path.join(projectPath, '.gitignore'),
    readme: path.join(projectPath, 'README.md'),
    srcDir: path.join(projectPath, 'src'),
    modelsDir: path.join(projectPath, 'src/models'),
    migrationsDir: path.join(projectPath, 'src/migrations'),
    testsDir: path.join(projectPath, 'tests'),
    lormDir: path.join(projectPath, '.lorm'),
    auditLog: path.join(projectPath, '.lorm/audit.log'),
    metricsFile: path.join(projectPath, '.lorm/metrics.json')
  })
};

/**
 * Test assertions and matchers
 */
export const testMatchers = {
  /**
   * Check if a string contains valid JSON
   */
  toBeValidJSON: (received: string) => {
    try {
      JSON.parse(received);
      return {
        message: () => `Expected ${received} not to be valid JSON`,
        pass: true
      };
    } catch {
      return {
        message: () => `Expected ${received} to be valid JSON`,
        pass: false
      };
    }
  },
  
  /**
   * Check if a config object is valid
   */
  toBeValidLormConfig: (received: any) => {
    const isValid = testHelpers.isValidConfig(received);
    return {
      message: () => isValid 
        ? `Expected ${JSON.stringify(received)} not to be a valid LORM config`
        : `Expected ${JSON.stringify(received)} to be a valid LORM config`,
      pass: isValid
    };
  }
};

export default testConfig;