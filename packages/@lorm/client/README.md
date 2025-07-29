# 🌐 @lorm/client

Auto-typed HTTP client for consuming routes from your Lorm backend.

The `@lorm/client` package connects your mobile app (React Native, Expo) to the Lorm backend with full type safety — no manual typing, no REST boilerplate.

> 📦 **Ultra-Lightweight**: ~6KB optimized bundle with comprehensive tree-shaking
> 🚀 **Production-Ready**: Enterprise-grade build configuration and performance monitoring

---

## 📦 Installation

```bash
npm install @lorm/client
```

---

## 🚀 Quick Start

```ts
import { createClient } from "@lorm/client";

const client = createClient();

const users = await client.getAllUsers();

console.log(users); // "data from users"
```

---

## 🛠️ API

### `createClient()`

Creates a new Lorm client instance.

#### Example:

```ts
const client = createClient();
```

---

## ✅ Type Safety

The client is auto-typed based on your Lorm backend routes (`lorm.router.js`). You get full autocomplete and validation on input/output.

```ts
client.getUserById({ id: "not-a-number" }); // ❌ Type error
client.getUserById({ id: 123 }); // ✅ Fully typed
```

Types are generated automatically when you run:

```bash
npx @lorm/cli dev
```

> 💡 **Note**: Use `npx @lorm/cli` for local execution. The CLI is designed for project-specific usage and doesn't require global installation.

They live in:

```
.lorm/types.d.ts
```

Make sure your frontend project has access to this file, or copy it into your app’s type declarations.

---

## 🧩 Framework Support

Works seamlessly with:

- ✅ React Native
- ✅ Expo

## 📦 Bundle Optimization

- **Ultra-Lightweight**: ~6KB optimized bundle size
- **Tree-Shaking**: Comprehensive dead code elimination
- **Minification**: Production-ready compressed output
- **Zero Dependencies**: Minimal runtime overhead for mobile apps

---

## 🐛 Troubleshooting

**“Cannot read property query of undefined”**

- Check if the route name matches exactly
- Make sure `.lorm/types.d.ts` exists and is correctly imported

**"Types not found"**

- Run `npx @lorm/cli dev` to regenerate types
- Check your TypeScript config paths
- Validate your configuration with `npx @lorm/cli check`

**"CLI command not found"**

- Make sure you're using `npx @lorm/cli` (not global installation)
- Verify the CLI is available: `npx @lorm/cli --version`

### Getting Help

- Use `npx @lorm/cli help` for CLI assistance
- Check the [CLI documentation](../cli/README.md) for detailed command reference
- Visit the [main documentation](../../../README.md) for setup guides

---

## 📚 Related Packages

- [`@lorm/cli`](../cli/README.md) - Command-line interface for Lorm projects
- [`@lorm/core`](../core/README.md) - Core Lorm functionality and utilities

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../../CONTRIBUTING.md) for details.

## 📄 License

Apache License - see [LICENSE](../../../LICENSE) for details.
