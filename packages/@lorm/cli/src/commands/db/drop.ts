import chalk from 'chalk';
import { confirm, input } from '@inquirer/prompts';
import {
  executeDrizzleKit,
  initializeCommand,
  handleCommandError,
} from '@/utils';
import { SecurityValidator, SecurityAuditLogger } from '@/utils';
import { RateLimiter } from '@/utils/rate-limiter.js';

export interface DropOptions {
  force?: boolean;
  confirm?: boolean;
}

export async function drop(options: DropOptions = {}): Promise<void> {
  const startTime = Date.now();
  
  try {
    const rateLimitResult = await RateLimiter.checkRateLimit('db:drop', process.cwd());
    
    if (!rateLimitResult.allowed) {
      RateLimiter.displayRateLimitInfo(rateLimitResult, 'db:drop');
      await SecurityAuditLogger.logSecurityEvent('db_drop_rate_limited', {
        remainingAttempts: rateLimitResult.remainingAttempts,
        blockUntil: rateLimitResult.blockUntil
      }, 'warn');
      throw new Error('Command rate limited for security');
    }
    
    if (rateLimitResult.remainingAttempts <= 2) {
      RateLimiter.displayRateLimitInfo(rateLimitResult, 'db:drop');
    }
    
    console.log(chalk.red('\n⚠️  DANGER ZONE: Database Drop Operation'));
    console.log(chalk.yellow('This will permanently delete ALL data in your database!'));
    
    const productionSafety = SecurityValidator.validateProductionSafety(
      'drop database',
      process.env.DATABASE_URL
    );
    
    if (!productionSafety.isValid) {
      SecurityValidator.displaySecurityResults(productionSafety, 'Production Safety Check');
      await SecurityAuditLogger.logDangerousOperation('db:drop', 'database', false);
      throw new Error('Database drop operation blocked for safety reasons');
    }
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    const dbValidation = SecurityValidator.validateDatabaseUrl(process.env.DATABASE_URL);
    if (!dbValidation.isValid) {
      SecurityValidator.displaySecurityResults(dbValidation, 'Database URL Validation');
      await SecurityAuditLogger.logDangerousOperation('db:drop', process.env.DATABASE_URL, false);
      throw new Error('Database URL validation failed');
    }
    
    if (!dbValidation.urlInfo?.isLocal) {
      console.error(chalk.red('\n🚨 Security Error: Database drop is only allowed on local databases'));
      console.error(chalk.red('   Detected remote database connection'));
      console.error(chalk.yellow('\n💡 For safety, this command only works with:'));
      console.error(chalk.yellow('   • localhost'));
      console.error(chalk.yellow('   • 127.0.0.1'));
      console.error(chalk.yellow('   • ::1'));
      console.error(chalk.yellow('   • SQLite files'));
      
      await SecurityAuditLogger.logDangerousOperation(
        'db:drop', 
        `remote:${dbValidation.urlInfo?.hostname}`, 
        false
      );
      throw new Error('Database drop blocked: Remote database detected');
    }
    
    console.log(chalk.blue('\n📊 Database Information:'));
    console.log(chalk.gray(`   Protocol: ${dbValidation.urlInfo.protocol}`));
    console.log(chalk.gray(`   Host: ${dbValidation.urlInfo.hostname}`));
    console.log(chalk.gray(`   Database: ${dbValidation.urlInfo.database || 'default'}`));
    console.log(chalk.gray(`   Local: ${dbValidation.urlInfo.isLocal ? '✅' : '❌'}`));
    
    if (!options.force) {
      const firstConfirm = await confirm({
        message: 'Are you absolutely sure you want to drop ALL tables and data?',
        default: false
      });
      
      if (!firstConfirm) {
        console.log(chalk.green('\n✅ Operation cancelled. Your data is safe.'));
        await SecurityAuditLogger.logDangerousOperation('db:drop', 'database', false);
        return;
      }
      
      const confirmText = 'DELETE ALL DATA';
      const typeConfirm = await input({
        message: `Type "${confirmText}" to confirm this destructive operation:`,
        validate: (value: string) => {
          if (value !== confirmText) {
            return `Please type exactly: ${confirmText}`;
          }
          return true;
        }
      });
      
      if (typeConfirm !== confirmText) {
        console.log(chalk.green('\n✅ Operation cancelled. Your data is safe.'));
        await SecurityAuditLogger.logDangerousOperation('db:drop', 'database', false);
        return;
      }
      
      const finalConfirm = await confirm({
        message: 'Last chance! This action cannot be undone. Proceed with database drop?',
        default: false
      });
      
      if (!finalConfirm) {
        console.log(chalk.green('\n✅ Operation cancelled. Your data is safe.'));
        await SecurityAuditLogger.logDangerousOperation('db:drop', 'database', false);
        return;
      }
    }
    
    await SecurityAuditLogger.logDangerousOperation('db:drop', 'database', true);
    
    console.log(chalk.red('\n🗑️  Proceeding with database drop...'));
    console.log(chalk.yellow('   This may take a moment...'));
    
    const { lormDir } = await initializeCommand('database drop');
    
    await executeDrizzleKit(
      'drop',
      lormDir,
      'Database dropped successfully! All tables and data have been removed.'
    );
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(`\n✅ Database drop completed in ${duration}ms`));
    console.log(chalk.blue('\n💡 Next steps:'));
    console.log(chalk.gray('   • Run `npx @lorm/cli db:push` to recreate tables'));
    console.log(chalk.gray('   • Or run `npx @lorm/cli db:migrate` if you have migrations'));
    
    await SecurityAuditLogger.logSecurityEvent('db_drop_completed', {
      duration,
      database: dbValidation.urlInfo?.database,
      host: dbValidation.urlInfo?.hostname
    }, 'warn');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    await SecurityAuditLogger.logSecurityEvent('db_drop_failed', {
      duration,
      error: error instanceof Error ? error.message : String(error)
    }, 'error');
    
    handleCommandError(error, 'Database Drop');
  }
}