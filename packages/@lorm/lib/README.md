# 🛠️ @lorm/lib

Shared utilities and enterprise features for the **Lorm framework** — providing advanced caching, plugin system, and performance monitoring.

> 📦 **Optimized Bundle**: ~20KB with enterprise features
> 🚀 **Production-Ready**: Enterprise-grade build configuration and performance monitoring
> 🔧 **Enterprise Features**: Advanced caching, plugin system, and performance tracking

---

## 🚀 Features

### Core Utilities
- **Package Manager Detection**: Automatic detection of npm, pnpm, yarn, or bun
- **File System Utilities**: Advanced file operations and validation
- **Configuration Validation**: Comprehensive project configuration validation
- **Template Generation**: Code generation for schemas, routers, and configs

### Enterprise Features
- **Advanced Caching**: File-based cache with TTL and size management
- **Plugin System**: Extensible plugin architecture with marketplace support
- **Performance Monitoring**: Built-in performance tracking and metrics
- **Error Recovery**: Intelligent error handling with contextual suggestions
- **Help System**: Interactive help and documentation system

### Developer Experience
- **Drizzle Kit Integration**: Seamless database migration and introspection
- **Type Generation**: Automatic TypeScript type generation
- **Hot Reloading**: Development server with file watching

---

## 🛠️ API

### Package Manager

```ts
import { detectPackageManager, installDependencies } from '@lorm/lib';

const pm = await detectPackageManager();
await installDependencies(['zod', '@lorm/core'], pm);
```

### Caching System

```ts
import { CommandCache } from '@lorm/lib';

const cache = new CommandCache({
  ttl: 3600000, // 1 hour
  maxSize: 100
});

const result = await cache.wrap('key', async () => {
  return expensiveOperation();
});
```

### Plugin System

```ts
import { PluginManager } from '@lorm/lib';

const pluginManager = new PluginManager();
await pluginManager.loadPlugins('./plugins');
await pluginManager.executeHook('beforeBuild', context);
```

### Performance Monitoring

```ts
import { PerformanceMonitor } from '@lorm/lib';

const monitor = new PerformanceMonitor();
monitor.startTracking('build');
// ... build process
monitor.endTracking('build');
monitor.generateReport();
```

---

## 📦 Bundle Optimization

- **Optimized Size**: ~20KB with comprehensive enterprise features
- **Tree-Shaking**: Comprehensive dead code elimination
- **Minification**: Production-ready compressed output
- **Modular Architecture**: Import only what you need
- **External Dependencies**: Large libraries externalized for optimal bundling

---

## 🔧 Enterprise Features

### Plugin Marketplace
- **Plugin Discovery**: Automatic plugin detection and loading
- **Premium Plugins**: Support for premium plugin marketplace
- **User Authorization**: Built-in user authentication for premium features
- **Hook System**: Extensible hook system for custom functionality

### Performance Tracking
- **Metrics Collection**: Automatic performance metrics collection
- **Report Generation**: Detailed performance reports and analysis
- **Memory Monitoring**: Memory usage tracking and optimization
- **Persistence**: Metrics stored in `.lorm` directory for historical analysis

### Advanced Caching
- **File-Based Cache**: Persistent caching with configurable TTL
- **Size Management**: Automatic cache size management and cleanup
- **Command Wrapping**: Easy caching wrapper for expensive operations
- **Cache Invalidation**: Smart cache invalidation strategies

---

## 🧩 Framework Integration

Designed for seamless integration with:

- ✅ **@lorm/cli** - Command-line interface utilities
- ✅ **@lorm/core** - Core framework functionality
- ✅ **Node.js** environments
- ✅ **CI/CD** pipelines

---

## 📚 Related Packages

- [`@lorm/cli`](../cli/README.md) - Command-line interface for Lorm projects
- [`@lorm/core`](../core/README.md) - Core framework functionality
- [`@lorm/client`](../client/README.md) - Auto-typed HTTP client for mobile apps
- [`@lorm/schema`](../schema/README.md) - Database schema abstractions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../../CONTRIBUTING.md) for details.

## 📄 License

Apache License - see [LICENSE](../../../LICENSE) for details.