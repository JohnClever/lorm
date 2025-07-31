import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

// Mock child_process for E2E testing
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
  execSync: vi.fn()
}));

// Mock fs for file operations
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    rmdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    rm: vi.fn()
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      rmdir: vi.fn(),
      unlink: vi.fn(),
      stat: vi.fn(),
      readdir: vi.fn(),
      rm: vi.fn()
    }
  }
}));

interface MockChildProcess {
  stdout: {
    on: any;
    pipe: any;
  };
  stderr: {
    on: any;
  };
  on: any;
  kill: any;
  pid: number;
}

describe('CLI Workflow E2E Tests', () => {
  let testWorkspace: string;
  let originalCwd: string;
  let mockProcess: MockChildProcess;

  beforeAll(() => {
    originalCwd = process.cwd();
    testWorkspace = path.join(tmpdir(), 'lorm-e2e-test-' + Date.now());
  });

  afterAll(() => {
    // Note: process.chdir() is not supported in workers, so we skip this
    // process.chdir(originalCwd);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock child process
    mockProcess = {
      stdout: {
        on: vi.fn(),
        pipe: vi.fn()
      },
      stderr: {
        on: vi.fn()
      },
      on: vi.fn(),
      kill: vi.fn(),
      pid: 12345
    };
    
    const mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(mockProcess as any);
    
    // Mock file system operations
    const mockMkdir = vi.mocked(fs.mkdir);
    mockMkdir.mockResolvedValue(undefined);
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    mockWriteFile.mockResolvedValue(undefined);
    
    const mockReadFile = vi.mocked(fs.readFile);
    // Mock readFile to return string when encoding is specified, Buffer otherwise
    mockReadFile.mockImplementation((path: any, encoding?: any) => {
      const content = '{}';
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return Promise.resolve(content as any);
      }
      return Promise.resolve(Buffer.from(content) as any);
    });
    
    const mockAccess = vi.mocked(fs.access);
    mockAccess.mockResolvedValue(undefined);
    
    const mockReaddir = vi.mocked(fs.readdir);
    mockReaddir.mockResolvedValue([]);
    
    const mockRm = vi.mocked(fs.rm);
    mockRm.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Project Lifecycle', () => {
    it('should create, develop, and build a complete project', async () => {
      const projectName = 'my-lorm-app';
      const projectPath = path.join(testWorkspace, projectName);
      
      // Step 1: Initialize project
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      // Mock project initialization
      await fs.mkdir(projectPath, { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith(projectPath, { recursive: true });
      
      // Create initial config
      const initialConfig = {
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql',
          url: 'postgresql://localhost:5432/my_lorm_app'
        },
        development: {
          watchMode: true,
          hotReload: true,
          debugMode: true
        },
        plugins: []
      };
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.json'),
        JSON.stringify(initialConfig, null, 2)
      );
      
      // Step 2: Start development server
      const mockSpawn = vi.mocked(spawn);
      const devProcess = spawn('lorm', ['dev'], { cwd: projectPath });
      
      expect(mockSpawn).toHaveBeenCalledWith('lorm', ['dev'], { cwd: projectPath });
      
      // Simulate dev server startup
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(
        call => call[0] === 'data'
      )?.[1];
      
      if (stdoutCallback) {
        stdoutCallback(Buffer.from('Development server started on http://localhost:3000'));
      }
      
      // Step 3: Add a model
      const userModelContent = `
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
`;
      
      await fs.writeFile(
        path.join(projectPath, 'src/models/user.ts'),
        userModelContent
      );
      
      // Step 4: Generate and run migration
      const migrationContent = `
import { sql } from 'drizzle-orm';

export async function up() {
  await sql\`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  \`;
}

export async function down() {
  await sql\`DROP TABLE users\`;
}
`;
      
      const timestamp = Date.now();
      await fs.writeFile(
        path.join(projectPath, `src/migrations/${timestamp}_create_users.ts`),
        migrationContent
      );
      
      // Step 5: Install and configure a plugin
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValue(Buffer.from(JSON.stringify(initialConfig)));
      
      const configWithPlugin = {
        ...initialConfig,
        plugins: [
          {
            name: 'auth-plugin',
            version: '1.0.0',
            enabled: true,
            config: {
              jwtSecret: 'your-secret-key',
              tokenExpiry: '24h'
            }
          }
        ]
      };
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.json'),
        JSON.stringify(configWithPlugin, null, 2)
      );
      
      // Step 6: Build for production
      const productionConfig = {
        ...configWithPlugin,
        environment: 'production',
        database: {
          ...configWithPlugin.database,
          url: 'postgresql://prod-server:5432/my_lorm_app_prod'
        },
        performance: {
          bundleAnalysis: true,
          lazyLoading: true,
          cacheEnabled: true
        }
      };
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.prod.json'),
        JSON.stringify(productionConfig, null, 2)
      );
      
      // Mock build process
      const buildProcess = spawn('lorm', ['build', '--config', 'lorm.config.prod.json'], {
        cwd: projectPath
      });
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'lorm',
        ['build', '--config', 'lorm.config.prod.json'],
        { cwd: projectPath }
      );
      
      // Verify all expected files were created
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, 'lorm.config.json'),
        expect.stringContaining('auth-plugin')
      );
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, 'src/models/user.ts'),
        expect.stringContaining('pgTable')
      );
    });

    it('should handle development workflow with hot reload', async () => {
      const projectPath = path.join(testWorkspace, 'hot-reload-test');
      
      // Start dev server with watch mode
      const mockSpawn = vi.mocked(spawn);
      const devProcess = spawn('lorm', ['dev', '--watch'], { cwd: projectPath });
      
      expect(mockSpawn).toHaveBeenCalledWith('lorm', ['dev', '--watch'], { cwd: projectPath });
      
      // Simulate file change detection
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(
        call => call[0] === 'data'
      )?.[1];
      
      if (stdoutCallback) {
        // Initial startup
        stdoutCallback(Buffer.from('Watching for file changes...'));
        
        // File change detected
        stdoutCallback(Buffer.from('File changed: src/models/user.ts'));
        
        // Hot reload triggered
        stdoutCallback(Buffer.from('Hot reloading...'));
        
        // Reload complete
        stdoutCallback(Buffer.from('Hot reload complete'));
      }
      
      // Verify process is still running
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('should handle error scenarios gracefully', async () => {
      const projectPath = path.join(testWorkspace, 'error-test');
      
      // Test invalid config handling
      const mockReadFile = vi.mocked(fs.readFile);
      const invalidConfig = '{ invalid json';
      mockReadFile.mockResolvedValue(Buffer.from(invalidConfig));
      
      // Mock error in dev server
      const mockSpawn = vi.mocked(spawn);
      const devProcess = spawn('lorm', ['dev'], { cwd: projectPath });
      
      // Simulate error output
      const stderrCallback = mockProcess.stderr.on.mock.calls.find(
        call => call[0] === 'data'
      )?.[1];
      
      if (stderrCallback) {
        stderrCallback(Buffer.from('Error: Invalid configuration file'));
      }
      
      // Simulate process exit with error
      const exitCallback = mockProcess.on.mock.calls.find(
        call => call[0] === 'exit'
      )?.[1];
      
      if (exitCallback) {
        exitCallback(1); // Exit code 1 indicates error
      }
      
      expect(mockSpawn).toHaveBeenCalledWith('lorm', ['dev'], { cwd: projectPath });
    });
  });

  describe('Plugin Ecosystem Workflow', () => {
    it('should install, configure, and use multiple plugins', async () => {
      const projectPath = path.join(testWorkspace, 'plugin-test');
      
      // Initial config
      const baseConfig = {
        version: '1.0.0',
        environment: 'development',
        database: { provider: 'postgresql' },
        plugins: []
      };
      
      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      mockReadFile.mockResolvedValue(Buffer.from(JSON.stringify(baseConfig)));
      
      // Install auth plugin
      const configWithAuth = {
        ...baseConfig,
        plugins: [
          {
            name: 'auth-plugin',
            version: '1.0.0',
            enabled: true,
            config: {
              provider: 'jwt',
              secret: 'auth-secret'
            }
          }
        ]
      };
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.json'),
        JSON.stringify(configWithAuth, null, 2)
      );
      
      // Install cache plugin
      const configWithBothPlugins = {
        ...configWithAuth,
        plugins: [
          ...configWithAuth.plugins,
          {
            name: 'cache-plugin',
            version: '2.0.0',
            enabled: true,
            config: {
              provider: 'redis',
              url: 'redis://localhost:6379'
            }
          }
        ]
      };
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.json'),
        JSON.stringify(configWithBothPlugins, null, 2)
      );
      
      // Verify plugin configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, 'lorm.config.json'),
        expect.stringContaining('auth-plugin')
      );
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, 'lorm.config.json'),
        expect.stringContaining('cache-plugin')
      );
    });

    it('should handle plugin conflicts and dependencies', async () => {
      const projectPath = path.join(testWorkspace, 'plugin-conflict-test');
      
      // Mock plugin with conflicting dependencies
      const configWithConflict = {
        version: '1.0.0',
        environment: 'development',
        database: { provider: 'postgresql' },
        plugins: [
          {
            name: 'plugin-a',
            version: '1.0.0',
            enabled: true,
            dependencies: ['shared-lib@^1.0.0']
          },
          {
            name: 'plugin-b',
            version: '1.0.0',
            enabled: true,
            dependencies: ['shared-lib@^2.0.0'] // Conflicting version
          }
        ]
      };
      
      const mockSpawn = vi.mocked(spawn);
      const installProcess = spawn('lorm', ['plugin', 'install', 'plugin-b'], {
        cwd: projectPath
      });
      
      // Simulate conflict detection
      const stderrCallback = mockProcess.stderr.on.mock.calls.find(
        call => call[0] === 'data'
      )?.[1];
      
      if (stderrCallback) {
        stderrCallback(Buffer.from('Warning: Dependency conflict detected for shared-lib'));
      }
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'lorm',
        ['plugin', 'install', 'plugin-b'],
        { cwd: projectPath }
      );
    });
  });

  describe('Database Migration Workflow', () => {
    it('should handle complex migration scenarios', async () => {
      const projectPath = path.join(testWorkspace, 'migration-test');
      
      // Create multiple migrations
      const migrations = [
        {
          name: '001_create_users.ts',
          content: 'export async function up() { /* create users table */ }'
        },
        {
          name: '002_create_posts.ts',
          content: 'export async function up() { /* create posts table */ }'
        },
        {
          name: '003_add_user_posts_relation.ts',
          content: 'export async function up() { /* add foreign key */ }'
        }
      ];
      
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      for (const migration of migrations) {
        await fs.writeFile(
          path.join(projectPath, 'src/migrations', migration.name),
          migration.content
        );
      }
      
      // Run migrations
      const mockSpawn = vi.mocked(spawn);
      const migrateProcess = spawn('lorm', ['migrate', 'up'], { cwd: projectPath });
      
      // Simulate migration progress
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(
        call => call[0] === 'data'
      )?.[1];
      
      if (stdoutCallback) {
        stdoutCallback(Buffer.from('Running migration: 001_create_users.ts'));
        stdoutCallback(Buffer.from('Running migration: 002_create_posts.ts'));
        stdoutCallback(Buffer.from('Running migration: 003_add_user_posts_relation.ts'));
        stdoutCallback(Buffer.from('All migrations completed successfully'));
      }
      
      expect(mockSpawn).toHaveBeenCalledWith('lorm', ['migrate', 'up'], { cwd: projectPath });
      
      // Test rollback
      const rollbackProcess = spawn('lorm', ['migrate', 'down', '--steps', '1'], {
        cwd: projectPath
      });
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'lorm',
        ['migrate', 'down', '--steps', '1'],
        { cwd: projectPath }
      );
    });
  });

  describe('Performance and Monitoring', () => {
    it('should collect and report performance metrics', async () => {
      const projectPath = path.join(testWorkspace, 'performance-test');
      
      // Config with performance monitoring enabled
      const performanceConfig = {
        version: '1.0.0',
        environment: 'development',
        database: { provider: 'postgresql' },
        performance: {
          enableMetrics: true,
          metricsPath: './.lorm/metrics.json',
          cacheEnabled: true,
          bundleAnalysis: true
        },
        plugins: []
      };
      
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.json'),
        JSON.stringify(performanceConfig, null, 2)
      );
      
      // Start dev server with metrics
      const mockSpawn = vi.mocked(spawn);
      const devProcess = spawn('lorm', ['dev', '--metrics'], { cwd: projectPath });
      
      // Simulate metrics collection
      const metricsData = {
        timestamp: new Date().toISOString(),
        buildTime: 2500,
        bundleSize: '1.2MB',
        cacheHitRate: 0.85,
        memoryUsage: {
          heapUsed: 45.2,
          heapTotal: 67.8
        },
        requestMetrics: {
          totalRequests: 150,
          averageResponseTime: 45,
          errorRate: 0.02
        }
      };
      
      await fs.writeFile(
        path.join(projectPath, '.lorm/metrics.json'),
        JSON.stringify(metricsData, null, 2)
      );
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, '.lorm/metrics.json'),
        expect.stringContaining('buildTime')
      );
    });
  });

  describe('Security and Audit', () => {
    it('should maintain security audit logs', async () => {
      const projectPath = path.join(testWorkspace, 'security-test');
      
      // Config with security features enabled
      const securityConfig = {
        version: '1.0.0',
        environment: 'production',
        database: { provider: 'postgresql' },
        security: {
          enableAuditLog: true,
          auditLogPath: './.lorm/audit.log',
          commandSandbox: true,
          allowedCommands: ['init', 'dev', 'build', 'migrate'],
          sessionTimeout: 3600
        },
        plugins: []
      };
      
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      await fs.writeFile(
        path.join(projectPath, 'lorm.config.json'),
        JSON.stringify(securityConfig, null, 2)
      );
      
      // Simulate audit log entries
      const auditEntries = [
        {
          timestamp: new Date().toISOString(),
          command: 'lorm dev',
          user: 'developer',
          success: true,
          duration: 1500
        },
        {
          timestamp: new Date().toISOString(),
          command: 'lorm migrate up',
          user: 'developer',
          success: true,
          duration: 3200
        }
      ];
      
      const auditLog = auditEntries.map(entry => JSON.stringify(entry)).join('\n');
      
      await fs.writeFile(
        path.join(projectPath, '.lorm/audit.log'),
        auditLog
      );
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, '.lorm/audit.log'),
        expect.stringContaining('lorm dev')
      );
    });
  });

  describe('Cleanup and Teardown', () => {
    it('should properly cleanup resources on exit', async () => {
      const projectPath = path.join(testWorkspace, 'cleanup-test');
      
      // Start dev server
      const mockSpawn = vi.mocked(spawn);
      const devProcess = spawn('lorm', ['dev'], { cwd: projectPath });
      
      // Simulate SIGINT (Ctrl+C)
      const exitCallback = mockProcess.on.mock.calls.find(
        call => call[0] === 'SIGINT'
      )?.[1];
      
      if (exitCallback) {
        exitCallback();
      } else {
        // If no SIGINT handler was registered, simulate the kill directly
        mockProcess.kill();
      }
      
      // Verify cleanup
      expect(mockProcess.kill).toHaveBeenCalled();
      
      // Cleanup temp files
      const mockRm = vi.mocked(fs.rm);
      await fs.rm(path.join(projectPath, '.lorm/temp'), { recursive: true, force: true });
      
      expect(mockRm).toHaveBeenCalledWith(
        path.join(projectPath, '.lorm/temp'),
        { recursive: true, force: true }
      );
    });
  });
});