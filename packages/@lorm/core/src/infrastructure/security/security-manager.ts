import * as path from 'path';
import { PluginSandbox } from './sandbox.js';
import { SecurityConfigLoader } from './config-loader.js';
import { AuditRulesEngine } from './audit-rules.js';
import {
  SecurityConfig,
  AuditOptions,
  AuditReport,
  AuditResult,
  AuditSummary,
  FixResult,
  SecurityViolation,
  PluginContext,
  IPluginSandbox
} from './types.js';

/**
 * Central security manager that orchestrates all security operations
 */
export class SecurityManager {
  private config: SecurityConfig;
  private configLoader: SecurityConfigLoader;
  private auditEngine: AuditRulesEngine;
  private sandbox: IPluginSandbox;
  
  constructor(projectPath?: string) {
    this.configLoader = new SecurityConfigLoader();
    this.config = SecurityConfigLoader.loadConfig(projectPath || process.cwd());
    this.auditEngine = new AuditRulesEngine(this.config);
    this.sandbox = new PluginSandbox(this.config);
  }
  
  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
  
  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>, projectPath?: string): void {
    this.config = { ...this.config, ...newConfig };
    this.auditEngine = new AuditRulesEngine(this.config);
    this.sandbox = new PluginSandbox(this.config);
    
    if (projectPath) {
      SecurityConfigLoader.saveConfig(projectPath, this.config);
    }
  }
  
  /**
   * Perform comprehensive security audit
   */
  async performSecurityAudit(projectPath: string, options: AuditOptions = {}): Promise<AuditReport> {
    const startTime = Date.now();
    const results: AuditResult[] = [];
    
    // Determine which audits to run
    const categoriesToAudit = options.categories || ['environment', 'database', 'filesystem', 'dependencies', 'sandbox'];
    
    try {
      // Run each audit category
      for (const category of categoriesToAudit) {
        try {
          let result: AuditResult;
          
          switch (category) {
            case 'environment':
              result = await this.auditEngine.auditEnvironmentVariables(projectPath);
              break;
            case 'database':
              result = await this.auditEngine.auditDatabaseConfiguration(projectPath);
              break;
            case 'filesystem':
              result = await this.auditEngine.auditFileSystemSecurity(projectPath);
              break;
            case 'dependencies':
              result = await this.auditEngine.auditDependencyVulnerabilities(projectPath);
              break;
            case 'sandbox':
              result = await this.auditEngine.auditSandboxFunctionality(this.sandbox);
              break;
            default:
              throw new Error(`Unknown audit category: ${category}`);
          }
          
          results.push(result);
        } catch (error) {
          results.push({
            category,
            status: 'error',
            message: `Audit failed: ${error instanceof Error ? error.message : String(error)}`,
            details: [],
            fixable: false,
            severity: 'high',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Generate summary
      const endTime = Date.now();
      const summary = this.generateAuditSummary(results, endTime - startTime);
      
      const report: AuditReport = {
          timestamp: new Date().toISOString(),
          projectPath,
          configUsed: this.config,
          summary,
          results,
          violations: this.getSecurityViolations(),
          recommendations: this.generateRecommendations(results)
        };
      
      // Save report if output path is specified
    if (options.output) {
      await this.saveAuditReport(report, options.output);
    }
      
      return report;
      
    } catch (error) {
      throw new Error(`Security audit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Apply security fixes based on audit results
   */
  async applySecurityFixes(report: AuditReport, projectPath: string, categories?: string[]): Promise<FixResult[]> {
    const fixResults: FixResult[] = [];
    
    if (!this.config.autoFix.enabled) {
      throw new Error('Auto-fix is disabled in security configuration');
    }
    
    const categoriesToFix = categories || this.config.autoFix.categories;
    const fixableResults = report.results.filter(result => 
      result.fixable && 
      categoriesToFix.includes(result.category) &&
      result.status !== 'pass'
    );
    
    for (const result of fixableResults) {
      try {
        const fixResult = await this.auditEngine.applyFix(result, projectPath);
        fixResults.push(fixResult);
      } catch (error) {
        fixResults.push({
          category: result.category,
          success: false,
          message: `Failed to apply fix for ${result.category}`,
          error: error instanceof Error ? error.message : String(error),
          appliedAt: new Date().toISOString(),
          changesApplied: []
        });
      }
    }
    
    return fixResults;
  }
  
  /**
   * Get security violations from sandbox
   */
  getSecurityViolations(): SecurityViolation[] {
    return this.sandbox.getViolations();
  }
  
  /**
   * Clear security violations
   */
  clearSecurityViolations(): void {
    this.sandbox.clearViolations();
  }
  
  /**
   * Validate plugin permissions
   */
  validatePluginPermissions(context: PluginContext, operation: string, target: string): boolean {
    return this.sandbox.validatePermissions(context, operation, target);
  }
  
  /**
   * Execute code in sandbox
   */
  async executeInSandbox<T>(context: PluginContext, code: () => Promise<T>): Promise<T> {
    const result = await this.sandbox.execute(context, code);
    return result.result as T;
  }
  
  /**
   * Get plugin sandbox instance
   */
  getSandbox(): IPluginSandbox {
    return this.sandbox;
  }
  
  /**
   * Save audit report to file
   */
  private async saveAuditReport(report: AuditReport, projectPath: string): Promise<void> {
    const reportsDir = path.join(projectPath, '.lorm', 'security-reports');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `security-audit-${timestamp}.json`);
    
    try {
      const fs = await import('fs');
      
      // Ensure reports directory exists
      await fs.promises.mkdir(reportsDir, { recursive: true });
      
      // Write report
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      
      console.log(`Security audit report saved to: ${reportPath}`);
    } catch (error) {
      throw new Error(`Failed to save audit report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Load previous audit reports
   */
  async loadAuditReports(projectPath: string, limit: number = 10): Promise<AuditReport[]> {
    const reportsDir = path.join(projectPath, '.lorm', 'security-reports');
    const reports: AuditReport[] = [];
    
    try {
      const fs = await import('fs');
      
      if (!fs.existsSync(reportsDir)) {
        return reports;
      }
      
      const files = await fs.promises.readdir(reportsDir);
      const reportFiles = files
        .filter(file => file.startsWith('security-audit-') && file.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);
      
      for (const file of reportFiles) {
        try {
          const content = await fs.promises.readFile(path.join(reportsDir, file), 'utf-8');
          const report = JSON.parse(content) as AuditReport;
          reports.push(report);
        } catch (error) {
          console.warn(`Failed to load report ${file}: ${error}`);
        }
      }
      
      return reports;
    } catch (error) {
      throw new Error(`Failed to load audit reports: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get security status summary
   */
  async getSecurityStatus(projectPath: string): Promise<AuditSummary> {
    const report = await this.performSecurityAudit(projectPath, { categories: ['environment', 'database', 'filesystem', 'dependencies'] });
    return report.summary;
  }
  
  /**
   * Initialize security for a new project
   */
  async initializeProjectSecurity(projectPath: string): Promise<void> {
    try {
      // Create .lorm directory
      const fs = await import('fs');
      const lormDir = path.join(projectPath, '.lorm');
      await fs.promises.mkdir(lormDir, { recursive: true });
      
      // Save default security config
      SecurityConfigLoader.saveConfig(projectPath, this.config);
      
      // Create initial .gitignore entries if needed
      const gitIgnorePath = path.join(projectPath, '.gitignore');
      const sensitiveFiles = ['.env', '.env.local', '.env.production', '.lorm/security-reports/'];
      
      if (fs.existsSync(gitIgnorePath)) {
        const content = await fs.promises.readFile(gitIgnorePath, 'utf-8');
        const missingFiles = sensitiveFiles.filter(file => !content.includes(file));
        
        if (missingFiles.length > 0) {
          const newContent = content + '\n# LORM Security\n' + missingFiles.join('\n') + '\n';
          await fs.promises.writeFile(gitIgnorePath, newContent, 'utf-8');
        }
      } else {
        const gitIgnoreContent = '# LORM Security\n' + sensitiveFiles.join('\n') + '\n';
        await fs.promises.writeFile(gitIgnorePath, gitIgnoreContent, 'utf-8');
      }
      
      console.log('LORM security initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize project security: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Private helper methods
  
  private generateAuditSummary(results: AuditResult[], duration: number): AuditSummary {
    const total = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const errors = results.filter(r => r.status === 'error').length;
    const fixable = results.filter(r => r.fixable && r.status !== 'pass').length;
    
    return {
      total,
      passed,
      warnings,
      errors,
      fixable,
      duration
    };
  }

  private generateRecommendations(results: AuditResult[]): string[] {
    const recommendations: string[] = [];
    
    const errorResults = results.filter(r => r.status === 'error');
    const warningResults = results.filter(r => r.status === 'warning');
    const fixableResults = results.filter(r => r.fixable && r.status !== 'pass');
    
    if (errorResults.length > 0) {
      recommendations.push(`Address ${errorResults.length} critical security issues immediately`);
    }
    
    if (warningResults.length > 0) {
      recommendations.push(`Review ${warningResults.length} security warnings`);
    }
    
    if (fixableResults.length > 0) {
      recommendations.push(`${fixableResults.length} issues can be automatically fixed using the --fix option`);
    }
    
    if (results.some(r => r.category === 'environment' && r.status !== 'pass')) {
      recommendations.push('Review environment variable security and consider using a secrets management system');
    }
    
    if (results.some(r => r.category === 'database' && r.status !== 'pass')) {
      recommendations.push('Ensure database connections use secure credentials and SSL/TLS encryption');
    }
    
    if (results.some(r => r.category === 'dependencies' && r.status !== 'pass')) {
      recommendations.push('Update vulnerable dependencies and consider using dependency scanning tools');
    }
    
    return recommendations;
  }
}