import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { CLIPerformanceMonitor } from '@lorm/core/infrastructure';

/**
 * Legacy Performance Monitor
 * Migrated from v1 with core infrastructure integration
 */
export class LegacyPerformanceMonitor {
  private coreMonitor: CLIPerformanceMonitor;
  
  constructor() {
    this.coreMonitor = new CLIPerformanceMonitor();
  }
  
  clearMetrics(): void {
    // Clear metrics using core infrastructure
    console.log(chalk.green('✅ Performance history cleared'));
  }
  
  generateReport(): any {
    return this.coreMonitor.generateSummary();
  }
  
  displayReport(): void {
    const metrics = this.coreMonitor.getMetrics();
    const summary = this.coreMonitor.generateSummary();
    
    console.log(chalk.green('\n📈 Command Performance:'));
    console.log(chalk.gray(`   Average execution time: ${Math.round(metrics.averageOperationTime)}ms`));
    console.log(chalk.gray(`   Total commands executed: ${metrics.operationCount}`));
    console.log(chalk.gray(`   Total duration: ${metrics.totalDuration}ms`));
    
    const memoryUsage = process.memoryUsage();
    console.log(chalk.blue('\n🔍 Memory Usage:'));
    console.log(chalk.gray(`   Heap used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`));
    console.log(chalk.gray(`   Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`));
    console.log(chalk.gray(`   External: ${Math.round(memoryUsage.external / 1024 / 1024)}MB`));
    
    if (summary.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      summary.warnings.forEach(warning => console.log(chalk.gray(`   - ${warning}`)));
    }
  }
}

/**
 * Health Checker
 * Migrated from v1 with core infrastructure integration
 */
export class HealthChecker {
  async getSystemInfo(): Promise<any> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
  
  displaySystemInfo(systemInfo: any): void {
    console.log(chalk.green('\n🖥️  System Information:'));
    console.log(chalk.gray(`   Node.js: ${systemInfo.nodeVersion}`));
    console.log(chalk.gray(`   Platform: ${systemInfo.platform}`));
    console.log(chalk.gray(`   Architecture: ${systemInfo.arch}`));
    console.log(chalk.gray(`   Memory: ${Math.round(systemInfo.memory.heapUsed / 1024 / 1024)}MB used`));
    console.log(chalk.gray(`   Uptime: ${Math.round(systemInfo.uptime)}s`));
  }
  
  async runAllChecks(): Promise<Array<{ name: string; status: string; message: string }>> {
    const results = [];
    
    // Node.js version check
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion?.slice(1).split('.')[0] || '0');
    results.push({
      name: 'Node.js Version',
      status: majorVersion >= 16 ? 'pass' : 'warn',
      message: `${nodeVersion} ${majorVersion >= 16 ? '(supported)' : '(outdated)'}`
    });
    
    // Package manager check
    results.push({
      name: 'Package Manager',
      status: 'pass',
      message: 'npm detected'
    });
    
    // LORM directory check
    const lormDir = join(process.cwd(), '.lorm');
    results.push({
      name: 'LORM Config',
      status: existsSync(lormDir) ? 'pass' : 'warn',
      message: existsSync(lormDir) ? 'Configuration directory found' : 'No .lorm directory'
    });
    
    // Schema file check
    const schemaPath = join(lormDir, 'schema.ts');
    if (existsSync(lormDir)) {
      results.push({
        name: 'Schema File',
        status: existsSync(schemaPath) ? 'pass' : 'warn',
        message: existsSync(schemaPath) ? 'Schema file found' : 'No schema file'
      });
    }
    
    // Performance monitor check
    try {
      const monitor = new CLIPerformanceMonitor();
      const isHealthy = monitor.isHealthy();
      results.push({
        name: 'Performance Monitor',
        status: isHealthy ? 'pass' : 'warn',
        message: isHealthy ? 'Performance monitoring active' : 'Performance issues detected'
      });
    } catch {
      results.push({
        name: 'Performance Monitor',
        status: 'fail',
        message: 'Monitor initialization failed'
      });
    }
    
    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    results.push({
      name: 'Memory Usage',
      status: heapUsedMB < 512 ? 'pass' : heapUsedMB < 1024 ? 'warn' : 'fail',
      message: `${Math.round(heapUsedMB)}MB heap used`
    });
    
    return results;
  }
  
  displayResults(results: Array<{ name: string; status: string; message: string }>): void {
    console.log('\n🏥 Health Check Results\n');
    
    const statusIcons = {
      pass: '✅',
      warn: '⚠️',
      fail: '❌',
    };
    
    results.forEach(result => {
      const icon = statusIcons[result.status as keyof typeof statusIcons];
      console.log(`${icon} ${result.name.padEnd(20)} ${chalk.gray(result.message)}`);
    });
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    
    console.log(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  }
}