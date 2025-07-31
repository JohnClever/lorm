# Plugin Architecture Migration Guide

This guide helps you migrate from the complex plugin interface to the new simplified plugin system while taking advantage of performance optimizations and improved testing capabilities.

## Overview of Changes

### 1. Simplified Plugin Interface
- **Before**: Complex `Plugin` interface with extensive metadata
- **After**: `SimplePlugin` interface with minimal required fields
- **Benefit**: Faster development, less boilerplate, easier maintenance

### 2. Performance Optimizations
- **New**: Lazy loading, intelligent caching, memory management
- **New**: Performance monitoring and metrics
- **Benefit**: Better startup times, reduced memory usage

### 3. Enhanced Testing Framework
- **New**: Comprehensive plugin testing utilities
- **New**: Mock plugin manager for isolated testing
- **Benefit**: Better test coverage, easier debugging

## Migration Steps

### Step 1: Convert Complex Plugins to Simple Plugins

**Before (Complex Plugin):**
```typescript
const complexPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin',
  metadata: {
    author: 'John Doe',
    license: 'MIT',
    repository: 'https://github.com/user/plugin',
    keywords: ['cli', 'tool'],
    category: 'utility',
    tags: ['development'],
    documentation: 'https://docs.example.com',
    homepage: 'https://example.com',
    bugs: 'https://github.com/user/plugin/issues'
  },
  dependencies: ['other-plugin'],
  peerDependencies: ['peer-plugin'],
  optionalDependencies: ['optional-plugin'],
  engines: {
    node: '>=14.0.0',
    npm: '>=6.0.0'
  },
  config: {
    schema: configSchema,
    defaults: defaultConfig
  },
  permissions: {
    filesystem: ['read', 'write'],
    network: ['http', 'https'],
    system: ['env']
  },
  lifecycle: {
    onLoad: async (context) => { /* complex setup */ },
    onUnload: async (context) => { /* complex cleanup */ },
    onEnable: async (context) => { /* enable logic */ },
    onDisable: async (context) => { /* disable logic */ }
  },
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      usage: 'hello [name]',
      examples: ['hello', 'hello John'],
      options: [
        {
          name: 'name',
          description: 'Name to greet',
          type: 'string',
          required: false,
          default: 'World'
        }
      ],
      action: async (args, context) => {
        console.log(`Hello, ${args.name}!`);
      }
    }
  ],
  hooks: [
    {
      name: 'beforeCommand',
      priority: 10,
      handler: async (context) => {
        console.log('Before command');
      }
    }
  ]
};
```

**After (Simple Plugin):**
```typescript
const simplePlugin: SimplePlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin',
  
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      action: async (args) => {
        console.log(`Hello, ${args.name || 'World'}!`);
      },
      options: [
        {
          name: 'name',
          description: 'Name to greet',
          type: 'string'
        }
      ]
    }
  ],
  
  hooks: [
    {
      name: 'beforeCommand',
      handler: async (context) => {
        console.log('Before command');
      }
    }
  ],
  
  onActivate: async () => {
    // Simple activation logic
  },
  
  onDeactivate: async () => {
    // Simple deactivation logic
  }
};
```

### Step 2: Use Builder Pattern for Complex Cases

For plugins that need more structure, use the builder pattern:

```typescript
const builderPlugin = new SimplePluginBuilder()
  .name('my-complex-plugin')
  .version('2.0.0')
  .description('A more complex plugin')
  .addCommand({
    name: 'build',
    description: 'Build the project',
    action: async (args) => {
      // Build logic
    }
  })
  .addCommand({
    name: 'test',
    description: 'Run tests',
    action: async (args) => {
      // Test logic
    }
  })
  .addHook({
    name: 'beforeBuild',
    handler: async (context) => {
      // Pre-build logic
    }
  })
  .onActivate(async () => {
    console.log('Plugin activated');
  })
  .build();
```

### Step 3: Update Plugin Registration

**Before:**
```typescript
await pluginManager.registerPlugin(complexPlugin);
```

**After:**
```typescript
// Simple plugins are automatically converted
await pluginManager.registerPlugin(simplePlugin);

// Or use the dedicated method
await pluginManager.registerSimplePlugin(simplePlugin);
```

### Step 4: Add Performance Optimizations

```typescript
// Configure performance settings
const config = {
  performance: {
    lazyLoading: true,
    cacheSize: 100,
    memoryThreshold: 50,
    preloadCritical: true,
    criticalPlugins: ['essential-plugin', 'core-plugin'],
    monitoring: true,
    cleanupInterval: 300000
  }
};

// Preload critical plugins
await pluginManager.preloadCriticalPlugins();

// Monitor performance
const metrics = pluginManager.getPerformanceMetrics();
console.log('Performance metrics:', metrics);

// Optimize memory usage
await pluginManager.optimizeMemoryUsage();
```

### Step 5: Add Comprehensive Testing

```typescript
import { PluginTestSuite, PluginTestUtils } from '@lorm/cli/plugins';

// Create test suite
const testSuite = new PluginTestSuite({
  testTimeout: 5000,
  enableCoverage: true,
  mockDependencies: true,
  isolateTests: true
});

// Run comprehensive tests
const testResult = await testSuite.runTests(simplePlugin, {
  validationTests: true,
  performanceTests: true,
  securityTests: true,
  functionalityTests: true,
  coverageTests: true
});

if (!testResult.success) {
  console.error('Plugin tests failed:', testResult.failures);
}
```

## Migration Checklist

### Phase 1: Basic Migration
- [ ] Convert complex plugins to simple plugins
- [ ] Update plugin registration calls
- [ ] Test basic functionality
- [ ] Update documentation

### Phase 2: Performance Optimization
- [ ] Configure performance settings
- [ ] Identify critical plugins for preloading
- [ ] Add performance monitoring
- [ ] Implement memory optimization

### Phase 3: Enhanced Testing
- [ ] Add plugin test suites
- [ ] Create mock environments
- [ ] Implement coverage tracking
- [ ] Add performance benchmarks

### Phase 4: Advanced Features
- [ ] Use builder pattern for complex plugins
- [ ] Implement custom validation rules
- [ ] Add plugin-specific performance metrics
- [ ] Create integration tests

## Best Practices

### 1. Start Simple
- Begin with the `SimplePlugin` interface
- Add complexity only when needed
- Use the builder pattern for structured development

### 2. Performance First
- Enable lazy loading for non-critical plugins
- Preload only essential plugins
- Monitor memory usage regularly
- Clean up unused plugins

### 3. Test Everything
- Write tests for all plugin functionality
- Use mock environments for isolation
- Track test coverage
- Benchmark performance regularly

### 4. Gradual Migration
- Migrate plugins one at a time
- Test thoroughly after each migration
- Keep both interfaces during transition
- Document changes for team members

## Common Issues and Solutions

### Issue: Plugin Not Loading
**Solution:** Check if the plugin is properly registered and dependencies are available.

### Issue: Performance Degradation
**Solution:** Enable lazy loading and optimize memory usage.

### Issue: Test Failures
**Solution:** Use mock environments and check for proper isolation.

### Issue: Complex Plugin Conversion
**Solution:** Use the builder pattern or keep complex plugins as-is initially.

## Support and Resources

- **Examples:** See `examples/simple-plugin-example.ts`
- **API Documentation:** Check the type definitions
- **Performance Guide:** Monitor metrics and optimize accordingly
- **Testing Guide:** Use the comprehensive testing framework

For additional help, refer to the plugin architecture documentation or create an issue in the repository.