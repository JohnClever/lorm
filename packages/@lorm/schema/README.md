# 🗄️ @lorm/schema

Database schema abstractions and adapters for the **Lorm framework** — providing type-safe database schema definitions with multi-adapter support.

> 📦 **Optimized Bundle**: ~15KB with modular adapters (5KB each)
> 🚀 **Production-Ready**: Enterprise-grade build configuration with minification
> 🎯 **Multi-Database**: Support for PostgreSQL, MySQL, SQLite, and more

---

## 🚀 Features

- **Multi-Database Support**: PostgreSQL, MySQL, SQLite adapters
- **Type-Safe Schemas**: Full TypeScript support with Drizzle ORM
- **Modular Architecture**: Import only the adapter you need
- **Zero Configuration**: Works out of the box with sensible defaults
- **Drizzle Integration**: Built on top of Drizzle ORM for maximum compatibility
- **Tree-Shakeable**: Optimized for minimal bundle size

---

## 🛠️ Usage

### PostgreSQL

```ts
import { pgTable, uuid, varchar, timestamp } from '@lorm/schema/pg';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

### MySQL

```ts
import { mysqlTable, int, varchar, timestamp } from '@lorm/schema/mysql';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

### SQLite

```ts
import { sqliteTable, integer, text } from '@lorm/schema/sqlite';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow()
});
```

---

## 📦 Available Exports

### Main Package (`@lorm/schema`)

Re-exports PostgreSQL core by default:

```ts
import { pgTable, uuid, varchar } from '@lorm/schema';
```

### Database-Specific Adapters

#### PostgreSQL (`@lorm/schema/pg`)
- All `drizzle-orm/pg-core` exports
- `sql` function from `drizzle-orm`

#### MySQL (`@lorm/schema/mysql`)
- All `drizzle-orm/mysql-core` exports
- `sql` function from `drizzle-orm`

#### SQLite (`@lorm/schema/sqlite`)
- All `drizzle-orm/sqlite-core` exports
- `sql` function from `drizzle-orm`

---

## 📦 Bundle Optimization

- **Modular Design**: ~15KB base + ~5KB per adapter
- **Tree-Shaking**: Import only the adapter you need
- **Minification**: Production-ready compressed output
- **Code Splitting**: Separate bundles for each database adapter
- **External Dependencies**: Drizzle ORM externalized for optimal bundling

### Bundle Sizes

| Export | ESM | CJS | Types | Notes |
|--------|-----|-----|-------|-------|
| **Main** | ~15KB | ~15KB | ~2KB | PostgreSQL by default |
| **PostgreSQL** | ~5KB | ~5KB | ~1KB | Adapter-specific |
| **MySQL** | ~5KB | ~5KB | ~1KB | Adapter-specific |
| **SQLite** | ~5KB | ~5KB | ~1KB | Adapter-specific |

---

## 🔧 Database Support

Built on [Drizzle ORM](https://orm.drizzle.team) with support for:

- ✅ **PostgreSQL** (Neon, Supabase, AWS RDS, etc.)
- ✅ **MySQL** (PlanetScale, AWS RDS, etc.)
- ✅ **SQLite** (Local development, Turso, etc.)
- ✅ **Custom adapters** via Drizzle ORM ecosystem

---

## 🧩 Framework Integration

Designed specifically for:

- ✅ **Lorm Framework** - Seamless integration with @lorm/core
- ✅ **React Native** applications
- ✅ **Expo** projects
- ✅ **Mobile-first** development

---

## 💡 Best Practices

### Import Optimization

```ts
// ✅ Good: Import specific adapter
import { pgTable, uuid } from '@lorm/schema/pg';

// ❌ Avoid: Importing unused adapters
import { pgTable } from '@lorm/schema';
import { mysqlTable } from '@lorm/schema/mysql'; // Unnecessary if using PostgreSQL
```

### Schema Organization

```ts
// schema.js
import { pgTable, uuid, varchar } from '@lorm/schema/pg';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 })
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }),
  authorId: uuid('author_id').references(() => users.id)
});

export const schema = { users, posts };
```

---

## 📚 Related Packages

- [`@lorm/core`](../core/README.md) - Core framework functionality
- [`@lorm/cli`](../cli/README.md) - Command-line interface for schema management
- [`@lorm/client`](../client/README.md) - Auto-typed HTTP client for mobile apps
- [`@lorm/lib`](../lib/README.md) - Shared utilities and enterprise features

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../../CONTRIBUTING.md) for details.

## 📄 License

Apache License - see [LICENSE](../../../LICENSE) for details.