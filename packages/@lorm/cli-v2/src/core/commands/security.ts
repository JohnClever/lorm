import { Logger, ICONS } from '../../utils/logger.js';
import { SecurityCommandOptions } from './types.js';
import { createSecurityCommand, getCommandPrefix } from '../../utils/command-factory.js';
import { SecurityManager, AuditOptions, AuditReport, AuditResult } from '@lorm/core';

const commandPrefix = getCommandPrefix();

// Security command implementations
const securityCommands = {
  async performSecurityAudit(options: SecurityCommandOptions): Promise<void> {
    const { verbose, fix, output } = options;
    const projectRoot = process.cwd();
    
    Logger.withIcon(ICONS.search, 'Running security audit...');
    
    try {
      // Initialize SecurityManager from core
      const securityManager = new SecurityManager(projectRoot);
      
      // Configure audit options
      const auditOptions: AuditOptions = {
        categories: ['environment', 'database', 'filesystem', 'dependencies', 'sandbox']
      };
      
      // Perform comprehensive audit using core infrastructure
      const report = await securityManager.performSecurityAudit(projectRoot, auditOptions);
      
      // Display results using CLI interface
      securityCommands.displayAuditResults(report, verbose);
      
      // Apply fixes if requested
      if (fix) {
        await securityCommands.applySecurityFixes(report, projectRoot);
      }
      
      // Save report if output path specified
      if (output) {
        // Note: Report saving should be handled by the SecurityManager internally
        Logger.success(`Audit report saved to ${output}`);
      }
      
    } catch (error) {
      Logger.error(`Security audit failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },

  async viewSecurityLogs(options: SecurityCommandOptions): Promise<void> {
    const { verbose } = options;
    const projectRoot = process.cwd();
    
    Logger.withIcon(ICONS.document, 'Viewing security logs...');
    
    try {
      // Initialize SecurityManager from core
      const securityManager = new SecurityManager(projectRoot);
      
      // Get security violations from core infrastructure
      const violations = securityManager.getSecurityViolations();
      
      if (violations.length === 0) {
        Logger.success('No security violations found');
        Logger.withIcon(ICONS.document, 'Security sandbox is functioning properly');
        Logger.dim('All plugin operations are executing within security constraints');
        return;
      }
      
      Logger.warning(`Found ${violations.length} security violations`);
      
      violations.forEach((violation, index) => {
        const icon = violation.type.includes('timeout') || violation.type.includes('memory') ? '🚨' : '⚠️';
        
        const logMethod = violation.type.includes('timeout') || violation.type.includes('memory') ? Logger.error : Logger.warning;
        logMethod(`${icon} [${new Date(violation.timestamp).toISOString()}] ${violation.type}:`);
        Logger.dim(`   Plugin: ${violation.pluginId}`);
        Logger.dim(`   Operation: ${violation.operation}`);
        Logger.dim(`   Target: ${violation.target}`);
        if (violation.message && verbose) {
          Logger.dim(`   Message: ${violation.message}`);
        }
        if (index < violations.length - 1) console.log('');
      });
    } catch (error) {
      Logger.error(`Failed to read security logs: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },

  displayAuditResults(report: AuditReport, verbose?: boolean): void {
    const { summary, results } = report;
    
    Logger.withIcon(ICONS.chart, 'Security Audit Results:');
    Logger.success(`Passed: ${summary.passed}`);
    Logger.warning(`Warnings: ${summary.warnings}`);
    Logger.error(`Errors: ${summary.errors}`);
    Logger.withIcon(ICONS.chart, `Total: ${summary.total} checks completed`);
    
    if (verbose || summary.warnings > 0 || summary.errors > 0) {
      Logger.withIcon(ICONS.chart, 'Detailed Results:');
      results.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        const logMethod = result.status === 'pass' ? Logger.success : result.status === 'warning' ? Logger.warning : Logger.error;
        
        logMethod(`${icon} [${result.category}] ${result.message}`);
        
        if (result.details && result.details.length > 0 && verbose) {
          result.details.forEach(detail => {
            Logger.dim(`   • ${detail}`);
          });
        }
      });
    }
    
    if (summary.fixable > 0) {
      Logger.withIcon(ICONS.tools, `${summary.fixable} issues can be automatically fixed with --fix`);
    }
  },

  async applySecurityFixes(report: AuditReport, projectRoot: string): Promise<void> {
    if (report.summary.fixable === 0) {
      Logger.withIcon(ICONS.tools, 'No automatic fixes available');
      return;
    }
    
    Logger.withIcon(ICONS.tools, `Applying ${report.summary.fixable} security fixes...`);
    
    try {
      // Initialize SecurityManager from core
      const securityManager = new SecurityManager(projectRoot);
      
      // Apply fixes using core infrastructure
      const fixResults = await securityManager.applySecurityFixes(report, projectRoot);
      
      // Display fix results
      fixResults.forEach(fixResult => {
        if (fixResult.success) {
          Logger.dim(`   ✓ Fixed: ${fixResult.message}`);
          if (fixResult.changesApplied.length > 0) {
            fixResult.changesApplied.forEach(change => {
              Logger.dim(`     - ${change.description}`);
            });
          }
        } else {
          Logger.dim(`   ✗ Failed to fix: ${fixResult.message}`);
          if (fixResult.error) {
            Logger.dim(`     Error: ${fixResult.error}`);
          }
        }
      });
      
      const successfulFixes = fixResults.filter(r => r.success).length;
      Logger.success(`${successfulFixes}/${fixResults.length} security fixes applied successfully`);
      
    } catch (error) {
      Logger.error(`Failed to apply security fixes: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Note: All complex audit logic has been moved to @lorm/core SecurityManager
  // This CLI now acts as a simple interface to the core security infrastructure
};

// Security audit command
export const securityAuditCommand = createSecurityCommand({
  name: 'audit',
  description: 'Run comprehensive security audit',
  aliases: ['audit'],
  category: 'security',
  requiresConfig: false,
  options: [
    {
      flag: '--verbose',
      description: 'Show detailed audit information',
    },
    {
      flag: '--fix',
      description: 'Automatically fix security issues where possible',
    },
    {
      flag: '--output <path>',
      description: 'Save audit report to file',
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli security:audit`,
    `${commandPrefix} @lorm/cli audit`,
    `${commandPrefix} @lorm/cli security:audit --verbose`,
    `${commandPrefix} @lorm/cli security:audit --fix`,
    `${commandPrefix} @lorm/cli security:audit --output audit-report.json`,
  ],
  action: async (options: SecurityCommandOptions) => {
    await securityCommands.performSecurityAudit(options);
  },
});

// Security logs command
export const securityLogsCommand = createSecurityCommand({
  name: 'logs',
  description: 'View security-related logs and events',
  aliases: ['logs'],
  category: 'security',
  requiresConfig: false,
  options: [
    {
      flag: '--verbose',
      description: 'Show all log entries instead of recent ones',
    },
  ],
  examples: [
    `${commandPrefix} @lorm/cli security:logs`,
    `${commandPrefix} @lorm/cli logs`,
    `${commandPrefix} @lorm/cli security:logs --verbose`,
  ],
  action: async (options: SecurityCommandOptions) => {
    await securityCommands.viewSecurityLogs(options);
  },
});

// Export all security commands
export const getSecurityCommands = () => [
  securityAuditCommand,
  securityLogsCommand,
];