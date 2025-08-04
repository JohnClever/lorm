import { join } from 'path';
import { detectPackageManagerFromLockFiles, isLormProject, hasSchemaFile, findConfigFile } from './file-utils.js';
import { cliPerformanceService } from '../services/performance.js';
import { execSync } from 'child_process';
import { Logger, ICONS } from './logger.js';

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  memory: NodeJS.MemoryUsage;
  uptime: number;
  packageManager?: string;
}

/**
 * Modern Health Checker for CLI v2
 * Uses core infrastructure without legacy compatibility layers
 */
export class ModernHealthChecker {
  constructor() {
    // Performance monitoring is now handled by CLIPerformanceService
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      packageManager: this.detectPackageManager()
    };
  }

  private detectPackageManager(): string {
    return detectPackageManagerFromLockFiles(process.cwd());
  }

  private getCommandVersion(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch {
      return 'not available';
    }
  }

  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Node.js version check
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    results.push({
      name: 'Node.js Version',
      status: majorVersion >= 18 ? 'pass' : majorVersion >= 16 ? 'warn' : 'fail',
      message: `${nodeVersion} ${majorVersion >= 18 ? '(recommended)' : majorVersion >= 16 ? '(supported)' : '(outdated)'}`,
      details: { version: nodeVersion, majorVersion }
    });

    // Package manager check
    const detectedPackageManager = this.detectPackageManager();
    results.push({
      name: 'Package Manager',
      status: detectedPackageManager !== 'unknown' ? 'pass' : 'warn',
      message: detectedPackageManager !== 'unknown' ? `${detectedPackageManager} detected` : 'No lock file found',
      details: { packageManager: detectedPackageManager }
    });

    // LORM project structure check
    const hasLormDir = isLormProject(process.cwd());
    results.push({
      name: 'LORM Project',
      status: hasLormDir ? 'pass' : 'warn',
      message: hasLormDir ? 'LORM project detected' : 'Not in a LORM project',
      details: { lormDirectory: hasLormDir }
    });

    // Configuration files check
    if (hasLormDir) {
      const foundConfig = findConfigFile(process.cwd());
      results.push({
        name: 'Configuration',
        status: foundConfig ? 'pass' : 'warn',
        message: foundConfig ? `Configuration found: ${foundConfig}` : 'No configuration file found',
        details: { configFile: foundConfig }
      });

      // Schema file check
      const hasSchema = hasSchemaFile(process.cwd());
      results.push({
        name: 'Database Schema',
        status: hasSchema ? 'pass' : 'warn',
        message: hasSchema ? 'Schema file found' : 'No schema file found',
        details: { schemaPath: hasSchema ? join(process.cwd(), '.lorm', 'schema.ts') : null }
      });
    }

    // Performance monitoring health check
    const performanceStatus = this.checkPerformanceMonitor();
    results.push(performanceStatus);

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    results.push({
      name: 'Memory Usage',
      status: heapUsedMB < 256 ? 'pass' : heapUsedMB < 512 ? 'warn' : 'fail',
      message: `${Math.round(heapUsedMB)}MB / ${Math.round(heapTotalMB)}MB heap used`,
      details: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        external: memoryUsage.external / 1024 / 1024,
        rss: memoryUsage.rss / 1024 / 1024
      }
    });

    // TypeScript check (if in a TypeScript project)
    try {
      const tsVersion = this.getCommandVersion('npx tsc --version');
      if (tsVersion !== 'not available') {
        results.push({
          name: 'TypeScript',
          status: 'pass',
          message: `TypeScript ${tsVersion}`,
          details: { version: tsVersion }
        });
      }
    } catch {
      // TypeScript not available, skip this check
    }

    return results;
  }

  private checkPerformanceMonitor(): HealthCheckResult {
    try {
      const isHealthy = cliPerformanceService.isHealthy();
      const currentSession = cliPerformanceService.getCurrentSession();
      
      return {
        name: 'Performance Monitor',
        status: isHealthy ? 'pass' : 'warn',
        message: isHealthy 
          ? 'Performance monitoring is healthy and active'
          : 'Performance monitoring has detected issues',
        details: {
          healthy: isHealthy,
          hasActiveSession: !!currentSession,
          sessionId: currentSession?.id || null
        }
      };
    } catch (error) {
      return {
        name: 'Performance Monitor',
        status: 'fail',
        message: `Performance monitor check failed: ${error}`,
        details: { error: String(error) }
      };
    }
  }

  displaySystemInfo(info: SystemInfo): void {
    Logger.withIcon('🖥️', 'System Information:', 'success');
    Logger.dim(`   Node.js: ${info.nodeVersion}`);
    Logger.dim(`   Platform: ${info.platform} (${info.arch})`);
    Logger.dim(`   Memory: ${Math.round(info.memory.heapUsed / 1024 / 1024)}MB used / ${Math.round(info.memory.heapTotal / 1024 / 1024)}MB total`);
    Logger.dim(`   Uptime: ${Math.round(info.uptime)}s`);
    if (info.packageManager) {
      Logger.dim(`   Package Manager: ${info.packageManager}`);
    }
  }

  displayResults(results: HealthCheckResult[]): void {
    Logger.withIcon('🏥', 'Health Check Results\n');
    
    const statusIcons = {
      pass: ICONS.success,
      warn: ICONS.warning,
      fail: ICONS.error,
    };
    
    results.forEach(result => {
      const icon = statusIcons[result.status];
      const nameWidth = 20;
      const paddedName = result.name.padEnd(nameWidth);
      Logger.dim(`${icon} ${paddedName} ${result.message}`);
    });
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    
    Logger.withIcon(ICONS.chart, `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
    
    if (failCount > 0) {
      Logger.error('Some critical issues were found. Please address them before proceeding.');
    } else if (warnCount > 0) {
      Logger.warning('Some warnings were found. Consider addressing them for optimal performance.');
    } else {
      Logger.success('All checks passed! Your environment is ready.');
    }
  }
}