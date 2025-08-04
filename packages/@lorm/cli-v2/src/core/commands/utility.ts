import { PerfCommandOptions, HealthCommandOptions } from './types.js';
import { createUtilityCommand, getCommandPrefix } from '../../utils/command-factory.js';

const commandPrefix = getCommandPrefix();
import { writeFileSync } from 'fs';
import { cliPerformanceService } from '../../services/performance.js';
import { ModernHealthChecker } from '../../utils/modern-health-checker.js';
import { Logger, ICONS } from '../../utils/logger.js';
// Removed chalk import - using Logger utility instead

// Utility command implementations - migrated from v1
const utilityCommands = {
  async showPerformanceMetrics(options: PerfCommandOptions): Promise<void> {
    try {
      await cliPerformanceService.displayMetrics(options);
    } catch (error) {
      Logger.error(`Failed to get performance metrics: ${error}`);
      process.exit(1);
    }
  },

  async runHealthCheck(options: HealthCommandOptions): Promise<void> {
    const { system, json } = options;
    Logger.withIcon('🏥', 'Running Health Checks');
    
    try {
      const healthChecker = new ModernHealthChecker();
      
      if (system) {
        const systemInfo = await healthChecker.getSystemInfo();
        healthChecker.displaySystemInfo(systemInfo);
      }
      
      const results = await healthChecker.runAllChecks();
      
      // Add performance health check
      const performanceHealthy = cliPerformanceService.isHealthy();
      results.push({
        name: 'Performance System',
        status: performanceHealthy ? 'pass' : 'warn',
        message: performanceHealthy ? 'Performance monitoring healthy' : 'Performance issues detected',
        details: { healthy: performanceHealthy }
      });
      
      if (json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      healthChecker.displayResults(results);
      
      // Display performance health separately
      await cliPerformanceService.displayHealth();
      
      const hasFailures = results.some(r => r.status === 'fail');
      if (hasFailures) {
        process.exit(1);
      }
    } catch (error) {
      Logger.error(`Health check failed: ${error}`);
      process.exit(1);
    }
  },


};



// Performance command
export const perfCommand = createUtilityCommand({
  name: 'perf',
  description: 'Show performance metrics and diagnostics',
  category: 'utility',
  requiresConfig: false,
  options: [
    { flag: '--clear', description: 'Clear performance history' },
    { flag: '--export <file>', description: 'Export metrics to file' },
    { flag: '--verbose', description: 'Show detailed metrics' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli perf`,
    `${commandPrefix} @lorm/cli perf --clear`,
    `${commandPrefix} @lorm/cli perf --export metrics.json`,
    `${commandPrefix} @lorm/cli perf --verbose`,
  ],
  action: async (options: PerfCommandOptions) => {
    await utilityCommands.showPerformanceMetrics(options);
  },
});

// Health command
export const healthCommand = createUtilityCommand({
  name: 'health',
  description: 'Run health checks and system diagnostics',
  category: 'utility',
  aliases: ['doctor'],
  requiresConfig: false,
  options: [
    { flag: '--system', description: 'Show system information' },
    { flag: '--json', description: 'Output results in JSON format' },
    { flag: '--verbose', description: 'Show detailed check information' },
  ],
  examples: [
    `${commandPrefix} @lorm/cli health`,
    `${commandPrefix} @lorm/cli doctor`,
    `${commandPrefix} @lorm/cli health --system`,
    `${commandPrefix} @lorm/cli health --json`,
    `${commandPrefix} @lorm/cli health --verbose`,
  ],
  action: async (options: HealthCommandOptions) => {
    await utilityCommands.runHealthCheck(options);
  },
});

// Doctor command (alias for health)
export const doctorCommand = createUtilityCommand({
  name: 'doctor',
  description: 'Alias for health command - run comprehensive diagnostics',
  category: 'utility',
  requiresConfig: false,
  action: async (options: HealthCommandOptions) => {
    await utilityCommands.runHealthCheck(options);
  },
});

// Export all utility commands
export const getUtilityCommands = () => [
  perfCommand,
  healthCommand,
  doctorCommand,
];