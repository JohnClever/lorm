# 🧠 @lorm/core

Core framework functionality for the **Lorm framework** — providing server logic, router definitions, and database integration.

> 📦 **Optimized Bundle**: ~30KB with comprehensive functionality
> 🚀 **Production-Ready**: Enterprise-grade build configuration and performance monitoring
> 🎯 **Type-Safe**: Full TypeScript support with end-to-end type safety

---

## 🚀 Features

- **Router System**: Define type-safe API routes with automatic validation
- **Database Integration**: Seamless Drizzle ORM integration with multiple adapters
- **Configuration Management**: Flexible configuration system for different environments
- **Server Logic**: Core server functionality for mobile backend APIs
- **Type Safety**: Complete TypeScript support with Zod validation
- **Performance Optimized**: Minimal overhead with comprehensive caching

---

## 🛠️ API

### `defineRouter(options)`

Define a type-safe API route with input validation and database access.

```ts
import { defineRouter } from '@lorm/core';
import { z } from 'zod';

export const getUserById = defineRouter({
  input: z.object({ id: z.number() }),
  resolve: async ({ input, db }) => {
    return db.select().from(users).where(eq(users.id, input.id));
  }
});
```

### `defineConfig(config)`

Define database configuration and project settings.

```ts
import { defineConfig } from '@lorm/core';

export default defineConfig({
  db: {
    url: process.env.DATABASE_URL,
    adapter: 'postgresql',
    options: {
      ssl: true
    }
  }
});
```

---

## 📦 Bundle Optimization

- **Optimized Size**: ~30KB with comprehensive functionality
- **Tree-Shaking**: Comprehensive dead code elimination
- **Minification**: Production-ready compressed output
- **External Dependencies**: Database drivers and large libraries externalized
- **Code Splitting**: Modular architecture for optimal loading

---

## 🔧 Database Support

Supports all Drizzle ORM adapters:

- ✅ **PostgreSQL** (Neon, Supabase, etc.)
- ✅ **MySQL** (PlanetScale, etc.)
- ✅ **SQLite** (Local development)
- ✅ **Custom adapters** via Drizzle ORM

---

## 🧩 Framework Integration

Designed specifically for:

- ✅ **React Native** applications
- ✅ **Expo** projects
- ✅ **Mobile-first** development

---

## 📚 Related Packages

- [`@lorm/cli`](../cli/README.md) - Command-line interface for Lorm projects
- [`@lorm/client`](../client/README.md) - Auto-typed HTTP client for mobile apps
- [`@lorm/schema`](../schema/README.md) - Database schema abstractions
- [`@lorm/lib`](../lib/README.md) - Shared utilities and enterprise features

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](../../../LICENSE) for details.