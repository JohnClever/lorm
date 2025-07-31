import { vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs module
vi.mock('fs', () => import('./__mocks__/fs'));
vi.mock('fs/promises', () => import('./__mocks__/fs').then(m => m.promises));

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset environment variables
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LORM_TEST_MODE', 'true');
  
  // Ensure test directories exist
  const testDirs = [
    './.lorm-test',
    './.lorm-test/logs',
    './.lorm-test/cache',
    './.lorm-test/tmp'
  ];
  
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
});

afterEach(() => {
  // Clean up test files after each test
  const testDir = './.lorm-test';
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  // Restore all mocks
  vi.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  createTempDir: (name: string) => {
    const tempDir = path.join('./.lorm-test/tmp', name);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  },
  
  createTempFile: (filePath: string, content: string = '') => {
    const fullPath = path.join('./.lorm-test/tmp', filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    return fullPath;
  },
  
  mockConfig: {
    database: {
      provider: 'postgresql' as const,
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass'
    },
    security: {
      enableAuditLog: true,
      auditLogPath: './.lorm-test/logs/audit.log',
      commandSandbox: true,
      allowedCommands: ['help', 'init', 'dev'],
      sessionTimeout: 3600,
      encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    },
    performance: {
      enabled: true,
      logPath: './.lorm-test/logs/performance.log',
      maxLogSize: 1024 * 1024,
      retentionDays: 7,
      slowCommandThreshold: 1000,
      memoryWarningThreshold: 100 * 1024 * 1024
    },
    plugins: [
      {
        name: '@lorm/plugin-auth',
        enabled: true
      },
      {
        name: '@lorm/plugin-cache',
        enabled: true
      }
    ]
  }
};

// Extend global types
declare global {
  var testUtils: {
    createTempDir: (name: string) => string;
    createTempFile: (filePath: string, content?: string) => string;
    mockConfig: {
      database: {
        provider: 'postgresql';
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
      };
      security: {
        enableAuditLog: boolean;
        auditLogPath: string;
        commandSandbox: boolean;
        allowedCommands: string[];
        sessionTimeout: number;
        encryptionKey: string;
      };
      performance: {
        enabled: boolean;
        logPath: string;
        maxLogSize: number;
        retentionDays: number;
        slowCommandThreshold: number;
        memoryWarningThreshold: number;
      };
      plugins: Array<{
        name: string;
        enabled: boolean;
      }>;
    };
  };
}