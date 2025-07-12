# 🌐 @lorm/client

Auto-typed HTTP client for consuming routes from your Lorm backend.

The `@lorm/client` package connects your frontend (React Native, React, Svelte, etc.) to the Lorm backend with full type safety — no manual typing, no REST boilerplate.

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

const data = await client.hello({ name: "John" });

console.log(data); // "Hello, John!"
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
lorm dev
```

They live in:

```
.lorm/types.d.ts
```

Make sure your frontend project has access to this file, or copy it into your app’s type declarations.

---

## 🧩 Framework Support

Works seamlessly with:

- ✅ React Native
- ✅ React / Next.js
- ✅ Svelte / SvelteKit
- ✅ Vue / Nuxt (with TypeScript)
- ✅ Any frontend that supports TypeScript

---

## 🐛 Troubleshooting

**“Cannot read property query of undefined”**

- Check if the route name matches exactly
- Make sure `.lorm/types.d.ts` exists and is correctly imported

**“Types not found”**

- Run `lorm dev` to regenerate types
- Check your TypeScript config paths

---

## 📜 License

Private project. All rights reserved. © 2025 John Clever
