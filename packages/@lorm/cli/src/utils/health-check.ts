import { promises as fs } from 'fs';
import { execSync } from 'child_process';

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

export interface SystemInfo {
  node: string;
  npm: string;
  os: string;
  arch: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
}

export class HealthChecker {
  private checks: Array<() => Promise<HealthCheckResult>> = [];

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks() {
    this.checks.push(
      this.checkNodeVersion.bind(this),
      this.checkNpmVersion.bind(this),
      this.checkConfigFile.bind(this),
      this.checkSchemaFile.bind(this),
      this.checkRouterFile.bind(this),
      this.checkDependencies.bind(this),
      this.checkDatabaseConnection.bind(this),
      this.checkMemoryUsage.bind(this)
    );
  }

  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const check of this.checks) {
      try {
        const result = await check();
        results.push(result);
      } catch (error) {
        results.push({
          name: 'Unknown Check',
          status: 'fail',
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return results;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const os = require('os');
    
    return {
      node: process.version,
      npm: this.getCommandVersion('npm --version'),
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
    };
  }

  private async checkNodeVersion(): Promise<HealthCheckResult> {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 18) {
      return {
        name: 'Node.js Version',
        status: 'pass',
        message: `Node.js ${nodeVersion} is supported`,
        details: { version: nodeVersion },
      };
    } else if (majorVersion >= 16) {
      return {
        name: 'Node.js Version',
        status: 'warn',
        message: `Node.js ${nodeVersion} is supported but upgrading to v18+ is recommended`,
        details: { version: nodeVersion },
      };
    } else {
      return {
        name: 'Node.js Version',
        status: 'fail',
        message: `Node.js ${nodeVersion} is not supported. Please upgrade to v16+`,
        details: { version: nodeVersion },
      };
    }
  }

  private async checkNpmVersion(): Promise<HealthCheckResult> {
    try {
      const npmVersion = this.getCommandVersion('npm --version');
      return {
        name: 'npm Version',
        status: 'pass',
        message: `npm ${npmVersion} is available`,
        details: { version: npmVersion },
      };
    } catch (error) {
      return {
        name: 'npm Version',
        status: 'fail',
        message: 'npm is not available or not working properly',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkConfigFile(): Promise<HealthCheckResult> {
    const configPaths = [
      'lorm.config.ts',
      'lorm.config.js',
      'lorm.config.mjs',
      'drizzle.config.ts',
      'drizzle.config.js',
    ];

    for (const configPath of configPaths) {
      try {
        await fs.access(configPath);
        return {
          name: 'Configuration File',
          status: 'pass',
          message: `Configuration file found: ${configPath}`,
          details: { path: configPath },
        };
      } catch {
        // Continue to next path
      }
    }

    return {
      name: 'Configuration File',
      status: 'fail',
      message: 'No configuration file found. Run `npx @lorm/cli init` to create one.',
      details: { searchedPaths: configPaths },
    };
  }

  private async checkSchemaFile(): Promise<HealthCheckResult> {
    const schemaPaths = [
      'lorm/schema/index.ts',
      'lorm/schema/index.js',
      'lorm/schema/index.mjs',
      'lorm.schema.js',
      'lorm.schema.ts',
      'src/schema.ts',
      'src/db/schema.ts',
      'schema.ts',
      'db/schema.ts',
    ];

    for (const schemaPath of schemaPaths) {
      try {
        await fs.access(schemaPath);
        let status: 'pass' | 'warn' = 'pass';
        let message = `Schema file found: ${schemaPath}`;
        
        // Add suggestions for legacy paths
        if (schemaPath === 'lorm.schema.js' || schemaPath === 'lorm.schema.ts') {
          status = 'warn';
          message += ' (consider migrating to lorm/schema/index.ts)';
        }
        
        return {
          name: 'Schema File',
          status,
          message,
          details: { path: schemaPath },
        };
      } catch {
        // Continue to next path
      }
    }

    return {
      name: 'Schema File',
      status: 'warn',
      message: 'No schema file found in common locations',
      details: { searchedPaths: schemaPaths },
    };
  }

  private async checkRouterFile(): Promise<HealthCheckResult> {
    const routerPaths = [
      'lorm/router/index.ts',
      'lorm/router/index.js',
      'lorm/router/index.mjs',
      'lorm.router.js',
      'lorm.router.ts',
    ];

    for (const routerPath of routerPaths) {
      try {
        await fs.access(routerPath);
        let status: 'pass' | 'warn' = 'pass';
        let message = `Router file found: ${routerPath}`;
        
        // Add suggestions for legacy paths
        if (routerPath === 'lorm.router.js' || routerPath === 'lorm.router.ts') {
          status = 'warn';
          message += ' (consider migrating to lorm/router/index.ts)';
        }
        
        return {
          name: 'Router File',
          status,
          message,
          details: { path: routerPath },
        };
      } catch {
        // Continue to next path
      }
    }

    return {
      name: 'Router File',
      status: 'warn',
      message: 'No router file found. Router is optional but recommended for API endpoints.',
      details: { searchedPaths: routerPaths },
    };
  }

  private async checkDependencies(): Promise<HealthCheckResult> {
    try {
      const packageJsonPath = 'package.json';
      await fs.access(packageJsonPath);
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const requiredDeps: string[] = [];
      const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
      
      if (missingDeps.length === 0) {
        return {
          name: 'Dependencies',
          status: 'pass',
          message: 'All required dependencies are installed',
          details: { dependencies: requiredDeps },
        };
      } else {
        return {
          name: 'Dependencies',
          status: 'fail',
          message: `Missing required dependencies: ${missingDeps.join(', ')}`,
          details: { missing: missingDeps },
        };
      }
    } catch (error) {
      return {
        name: 'Dependencies',
        status: 'fail',
        message: 'Could not check dependencies',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkDatabaseConnection(): Promise<HealthCheckResult> {
    // This would need to be implemented based on the actual database connection logic
    // For now, we'll return a placeholder
    return {
      name: 'Database Connection',
      status: 'warn',
      message: 'Database connection check not implemented yet',
      details: { note: 'This check will be implemented in a future version' },
    };
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    
    if (heapUsedMB < 100) {
      return {
        name: 'Memory Usage',
        status: 'pass',
        message: `Memory usage is normal: ${heapUsedMB}MB / ${heapTotalMB}MB`,
        details: { heapUsed: heapUsedMB, heapTotal: heapTotalMB },
      };
    } else if (heapUsedMB < 200) {
      return {
        name: 'Memory Usage',
        status: 'warn',
        message: `Memory usage is elevated: ${heapUsedMB}MB / ${heapTotalMB}MB`,
        details: { heapUsed: heapUsedMB, heapTotal: heapTotalMB },
      };
    } else {
      return {
        name: 'Memory Usage',
        status: 'fail',
        message: `Memory usage is high: ${heapUsedMB}MB / ${heapTotalMB}MB`,
        details: { heapUsed: heapUsedMB, heapTotal: heapTotalMB },
      };
    }
  }

  private getCommandVersion(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
      throw new Error(`Failed to get version: ${error}`);
    }
  }

  displayResults(results: HealthCheckResult[]): void {
    console.log('\n🏥 Health Check Results\n');
    
    const statusIcons = {
      pass: '✅',
      warn: '⚠️',
      fail: '❌',
    };
    
    results.forEach(result => {
      const icon = statusIcons[result.status];
      console.log(`${icon} ${result.name}: ${result.message}`);
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`);
      }
    });
    
    const summary = {
      pass: results.filter(r => r.status === 'pass').length,
      warn: results.filter(r => r.status === 'warn').length,
      fail: results.filter(r => r.status === 'fail').length,
    };
    
    console.log(`\n📊 Summary: ${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed\n`);
  }

  displaySystemInfo(info: SystemInfo): void {
    console.log('\n💻 System Information\n');
    console.log(`Node.js: ${info.node}`);
    console.log(`npm: ${info.npm}`);
    console.log(`OS: ${info.os}`);
    console.log(`Architecture: ${info.arch}`);
    console.log(`Memory: ${Math.round(info.memory.used / 1024 / 1024)}MB / ${Math.round(info.memory.total / 1024 / 1024)}MB`);
    console.log('');
  }
}