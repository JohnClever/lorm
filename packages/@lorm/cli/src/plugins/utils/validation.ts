/**
 * @fileoverview Plugin Validation Utilities
 * 
 * Provides comprehensive validation functions for plugins and plugin-related data,
 * including schema validation, error recovery, and enhanced validation results.
 * 
 * @example
 * ```typescript
 * import { isPlugin, validatePluginName, pluginValidator } from './validation';
 * 
 * // Basic plugin validation
 * if (isPlugin(someObject)) {
 *   console.log('Valid plugin:', someObject.name);
 * }
 * 
 * // Enhanced validation with context
 * const result = await pluginValidator.validatePlugin(plugin, {
 *   strict: true,
 *   operation: 'install'
 * });
 * ```
 */

import {
  Plugin,
  PluginCommand,
  PluginHook,
  PluginError,
  PluginErrorDetails,
  LicenseType,
  ValidationResult,
  ValidationError,
  PluginContext,
  ConfigSchema,
  HookSchema,
  PluginPermission,
  PluginDependency,
  PluginLifecycle,
  PluginMetadata,
  CommandResult,
  HookExecutionContext,
  PluginName,
  PluginVersion,
  CommandName,
  HookName,
  PluginErrorCode
} from '../types';

/**
 * Validates if an object is a valid Plugin.
 * 
 * Performs comprehensive validation of plugin structure, including name format,
 * version format, and required properties.
 * 
 * @param obj - The object to validate as a plugin
 * @returns True if the object is a valid plugin, false otherwise
 * 
 * @example
 * ```typescript
 * const plugin = {
 *   name: '@my-org/my-plugin',
 *   version: '1.0.0',
 *   description: 'A sample plugin',
 *   license: { type: 'MIT' },
 *   dependencies: [],
 *   commands: [],
 *   hooks: []
 * };
 * 
 * if (isPlugin(plugin)) {
 *   console.log('Valid plugin');
 * }
 * ```
 */
export function isPlugin(obj: unknown): obj is Plugin {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const plugin = obj as Record<string, unknown>;
  
  const hasValidName = typeof plugin.name === 'string';
  const hasValidVersion = typeof plugin.version === 'string';
  const hasValidDescription = typeof plugin.description === 'string';
  const hasValidAuthor = plugin.author === undefined || typeof plugin.author === 'string';
  const hasValidLicense = Boolean(plugin.license && typeof plugin.license === 'object');
  const hasValidDependencies = Array.isArray(plugin.dependencies);
  const hasValidCommands = Array.isArray(plugin.commands);
  const hasValidHooks = Array.isArray(plugin.hooks);
  
  if (!hasValidName || !hasValidVersion) {
    return false;
  }
  
  const hasValidNameFormat = validatePluginName(plugin.name as string);
  const hasValidVersionFormat = validatePluginVersion(plugin.version as string);
  
  return hasValidName && hasValidVersion && hasValidDescription && hasValidAuthor && hasValidLicense && hasValidDependencies && hasValidCommands && hasValidHooks && hasValidNameFormat && hasValidVersionFormat;
}

/**
 * Validates plugin name format according to npm package naming conventions.
 * 
 * Ensures the name follows npm standards: lowercase, hyphens allowed,
 * scoped packages supported, and length constraints.
 * 
 * @param name - The plugin name to validate
 * @returns True if the name format is valid, false otherwise
 * 
 * @example
 * ```typescript
 * validatePluginName('@my-org/my-plugin'); // true
 * validatePluginName('my-plugin'); // true
 * validatePluginName('My-Plugin'); // false (uppercase)
 * validatePluginName(''); // false (empty)
 * ```
 */
export function validatePluginName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  

  const nameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return nameRegex.test(name) && name.length > 0 && name.length <= 214;
}

/**
 * Validates plugin version format according to semantic versioning (semver).
 * 
 * Supports standard semver format: MAJOR.MINOR.PATCH with optional
 * pre-release and build metadata.
 * 
 * @param version - The version string to validate
 * @returns True if the version follows semver format, false otherwise
 * 
 * @example
 * ```typescript
 * validatePluginVersion('1.0.0'); // true
 * validatePluginVersion('1.0.0-alpha.1'); // true
 * validatePluginVersion('1.0.0+build.1'); // true
 * validatePluginVersion('1.0'); // false (incomplete)
 * ```
 */
export function validatePluginVersion(version: string): boolean {
  if (!version || typeof version !== 'string') {
    return false;
  }
  

  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Validates if an object is a valid PluginCommand.
 * 
 * Checks for required properties: name, description, and handler function.
 * Ensures the command has a non-empty name and proper structure.
 * 
 * @param obj - The object to validate as a plugin command
 * @returns True if the object is a valid plugin command, false otherwise
 * 
 * @example
 * ```typescript
 * const command = {
 *   name: 'build',
 *   description: 'Build the project',
 *   handler: async (args, context) => {
 *     // implementation here
 *   }
 * };
 * 
 * if (isPluginCommand(command)) {
 *   console.log('Valid command');
 * }
 * ```
 */
export function isPluginCommand(obj: unknown): obj is PluginCommand {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const command = obj as Record<string, unknown>;
  
  return (
    typeof command.name === 'string' &&
    typeof command.description === 'string' &&
    typeof command.handler === 'function' &&
    command.name.length > 0 &&
    command.description.length > 0
  );
}

/**
 * Validates plugin license
 */
export function validatePluginLicense(license: unknown): boolean {
  if (!license || typeof license !== 'object') {
    return false;
  }

  const licenseObj = license as Record<string, unknown>;
  const validLicenseTypes: LicenseType[] = [
    'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 
    'LGPL-2.1', 'MPL-2.0', 'CDDL-1.0', 'EPL-2.0', 'Custom', 'Proprietary'
  ];
  
  return (
    typeof licenseObj.type === 'string' &&
    validLicenseTypes.includes(licenseObj.type as LicenseType)
  );
}

/**
 * Validates plugin dependencies
 */
export function validatePluginDependencies(dependencies: unknown): boolean {
  if (!dependencies) {
    return true; // Dependencies are optional
  }
  
  if (typeof dependencies !== 'object') {
    return false;
  }
  
  const deps = dependencies as Record<string, unknown>;
  
  for (const [name, version] of Object.entries(deps)) {
    if (typeof name !== 'string' || typeof version !== 'string') {
      return false;
    }
    
    if (!validatePluginName(name) || !validatePluginVersion(version.replace(/[^\d\.]/g, ''))) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates plugin engines requirement
 */
export function validatePluginEngines(engines: unknown): boolean {
  if (!engines) {
    return true; // Engines are optional
  }
  
  if (typeof engines !== 'object') {
    return false;
  }
  
  const enginesObj = engines as Record<string, unknown>;
  
  for (const [engine, version] of Object.entries(enginesObj)) {
    if (typeof engine !== 'string' || typeof version !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * Creates a standardized plugin error
 */
export function createPluginError(
  code: PluginErrorCode,
  message: string,
  details?: Partial<PluginErrorDetails>
): PluginError {
  const error = new Error(message) as PluginError;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Checks if an error is a plugin error
 */
export function isPluginError(obj: unknown): obj is PluginError {
  return (
    obj instanceof Error &&
    'code' in obj &&
    typeof (obj as PluginError).code === 'string'
  );
}

/**
 * Enhanced validation result with recovery suggestions
 */
export interface EnhancedValidationResult extends ValidationResult {
  readonly severity: 'error' | 'warning' | 'info';
  readonly recoverable: boolean;
  readonly suggestions: readonly string[];
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
}

/**
 * Validation context for enhanced error reporting
 */
export interface ValidationContext {
  readonly pluginName?: string;
  readonly operation?: string;
  readonly strict?: boolean;
  readonly skipOptional?: boolean;
  readonly customValidators?: Record<string, (value: unknown) => ValidationResult>;
}

/**
 * Schema validator interface
 */
export interface SchemaValidator<T = unknown> {
  validate(value: unknown, context?: ValidationContext): ValidationResult;
  validateAsync(value: unknown, context?: ValidationContext): Promise<ValidationResult>;
  getSchema(): Record<string, unknown>;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  readonly canRecover: (error: PluginError) => boolean;
  readonly recover: (error: PluginError, context?: Record<string, unknown>) => Promise<unknown>;
  readonly priority: number;
}

/**
 * Validation rule interface
 */
export interface ValidationRule<T = unknown> {
  readonly name: string;
  readonly validate: (value: T, context?: ValidationContext) => ValidationResult;
  readonly required?: boolean;
  readonly async?: boolean;
}

/**
 * Comprehensive plugin validator
 */
export class PluginValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private schemas: Map<string, SchemaValidator> = new Map();
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultSchemas();
    this.initializeRecoveryStrategies();
  }

  /**
   * Add custom validation rule
   */
  addRule<T>(field: string, rule: ValidationRule<T>): void {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push(rule as ValidationRule);
  }

  /**
   * Add schema validator
   */
  addSchema(name: string, validator: SchemaValidator): void {
    this.schemas.set(name, validator);
  }

  /**
   * Add error recovery strategy
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Validate plugin with comprehensive checks
   */
  async validatePlugin(
    plugin: unknown,
    context: ValidationContext = {}
  ): Promise<EnhancedValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Basic structure validation
      if (!isPlugin(plugin)) {
        return this.createValidationResult(false, [
          { message: 'Invalid plugin structure', code: 'INVALID_STRUCTURE' }
        ], [], 'error', false, ['Ensure plugin implements the Plugin interface']);
      }

      const p = plugin as Plugin;

      // Validate required fields
      await this.validateField('name', p.name, context, errors, warnings, suggestions);
      await this.validateField('version', p.version, context, errors, warnings, suggestions);
      await this.validateField('description', p.description, context, errors, warnings, suggestions);
      await this.validateField('author', p.author, context, errors, warnings, suggestions);
      await this.validateField('license', p.license, context, errors, warnings, suggestions);

      // Validate optional fields
      if (p.dependencies) {
        await this.validateField('dependencies', p.dependencies, context, errors, warnings, suggestions);
      }
      if (p.peerDependencies) {
        await this.validateField('peerDependencies', p.peerDependencies, context, errors, warnings, suggestions);
      }
      if (p.engines) {
        await this.validateField('engines', p.engines, context, errors, warnings, suggestions);
      }
      if (p.config) {
        await this.validateField('config', p.config, context, errors, warnings, suggestions);
      }
      if (p.commands) {
        await this.validateField('commands', p.commands, context, errors, warnings, suggestions);
      }
      if (p.hooks) {
        await this.validateField('hooks', p.hooks, context, errors, warnings, suggestions);
      }
      if (p.permissions) {
        await this.validateField('permissions', p.permissions, context, errors, warnings, suggestions);
      }
      if (p.lifecycle) {
        await this.validateField('lifecycle', p.lifecycle, context, errors, warnings, suggestions);
      }
      if (p.metadata) {
        await this.validateField('metadata', p.metadata, context, errors, warnings, suggestions);
      }

      // Schema validation
      if (p.configSchema) {
        const schemaResult = await this.validateSchema('config', p.config?.default, p.configSchema);
        if (!schemaResult.valid && schemaResult.errors) {
          errors.push(...schemaResult.errors);
        }
      }

      const severity = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info';
      const recoverable = errors.every(error => this.isRecoverable(error));

      return this.createValidationResult(
        errors.length === 0,
        errors,
        warnings,
        severity,
        recoverable,
        suggestions
      );
    } catch (error) {
      return this.createValidationResult(false, [
        { message: `Validation failed: ${error}`, code: 'VALIDATION_ERROR' }
      ], [], 'error', false, ['Check plugin structure and try again']);
    }
  }

  /**
   * Validate plugin command
   */
  async validateCommand(
    command: unknown,
    context: ValidationContext = {}
  ): Promise<EnhancedValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!isPluginCommand(command)) {
      return this.createValidationResult(false, [
        { message: 'Invalid command structure', code: 'INVALID_COMMAND' }
      ], [], 'error', false, ['Ensure command implements the PluginCommand interface']);
    }

    const cmd = command as PluginCommand;

    // Validate command fields
    await this.validateField('commandName', cmd.name, context, errors, warnings, suggestions);
    await this.validateField('commandDescription', cmd.description, context, errors, warnings, suggestions);
    await this.validateField('commandHandler', cmd.handler, context, errors, warnings, suggestions);

    if (cmd.options) {
      await this.validateField('commandOptions', cmd.options, context, errors, warnings, suggestions);
    }

    const severity = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info';
    const recoverable = errors.every(error => this.isRecoverable(error));

    return this.createValidationResult(
      errors.length === 0,
      errors,
      warnings,
      severity,
      recoverable,
      suggestions
    );
  }

  /**
   * Validate plugin hook
   */
  async validateHook(
    hook: unknown,
    context: ValidationContext = {}
  ): Promise<EnhancedValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!hook || typeof hook !== 'object') {
      return this.createValidationResult(false, [
        { message: 'Invalid hook structure', code: 'INVALID_HOOK' }
      ], [], 'error', false, ['Ensure hook is a valid object']);
    }

    const h = hook as PluginHook;

    // Validate hook fields
    await this.validateField('hookName', h.name, context, errors, warnings, suggestions);
    await this.validateField('hookHandler', h.handler, context, errors, warnings, suggestions);

    if (h.schema) {
      await this.validateField('hookSchema', h.schema, context, errors, warnings, suggestions);
    }

    const severity = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info';
    const recoverable = errors.every(error => this.isRecoverable(error));

    return this.createValidationResult(
      errors.length === 0,
      errors,
      warnings,
      severity,
      recoverable,
      suggestions
    );
  }

  /**
   * Attempt to recover from validation errors
   */
  async recoverFromErrors(
    errors: PluginError[],
    context?: Record<string, unknown>
  ): Promise<{ recovered: unknown[]; failed: PluginError[] }> {
    const recovered: unknown[] = [];
    const failed: PluginError[] = [];

    for (const error of errors) {
      let wasRecovered = false;
      
      for (const strategy of this.recoveryStrategies) {
        if (strategy.canRecover(error)) {
          try {
            const result = await strategy.recover(error, context);
            recovered.push(result);
            wasRecovered = true;
            break;
          } catch (recoveryError) {
            // Recovery failed, continue to next strategy
          }
        }
      }
      
      if (!wasRecovered) {
        failed.push(error);
      }
    }

    return { recovered, failed };
  }

  private async validateField(
    fieldName: string,
    value: unknown,
    context: ValidationContext,
    errors: ValidationError[],
    warnings: string[],
    suggestions: string[]
  ): Promise<void> {
    const rules = this.rules.get(fieldName) || [];
    
    for (const rule of rules) {
      try {
        const result = rule.validate(value, context);
        
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
        
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } catch (error) {
        errors.push({
          field: fieldName,
          message: `Validation rule '${rule.name}' failed: ${error}`,
          code: 'RULE_ERROR'
        });
      }
    }
  }

  private async validateSchema(
    schemaName: string,
    value: unknown,
    schema: unknown
  ): Promise<ValidationResult> {
    const validator = this.schemas.get(schemaName);
    
    if (!validator) {
      return {
        valid: true,
        warnings: [`No validator found for schema '${schemaName}'`]
      };
    }
    
    try {
      return await validator.validateAsync(value);
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: `Schema validation failed: ${error}`,
          code: 'SCHEMA_ERROR'
        }]
      };
    }
  }

  private isRecoverable(error: ValidationError): boolean {
    const recoverableCodes = [
      'MISSING_OPTIONAL',
      'FORMAT_WARNING',
      'DEPRECATED_FIELD',
      'SUGGESTION_AVAILABLE'
    ];
    
    return error.code ? recoverableCodes.includes(error.code) : false;
  }

  private createValidationResult(
    valid: boolean,
    errors: ValidationError[],
    warnings: string[],
    severity: 'error' | 'warning' | 'info',
    recoverable: boolean,
    suggestions: string[]
  ): EnhancedValidationResult {
    return {
      valid,
      errors,
      warnings,
      severity,
      recoverable,
      suggestions,
      timestamp: Date.now()
    };
  }

  private initializeDefaultRules(): void {
    // Plugin name validation rules
    this.addRule('name', {
      name: 'required',
      validate: (value) => ({
        valid: !!value,
        errors: !value ? [{ message: 'Plugin name is required', code: 'REQUIRED' }] : undefined
      })
    });

    this.addRule('name', {
      name: 'format',
      validate: (value) => {
        if (typeof value !== 'string') {
          return {
            valid: false,
            errors: [{ message: 'Plugin name must be a string', code: 'TYPE_ERROR' }]
          };
        }
        
        const isValid = validatePluginName(value);
        return {
          valid: isValid,
          errors: !isValid ? [{ message: 'Invalid plugin name format', code: 'FORMAT_ERROR' }] : undefined,
          warnings: !isValid ? ['Plugin name should follow npm package naming conventions'] : undefined
        };
      }
    });

    // Plugin version validation rules
    this.addRule('version', {
      name: 'required',
      validate: (value) => ({
        valid: !!value,
        errors: !value ? [{ message: 'Plugin version is required', code: 'REQUIRED' }] : undefined
      })
    });

    this.addRule('version', {
      name: 'semver',
      validate: (value) => {
        if (typeof value !== 'string') {
          return {
            valid: false,
            errors: [{ message: 'Plugin version must be a string', code: 'TYPE_ERROR' }]
          };
        }
        
        const isValid = validatePluginVersion(value);
        return {
          valid: isValid,
          errors: !isValid ? [{ message: 'Invalid semantic version format', code: 'SEMVER_ERROR' }] : undefined
        };
      }
    });

    // Add more validation rules for other fields...
  }

  private initializeDefaultSchemas(): void {
    // Add default schema validators
  }

  private initializeRecoveryStrategies(): void {
    // Default recovery strategy for missing optional fields
    this.addRecoveryStrategy({
      canRecover: (error) => error.code === PluginErrorCode.VALIDATION_ERROR,
      recover: async (error) => {
        // Attempt to provide default values or suggestions
        return { recovered: true, suggestion: 'Applied default configuration' };
      },
      priority: 1
    });
  }
}

/**
 * Global plugin validator instance
 */
export const pluginValidator = new PluginValidator();

/**
 * Validates plugin configuration schema
 */
export function validatePluginConfig(config: unknown): boolean {
  if (!config) {
    return true; // Config is optional
  }
  
  if (typeof config !== 'object') {
    return false;
  }
  
  const configObj = config as Record<string, unknown>;
  
  // Basic validation - config should have schema and/or default properties
  if (configObj.schema && typeof configObj.schema !== 'object') {
    return false;
  }
  
  if (configObj.default && typeof configObj.default !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Validates complete plugin structure
 */
export function validatePlugin(plugin: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isPlugin(plugin)) {
    errors.push('Invalid plugin structure');
    return { valid: false, errors };
  }
  
  const p = plugin as Plugin;
  
  // Validate required fields
  if (!validatePluginName(p.name)) {
    errors.push(`Invalid plugin name: ${p.name}`);
  }
  
  if (!validatePluginVersion(p.version)) {
    errors.push(`Invalid plugin version: ${p.version}`);
  }
  
  if (!validatePluginLicense(p.license)) {
    errors.push('Invalid plugin license');
  }
  
  // Validate optional fields
  if (p.dependencies && !validatePluginDependencies(p.dependencies)) {
    errors.push('Invalid plugin dependencies');
  }
  
  if (p.peerDependencies && !validatePluginDependencies(p.peerDependencies)) {
    errors.push('Invalid plugin peer dependencies');
  }
  
  if (p.engines && !validatePluginEngines(p.engines)) {
    errors.push('Invalid plugin engines');
  }
  
  if (p.config && !validatePluginConfig(p.config)) {
    errors.push('Invalid plugin config');
  }
  
  // Validate commands
  if (p.commands) {
    if (!Array.isArray(p.commands)) {
      errors.push('Plugin commands must be an array');
    } else {
      p.commands.forEach((command, index) => {
        if (!isPluginCommand(command)) {
          errors.push(`Invalid command at index ${index}`);
        }
      });
    }
  }
  
  // Validate hooks
  if (p.hooks) {
    if (!Array.isArray(p.hooks)) {
      errors.push('Plugin hooks must be an array');
    } else {
      p.hooks.forEach((hook, index) => {
        if (!hook.name || typeof hook.name !== 'string') {
          errors.push(`Invalid hook name at index ${index}`);
        }
        if (!hook.handler || typeof hook.handler !== 'function') {
          errors.push(`Invalid hook handler at index ${index}`);
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes plugin name for file system usage
 */
export function sanitizePluginName(name: string): string {
  return name.replace(/[@\/]/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
}

/**
 * Checks if a plugin version satisfies a requirement
 */
export function satisfiesVersion(version: string, requirement: string): boolean {
  // Simple version comparison - in a real implementation, you'd use semver
  const cleanVersion = version.replace(/[^\d\.]/g, '');
  const cleanRequirement = requirement.replace(/[^\d\.]/g, '');
  
  const versionParts = cleanVersion.split('.').map(Number);
  const requirementParts = cleanRequirement.split('.').map(Number);
  
  for (let i = 0; i < Math.max(versionParts.length, requirementParts.length); i++) {
    const vPart = versionParts[i] || 0;
    const rPart = requirementParts[i] || 0;
    
    if (vPart > rPart) return true;
    if (vPart < rPart) return false;
  }
  
  return true; // Equal versions satisfy
}