import chalk from 'chalk';
import { SecurityValidator, SecurityValidationResult } from '@/utils/security';
import { exists, readFile } from '@/utils/file-utils';
import { BaseCommandOptions } from '@/types';
import { resolve } from 'path';

export interface SecurityAuditCommandOptions extends BaseCommandOptions {
  verbose?: boolean;
  json?: boolean;
  fix?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditResult {
  category: string;
  status: 'pass' | 'warn' | 'fail';
  result: SecurityValidationResult;
  description: string;
}

export async function securityAudit(options: SecurityAuditCommandOptions = {}): Promise<void> {
  console.log(chalk.blue('\n🔒 Lorm Security Audit'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('Performing comprehensive security analysis...\n'));

  const auditResults: AuditResult[] = [];
  let overallScore = 0;
  let totalChecks = 0;

  try {
    // 1. Environment Variables Audit
    console.log(chalk.cyan('🔍 Checking environment variables...'));
    const envResult = SecurityValidator.validateEnvironmentVariables();
    auditResults.push({
      category: 'Environment Variables',
      status: envResult.isValid ? 'pass' : (envResult.errors.length > 0 ? 'fail' : 'warn'),
      result: envResult,
      description: 'Validates environment variable security and configuration'
    });
    totalChecks++;
    if (envResult.isValid) overallScore++;

    // 2. Database Configuration Audit
    console.log(chalk.cyan('🔍 Checking database configuration...'));
    const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;
    let dbResult: SecurityValidationResult;
    
    if (databaseUrl) {
      dbResult = SecurityValidator.validateDatabaseUrl(databaseUrl);
    } else {
      dbResult = {
        isValid: false,
        errors: ['No database URL found in environment variables'],
        warnings: [],
        suggestions: ['Set DATABASE_URL or DB_URL environment variable']
      };
    }
    
    auditResults.push({
      category: 'Database Security',
      status: dbResult.isValid ? 'pass' : (dbResult.errors.length > 0 ? 'fail' : 'warn'),
      result: dbResult,
      description: 'Validates database URL security and connection safety'
    });
    totalChecks++;
    if (dbResult.isValid) overallScore++;

    // 3. File System Security Audit
    console.log(chalk.cyan('🔍 Checking file system security...'));
    const fsResult = await auditFileSystemSecurity();
    auditResults.push({
      category: 'File System Security',
      status: fsResult.isValid ? 'pass' : (fsResult.errors.length > 0 ? 'fail' : 'warn'),
      result: fsResult,
      description: 'Validates file permissions and directory structure'
    });
    totalChecks++;
    if (fsResult.isValid) overallScore++;

    // 4. Production Safety Audit
    console.log(chalk.cyan('🔍 Checking production safety...'));
    const prodResult = SecurityValidator.validateProductionSafety('security_audit', databaseUrl);
    auditResults.push({
      category: 'Production Safety',
      status: prodResult.isValid ? 'pass' : (prodResult.errors.length > 0 ? 'fail' : 'warn'),
      result: prodResult,
      description: 'Validates production environment safety measures'
    });
    totalChecks++;
    if (prodResult.isValid) overallScore++;

    // 5. Dependencies Security Audit
    console.log(chalk.cyan('🔍 Checking dependencies security...'));
    const depsResult = await auditDependencies();
    auditResults.push({
      category: 'Dependencies Security',
      status: depsResult.isValid ? 'pass' : (depsResult.errors.length > 0 ? 'fail' : 'warn'),
      result: depsResult,
      description: 'Validates package dependencies for known vulnerabilities'
    });
    totalChecks++;
    if (depsResult.isValid) overallScore++;

    // 6. Configuration Files Audit
    console.log(chalk.cyan('🔍 Checking configuration files...'));
    const configResult = await auditConfigurationFiles();
    auditResults.push({
      category: 'Configuration Security',
      status: configResult.isValid ? 'pass' : (configResult.errors.length > 0 ? 'fail' : 'warn'),
      result: configResult,
      description: 'Validates configuration files for security issues'
    });
    totalChecks++;
    if (configResult.isValid) overallScore++;

    // Display Results
    if (options.json) {
      console.log(JSON.stringify({
        overallScore: `${overallScore}/${totalChecks}`,
        scorePercentage: Math.round((overallScore / totalChecks) * 100),
        results: auditResults
      }, null, 2));
      return;
    }

    displayAuditResults(auditResults, overallScore, totalChecks, options.verbose);

    // Provide recommendations
    if (overallScore < totalChecks) {
      console.log(chalk.yellow('\n💡 Security Recommendations:'));
      auditResults.forEach(result => {
        if (result.status !== 'pass' && result.result.suggestions.length > 0) {
          console.log(chalk.yellow(`\n${result.category}:`));
          result.result.suggestions.forEach(suggestion => {
            console.log(chalk.gray(`  • ${suggestion}`));
          });
        }
      });
    }

  } catch (error) {
    console.error(chalk.red('❌ Security audit failed:'));
    console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

async function auditFileSystemSecurity(): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  try {
    // Check for sensitive files in wrong locations
    const sensitiveFiles = ['.env', '.env.local', '.env.production', 'config.json'];
    
    for (const file of sensitiveFiles) {
      if (await exists(file)) {
        const testPath = SecurityValidator.validateFilePath(file);
        if (!testPath.isValid) {
          warnings.push(`Sensitive file ${file} found in project root`);
          suggestions.push(`Move ${file} to a secure location or add to .gitignore`);
        }
      }
    }

    // Check .lorm directory permissions
    if (await exists('.lorm')) {
      // Directory exists, which is good for logging
    } else {
      suggestions.push('Create .lorm directory for security logs');
    }

    // Check for common security files
    const securityFiles = ['.gitignore', 'SECURITY.md'];
    for (const file of securityFiles) {
      if (!await exists(file)) {
        warnings.push(`Missing ${file} file`);
        suggestions.push(`Create ${file} for better security practices`);
      }
    }

  } catch (error) {
    errors.push(`File system audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

async function auditDependencies(): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  try {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    
    if (!await exists(packageJsonPath)) {
      errors.push('No package.json found');
      return { isValid: false, errors, warnings, suggestions };
    }

    const packageContent = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    // Check for known vulnerable packages (basic check)
    const knownVulnerable = ['lodash@4.17.20', 'moment@2.29.1'];
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    Object.entries(dependencies).forEach(([name, version]) => {
      const depString = `${name}@${version}`;
      if (knownVulnerable.some(vuln => depString.includes(vuln))) {
        warnings.push(`Potentially vulnerable dependency: ${depString}`);
        suggestions.push(`Update ${name} to latest version`);
      }
    });

    // Check for package-lock.json or yarn.lock
    const hasLockFile = await exists('package-lock.json') || await exists('yarn.lock') || await exists('pnpm-lock.yaml');
    if (!hasLockFile) {
      warnings.push('No lock file found');
      suggestions.push('Use npm ci, yarn install --frozen-lockfile, or pnpm install --frozen-lockfile for reproducible builds');
    }

    suggestions.push('Run npm audit or yarn audit regularly to check for vulnerabilities');

  } catch (error) {
    errors.push(`Dependencies audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

async function auditConfigurationFiles(): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  try {
    // Check common config files for security issues
    const configFiles = [
      { file: '.env', check: checkEnvFile },
      { file: 'drizzle.config.ts', check: checkDrizzleConfig },
      { file: 'drizzle.config.js', check: checkDrizzleConfig },
    ];

    for (const { file, check } of configFiles) {
      if (await exists(file)) {
        const result = await check(file);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        suggestions.push(...result.suggestions);
      }
    }

  } catch (error) {
    errors.push(`Configuration audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

async function checkEnvFile(filePath: string): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Check for hardcoded secrets
        if (trimmed.includes('password=') || trimmed.includes('secret=') || trimmed.includes('key=')) {
          const value = trimmed.split('=')[1];
          if (value && value.length > 0 && !value.startsWith('$')) {
            warnings.push(`Potential hardcoded secret on line ${index + 1} in ${filePath}`);
            suggestions.push('Use environment-specific values or secret management');
          }
        }
      }
    });

  } catch (error) {
    errors.push(`Failed to check ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

async function checkDrizzleConfig(filePath: string): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check for hardcoded database URLs
    if (content.includes('postgresql://') || content.includes('mysql://')) {
      warnings.push(`Potential hardcoded database URL in ${filePath}`);
      suggestions.push('Use environment variables for database URLs');
    }

    // Check for verbose logging in production
    if (content.includes('verbose: true') || content.includes('"verbose": true')) {
      warnings.push(`Verbose logging enabled in ${filePath}`);
      suggestions.push('Disable verbose logging in production');
    }

  } catch (error) {
    errors.push(`Failed to check ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

function displayAuditResults(results: AuditResult[], score: number, total: number, verbose: boolean = false): void {
  console.log(chalk.blue('\n📊 Security Audit Results'));
  console.log(chalk.gray('─'.repeat(50)));

  results.forEach(result => {
    const statusIcon = getStatusIcon(result.status);
    const statusColor = getStatusColor(result.status);
    
    console.log(`\n${statusIcon} ${chalk.white(result.category)}`);
    console.log(chalk.gray(`   ${result.description}`));
    
    if (verbose || result.status !== 'pass') {
      if (result.result.errors.length > 0) {
        console.log(chalk.red('   Errors:'));
        result.result.errors.forEach(error => {
          console.log(chalk.red(`     • ${error}`));
        });
      }
      
      if (result.result.warnings.length > 0) {
        console.log(chalk.yellow('   Warnings:'));
        result.result.warnings.forEach(warning => {
          console.log(chalk.yellow(`     • ${warning}`));
        });
      }
    }
  });

  // Overall Score
  console.log(chalk.blue('\n🎯 Overall Security Score'));
  console.log(chalk.gray('─'.repeat(30)));
  
  const percentage = Math.round((score / total) * 100);
  const scoreColor = percentage >= 80 ? chalk.green : percentage >= 60 ? chalk.yellow : chalk.red;
  
  console.log(`${scoreColor(`${score}/${total} (${percentage}%)`)}`);
  
  if (percentage >= 90) {
    console.log(chalk.green('🏆 Excellent security posture!'));
  } else if (percentage >= 70) {
    console.log(chalk.yellow('⚠️  Good security, but room for improvement'));
  } else {
    console.log(chalk.red('🚨 Security improvements needed'));
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass': return '✅';
    case 'warn': return '⚠️';
    case 'fail': return '❌';
    default: return '❓';
  }
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'pass': return chalk.green;
    case 'warn': return chalk.yellow;
    case 'fail': return chalk.red;
    default: return chalk.gray;
  }
}