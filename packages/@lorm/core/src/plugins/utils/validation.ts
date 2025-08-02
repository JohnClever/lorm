// Plugin Validation Utilities for LORM Framework
// Handles validation of plugin structure, configuration, and dependencies

import {
  Plugin,
  PluginName,
  PluginVersion,
  PluginCommand,
  PluginHook,
  PluginPermission,
  PluginDependency,
  ValidationResult,
  ValidationError,
  PluginError,
  PluginErrorCode,
  PluginErrorDetails,
  ConfigSchema,
  StrictRecord
} from '../types';

/**
 * Plugin Validator
 * 
 * Provides comprehensive validation for plugins, including:
 * - Plugin structure validation
 * - Configuration schema validation
 * - Dependency validation
 * - Permission validation
 * - Command and hook validation
 */
export class PluginValidator {
  private readonly pluginNameRegex = /^[a-z0-9-_]+$/;
  private readonly versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/;
  private readonly commandNameRegex = /^[a-z0-9-:]+$/;
  private readonly hookNameRegex = /^[a-z0-9-:]+$/;

  /**
   * Validate a complete plugin object
   */
  validatePlugin<TConfig extends StrictRecord<string, unknown> = StrictRecord<string, unknown>>(
    plugin: unknown
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Basic type check
    if (!plugin || typeof plugin !== 'object') {
      return {
        valid: false,
        errors: [{
          field: 'plugin',
          message: 'Plugin must be an object',
          code: 'INVALID_TYPE'
        }]
      };
    }

    const pluginObj = plugin as Record<string, unknown>;

    // Validate required fields
    const requiredFields = ['name', 'version', 'description', 'author', 'license'];
    for (const field of requiredFields) {
      if (!(field in pluginObj) || pluginObj[field] === undefined || pluginObj[field] === null) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          code: 'REQUIRED_FIELD_MISSING'
        });
      }
    }

    // Validate plugin name
    if (typeof pluginObj.name === 'string') {
      const nameValidation = this.validatePluginName(pluginObj.name);
      if (!nameValidation.valid) {
        errors.push(...(nameValidation.errors || []));
      }
    } else if (pluginObj.name !== undefined) {
      errors.push({
        field: 'name',
        message: 'Plugin name must be a string',
        code: 'INVALID_TYPE',
        value: pluginObj.name
      });
    }

    // Validate plugin version
    if (typeof pluginObj.version === 'string') {
      const versionValidation = this.validatePluginVersion(pluginObj.version);
      if (!versionValidation.valid) {
        errors.push(...(versionValidation.errors || []));
      }
    } else if (pluginObj.version !== undefined) {
      errors.push({
        field: 'version',
        message: 'Plugin version must be a string',
        code: 'INVALID_TYPE',
        value: pluginObj.version
      });
    }

    // Validate description
    if (typeof pluginObj.description === 'string') {
      if (pluginObj.description.length < 10) {
        warnings.push('Plugin description should be at least 10 characters long');
      }
      if (pluginObj.description.length > 500) {
        warnings.push('Plugin description should be less than 500 characters');
      }
    } else if (pluginObj.description !== undefined) {
      errors.push({
        field: 'description',
        message: 'Plugin description must be a string',
        code: 'INVALID_TYPE',
        value: pluginObj.description
      });
    }

    // Validate author
    if (typeof pluginObj.author !== 'string' && pluginObj.author !== undefined) {
      errors.push({
        field: 'author',
        message: 'Plugin author must be a string',
        code: 'INVALID_TYPE',
        value: pluginObj.author
      });
    }

    // Validate license
    if (pluginObj.license !== undefined) {
      const licenseValidation = this.validatePluginLicense(pluginObj.license);
      if (!licenseValidation.valid) {
        errors.push(...(licenseValidation.errors || []));
      }
    }

    // Validate optional fields
    if (pluginObj.homepage !== undefined && typeof pluginObj.homepage !== 'string') {
      errors.push({
        field: 'homepage',
        message: 'Plugin homepage must be a string',
        code: 'INVALID_TYPE',
        value: pluginObj.homepage
      });
    }

    if (pluginObj.repository !== undefined && typeof pluginObj.repository !== 'string') {
      errors.push({
        field: 'repository',
        message: 'Plugin repository must be a string',
        code: 'INVALID_TYPE',
        value: pluginObj.repository
      });
    }

    // Validate keywords
    if (pluginObj.keywords !== undefined) {
      const keywordsValidation = this.validateKeywords(pluginObj.keywords);
      if (!keywordsValidation.valid) {
        errors.push(...(keywordsValidation.errors || []));
      }
    }

    // Validate engines
    if (pluginObj.engines !== undefined) {
      const enginesValidation = this.validateEngines(pluginObj.engines);
      if (!enginesValidation.valid) {
        errors.push(...(enginesValidation.errors || []));
      }
    }

    // Validate dependencies
    if (pluginObj.dependencies !== undefined) {
      const depsValidation = this.validateDependencies(pluginObj.dependencies);
      if (!depsValidation.valid) {
        errors.push(...(depsValidation.errors || []));
      }
    }

    // Validate peer dependencies
    if (pluginObj.peerDependencies !== undefined) {
      const peerDepsValidation = this.validateDependencies(pluginObj.peerDependencies);
      if (!peerDepsValidation.valid) {
        errors.push(...(peerDepsValidation.errors || []));
      }
    }

    // Validate commands
    if (pluginObj.commands !== undefined) {
      const commandsValidation = this.validateCommands(pluginObj.commands);
      if (!commandsValidation.valid) {
        errors.push(...(commandsValidation.errors || []));
      }
    }

    // Validate hooks
    if (pluginObj.hooks !== undefined) {
      const hooksValidation = this.validateHooks(pluginObj.hooks);
      if (!hooksValidation.valid) {
        errors.push(...(hooksValidation.errors || []));
      }
    }

    // Validate permissions
    if (pluginObj.permissions !== undefined) {
      const permissionsValidation = this.validatePermissions(pluginObj.permissions);
      if (!permissionsValidation.valid) {
        errors.push(...(permissionsValidation.errors || []));
      }
    }

    // Validate plugin dependencies
    if (pluginObj.pluginDependencies !== undefined) {
      const pluginDepsValidation = this.validatePluginDependencies(pluginObj.pluginDependencies);
      if (!pluginDepsValidation.valid) {
        errors.push(...(pluginDepsValidation.errors || []));
      }
    }

    // Validate configuration schema
    if (pluginObj.configSchema !== undefined) {
      const configSchemaValidation = this.validateConfigSchema(pluginObj.configSchema);
      if (!configSchemaValidation.valid) {
        errors.push(...(configSchemaValidation.errors || []));
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate plugin name
   */
  validatePluginName(name: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!this.pluginNameRegex.test(name)) {
      errors.push({
        field: 'name',
        message: 'Plugin name must contain only lowercase letters, numbers, hyphens, and underscores',
        code: 'INVALID_FORMAT',
        value: name
      });
    }

    if (name.length < 2) {
      errors.push({
        field: 'name',
        message: 'Plugin name must be at least 2 characters long',
        code: 'TOO_SHORT',
        value: name
      });
    }

    if (name.length > 50) {
      errors.push({
        field: 'name',
        message: 'Plugin name must be less than 50 characters long',
        code: 'TOO_LONG',
        value: name
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate plugin version
   */
  validatePluginVersion(version: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!this.versionRegex.test(version)) {
      errors.push({
        field: 'version',
        message: 'Plugin version must follow semantic versioning (e.g., 1.0.0, 1.0.0-beta)',
        code: 'INVALID_FORMAT',
        value: version
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate plugin license
   */
  validatePluginLicense(license: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof license === 'string') {
      // Simple string license
      const validLicenses = [
        'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC',
        'LGPL-2.1', 'MPL-2.0', 'CDDL-1.0', 'EPL-2.0', 'Custom', 'Proprietary'
      ];
      
      if (!validLicenses.includes(license)) {
        errors.push({
          field: 'license',
          message: `Invalid license type. Must be one of: ${validLicenses.join(', ')}`,
          code: 'INVALID_VALUE',
          value: license
        });
      }
    } else if (typeof license === 'object' && license !== null) {
      // License object
      const licenseObj = license as Record<string, unknown>;
      
      if (typeof licenseObj.type !== 'string') {
        errors.push({
          field: 'license.type',
          message: 'License type must be a string',
          code: 'INVALID_TYPE',
          value: licenseObj.type
        });
      }
      
      if (licenseObj.url !== undefined && typeof licenseObj.url !== 'string') {
        errors.push({
          field: 'license.url',
          message: 'License URL must be a string',
          code: 'INVALID_TYPE',
          value: licenseObj.url
        });
      }
    } else {
      errors.push({
        field: 'license',
        message: 'License must be a string or object',
        code: 'INVALID_TYPE',
        value: license
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate keywords array
   */
  validateKeywords(keywords: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(keywords)) {
      errors.push({
        field: 'keywords',
        message: 'Keywords must be an array',
        code: 'INVALID_TYPE',
        value: keywords
      });
      return { valid: false, errors };
    }

    keywords.forEach((keyword, index) => {
      if (typeof keyword !== 'string') {
        errors.push({
          field: `keywords[${index}]`,
          message: 'Each keyword must be a string',
          code: 'INVALID_TYPE',
          value: keyword
        });
      } else if (keyword.length === 0) {
        errors.push({
          field: `keywords[${index}]`,
          message: 'Keywords cannot be empty',
          code: 'EMPTY_VALUE',
          value: keyword
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate engines object
   */
  validateEngines(engines: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof engines !== 'object' || engines === null) {
      errors.push({
        field: 'engines',
        message: 'Engines must be an object',
        code: 'INVALID_TYPE',
        value: engines
      });
      return { valid: false, errors };
    }

    const enginesObj = engines as Record<string, unknown>;
    
    for (const [engine, version] of Object.entries(enginesObj)) {
      if (typeof version !== 'string') {
        errors.push({
          field: `engines.${engine}`,
          message: 'Engine version must be a string',
          code: 'INVALID_TYPE',
          value: version
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate dependencies object
   */
  validateDependencies(dependencies: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof dependencies !== 'object' || dependencies === null) {
      errors.push({
        field: 'dependencies',
        message: 'Dependencies must be an object',
        code: 'INVALID_TYPE',
        value: dependencies
      });
      return { valid: false, errors };
    }

    const depsObj = dependencies as Record<string, unknown>;
    
    for (const [dep, version] of Object.entries(depsObj)) {
      if (typeof version !== 'string') {
        errors.push({
          field: `dependencies.${dep}`,
          message: 'Dependency version must be a string',
          code: 'INVALID_TYPE',
          value: version
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate commands array
   */
  validateCommands(commands: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(commands)) {
      errors.push({
        field: 'commands',
        message: 'Commands must be an array',
        code: 'INVALID_TYPE',
        value: commands
      });
      return { valid: false, errors };
    }

    commands.forEach((command, index) => {
      const commandValidation = this.validateCommand(command, `commands[${index}]`);
      if (!commandValidation.valid) {
        errors.push(...(commandValidation.errors || []));
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a single command
   */
  validateCommand(command: unknown, fieldPrefix = 'command'): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof command !== 'object' || command === null) {
      errors.push({
        field: fieldPrefix,
        message: 'Command must be an object',
        code: 'INVALID_TYPE',
        value: command
      });
      return { valid: false, errors };
    }

    const commandObj = command as Record<string, unknown>;

    // Validate required fields
    if (typeof commandObj.name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Command name must be a string',
        code: 'INVALID_TYPE',
        value: commandObj.name
      });
    } else if (!this.commandNameRegex.test(commandObj.name)) {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Command name must contain only lowercase letters, numbers, hyphens, and colons',
        code: 'INVALID_FORMAT',
        value: commandObj.name
      });
    }

    if (typeof commandObj.description !== 'string') {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Command description must be a string',
        code: 'INVALID_TYPE',
        value: commandObj.description
      });
    }

    if (typeof commandObj.handler !== 'function') {
      errors.push({
        field: `${fieldPrefix}.handler`,
        message: 'Command handler must be a function',
        code: 'INVALID_TYPE',
        value: commandObj.handler
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate hooks array
   */
  validateHooks(hooks: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(hooks)) {
      errors.push({
        field: 'hooks',
        message: 'Hooks must be an array',
        code: 'INVALID_TYPE',
        value: hooks
      });
      return { valid: false, errors };
    }

    hooks.forEach((hook, index) => {
      const hookValidation = this.validateHook(hook, `hooks[${index}]`);
      if (!hookValidation.valid) {
        errors.push(...(hookValidation.errors || []));
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a single hook
   */
  validateHook(hook: unknown, fieldPrefix = 'hook'): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof hook !== 'object' || hook === null) {
      errors.push({
        field: fieldPrefix,
        message: 'Hook must be an object',
        code: 'INVALID_TYPE',
        value: hook
      });
      return { valid: false, errors };
    }

    const hookObj = hook as Record<string, unknown>;

    // Validate required fields
    if (typeof hookObj.name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Hook name must be a string',
        code: 'INVALID_TYPE',
        value: hookObj.name
      });
    } else if (!this.hookNameRegex.test(hookObj.name)) {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Hook name must contain only lowercase letters, numbers, hyphens, and colons',
        code: 'INVALID_FORMAT',
        value: hookObj.name
      });
    }

    if (typeof hookObj.handler !== 'function') {
      errors.push({
        field: `${fieldPrefix}.handler`,
        message: 'Hook handler must be a function',
        code: 'INVALID_TYPE',
        value: hookObj.handler
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate permissions array
   */
  validatePermissions(permissions: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(permissions)) {
      errors.push({
        field: 'permissions',
        message: 'Permissions must be an array',
        code: 'INVALID_TYPE',
        value: permissions
      });
      return { valid: false, errors };
    }

    permissions.forEach((permission, index) => {
      if (typeof permission !== 'object' || permission === null) {
        errors.push({
          field: `permissions[${index}]`,
          message: 'Permission must be an object',
          code: 'INVALID_TYPE',
          value: permission
        });
        return;
      }

      const permObj = permission as Record<string, unknown>;
      
      if (typeof permObj.name !== 'string') {
        errors.push({
          field: `permissions[${index}].name`,
          message: 'Permission name must be a string',
          code: 'INVALID_TYPE',
          value: permObj.name
        });
      }

      if (typeof permObj.description !== 'string') {
        errors.push({
          field: `permissions[${index}].description`,
          message: 'Permission description must be a string',
          code: 'INVALID_TYPE',
          value: permObj.description
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate plugin dependencies array
   */
  validatePluginDependencies(dependencies: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(dependencies)) {
      errors.push({
        field: 'pluginDependencies',
        message: 'Plugin dependencies must be an array',
        code: 'INVALID_TYPE',
        value: dependencies
      });
      return { valid: false, errors };
    }

    dependencies.forEach((dependency, index) => {
      if (typeof dependency !== 'object' || dependency === null) {
        errors.push({
          field: `pluginDependencies[${index}]`,
          message: 'Plugin dependency must be an object',
          code: 'INVALID_TYPE',
          value: dependency
        });
        return;
      }

      const depObj = dependency as Record<string, unknown>;
      
      if (typeof depObj.name !== 'string') {
        errors.push({
          field: `pluginDependencies[${index}].name`,
          message: 'Plugin dependency name must be a string',
          code: 'INVALID_TYPE',
          value: depObj.name
        });
      }

      if (depObj.version !== undefined && typeof depObj.version !== 'string') {
        errors.push({
          field: `pluginDependencies[${index}].version`,
          message: 'Plugin dependency version must be a string',
          code: 'INVALID_TYPE',
          value: depObj.version
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate configuration schema
   */
  validateConfigSchema<T extends StrictRecord<string, unknown>>(schema: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof schema !== 'object' || schema === null) {
      errors.push({
        field: 'configSchema',
        message: 'Configuration schema must be an object',
        code: 'INVALID_TYPE',
        value: schema
      });
      return { valid: false, errors };
    }

    const schemaObj = schema as Record<string, unknown>;

    if (typeof schemaObj.properties !== 'object' || schemaObj.properties === null) {
      errors.push({
        field: 'configSchema.properties',
        message: 'Configuration schema properties must be an object',
        code: 'INVALID_TYPE',
        value: schemaObj.properties
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate configuration against schema
   */
  validateConfig<T extends StrictRecord<string, unknown>>(
    config: unknown,
    schema: ConfigSchema<T>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (typeof config !== 'object' || config === null) {
      return {
        valid: false,
        errors: [{
          field: 'config',
          message: 'Configuration must be an object',
          code: 'INVALID_TYPE',
          value: config
        }]
      };
    }

    const configObj = config as Record<string, unknown>;

    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in configObj)) {
          errors.push({
            field: String(requiredProp),
            message: `Required configuration property '${String(requiredProp)}' is missing`,
            code: 'REQUIRED_PROPERTY_MISSING'
          });
        }
      }
    }

    // Validate each property
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in configObj) {
        const propValidation = this.validateConfigProperty(
          configObj[propName],
          propSchema,
          propName
        );
        if (!propValidation.valid) {
          errors.push(...(propValidation.errors || []));
        }
        if (propValidation.warnings) {
          warnings.push(...propValidation.warnings);
        }
      }
    }

    // Check for additional properties
    if (schema.additionalProperties === false) {
      for (const propName of Object.keys(configObj)) {
        if (!(propName in schema.properties)) {
          warnings.push(`Unknown configuration property '${propName}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate a single configuration property
   */
  private validateConfigProperty(
    value: unknown,
    schema: { type: string; minimum?: number; maximum?: number; pattern?: string; enum?: readonly unknown[] },
    fieldName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Type validation
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: fieldName,
            message: `Property '${fieldName}' must be a string`,
            code: 'INVALID_TYPE',
            value
          });
        } else {
          // Pattern validation
          if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
            errors.push({
              field: fieldName,
              message: `Property '${fieldName}' does not match required pattern`,
              code: 'PATTERN_MISMATCH',
              value
            });
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({
            field: fieldName,
            message: `Property '${fieldName}' must be a number`,
            code: 'INVALID_TYPE',
            value
          });
        } else {
          // Range validation
          if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push({
              field: fieldName,
              message: `Property '${fieldName}' must be at least ${schema.minimum}`,
              code: 'VALUE_TOO_SMALL',
              value
            });
          }
          if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push({
              field: fieldName,
              message: `Property '${fieldName}' must be at most ${schema.maximum}`,
              code: 'VALUE_TOO_LARGE',
              value
            });
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: fieldName,
            message: `Property '${fieldName}' must be a boolean`,
            code: 'INVALID_TYPE',
            value
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: fieldName,
            message: `Property '${fieldName}' must be an array`,
            code: 'INVALID_TYPE',
            value
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            field: fieldName,
            message: `Property '${fieldName}' must be an object`,
            code: 'INVALID_TYPE',
            value
          });
        }
        break;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `Property '${fieldName}' must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
        value
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
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