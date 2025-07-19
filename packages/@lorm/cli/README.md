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

## 🗄️ Database Commands

### `lorm push`

Push your schema changes directly to your database (development workflow).

**What it does:**

- Reads your `lorm.schema.js` file
- Connects to your database using `lorm.config.js`
- Applies schema changes directly to the database
- Syncs your schema with the database
- Updates `.lorm/` directory with compiled artifacts

**Requirements:**

- Valid database URL in `lorm.config.js`
- Properly defined schema in `lorm.schema.js`

**Best for:** Quick prototyping and local development

---

### `lorm generate`

Generate migration files based on schema changes (production workflow).

**What it does:**

- Compares your current schema with the database
- Generates SQL migration files in `drizzle/` directory
- Creates timestamped migration files
- Prepares migrations for production deployment

**Best for:** Production deployments and team collaboration

---

### `lorm migrate`

Apply pending migrations to your database.

**What it does:**

- Runs all pending migration files
- Updates the database to match your schema
- Tracks applied migrations in the database
- Ensures consistent database state across environments

**Best for:** Production deployments and CI/CD pipelines

---

### `lorm pull`

Pull existing database schema and generate Drizzle schema files.

**What it does:**

- Connects to your existing database
- Introspects the current database schema
- Generates corresponding Drizzle schema files
- Creates TypeScript schema definitions

**Best for:** Migrating existing databases to Lorm

---

### `lorm check`

Check for schema consistency and potential issues.

**What it does:**

- Validates your schema definitions
- Checks for potential migration conflicts
- Identifies schema inconsistencies
- Provides recommendations for fixes

**Best for:** Pre-deployment validation and debugging

---

### `lorm up`

Upgrade your schema to the latest version.

**What it does:**

- Applies any pending schema upgrades
- Updates database structure
- Ensures compatibility with latest Lorm version
- Handles version-specific migrations

**Best for:** Framework upgrades and maintenance

---

### `lorm studio`

Launch Drizzle Studio for visual database management.

**What it does:**

- Starts Drizzle Studio web interface
- Provides visual database browser
- Enables data viewing and editing
- Offers query execution interface

**Features:**

- 🎨 Visual database browser
- 📊 Data visualization
- ✏️ In-browser data editing
- 🔍 Query builder interface

**Best for:** Database exploration and data management

---

### `lorm drop`

⚠️ **DANGER ZONE** ⚠️ Drop all tables from your database.

**What it does:**

- **PERMANENTLY DELETES** all tables and data
- Only works on local databases (localhost/127.0.0.1)
- Requires explicit user confirmation
- Supports PostgreSQL, MySQL, and SQLite

**Safety features:**

- 🛡️ Local-only protection
- ⚠️ Confirmation prompts
- 🔒 Transaction safety
- 📋 Detailed logging

**Best for:** Resetting development databases

**⚠️ WARNING:** This command will permanently delete all your data. Only use in development!

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
export default defineConfig({
  db: {
    url: "your-db-url",
    adapter: "your-selected-adapter",
    options: "your-adapter-options"
  }
});`;
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
import { pgTable, uuid, varchar } from "@lorm/schema/pg";

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

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

For more information, visit the main [Lorm documentation](https://github.com/JohnClever/lorm).

