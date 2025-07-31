/**
 * Example demonstrating the simplified plugin interface
 * This shows how to create plugins with minimal boilerplate
 */

import {
  SimplePlugin,
  SimplePluginBuilder,
  createSimplePlugin,
  PluginManager,
  PerformanceManager,
  PluginTestSuite
} from '../index';

// Example 1: Basic simple plugin using object literal
const basicPlugin: SimplePlugin = {
  name: 'my-basic-plugin',
  version: '1.0.0',
  description: 'A basic plugin example',
  
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
        console.log('Command is about to execute');
      }
    }
  ],
  
  onActivate: async () => {
    console.log('Plugin activated!');
  },
  
  onDeactivate: async () => {
    console.log('Plugin deactivated!');
  }
};

// Example 2: Using the fluent builder API
const builderPlugin = new SimplePluginBuilder()
  .name('my-builder-plugin')
  .version('2.0.0')
  .description('A plugin built with the fluent API')
  .addCommand({
    name: 'build',
    description: 'Build the project',
    action: async (args) => {
      console.log('Building project...');
      // Simulate build process
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Build complete!');
    },
    options: [
      {
        name: 'watch',
        description: 'Watch for changes',
        type: 'boolean'
      }
    ]
  })
  .addHook({
    name: 'afterCommand',
    handler: async (context) => {
      console.log('Command execution finished');
    }
  })
  .onActivate(async () => {
    console.log('Builder plugin is ready!');
  })
  .build();

// Example 3: Using the factory function
const factoryPlugin = createSimplePlugin({
  name: 'my-factory-plugin',
  version: '1.5.0',
  description: 'A plugin created with the factory function',
  
  commands: [
    {
      name: 'deploy',
      description: 'Deploy the application',
      action: async (args) => {
        console.log(`Deploying to ${args.environment || 'production'}...`);
        // Simulate deployment
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Deployment successful!');
      },
      options: [
        {
          name: 'environment',
          description: 'Target environment',
          type: 'string'
        }
      ]
    }
  ]
});

// Example 4: Performance-optimized plugin loading
export async function demonstratePerformanceOptimizations() {
  const performanceManager = new PerformanceManager({
    lazyLoading: true,
    cacheSize: 100,
    memoryThreshold: 50,
    preloadCritical: true,
    criticalPlugins: ['my-basic-plugin', 'my-builder-plugin'],
    monitoring: true,
    cleanupInterval: 300000 // 5 minutes
  });
  
  // Monitor performance events
  performanceManager.on('pluginLoaded', (data) => {
    console.log(`Plugin ${data.pluginName} loaded in ${data.loadTime}ms`);
  });
  
  performanceManager.on('memoryCleanup', (data) => {
    console.log(`Cleaned up ${data.removedCount} plugins from cache`);
  });
  
  // Get performance metrics
  const metrics = performanceManager.getMetrics();
  console.log('Performance metrics:', metrics);
}

// Example 5: Plugin testing
export async function demonstratePluginTesting() {
  const testSuite = new PluginTestSuite({
    testTimeout: 5000,
    enableCoverage: true,
    mockDependencies: true,
    isolateTests: true
  });
  
  // Test the basic plugin
  const testResult = await testSuite.runTests(basicPlugin, {
    validationTests: true,
    performanceTests: true,
    securityTests: true,
    functionalityTests: true,
    coverageTests: true
  });
  
  console.log('Test results:', testResult);
  
  if (testResult.success) {
    console.log('All tests passed!');
  } else {
    console.log('Some tests failed:', testResult.failures);
  }
}

// Example 6: Plugin manager integration
export async function demonstratePluginManagerIntegration() {
  // This would typically be done in your main application
  // const pluginManager = new PluginManager(config, dependencies...);
  
  // Register simple plugins
  // await pluginManager.registerSimplePlugin(basicPlugin);
  // await pluginManager.registerSimplePlugin(builderPlugin);
  // await pluginManager.registerSimplePlugin(factoryPlugin);
  
  // Preload critical plugins for better performance
  // await pluginManager.preloadCriticalPlugins();
  
  // Get performance metrics
  // const metrics = pluginManager.getPerformanceMetrics();
  // console.log('Plugin system metrics:', metrics);
  
  // Optimize memory usage
  // await pluginManager.optimizeMemoryUsage();
  
  console.log('Plugin manager integration example (commented out for safety)');
}

// Export the example plugins for use in tests or other examples
export {
  basicPlugin,
  builderPlugin,
  factoryPlugin
};