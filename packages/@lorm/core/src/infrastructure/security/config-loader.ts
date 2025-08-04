import * as fs from 'fs';
import * as path from 'path';
import {
  SecurityConfig,
  AuditCategory,
  EnvironmentAuditConfig,
  DatabaseAuditConfig,
  FileSystemAuditConfig,
  DependencyAuditConfig
} from './types.js';

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  sandboxing: true,
  allowedPaths: [process.cwd()],
  allowedNetworkHosts: ['localhost', '127.0.0.1'],
  maxExecutionTime: 30000, // 30 seconds
  maxMemoryUsage: 256 * 1024 * 1024, // 256MB
  
  auditRules: {
    environment: {
      enabled: true,
      sensitivePatterns: [
        /password/i, /secret/i, /key/i, /token/i, /auth/i,
        /credential/i, /private/i, /confidential/i
      ],
      excludePatterns: [/^\$\{/, /^<%/],
      checkHardcodedSecrets: true,
      strictMode: false // Set to true for production environments
    },
    database: {
      enabled: true,
      checkCredentials: true,
      allowedHosts: ['localhost', '127.0.0.1'],
      requireSSL: false, // Set to true for production
      checkConnectionStrings: true
    },
    filesystem: {
      enabled: true,
      sensitiveFiles: [
        '.env', '.env.local', '.env.production', '.env.staging',
        'config/secrets.yml', 'config/database.yml',
        'private.key', '*.pem', '*.p12'
      ],
      excludePaths: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      checkPermissions: true,
      scanForSecrets: true
    },
    dependencies: {
      enabled: true,
      vulnerabilityThreshold: 'medium',
      excludePackages: [],
      checkLicenses: false,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC']
    }
  },
  
  autoFix: {
    enabled: false, // Disabled by default for safety
    categories: ['filesystem', 'configuration'],
    backupBeforeFix: true
  }
};

/**
 * Security configuration loader with support for multiple config sources
 */
export class SecurityConfigLoader {
  /**
   * Load security configuration from project files with optional overrides
   */
  static loadConfig(projectPath: string, overrides?: Partial<SecurityConfig>): SecurityConfig {
    const configPaths = [
      path.join(projectPath, 'lorm.security.json'),
      path.join(projectPath, 'lorm.config.json'),
      path.join(projectPath, '.lormrc')
    ];
    
    let config = { ...defaultSecurityConfig };
    
    // Load from configuration files
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (fileConfig.security) {
            config = this.mergeConfigs(config, fileConfig.security);
          }
        } catch (error) {
          // Log warning but continue with defaults
          console.warn(`Failed to load config from ${configPath}:`, error);
        }
      }
    }
    
    // Apply overrides
    if (overrides) {
      config = this.mergeConfigs(config, overrides);
    }
    
    return config;
  }
  
  /**
   * Deep merge security configurations
   */
  private static mergeConfigs(base: SecurityConfig, override: Partial<SecurityConfig>): SecurityConfig {
    return {
      ...base,
      ...override,
      auditRules: {
        ...base.auditRules,
        ...override.auditRules,
        environment: {
          ...base.auditRules.environment,
          ...override.auditRules?.environment
        },
        database: {
          ...base.auditRules.database,
          ...override.auditRules?.database
        },
        filesystem: {
          ...base.auditRules.filesystem,
          ...override.auditRules?.filesystem
        },
        dependencies: {
          ...base.auditRules.dependencies,
          ...override.auditRules?.dependencies
        }
      },
      autoFix: {
        ...base.autoFix,
        ...override.autoFix
      }
    };
  }
  
  /**
   * Validate security configuration
   */
  static validateConfig(config: SecurityConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate basic settings
    if (config.maxExecutionTime && config.maxExecutionTime < 1000) {
      errors.push('maxExecutionTime should be at least 1000ms');
    }
    
    if (config.maxMemoryUsage && config.maxMemoryUsage < 1024 * 1024) {
      errors.push('maxMemoryUsage should be at least 1MB');
    }
    
    // Validate paths
    if (!Array.isArray(config.allowedPaths) || config.allowedPaths.length === 0) {
      errors.push('allowedPaths must be a non-empty array');
    }
    
    // Validate network hosts
    if (!Array.isArray(config.allowedNetworkHosts)) {
      errors.push('allowedNetworkHosts must be an array');
    }
    
    // Validate audit rules
    const validThresholds = ['low', 'medium', 'high', 'critical'];
    if (!validThresholds.includes(config.auditRules.dependencies.vulnerabilityThreshold)) {
      errors.push('dependencies.vulnerabilityThreshold must be one of: low, medium, high, critical');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Save security configuration to file
   */
  static saveConfig(projectPath: string, config: SecurityConfig): void {
    const configPath = path.join(projectPath, 'lorm.security.json');
    const validation = this.validateConfig(config);
    
    if (!validation.valid) {
      throw new Error(`Invalid security configuration: ${validation.errors.join(', ')}`);
    }
    
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save security configuration: ${error}`);
    }
  }
}