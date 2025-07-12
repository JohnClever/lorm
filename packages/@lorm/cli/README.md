# 🪄 @lorm/cli

Command-line interface for the **Lorm framework** — a zero-config, full-stack framework for building type-safe, high-performance apps optimized for **Mobile Applications**.

---

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @lorm/cli
```

### Local Installation

```bash
npm install @lorm/cli --save-dev
```

---

## 🚀 Quick Start

```bash
cd my-app
npx @lorm/cli init
lorm push
lorm dev
```

---

## 📋 Commands

### `lorm init`

Initialize a new Lorm project in your existing directory.

**What it does:**

- Installs required dependencies (`zod`, `@lorm/core`, `@lorm/schema`, `@lorm/lib`)
- Creates `lorm.config.js` with database configuration
- Creates `lorm.schema.js` with example schema (`users` table)
- Creates `lorm.router.js` with example API routes
- Sets up the foundation for a type-safe full-stack app

**Generated files:**

- `lorm.config.js`
- `lorm.schema.js`
- `lorm.router.js`

---

### `lorm dev`

Start a local development server with hot reload.

**What it does:**

- Starts HTTP server on `http://localhost:3000`
- Watches `lorm.router.js` for changes
- Auto-generates TypeScript types in `.lorm/types.d.ts`
- Enables instant API testing and development

**Features:**

- 🔥 Hot reload on router changes
- 🎯 Automatic type generation
- 🚀 Zero-config setup
- 📡 CORS enabled for frontend development

---

### `lorm push`

Push your schema changes to your database.

**What it does:**

- Reads your `lorm.schema.js` file
- Connects to your database using `lorm.config.js`
- Generates and applies database migrations
- Syncs your schema with the database
- Updates `.lorm/` directory with compiled artifacts

**Requirements:**

- Valid database URL in `lorm.config.js`
- Properly defined schema in `lorm.schema.js`

---

## 🗂️ Project Structure

After running `lorm init`, your project will include:

```
my-app/
├── lorm.config.js
├── lorm.schema.js
├── lorm.router.js
├── .lorm/
└── frontend/ (React Native, etc.)
```

---

## ⚙️ Configuration

### Database Setup

Edit `lorm.config.js` to configure your database:

```js
export default {
  db: {
    url: "your-db-url"
  }
}
```

**Supported databases:**

You can use any database supported by [Drizzle ORM](https://orm.drizzle.team/docs/overview):

- PostgreSQL (e.g., Neon, Supabase)
- MySQL / PlanetScale
- SQLite (great for local dev)

---

## 🧱 Schema Definition

Define your database schema in `lorm.schema.js`:

```js
import { pgTable, uuid, varchar } from "@lorm/schema";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 })
});

export const schema = { users };
```

---

## 🔧 Router Definition

Define your API routes in `lorm.router.js`:

```js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "./lorm.schema.js";

export const getUserById = defineRouter({
  input: z.object({ id: z.number() }),
  resolve: async ({input, db}) => {
    try {
      return db.select().from(users).where(eq(users.id, input.id));
    } catch (error) {
      throw new Error("Something went wrong in getUserById route");
    }
  }
});
```

---

## 💻 Frontend Integration

Use the generated types in your frontend:

Works with:

- ✅ React Native
- ✅ React / Next.js
- ✅ Svelte / SvelteKit
- ✅ Any TypeScript frontend

---

## 🔧 Advanced Usage

### Custom Port

Set a custom port with the `PORT` env variable:

```bash
PORT=4000 lorm dev
```

### Environment Variables

Create a `.env` file for environment-specific settings:

```
DATABASE_URL=your-db-url
PORT=3000
```

---

## 🧪 Requirements

- Node.js 18+
- A Drizzle-supported database
- TypeScript frontend (for full type safety)

---

## 🎯 Philosophy

The Lorm CLI embodies the framework's core philosophy:

🧱 "Zero backend boilerplate, maximum type safety"

- 🧘‍♀️ Zero config — works out of the box
- 🔐 End-to-end type safety — from database to frontend
- ⚡️ CLI-first workflow — everything through simple commands
- 🚀 Mobile-optimized — built for React Native and mobile-first teams

---

## 📚 Related Packages

| Package         | Description                              |
|----------------|------------------------------------------|
| `@lorm/core`   | Server logic and router definitions      |
| `@lorm/client` | Auto-typed HTTP client for frontends     |
| `@lorm/schema` | Database schema abstractions             |
| `@lorm/lib`    | Shared utilities and types               |

---

## 🐛 Troubleshooting

### Common Issues

**"Database connection failed"**

- Check your database URL in `lorm.config.js`
- Ensure your database is running and accessible

**"Types not updating"**

- Restart `lorm dev` to regenerate types
- Check your router exports

**"Command not found"**

- Install globally: `npm install -g @lorm/cli`
- Or use via `npx`: `npx @lorm/cli init`

---

## 📜 License

Private project. All rights reserved. © 2025 John Clever

For more information, visit the main [Lorm documentation](https://github.com/JohnClever/lorm).

