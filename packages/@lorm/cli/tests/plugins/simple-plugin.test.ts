/**
 * Tests for the simplified plugin interface and performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SimplePlugin,
  SimplePluginBuilder,
  createSimplePlugin,
  convertSimplePlugin,
  isSimplePlugin,
  PerformanceManager,
  OptimizedPluginLoader,
  PluginTestSuite,
  MockPluginManager
} from '@/plugins';

describe('Simple Plugin Interface', () => {
  describe('SimplePlugin Creation', () => {
    it('should create a simple plugin with minimal configuration', () => {
      const plugin: SimplePlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin'
      };

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.description).toBe('A test plugin');
    });

    it('should create a simple plugin with commands', () => {
      const plugin: SimplePlugin = {
        name: 'command-plugin',
        version: '1.0.0',
        description: 'Plugin with commands',
        commands: [
          {
            name: 'hello',
            description: 'Say hello',
            action: async (args) => {
              return `Hello, ${args.name || 'World'}!`;
            },
            options: [
              {
                name: 'name',
                description: 'Name to greet',
                type: 'string'
              }
            ]
          }
        ]
      };

      expect(plugin.commands).toHaveLength(1);
      expect(plugin.commands![0].name).toBe('hello');
      expect(plugin.commands![0].options).toHaveLength(1);
    });

    it('should create a simple plugin with hooks', () => {
      const plugin: SimplePlugin = {
        name: 'hook-plugin',
        version: '1.0.0',
        description: 'Plugin with hooks',
        hooks: [
          {
            name: 'beforeCommand',
            handler: async (context) => {
              console.log('Before command execution');
            }
          }
        ]
      };

      expect(plugin.hooks).toHaveLength(1);
      expect(plugin.hooks![0].name).toBe('beforeCommand');
    });

    it('should create a simple plugin with lifecycle methods', async () => {
      const onActivate = vi.fn();
      const onDeactivate = vi.fn();

      const plugin: SimplePlugin = {
        name: 'lifecycle-plugin',
        version: '1.0.0',
        description: 'Plugin with lifecycle',
        onActivate,
        onDeactivate
      };

      await plugin.onActivate?.();
      await plugin.onDeactivate?.();

      expect(onActivate).toHaveBeenCalledOnce();
      expect(onDeactivate).toHaveBeenCalledOnce();
    });
  });

  describe('SimplePluginBuilder', () => {
    it('should build a plugin using fluent API', () => {
      const plugin = new SimplePluginBuilder()
        .name('builder-plugin')
        .version('2.0.0')
        .description('Built with fluent API')
        .addCommand({
          name: 'build',
          description: 'Build project',
          action: async () => 'Building...'
        })
        .addHook({
          name: 'afterCommand',
          handler: async () => console.log('After command')
        })
        .build();

      expect(plugin.name).toBe('builder-plugin');
      expect(plugin.version).toBe('2.0.0');
      expect(plugin.commands).toHaveLength(1);
      expect(plugin.hooks).toHaveLength(1);
    });

    it('should allow chaining multiple commands and hooks', () => {
      const plugin = new SimplePluginBuilder()
        .name('multi-plugin')
        .version('1.0.0')
        .description('Multiple commands and hooks')
        .addCommand({
          name: 'cmd1',
          description: 'Command 1',
          action: async () => 'cmd1'
        })
        .addCommand({
          name: 'cmd2',
          description: 'Command 2',
          action: async () => 'cmd2'
        })
        .addHook({
          name: 'hook1',
          handler: async () => {}
        })
        .addHook({
          name: 'hook2',
          handler: async () => {}
        })
        .build();

      expect(plugin.commands).toHaveLength(2);
      expect(plugin.hooks).toHaveLength(2);
    });
  });

  describe('createSimplePlugin Factory', () => {
    it('should create a plugin using factory function', () => {
      const plugin = createSimplePlugin({
        name: 'factory-plugin',
        version: '1.5.0',
        description: 'Created with factory',
        commands: [
          {
            name: 'deploy',
            description: 'Deploy app',
            action: async () => 'Deploying...'
          }
        ]
      });

      expect(plugin.name).toBe('factory-plugin');
      expect(plugin.version).toBe('1.5.0');
      expect(plugin.commands).toHaveLength(1);
    });
  });

  describe('Plugin Conversion', () => {
    it('should detect simple plugins correctly', () => {
      const simplePlugin: SimplePlugin = {
        name: 'simple',
        version: '1.0.0',
        description: 'Simple plugin'
      };

      const complexPlugin = {
        name: 'complex',
        version: '1.0.0',
        description: 'Complex plugin',
        metadata: {
          author: 'Test'
        }
      };

      expect(isSimplePlugin(simplePlugin)).toBe(true);
      expect(isSimplePlugin(complexPlugin)).toBe(false);
    });

    it('should convert simple plugin to full plugin', () => {
      const simplePlugin: SimplePlugin = {
        name: 'convert-test',
        version: '1.0.0',
        description: 'Plugin to convert',
        commands: [
          {
            name: 'test',
            description: 'Test command',
            action: async () => 'test'
          }
        ]
      };

      const fullPlugin = convertSimplePlugin(simplePlugin);

      expect(fullPlugin.name).toBe('convert-test');
      expect(fullPlugin.version).toBe('1.0.0');
      expect(fullPlugin.metadata).toBeDefined();
      expect(fullPlugin.commands).toHaveLength(1);
      expect(fullPlugin.lifecycle).toBeDefined();
    });
  });
});

describe('Performance Optimizations', () => {
  let performanceManager: PerformanceManager;

  beforeEach(() => {
    performanceManager = new PerformanceManager({
      lazyLoading: true,
      cacheSize: 10,
      memoryThreshold: 5,
      preloadCritical: true,
      criticalPlugins: ['critical-plugin'],
      monitoring: true,
      cleanupInterval: 1000
    });
  });

  afterEach(() => {
    performanceManager.cleanup();
  });

  describe('PerformanceManager', () => {
    it('should initialize with correct configuration', () => {
      const config = performanceManager.getConfig();
      expect(config.lazyLoading).toBe(true);
      expect(config.cacheSize).toBe(10);
      expect(config.memoryThreshold).toBe(5);
    });

    it('should track performance metrics', () => {
      const metrics = performanceManager.getMetrics();
      expect(metrics).toHaveProperty('totalPlugins');
      expect(metrics).toHaveProperty('cachedPlugins');
      expect(metrics).toHaveProperty('averageLoadTime');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('should emit events on plugin load', (done) => {
      performanceManager.on('pluginLoaded', (data) => {
        expect(data).toHaveProperty('pluginName');
        expect(data).toHaveProperty('loadTime');
        done();
      });

      // Simulate plugin load
      performanceManager.recordPluginLoad('test-plugin', 100);
    });

    it('should manage cache size limits', () => {
      // Add plugins beyond cache limit
      for (let i = 0; i < 15; i++) {
        performanceManager.addToCache(`plugin-${i}`, {
          name: `plugin-${i}`,
          version: '1.0.0',
          description: 'Test plugin'
        });
      }

      const cacheSize = performanceManager.getCacheSize();
      expect(cacheSize).toBeLessThanOrEqual(10);
    });
  });

  describe('OptimizedPluginLoader', () => {
    let loader: OptimizedPluginLoader;

    beforeEach(() => {
      loader = new OptimizedPluginLoader({
        lazyLoading: true,
        cacheSize: 5,
        memoryThreshold: 3,
        preloadCritical: false,
        criticalPlugins: [],
        monitoring: true,
        cleanupInterval: 1000
      });
    });

    it('should cache loaded plugins', async () => {
      const mockPlugin = {
        name: 'cached-plugin',
        version: '1.0.0',
        description: 'Cached plugin'
      };

      // Mock the actual loading
      vi.spyOn(loader as any, 'actualLoadPlugin').mockResolvedValue(mockPlugin);

      // Load plugin twice
      const plugin1 = await loader.loadPlugin('cached-plugin');
      const plugin2 = await loader.loadPlugin('cached-plugin');

      expect(plugin1).toBe(plugin2); // Should be same instance from cache
    });

    it('should handle lazy loading', async () => {
      const mockPlugin = {
        name: 'lazy-plugin',
        version: '1.0.0',
        description: 'Lazy loaded plugin'
      };

      vi.spyOn(loader as any, 'actualLoadPlugin').mockResolvedValue(mockPlugin);

      const startTime = Date.now();
      const plugin = await loader.loadPlugin('lazy-plugin');
      const loadTime = Date.now() - startTime;

      expect(plugin).toBeDefined();
      expect(loadTime).toBeGreaterThan(0);
    });
  });
});

describe('Plugin Testing Framework', () => {
  let testSuite: PluginTestSuite;
  let mockPlugin: SimplePlugin;

  beforeEach(() => {
    testSuite = new PluginTestSuite({
      testTimeout: 1000,
      enableCoverage: true,
      mockDependencies: true,
      isolateTests: true
    });

    mockPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Plugin for testing',
      commands: [
        {
          name: 'test-cmd',
          description: 'Test command',
          action: async (args) => `Result: ${args.input || 'default'}`,
          options: [
            {
              name: 'input',
              description: 'Input value',
              type: 'string'
            }
          ]
        }
      ],
      hooks: [
        {
          name: 'beforeTest',
          handler: async (context) => {
            console.log('Before test hook');
          }
        }
      ]
    };
  });

  describe('PluginTestSuite', () => {
    it('should run validation tests', async () => {
      const result = await testSuite.runTests(mockPlugin, {
        validationTests: true,
        performanceTests: false,
        securityTests: false,
        functionalityTests: false,
        coverageTests: false
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('results');
      expect(result.results.validation).toBeDefined();
    });

    it('should run functionality tests', async () => {
      const result = await testSuite.runTests(mockPlugin, {
        validationTests: false,
        performanceTests: false,
        securityTests: false,
        functionalityTests: true,
        coverageTests: false
      });

      expect(result.results.functionality).toBeDefined();
      expect(result.results.functionality?.commandTests).toBeDefined();
      expect(result.results.functionality?.hookTests).toBeDefined();
    });

    it('should run performance tests', async () => {
      const result = await testSuite.runTests(mockPlugin, {
        validationTests: false,
        performanceTests: true,
        securityTests: false,
        functionalityTests: false,
        coverageTests: false
      });

      expect(result.results.performance).toBeDefined();
      expect(result.results.performance?.loadTime).toBeGreaterThan(0);
    });
  });

  describe('MockPluginManager', () => {
    let mockManager: MockPluginManager;

    beforeEach(() => {
      mockManager = new MockPluginManager();
    });

    it('should register and manage mock plugins', async () => {
      await mockManager.registerPlugin(mockPlugin);
      
      const plugins = mockManager.getRegisteredPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
    });

    it('should execute plugin commands', async () => {
      await mockManager.registerPlugin(mockPlugin);
      
      const result = await mockManager.executeCommand('test-cmd', { input: 'hello' });
      expect(result).toBe('Result: hello');
    });

    it('should trigger plugin hooks', async () => {
      const hookSpy = vi.fn();
      const pluginWithSpy = {
        ...mockPlugin,
        hooks: [
          {
            name: 'beforeTest',
            handler: hookSpy
          }
        ]
      };

      await mockManager.registerPlugin(pluginWithSpy);
      await mockManager.triggerHook('beforeTest', {});

      expect(hookSpy).toHaveBeenCalledOnce();
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate simple plugins with performance optimizations', async () => {
    const simplePlugin = createSimplePlugin({
      name: 'integration-plugin',
      version: '1.0.0',
      description: 'Integration test plugin',
      commands: [
        {
          name: 'integrate',
          description: 'Integration command',
          action: async () => 'integrated'
        }
      ]
    });

    const performanceManager = new PerformanceManager({
      lazyLoading: true,
      cacheSize: 10,
      memoryThreshold: 5,
      preloadCritical: false,
      criticalPlugins: [],
      monitoring: true,
      cleanupInterval: 5000
    });

    const loader = new OptimizedPluginLoader({
      lazyLoading: true,
      cacheSize: 10,
      memoryThreshold: 5,
      preloadCritical: false,
      criticalPlugins: [],
      monitoring: true,
      cleanupInterval: 5000
    });

    // Test that simple plugin can be converted and cached
    const fullPlugin = convertSimplePlugin(simplePlugin);
    expect(fullPlugin.name).toBe('integration-plugin');
    expect(isSimplePlugin(simplePlugin)).toBe(true);
    expect(isSimplePlugin(fullPlugin)).toBe(false);

    // Test performance tracking
    const metrics = performanceManager.getMetrics();
    expect(metrics).toBeDefined();

    // Cleanup
    await performanceManager.cleanup();
  });

  it('should work with testing framework end-to-end', async () => {
    const plugin = new SimplePluginBuilder()
      .name('e2e-plugin')
      .version('1.0.0')
      .description('End-to-end test plugin')
      .addCommand({
        name: 'e2e',
        description: 'E2E command',
        action: async (args) => `E2E: ${args.test || 'passed'}`
      })
      .build();

    const testSuite = new PluginTestSuite({
      testTimeout: 2000,
      enableCoverage: true,
      mockDependencies: true,
      isolateTests: true
    });

    const result = await testSuite.runTests(plugin, {
      validationTests: true,
      performanceTests: true,
      securityTests: true,
      functionalityTests: true,
      coverageTests: true
    });

    expect(result.success).toBe(true);
    expect(result.results.validation).toBeDefined();
    expect(result.results.performance).toBeDefined();
    expect(result.results.functionality).toBeDefined();
  });
});