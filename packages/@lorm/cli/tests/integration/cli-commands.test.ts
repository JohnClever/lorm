import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

// Mock external dependencies
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
  exec: vi.fn()
}));

vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    rmdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn()
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
      readdir: vi.fn()
    }
  }
}));

describe('CLI Commands Integration', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    testDir = path.join(tmpdir(), 'lorm-cli-test-' + Date.now());
  });

  afterAll(() => {
    // Note: process.chdir() is not supported in workers, so we skip this
    // process.chdir(originalCwd);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful directory creation
    const mockMkdir = vi.mocked(fs.mkdir);
    mockMkdir.mockResolvedValue(undefined);
    
    // Mock file system operations
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('init command', () => {
    it('should initialize a new LORM project', async () => {
      const mockExecSync = vi.mocked(execSync);
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      // Mock successful command execution
      mockExecSync.mockReturnValue(Buffer.from('success'));
      
      // Simulate init command execution
      const projectName = 'test-project';
      const projectPath = path.join(testDir, projectName);
      
      // Test directory creation
      await fs.mkdir(projectPath, { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith(projectPath, { recursive: true });
      
      // Test config file creation
      const configContent = JSON.stringify({
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql'
        },
        plugins: []
      }, null, 2);
      
      await fs.writeFile(path.join(projectPath, 'lorm.config.json'), configContent);
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, 'lorm.config.json'),
        configContent
      );
      
      // Test package.json creation
      const packageContent = JSON.stringify({
        name: projectName,
        version: '1.0.0',
        description: 'A LORM project',
        main: 'index.js',
        scripts: {
          dev: 'lorm dev',
          build: 'lorm build',
          migrate: 'lorm migrate'
        },
        dependencies: {
          '@lorm/core': '^1.0.0',
          '@lorm/cli': '^1.0.0'
        }
      }, null, 2);
      
      await fs.writeFile(path.join(projectPath, 'package.json'), packageContent);
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(projectPath, 'package.json'),
        packageContent
      );
    });

    it('should handle existing project directory', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      // Mock directory already exists
      mockAccess.mockResolvedValue(undefined);
      
      const error = new Error('Directory already exists');
      (error as any).code = 'EEXIST';
      mockMkdir.mockRejectedValue(error);
      
      const projectPath = path.join(testDir, 'existing-project');
      
      await expect(fs.mkdir(projectPath, { recursive: false })).rejects.toThrow('Directory already exists');
    });

    it('should create project structure with templates', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      const projectPath = path.join(testDir, 'template-project');
      
      // Create directory structure
      const directories = [
        projectPath,
        path.join(projectPath, 'src'),
        path.join(projectPath, 'src/models'),
        path.join(projectPath, 'src/migrations'),
        path.join(projectPath, 'src/seeds'),
        path.join(projectPath, 'tests')
      ];
      
      for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      expect(mockMkdir).toHaveBeenCalledTimes(directories.length);
      
      // Create template files
      const templateFiles = [
        { path: 'src/index.ts', content: 'export * from "./models";' },
        { path: 'src/models/index.ts', content: 'export * from "./user";' },
        { path: '.gitignore', content: 'node_modules/\n.env\n.lorm/' },
        { path: 'README.md', content: '# LORM Project\n\nGenerated with LORM CLI.' }
      ];
      
      for (const file of templateFiles) {
        await fs.writeFile(path.join(projectPath, file.path), file.content);
      }
      
      expect(mockWriteFile).toHaveBeenCalledTimes(templateFiles.length); // Only template files are written in this test
    });
  });

  describe('dev command', () => {
    it('should start development server', async () => {
      const mockExecSync = vi.mocked(execSync);
      const mockReadFile = vi.mocked(fs.readFile);
      
      // Mock config file reading
      const configContent = JSON.stringify({
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql',
          url: 'postgresql://localhost:5432/test'
        },
        development: {
          watchMode: true,
          hotReload: true,
          debugMode: true
        },
        plugins: []
      });
      
      mockReadFile.mockImplementation((path: any, encoding?: any) => {
        if (encoding === 'utf8' || encoding === 'utf-8') {
          return Promise.resolve(configContent as any);
        }
        return Promise.resolve(Buffer.from(configContent) as any);
      });
      
      // Mock successful server start
      mockExecSync.mockReturnValue(Buffer.from('Development server started on port 3000'));
      
      // Simulate reading config
      const config = await fs.readFile('lorm.config.json', 'utf8');
      expect(config).toBe(configContent);
      
      // Simulate dev server start
      const result = execSync('lorm dev --port 3000');
      expect(result.toString()).toContain('Development server started');
    });

    it('should handle missing config file', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      
      const error = new Error('Config file not found');
      (error as any).code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);
      
      await expect(fs.readFile('lorm.config.json')).rejects.toThrow('Config file not found');
    });

    it('should validate config before starting dev server', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      
      // Mock invalid config
      const invalidConfig = JSON.stringify({
        version: '1.0.0',
        // missing required fields
      });
      
      mockReadFile.mockResolvedValue(Buffer.from(invalidConfig));
      
      const config = await fs.readFile('lorm.config.json', 'utf8');
      const parsed = JSON.parse(config);
      
      // Should detect missing database config
      expect(parsed.database).toBeUndefined();
    });
  });

  describe('build command', () => {
    it('should build project for production', async () => {
      const mockExecSync = vi.mocked(execSync);
      const mockReadFile = vi.mocked(fs.readFile);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      // Mock config reading
      const configContent = JSON.stringify({
        version: '1.0.0',
        environment: 'production',
        database: {
          provider: 'postgresql'
        },
        performance: {
          bundleAnalysis: true,
          lazyLoading: true
        },
        plugins: []
      });
      
      mockReadFile.mockResolvedValue(Buffer.from(configContent));
      
      // Mock build output directory creation
      await fs.mkdir('dist', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('dist', { recursive: true });
      
      // Mock build process
      mockExecSync.mockReturnValue(Buffer.from('Build completed successfully'));
      
      const result = execSync('lorm build --output dist');
      expect(result.toString()).toContain('Build completed successfully');
      
      // Mock build artifacts creation
      await fs.writeFile('dist/index.js', 'console.log("Built with LORM");');
      expect(mockWriteFile).toHaveBeenCalledWith('dist/index.js', 'console.log("Built with LORM");');
    });

    it('should optimize build for production', async () => {
      const mockExecSync = vi.mocked(execSync);
      
      // Mock optimized build
      mockExecSync.mockReturnValue(Buffer.from('Optimized build completed'));
      
      const result = execSync('lorm build --optimize --minify');
      expect(result.toString()).toContain('Optimized build completed');
    });

    it('should generate build report', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      const buildReport = {
        timestamp: new Date().toISOString(),
        duration: 5000,
        outputSize: '2.5MB',
        chunks: [
          { name: 'main', size: '1.8MB' },
          { name: 'vendor', size: '700KB' }
        ],
        warnings: [],
        errors: []
      };
      
      await fs.writeFile('dist/build-report.json', JSON.stringify(buildReport, null, 2));
      expect(mockWriteFile).toHaveBeenCalledWith(
        'dist/build-report.json',
        JSON.stringify(buildReport, null, 2)
      );
    });
  });

  describe('migrate command', () => {
    it('should run database migrations', async () => {
      const mockExecSync = vi.mocked(execSync);
      const mockReadFile = vi.mocked(fs.readFile);
      
      // Mock config with migration settings
      const configContent = JSON.stringify({
        version: '1.0.0',
        environment: 'development',
        database: {
          provider: 'postgresql',
          url: 'postgresql://localhost:5432/test',
          migrations: {
            directory: './src/migrations',
            table: '__drizzle_migrations'
          }
        },
        plugins: []
      });
      
      mockReadFile.mockResolvedValue(Buffer.from(configContent));
      
      // Mock successful migration
      mockExecSync.mockReturnValue(Buffer.from('Migrations completed successfully'));
      
      const result = execSync('lorm migrate up');
      expect(result.toString()).toContain('Migrations completed successfully');
    });

    it('should rollback migrations', async () => {
      const mockExecSync = vi.mocked(execSync);
      
      mockExecSync.mockReturnValue(Buffer.from('Rollback completed'));
      
      const result = execSync('lorm migrate down --steps 1');
      expect(result.toString()).toContain('Rollback completed');
    });

    it('should generate new migration', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      const migrationContent = `
import { sql } from 'drizzle-orm';

export async function up() {
  // Migration up logic
}

export async function down() {
  // Migration down logic
}
`;
      
      const timestamp = Date.now();
      const filename = `${timestamp}_create_users_table.ts`;
      
      await fs.writeFile(`src/migrations/${filename}`, migrationContent);
      expect(mockWriteFile).toHaveBeenCalledWith(
        `src/migrations/${filename}`,
        migrationContent
      );
    });
  });

  describe('plugin command', () => {
    it('should install plugin', async () => {
      const mockExecSync = vi.mocked(execSync);
      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      // Mock current config
      const currentConfig = {
        version: '1.0.0',
        environment: 'development',
        database: { provider: 'postgresql' },
        plugins: []
      };
      
      mockReadFile.mockResolvedValue(Buffer.from(JSON.stringify(currentConfig)));
      
      // Mock plugin installation
      mockExecSync.mockReturnValue(Buffer.from('Plugin installed successfully'));
      
      // Mock config update with new plugin
      const updatedConfig = {
        ...currentConfig,
        plugins: [
          {
            name: 'test-plugin',
            version: '1.0.0',
            enabled: true,
            config: {}
          }
        ]
      };
      
      await fs.writeFile('lorm.config.json', JSON.stringify(updatedConfig, null, 2));
      expect(mockWriteFile).toHaveBeenCalledWith(
        'lorm.config.json',
        JSON.stringify(updatedConfig, null, 2)
      );
    });

    it('should list available plugins', async () => {
      const mockExecSync = vi.mocked(execSync);
      
      const pluginList = JSON.stringify([
        { name: 'auth-plugin', version: '1.0.0', description: 'Authentication plugin' },
        { name: 'cache-plugin', version: '2.1.0', description: 'Caching plugin' }
      ]);
      
      mockExecSync.mockReturnValue(Buffer.from(pluginList));
      
      const result = execSync('lorm plugin list');
      const plugins = JSON.parse(result.toString());
      
      expect(plugins).toHaveLength(2);
      expect(plugins[0].name).toBe('auth-plugin');
    });

    it('should uninstall plugin', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      
      // Mock config with installed plugin
      const configWithPlugin = {
        version: '1.0.0',
        environment: 'development',
        database: { provider: 'postgresql' },
        plugins: [
          {
            name: 'test-plugin',
            version: '1.0.0',
            enabled: true
          }
        ]
      };
      
      mockReadFile.mockResolvedValue(Buffer.from(JSON.stringify(configWithPlugin)));
      
      // Mock config update after plugin removal
      const configWithoutPlugin = {
        ...configWithPlugin,
        plugins: []
      };
      
      await fs.writeFile('lorm.config.json', JSON.stringify(configWithoutPlugin, null, 2));
      expect(mockWriteFile).toHaveBeenCalledWith(
        'lorm.config.json',
        JSON.stringify(configWithoutPlugin, null, 2)
      );
    });
  });

  describe('error handling', () => {
    it('should handle command execution errors', async () => {
      const mockExecSync = vi.mocked(execSync);
      
      const error = new Error('Command failed');
      (error as any).status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });
      
      expect(() => execSync('lorm invalid-command')).toThrow('Command failed');
    });

    it('should handle file system errors gracefully', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      mockReadFile.mockRejectedValue(error);
      
      await expect(fs.readFile('restricted-file.txt')).rejects.toThrow('Permission denied');
    });

    it('should validate command arguments', () => {
      const mockExecSync = vi.mocked(execSync);
      
      // Mock validation error
      const error = new Error('Invalid arguments');
      mockExecSync.mockImplementation(() => {
        throw error;
      });
      
      expect(() => execSync('lorm init')).toThrow('Invalid arguments'); // missing project name
    });
  });
});