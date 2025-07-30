import chalk from 'chalk';
import { readFile, exists } from '../../utils/file-utils';
import { SecurityAuditLogger } from '../../utils/security';
import { BaseCommandOptions } from '../../types';

export interface SecurityLogsCommandOptions extends BaseCommandOptions {
  lines?: number;
  level?: 'info' | 'warn' | 'error' | 'critical';
  follow?: boolean;
  json?: boolean;
  search?: string;
}

export async function securityLogs(options: SecurityLogsCommandOptions = {}): Promise<void> {
  const logFile = '.lorm/security.log';
  
  try {
    if (!await exists(logFile)) {
      console.log(chalk.yellow('⚠️  No security logs found'));
      console.log(chalk.gray('Security logs will be created when security events occur'));
      return;
    }

    const content = await readFile(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log(chalk.yellow('⚠️  Security log file is empty'));
      return;
    }

    let filteredLogs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filter by level
    if (options.level && options.level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }

    // Filter by search term
    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchTerm)
      );
    }

    // Limit number of lines
    if (options.lines && options.lines > 0) {
      filteredLogs = filteredLogs.slice(-options.lines);
    }

    if (filteredLogs.length === 0) {
      console.log(chalk.yellow('⚠️  No logs match the specified criteria'));
      return;
    }

    console.log(chalk.blue(`\n🔒 Security Audit Logs (${filteredLogs.length} entries)`));
    console.log(chalk.gray('─'.repeat(80)));

    if (options.json) {
      console.log(JSON.stringify(filteredLogs, null, 2));
      return;
    }

    filteredLogs.forEach((log, index) => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const levelColor = getLevelColor(log.level);
      const eventIcon = getEventIcon(log.event);
      
      console.log(`\n${chalk.gray(`[${index + 1}]`)} ${chalk.cyan(timestamp)} ${levelColor(log.level.toUpperCase())} ${eventIcon} ${chalk.white(log.event)}`);
      
      if (log.details && Object.keys(log.details).length > 0) {
        Object.entries(log.details).forEach(([key, value]) => {
          if (typeof value === 'object') {
            console.log(`  ${chalk.gray(key)}: ${chalk.white(JSON.stringify(value))}`);
          } else {
            console.log(`  ${chalk.gray(key)}: ${chalk.white(value)}`);
          }
        });
      }
      
      if (log.user) {
        console.log(`  ${chalk.gray('user')}: ${chalk.white(log.user)}`);
      }
      
      if (log.pid) {
        console.log(`  ${chalk.gray('pid')}: ${chalk.white(log.pid)}`);
      }
    });

    console.log(chalk.gray('\n─'.repeat(80)));
    console.log(chalk.blue(`📊 Total entries: ${filteredLogs.length}`));
    
    if (options.level && options.level !== 'all') {
      console.log(chalk.blue(`🔍 Filtered by level: ${options.level}`));
    }
    
    if (options.search) {
      console.log(chalk.blue(`🔍 Filtered by search: "${options.search}"`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to read security logs:'));
    console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

function getLevelColor(level: string): (text: string) => string {
  switch (level) {
    case 'error':
      return chalk.red;
    case 'warn':
      return chalk.yellow;
    case 'info':
    default:
      return chalk.green;
  }
}

function getEventIcon(event: string): string {
  const iconMap: Record<string, string> = {
    'command_execution': '⚡',
    'dangerous_operation': '⚠️',
    'db_drop_completed': '🗑️',
    'db_drop_cancelled': '🛑',
    'security_validation': '🔍',
    'rate_limit_exceeded': '🚫',
    'input_validation_failed': '❌',
    'path_traversal_blocked': '🛡️',
    'production_safety_check': '🔒',
  };
  
  return iconMap[event] || '📝';
}