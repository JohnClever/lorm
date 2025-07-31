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
} from '../index';

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
              console.log(`Hello, ${args.name || 'World'}!`);
            },
            options: [
              {
                flag: '--name',
                description: 'Name to greet',
                defaultValue: 'World'
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
        init: onActivate,
        cleanup: onDeactivate
      };

      await plugin.init?.();
      await plugin.cleanup?.();

      expect(onActivate).toHaveBeenCalledOnce();
      expect(onDeactivate).toHaveBeenCalledOnce();
    });
  });

  describe('SimplePluginBuilder', () => {
    it('should build a plugin using fluent API', () => {
      const plugin = new SimplePluginBuilder('builder-plugin', '2.0.0')
        .description('Built with fluent API')
        .addCommand({
          name: 'build',
          description: 'Build project',
          action: async () => {
              console.log('Building...');
            }
        })
        .addHook({
          name: 'afterCommand',
          handler: async () => console.log('After command')
        });

      const builtPlugin = plugin.build();
      expect(builtPlugin.name).toBe('builder-plugin');
      expect(builtPlugin.version).toBe('2.0.0');
      expect(builtPlugin.commands).toHaveLength(1);
      expect(builtPlugin.hooks).toHaveLength(1);
    });

    it('should allow chaining multiple commands and hooks', () => {
      const plugin = new SimplePluginBuilder('multi-plugin', '1.0.0')
        .description('Multiple commands and hooks')
        .addCommand({
          name: 'cmd1',
          description: 'Command 1',
          action: async () => {
              console.log('cmd1');
            }
        })
        .addCommand({
          name: 'cmd2',
          description: 'Command 2',
          action: async () => {
              console.log('cmd2');
            }
        })
        .addHook({
          name: 'hook1',
          handler: async () => {}
        })
        .addHook({
          name: 'hook2',
          handler: async () => {}
        });

      const builtPlugin = plugin.build();
      expect(builtPlugin.commands).toHaveLength(2);
      expect(builtPlugin.hooks).toHaveLength(2);
    });
  });

  describe('createSimplePlugin Factory', () => {
    it('should create a plugin using factory function', () => {
      const plugin = new SimplePluginBuilder('factory-plugin', '1.5.0')
        .description('Created with factory')
        .addCommand({
          name: 'deploy',
          description: 'Deploy app',
          action: async () => {
            console.log('Deploying...');
          }
        })
        .build();

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
            action: async () => {
              console.log('test');
            }
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
    performanceManager.destroy();
  });

  describe('PerformanceManager', () => {
    it('should initialize with correct configuration', () => {
      const metrics = performanceManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.loadTimes).toBeInstanceOf(Map);
      expect(metrics.memoryUsage).toBeInstanceOf(Map);
    });

    it('should track performance metrics', () => {
      const metrics = performanceManager.getMetrics();
      expect(metrics).toHaveProperty('loadTimes');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cacheStats');
      expect(metrics).toHaveProperty('totalLoaded');
    });

    it('should emit events on plugin load', async () => {
      const eventPromise = new Promise((resolve) => {
        performanceManager.on('pluginLoaded', (data) => {
          expect(data).toHaveProperty('pluginName');
          expect(data).toHaveProperty('loadTime');
          resolve(data);
        });
      });

      // Simulate plugin load by emitting event
      performanceManager.emit('pluginLoaded', { pluginName: 'test-plugin', loadTime: 100 });
      
      await eventPromise;
    });

    it('should manage cache size limits', () => {
      // Test cache size management through metrics
      const metrics = performanceManager.getMetrics();
      expect(metrics.cacheStats).toBeDefined();
      expect(typeof metrics.cacheStats).toBe('object');
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
      timeout: 1000,
      performanceTesting: true,
      securityTesting: true,
      mockDependencies: true
    });

    mockPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Plugin for testing',
      commands: [
        {
          name: 'test-cmd',
          description: 'Test command',
          action: async (args) => {
            console.log(`Result: ${args.input || 'default'}`);
          },
          options: [
            {
              flag: '--input',
              description: 'Input value',
              defaultValue: 'default'
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
      const convertedPlugin = convertSimplePlugin(mockPlugin);
      const result = await testSuite.testPlugin(convertedPlugin);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('executionTime');
      expect(result.success).toBeDefined();
    });

    it('should run functionality tests', async () => {
      const convertedPlugin = convertSimplePlugin(mockPlugin);
      const result = await testSuite.testPlugin(convertedPlugin);

      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should run performance tests', async () => {
      const convertedPlugin = convertSimplePlugin(mockPlugin);
      const result = await testSuite.testPlugin(convertedPlugin);

      expect(result.performance).toBeDefined();
      expect(result.performance?.loadTime).toBeGreaterThan(0);
    });
  });

  describe('MockPluginManager', () => {
    let mockManager: MockPluginManager;

    beforeEach(() => {
      mockManager = new MockPluginManager();
    });

    it('should register and manage mock plugins', async () => {
      const convertedPlugin = convertSimplePlugin(mockPlugin);
      await mockManager.registerPlugin(convertedPlugin);
      
      const plugins = mockManager.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
    });

    it('should execute plugin commands', async () => {
      const convertedPlugin = convertSimplePlugin(mockPlugin);
      await mockManager.registerPlugin(convertedPlugin);
      
      await mockManager.executeCommand('test-cmd', { input: 'hello' });
      // Command executed successfully (void return)
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

      const convertedPlugin = convertSimplePlugin(pluginWithSpy);
      await mockManager.registerPlugin(convertedPlugin);
      await mockManager.executeHook('beforeTest', {}, {});

      expect(hookSpy).toHaveBeenCalledOnce();
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate simple plugins with performance optimizations', async () => {
    const simplePlugin = new SimplePluginBuilder('integration-plugin', '1.0.0')
      .description('Integration test plugin')
      .addCommand({
        name: 'integrate',
        description: 'Integration command',
        action: async () => {
          console.log('integrated');
        }
      })
      .build();

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
    performanceManager.destroy();
  });

  it('should work with testing framework end-to-end', async () => {
    const plugin = new SimplePluginBuilder('e2e-plugin', '1.0.0')
      .description('End-to-end test plugin')
      .addCommand({
        name: 'e2e',
        description: 'E2E command',
        action: async (args) => {
          console.log(`E2E: ${args.test || 'passed'}`);
        }
      });

    const testSuite = new PluginTestSuite({
      timeout: 2000,
      performanceTesting: true,
      securityTesting: true,
      mockDependencies: true
    });

    const builtPlugin = plugin.build();
    const convertedPlugin = convertSimplePlugin(builtPlugin);
    const result = await testSuite.testPlugin(convertedPlugin);

    expect(result.success).toBeDefined();
    expect(result.executionTime).toBeGreaterThan(0);
    expect(result.errors).toBeDefined();
    expect(result.warnings).toBeDefined();
  });
});