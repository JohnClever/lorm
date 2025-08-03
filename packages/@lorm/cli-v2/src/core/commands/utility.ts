import chalk from 'chalk';
import { PerfCommandOptions, HealthCommandOptions } from './types.js';
import { createUtilityCommand } from '../../utils/command-factory.js';
import { writeFileSync } from 'fs';
import { LegacyPerformanceMonitor, HealthChecker } from '../../utils/legacy-utils.js';

// Utility command implementations - migrated from v1
const utilityCommands = {
  async showPerformanceMetrics(options: PerfCommandOptions): Promise<void> {
    const { clear, export: exportFile } = options;
    console.log(chalk.blue('📊 Performance Metrics'));
    
    try {
      const performanceMonitor = new LegacyPerformanceMonitor();
      
      if (clear) {
        performanceMonitor.clearMetrics();
        return;
      }
      
      if (exportFile) {
        const report = performanceMonitor.generateReport();
        const exportData = {
          ...report,
          timestamp: new Date().toISOString()
        };
        const filePath = typeof exportFile === 'string' ? exportFile : 'performance-metrics.json';
        writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(chalk.green(`✅ Metrics exported to ${filePath}`));
        return;
      }
      
      performanceMonitor.displayReport();
    } catch (error) {
      console.error(chalk.red('❌ Failed to get performance metrics:'), error);
      process.exit(1);
    }
  },

  async runHealthCheck(options: HealthCommandOptions): Promise<void> {
    const { system, json } = options;
    console.log(chalk.blue('🏥 Running Health Checks'));
    
    try {
      const healthChecker = new HealthChecker();
      
      if (system) {
        const systemInfo = await healthChecker.getSystemInfo();
        healthChecker.displaySystemInfo(systemInfo);
      }
      
      const results = await healthChecker.runAllChecks();
      
      if (json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      healthChecker.displayResults(results);
      
      const hasFailures = results.some(r => r.status === 'fail');
      if (hasFailures) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Health check failed:'), error);
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
    'lorm perf',
    'lorm perf --clear',
    'lorm perf --export metrics.json',
    'lorm perf --verbose',
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
    'lorm health',
    'lorm doctor',
    'lorm health --system',
    'lorm health --json',
    'lorm health --verbose',
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