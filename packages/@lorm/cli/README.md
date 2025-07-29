# 🪄 @lorm/cli

Command-line interface for the **Lorm framework** — a zero-config, full-stack mobile framework built for **Mobile Applications**.

> 📱 Built for **React Native** and **Expo**
> ✅ Works with **any Drizzle-supported database**: PostgreSQL, MySQL, SQLite, and more
> 📦 **Optimized Bundle**: ~50KB with enterprise features and performance monitoring
---

## 📦 Installation

**Step 1: Install the CLI package locally**

```bash
# Using npm
npm install @lorm/cli --save-dev

# Using pnpm
pnpm add @lorm/cli --save-dev

# Using yarn
yarn add @lorm/cli --dev
```

**Step 2: Use the CLI via npx/pnpx**

```bash
# Using npx (npm)
npx @lorm/cli <command>

# Using pnpx (pnpm)
pnpx @lorm/cli <command>
```

> 💡 **Note**: The CLI is designed for local execution only and does not support global installation. You must first install the package locally in your project, then use npx/pnpx to execute commands. This ensures consistent behavior across different projects and environments.

---

## 🚀 Quick Start

1. Install the CLI locally:
   ```bash
   npm install @lorm/cli --save-dev
   ```

2. Initialize a new Lorm project:
   ```bash
   npx @lorm/cli init
   ```

3. Configure your database connection in `lorm.config.js`

4. Define your schema in `lorm.schema.js`

5. Push your schema to the database:
   ```bash
   npx @lorm/cli push
   ```

6. Start the development server:
   ```bash
   npx @lorm/cli dev
   ```

---

## 📋 Commands

### Core Commands

#### `npx @lorm/cli init`
Initialize a new Lorm project with configuration files and directory structure.

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

#### `npx @lorm/cli dev`
Start development server with file watching, automatic type generation, and hot reloading.

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

#### `npx @lorm/cli check`
Validate schema consistency, configuration files, and project structure.

**What it does:**

- Validates your schema definitions
- Checks for potential migration conflicts
- Identifies schema inconsistencies
- Provides recommendations for fixes

**Best for:** Pre-deployment validation and debugging

---

## 🗄️ Database Commands

### `npx @lorm/cli db:push` (alias: `push`)

Push schema changes directly to database (recommended for development).

**What it does:**

- Compares your current schema with the database
- Applies changes directly without generating migration files
- Perfect for rapid development and prototyping
- Provides immediate feedback on schema changes

**Best for:** Development and prototyping

```bash
npx @lorm/cli db:push
# or
npx @lorm/cli push
```

---

### `npx @lorm/cli db:generate` (alias: `generate`)

Generate migration files from schema changes.

**What it does:**

- Analyzes differences between your schema and database
- Creates timestamped migration files with SQL commands
- Allows you to review and modify changes before applying
- Supports custom migration logic

**Best for:** Production deployments and version control

```bash
npx @lorm/cli db:generate
# or
npx @lorm/cli generate
```

---

### `npx @lorm/cli db:migrate` (alias: `migrate`)

Apply pending database migrations to production or staging environments.

**What it does:**

- Runs all pending migration files in chronological order
- Updates the migration history table
- Ensures database schema is up to date
- Provides rollback capabilities

**Best for:** Production deployments and CI/CD pipelines

```bash
npx @lorm/cli db:migrate
# or
npx @lorm/cli migrate
```

---

### `npx @lorm/cli db:pull` (alias: `pull`)

Pull and introspect schema from existing database.

**What it does:**

- Introspects your existing database structure
- Generates schema files based on current tables and relationships
- Creates a starting point for existing projects
- Preserves existing data and relationships

**Best for:** Migrating existing databases to Lorm

```bash
npx @lorm/cli db:pull
# or
npx @lorm/cli pull
```

---

### `npx @lorm/cli db:studio` (alias: `studio`)

Start Drizzle Studio for visual database management and data browsing.

**What it does:**

- Launches a web-based database browser interface
- Allows you to view, edit, and manage data visually
- Provides query builder and data visualization tools
- Supports multiple database connections

**Best for:** Database administration, debugging, and data exploration

```bash
npx @lorm/cli db:studio
# or
npx @lorm/cli studio
```

---

### `npx @lorm/cli db:up` (alias: `up`)

Upgrade schema to latest version with automatic conflict resolution.

**What it does:**

- Automatically resolves schema conflicts and inconsistencies
- Applies the latest schema changes intelligently
- Handles complex migration scenarios
- Provides detailed upgrade reports

**Best for:** Automated deployments and schema maintenance

```bash
npx @lorm/cli db:up
# or
npx @lorm/cli up
```

---

### `npx @lorm/cli db:drop` (alias: `drop`)

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

```bash
npx @lorm/cli db:drop
# or
npx @lorm/cli drop
```

---

## 🗂️ Project Structure

After running `npx @lorm/cli init`, your project will include:

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
- ✅ Expo

---

## 🔧 Advanced Usage

### Custom Port

Set a custom port with the `PORT` env variable:

```bash
PORT=4000 npx @lorm/cli dev
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
- React Native or Expo development environment

---

## 🎯 Philosophy

The Lorm CLI embodies the framework's core philosophy:

🧱 "Zero backend boilerplate, maximum type safety"

- 🧘‍♀️ Zero config — works out of the box
- 🔐 End-to-end type safety — from database to frontend
- ⚡️ CLI-first workflow — everything through simple commands
- 📱 Mobile-exclusive — built exclusively for React Native and Expo teams

---

## 🆘 Help & Information

### `npx @lorm/cli help`

Show general help information or detailed help for specific commands.

**Usage:**

```bash
# General help
npx @lorm/cli help
npx @lorm/cli --help
npx @lorm/cli -h

# Command-specific help
npx @lorm/cli help init
npx @lorm/cli help db:push
npx @lorm/cli help dev
```

**What it provides:**

- Complete command reference
- Usage examples and syntax
- Available options and flags
- Best practices and recommendations

---

### `npx @lorm/cli --version`

Show CLI version information.

```bash
npx @lorm/cli --version
npx @lorm/cli -v
```

---

## ✨ Features

### Enhanced Help System
- **Comprehensive Documentation**: Detailed help for all commands with practical examples
- **Context-Aware Assistance**: Command-specific help with relevant options and use cases
- **Interactive Guidance**: Step-by-step instructions for complex workflows

### Improved Error Recovery
- **Smart Error Detection**: Identifies common configuration and setup issues
- **Actionable Solutions**: Provides specific steps to resolve problems
- **Recovery Suggestions**: Offers alternative approaches when commands fail

### Command Organization
- **Logical Grouping**: Database operations grouped under `db:` prefix for clarity
- **Intuitive Aliases**: Short aliases for frequently used commands
- **Consistent Naming**: Standardized command structure across all operations

### Local Execution Only
- **Project Isolation**: Each project uses its own CLI version
- **Consistent Behavior**: Eliminates version conflicts between projects
- **Easy Updates**: Simple `npx`/`pnpx` usage without global installation management

### Type Safety & Reliability
- **Full TypeScript Support**: Complete type checking and IntelliSense support
- **Comprehensive Testing**: Extensive integration tests ensure reliability
- **Dependency Optimization**: Minimal dependencies for faster installation
- **Bundle Size Monitoring**: Automated size analysis and optimization
- **Clean Architecture**: Professional codebase with automated cleanup
- **Performance Tracking**: Built-in performance monitoring and metrics

---

## 📚 Related Packages

| Package         | Description                              |
|----------------|------------------------------------------|
| `@lorm/core`   | Server logic and router definitions      |
| `@lorm/client` | Auto-typed HTTP client for frontends     |
| `@lorm/schema` | Database schema abstractions             |
| `@lorm/lib`    | Shared utilities and types               |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../../CONTRIBUTING.md) for details.

## 🐛 Troubleshooting

### Common Issues

**Command not found:**
```bash
# Make sure you're using npx/pnpx
npx @lorm/cli --version
```

**Configuration errors:**
```bash
# Validate your configuration
npx @lorm/cli check
```

**Database connection issues:**
```bash
# Check your database URL and credentials
npx @lorm/cli help db:push
```

### Getting Help

- Use `npx @lorm/cli help <command>` for command-specific guidance
- Check the [main documentation](../../../README.md) for setup instructions
- Report issues on [GitHub](https://github.com/lormjs/lorm/issues)

## 📄 License

Apache License - see [LICENSE](../../../LICENSE) for details.

