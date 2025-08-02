# 🪄 @lorm/cli

Command-line interface for the **Lorm framework** — a zero-config, full-stack mobile framework built for mobile applications with **enterprise-grade type safety**, **security**, and **performance monitoring**.

> 📱 **Mobile-First**: Designed to work with mobile applications (React Native and Expo projects)
> ✅ **Database Agnostic**: Works with any Drizzle-supported database (PostgreSQL, MySQL, SQLite, and more)
> 📦 **Project-Scoped**: No global installation required — keeps your mobile project dependencies clean
> 🚀 **Zero Config**: Get a type-safe backend API in minutes
> 🛡️ **Enterprise Security**: Zero-trust input validation, audit logging, and rate limiting
> ⚡️ **Performance Monitoring**: Built-in command execution tracking and optimization
> 🔧 **Health Checks**: Comprehensive system validation and diagnostics
> 🧩 **Plugin System**: Extensible architecture with plugin management
> 🔒 **Production-Safe**: Multi-layer security for dangerous operations
---

## 📦 Installation

**Install the CLI as a dev dependency in your React Native/Expo project:**

```bash
# Navigate to your React Native or Expo project
cd my-react-native-app

# Install Lorm CLI locally
npm install @lorm/cli --save-dev

# Or with pnpm
pnpm add @lorm/cli -D

# Or with yarn
yarn add @lorm/cli --dev
```

**Use the CLI via npx/pnpm dlx (no global installation needed):**

```bash
# Using npx (npm)
npx @lorm/cli <command>

# Using pnpm dlx (pnpm)
pnpm dlx @lorm/cli <command>

# Using yarn
yarn @lorm/cli <command>
```

> 🎯 **Mobile-First Philosophy**: Lorm CLI is designed to be project-scoped within your mobile application. This ensures version consistency, eliminates global dependency conflicts, and keeps your mobile development environment clean and predictable.

---

## 🚀 Quick Start for React Native/Expo

**Prerequisites:** You should have an existing React Native or Expo project.

1. **Navigate to your mobile project and install Lorm CLI:**
   ```bash
   cd my-react-native-app
   npm install @lorm/cli --save-dev
   ```

2. **Initialize Lorm in your mobile project:**
   ```bash
   npx @lorm/cli init
   ```

3. **Configure your database connection in `lorm.config.js`**
   ```javascript
   // lorm.config.js
   export default {
     database: {
       url: process.env.DATABASE_URL || "your-database-url"
     }
   };
   ```

4. **Define your schema in `lorm.schema.js`** (example users table included)

5. **Push your schema to the database:**
   ```bash
   npx @lorm/cli push
   ```

6. **Start the development server:**
   ```bash
   npx @lorm/cli dev
   ```

7. **Install the client in your React Native/Expo app:**
   ```bash
   npm install @lorm/client
   ```

8. **Use type-safe APIs in your mobile app:**
   ```typescript
   import { createClient } from '@lorm/client';
   
   const client = createClient({
     url: 'http://localhost:3000' // Your Lorm server
   });
   
   // Fully typed API calls
   const users = await client.getUsers();
   ```

---

## 📋 Commands

The Lorm CLI provides **44+ commands** organized into logical categories with **comprehensive type safety**, **performance monitoring**, and **detailed help system**.

### 🎯 Core Commands

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
Validate schema consistency, configuration files, and project structure with **comprehensive health diagnostics**.

**What it does:**

- Validates your schema definitions with type safety
- Checks for potential migration conflicts
- Identifies schema inconsistencies
- Provides detailed recommendations for fixes
- Performs system health checks and diagnostics
- Validates TypeScript configuration and dependencies

**Best for:** Pre-deployment validation, debugging, and system health monitoring

---

### 🔧 Utility Commands

#### `npx @lorm/cli health`
Comprehensive system health check and diagnostics.

**What it does:**

- Validates project configuration and dependencies
- Checks database connectivity and schema consistency
- Monitors system resources and performance
- Provides detailed diagnostic reports
- Identifies potential issues and optimization opportunities

**Best for:** System monitoring, troubleshooting, and performance optimization

#### `npx @lorm/cli perf`
Performance monitoring and command execution analytics.

**What it does:**

- Displays detailed performance metrics for all CLI commands
- Shows execution times, success rates, and error statistics
- Provides performance optimization recommendations
- Tracks command usage patterns and trends
- Monitors system resource utilization

**Best for:** Performance optimization, debugging slow commands, and usage analytics

---

## 🛡️ Enterprise Security Features

The Lorm CLI implements **enterprise-grade security** with multiple layers of protection:

### 🔒 Input Validation & Sanitization
- **Zero-Trust Validation**: All user inputs validated using Zod schemas
- **Command Injection Prevention**: Advanced protection against malicious command execution
- **Path Traversal Protection**: Secure file system operations with path validation
- **Database URL Validation**: Ensures only safe database connections are allowed

### 🚨 Security Audit System
- **Complete Audit Trails**: Every security event is logged with timestamps and context
- **Command Execution Logging**: Track all CLI command executions for compliance
- **Dangerous Operation Monitoring**: Special logging for high-risk operations
- **Security Event Analysis**: Detailed security event categorization and reporting

### ⚡ Rate Limiting & Abuse Prevention
- **Intelligent Throttling**: Command-specific rate limits prevent system abuse
- **Adaptive Rate Limiting**: Dynamic limits based on command type and system load
- **Rate Limit Monitoring**: Real-time rate limit status and statistics
- **Graceful Degradation**: User-friendly rate limit notifications

### 🔐 Production Safety
- **Multi-Layer Protection**: Multiple confirmation steps for dangerous operations
- **Environment Detection**: Automatic production environment safety checks
- **Local-Only Restrictions**: Critical operations restricted to local databases
- **Safety Confirmations**: Interactive confirmations for destructive commands

### 📊 Security Monitoring
```bash
# View security audit logs
npx @lorm/cli security:logs

# Run security audit
npx @lorm/cli security:audit

# Check rate limit status
npx @lorm/cli cache:stats
```

---

## 🐛 Recent Bug Fixes & Improvements

### ✅ Database Connection Error Handling (Latest)
**Issue Fixed**: CLI was incorrectly reporting "✅ Schema pushed successfully!" even when database connections failed.

**Solution Implemented**:
- **Enhanced Error Detection**: Improved `executeDrizzleKit` function to properly capture and analyze drizzle-kit output
- **Connection Error Recognition**: Added specific detection for ECONNREFUSED, authentication failures, and other database connectivity issues
- **Accurate Status Reporting**: Fixed success/failure reporting mechanism to prevent false positive messages
- **Clear Error Messages**: Ensured that database connection failures now correctly display actionable error messages

**Impact**: Users now receive accurate feedback about database operations, preventing confusion and ensuring reliable deployment processes.

### 🔧 Type Safety Improvements
- **Fixed Static Context Errors**: Resolved TypeScript compilation issues in `rate-limiter.ts`
- **Improved Import Handling**: Corrected Chalk import and static property references
- **Zero `any` Types**: Achieved 100% TypeScript coverage with strict mode enabled

### 🚀 Performance Enhancements
- **Optimized Bundle Sizes**: Reduced package sizes while maintaining full functionality
- **Improved Command Execution**: Enhanced performance monitoring and caching systems
- **Memory Management**: Better memory usage tracking and optimization

---

### 🔌 Plugin System

Plugin management has been moved to the `@lorm/core` package. For plugin development and management, please refer to the `@lorm/core` documentation.

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

## 🎯 Type Safety & Performance

### **100% Type Safety**
The Lorm CLI is built with **comprehensive TypeScript integration**:

- **Zero `any` types** throughout the codebase
- **Generic command interfaces** with proper type constraints
- **Compile-time validation** for all command options and arguments
- **Full IntelliSense support** for enhanced developer experience

### **Performance Monitoring**
Built-in performance tracking for all CLI operations:

- **Command execution timing** with millisecond precision
- **Success/failure rate tracking** for reliability monitoring
- **Resource usage monitoring** for optimization insights
- **Performance analytics** with detailed metrics and trends

### **Enhanced Error Handling**
- **Graceful error recovery** with helpful suggestions
- **Detailed error diagnostics** with context-aware messages
- **User-friendly error formatting** with actionable recommendations
- **Comprehensive logging** for debugging and troubleshooting

### **Help System**
- **Categorized commands** (Core, Database, Development, Utility, Plugin)
- **Detailed command descriptions** with examples and use cases
- **Interactive help** with `npx @lorm/cli help <command>`
- **Beautiful formatting** with colors and structured output

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

