import { SecurityManager } from '@lorm/core/infrastructure';
import type {
  SecurityConfig,
  AuditOptions,
  AuditReport,
  FixResult,
  SecurityViolation,
  PluginContext,
  IPluginSandbox,
  SandboxResult
} from '@lorm/core/infrastructure';
import { Logger } from '../utils/logger.js';

/**
 * CLI Security Service
 * Provides a clean interface to the core SecurityManager for CLI operations
 */
export class CLISecurityService {
  private securityManager: SecurityManager;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.securityManager = new SecurityManager(projectPath);
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return this.securityManager.getConfig();
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.securityManager.updateConfig(newConfig, this.projectPath);
  }

  /**
   * Get the plugin sandbox for secure plugin execution
   */
  getSandbox(): IPluginSandbox {
    return this.securityManager.getSandbox();
  }

  /**
   * Execute code in sandbox with proper error handling
   */
  async executeInSandbox<T>(
    context: PluginContext,
    operation: () => Promise<T>
  ): Promise<SandboxResult<T>> {
    try {
      const sandbox = this.getSandbox();
      return await sandbox.execute(context, operation);
    } catch (error) {
      Logger.error(`Sandbox execution failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validate plugin permissions
   */
  validatePermissions(
    context: PluginContext,
    operation: string,
    target: string
  ): boolean {
    return this.securityManager.validatePluginPermissions(context, operation, target);
  }

  /**
   * Perform security audit with CLI-friendly output
   */
  async performAudit(options: AuditOptions = {}): Promise<AuditReport> {
    try {
      Logger.info('🔍 Running security audit...');
      const report = await this.securityManager.performSecurityAudit(this.projectPath, options);
      
      // Display summary
      this.displayAuditSummary(report);
      
      return report;
    } catch (error) {
      Logger.error(`Security audit failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Apply security fixes
   */
  async applyFixes(report: AuditReport, categories?: string[]): Promise<FixResult[]> {
    try {
      Logger.info('🔧 Applying security fixes...');
      const results = await this.securityManager.applySecurityFixes(report, this.projectPath, categories);
      
      // Display fix results
      this.displayFixResults(results);
      
      return results;
    } catch (error) {
      Logger.error(`Failed to apply security fixes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get security violations
   */
  getViolations(): SecurityViolation[] {
    return this.securityManager.getSecurityViolations();
  }

  /**
   * Clear security violations
   */
  clearViolations(): void {
    this.securityManager.clearSecurityViolations();
  }

  /**
   * Check if security system is healthy
   */
  isHealthy(): boolean {
    try {
      const config = this.getConfig();
      const violations = this.getViolations();
      
      // Consider healthy if:
      // 1. Configuration is valid
      // 2. No critical violations in the last hour
      const recentCriticalViolations = violations.filter(v => 
        Date.now() - v.timestamp < 3600000 && // Last hour
        v.blocked
      );
      
      return config && recentCriticalViolations.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Display audit summary in CLI-friendly format
   */
  private displayAuditSummary(report: AuditReport): void {
    const { summary } = report;
    const overallStatus = summary.errors > 0 ? 'error' : summary.warnings > 0 ? 'warning' : 'pass';
    
    Logger.info(`\n📊 Security Audit Summary:`);
    Logger.info(`   Duration: ${summary.duration}ms`);
    Logger.info(`   Status: ${this.getStatusIcon(overallStatus)} ${overallStatus.toUpperCase()}`);
    Logger.info(`   Total Checks: ${summary.total}`);
    Logger.info(`   Passed: ${summary.passed}`);
    
    if (summary.warnings > 0) {
      Logger.warning(`   Warnings: ${summary.warnings}`);
    }
    if (summary.errors > 0) {
      Logger.error(`   Errors: ${summary.errors}`);
    }
    if (summary.fixable > 0) {
      Logger.info(`   Fixable: ${summary.fixable}`);
    }
  }

  /**
   * Display fix results in CLI-friendly format
   */
  private displayFixResults(results: FixResult[]): void {
    Logger.info(`\n🔧 Fix Results:`);
    
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      Logger.info(`   ${icon} ${result.category}: ${result.message}`);
      
      if (result.changesApplied.length > 0) {
        result.changesApplied.forEach(change => {
          Logger.info(`      • ${change.description}`);
        });
      }
      
      if (result.error) {
        Logger.error(`      Error: ${result.error}`);
      }
    });
  }

  /**
   * Get status icon for display
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }
}

// Singleton instance for CLI usage
let cliSecurityServiceInstance: CLISecurityService | null = null;

/**
 * Get or create the CLI security service instance
 */
export function getCLISecurityService(projectPath?: string): CLISecurityService {
  if (!cliSecurityServiceInstance || (projectPath && projectPath !== process.cwd())) {
    cliSecurityServiceInstance = new CLISecurityService(projectPath);
  }
  return cliSecurityServiceInstance;
}

// Export singleton instance for convenience
export const cliSecurityService = getCLISecurityService();