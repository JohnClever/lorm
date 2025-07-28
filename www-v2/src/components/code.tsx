// Centralized code examples for LORM documentation
// This file contains all code snippets used across the documentation

// ============================================================================
// INSTALLATION & SETUP
// ============================================================================

export const installationCodes = {
  npm: `npm install -g @lorm/cli`,
  pnpm: `pnpm add -g @lorm/cli`,
  yarn: `yarn global add @lorm/cli`,
  bun: `bun install -g @lorm/cli`
};

export const globalInstallCode = `npm install -g @lorm/cli`;

export const localInstallCode = `npm install @lorm/cli --save-dev`;

export const clientInstallCode = `npm install @lorm/client`;

export const quickStartCode = `# Initialize your project
cd my-app
lorm init
# Push your schema
lorm push
# Start development server
lorm dev`;

export const initCode = `cd my-app
lorm init`;

export const packageJsonCode = `{
  "dependencies": {
    "zod": "^3.22.0",
    "@lorm/core": "latest",
    "@lorm/schema": "latest",
    "@lorm/lib": "latest"
  }
}`;

export const basicConfigCode = `// lorm.config.js
export default {
  database: {
    url: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/mydb"
  }
};`;

// ============================================================================
// SCHEMA EXAMPLES
// ============================================================================

export const basicSchemaCode = `// lorm.schema.js
import { pgTable, uuid, varchar, text, timestamp, boolean } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
export const schema = { users };`;

export const schemaCode = `// lorm.schema.js
import { pgTable, uuid, varchar } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 })
});
export const schema = { users };`;

export const relationshipsCode = `// lorm.schema.js
import { pgTable, uuid, varchar, text, timestamp, integer } from "@lorm/schema/pg";
import { relations } from "drizzle-orm";
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  authorId: uuid("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments)
}));
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  }),
  comments: many(comments)
}));
export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id]
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id]
  })
}));
export const schema = { users, posts, comments };`;

export const dataTypesCode = `// PostgreSQL Data Types
import { 
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  time,
  decimal,
  real,
  doublePrecision,
  json,
  jsonb,
  serial,
  bigserial
} from "@lorm/schema/pg";
export const products = pgTable("products", {
  // Primary Keys
  id: uuid("id").defaultRandom().primaryKey(),
  legacyId: serial("legacy_id"), // Auto-incrementing integer
  // Text Types
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).unique(), 
  // Numeric Types
  price: decimal("price", { precision: 10, scale: 2 }),
  weight: real("weight"),
  rating: doublePrecision("rating"),
  stock: integer("stock").default(0),
  views: bigint("views", { mode: "number" }).default(0),
  // Boolean Types
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  // Date/Time Types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  launchDate: date("launch_date"),
  // JSON Types
  metadata: json("metadata"),
  settings: jsonb("settings")
});`;

export const constraintsCode = `// Schema Constraints and Validations
import { pgTable, uuid, varchar, text, timestamp, integer, unique, index } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  age: integer("age"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  // Composite unique constraint
  uniqueFullName: unique().on(table.firstName, table.lastName),
  // Indexes for performance
  emailIndex: index("email_idx").on(table.email),
  usernameIndex: index("username_idx").on(table.username),
  nameIndex: index("name_idx").on(table.firstName, table.lastName)
}));
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  authorId: uuid("author_id").notNull().references(() => users.id, {
    onDelete: "cascade", // Delete posts when user is deleted
    onUpdate: "cascade"  // Update posts when user ID changes
  }),
  status: varchar("status", { length: 20 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  // Composite index for common queries
  authorStatusIndex: index("author_status_idx").on(table.authorId, table.status),
  slugIndex: index("slug_idx").on(table.slug)
}));`;

export const enumsCode = `// Using Enums for Better Type Safety
import { pgTable, uuid, varchar, timestamp, pgEnum } from "@lorm/schema/pg";
// Define enums
export const userRoleEnum = pgEnum("user_role", ["admin", "moderator", "user"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: postStatusEnum("status").default("draft").notNull(),
  priority: priorityEnum("priority").default("medium"),
  authorId: uuid("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});`;

export const migrationCode = `// Database migrations with Lorm
// Run: lorm generate
// This creates migration files automatically
// migrations/0001_initial.sql
CREATE TYPE "user_role" AS ENUM('admin', 'moderator', 'user');
CREATE TYPE "post_status" AS ENUM('draft', 'published', 'archived');
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE TABLE "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(255) NOT NULL,
  "content" text,
  "status" "post_status" DEFAULT 'draft' NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX "email_idx" ON "users"("email");
CREATE INDEX "author_status_idx" ON "posts"("author_id", "status");
// Apply migrations: lorm migrate`;

export const bestPracticesCode = `// Schema Best Practices
// 1. Use meaningful table and column names
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  displayName: varchar("display_name", { length: 100 }),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
// 2. Add proper constraints and indexes
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  customerId: uuid("customer_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").default("pending").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  // Composite index for common queries
  customerStatusIndex: index("customer_status_idx").on(table.customerId, table.status),
  orderNumberIndex: index("order_number_idx").on(table.orderNumber),
  createdAtIndex: index("created_at_idx").on(table.createdAt)
}));
// 3. Use enums for fixed value sets
export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"
]);
// 4. Establish clear relationships
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, {
    onDelete: "cascade" // Delete items when order is deleted
  }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull()
}, (table) => ({
  orderProductIndex: index("order_product_idx").on(table.orderId, table.productId)
}));`;

// ============================================================================
// ROUTER EXAMPLES
// ============================================================================

export const basicRouterCode = `// lorm.router.js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users } from "./lorm.schema.js";
import { eq } from "drizzle-orm";
// Simple hello endpoint
export const hello = defineRouter({
  input: z.object({ name: z.string() }),
  resolve: async ({ input }) => {
    return \`Hello, \${input.name}!\`;
  }
});
// Database query endpoint
export const getUserById = defineRouter({
  input: z.object({ id: z.string().uuid() }),
  resolve: async ({ input, db }) => {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.id));
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
});`;

export const routerCode = `// lorm.router.js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { schema } from "./lorm.schema.js";
export const getUserById = defineRouter({
  input: z.object({ id: z.string() }),
  resolve: async ({input, db}) => {
    return db.select().from(users).where(eq(users.id, input.id));
  }
});`;

export const crudOperationsCode = `// Complete CRUD operations
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users, posts } from "./lorm.schema.js";
import { eq, and, desc, like } from "drizzle-orm";
// CREATE - Add new user
export const createUser = defineRouter({
  input: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format")
  }),
  resolve: async ({ input, db }) => {
    const [newUser] = await db.insert(users)
      .values({
        name: input.name,
        email: input.email
      })
      .returning();
    return newUser;
  }
});
// READ - Get all users with pagination
export const getUsers = defineRouter({
  input: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    search: z.string().optional()
  }),
  resolve: async ({ input, db }) => {
    const offset = (input.page - 1) * input.limit;
    let query = db.select().from(users);
    if (input.search) {
      query = query.where(like(users.name, \`%\${input.search}%\`));
    }
    const results = await query
      .limit(input.limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));
    return results;
  }
});
// UPDATE - Update user
export const updateUser = defineRouter({
  input: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional()
  }),
  resolve: async ({ input, db }) => {
    const { id, ...updateData } = input;
    const [updatedUser] = await db.update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }
});
// DELETE - Delete user
export const deleteUser = defineRouter({
  input: z.object({ id: z.string().uuid() }),
  resolve: async ({ input, db }) => {
    const [deletedUser] = await db.delete(users)
      .where(eq(users.id, input.id))
      .returning();
    if (!deletedUser) {
      throw new Error("User not found");
    }
    return { success: true, deletedUser };
  }
});`;

export const validationCode = `// Input validation with Zod
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users } from "./lorm.schema.js";
export const createUser = defineRouter({
  input: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.string()
      .email("Invalid email format")
      .toLowerCase(),
    age: z.number()
      .int("Age must be an integer")
      .min(13, "Must be at least 13 years old")
      .max(120, "Age must be realistic")
      .optional(),
    role: z.enum(["user", "admin", "moderator"])
      .default("user")
  }),
  resolve: async ({ input, db }) => {
    // Input is automatically validated
    const [user] = await db.insert(users)
      .values(input)
      .returning();
    return user;
  }
});`;

export const middlewareCode = `// Middleware for authentication and logging
import { defineRouter, createMiddleware } from "@lorm/core";
import { z } from "zod";
import { users } from "./lorm.schema.js";
import { eq } from "drizzle-orm";
// Authentication middleware
const authMiddleware = createMiddleware({
  resolve: async ({ ctx, next }) => {
    const token = ctx.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Authentication required');
    }
    const userId = verifyToken(token);
    const [user] = await ctx.db.select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }
    return next({ user });
  }
});
// Logging middleware
const loggingMiddleware = createMiddleware({
  resolve: async ({ ctx, next }) => {
    const start = Date.now();
    console.log('Request started:', ctx.path);
    const result = await next();
    const duration = Date.now() - start;
    console.log('Request completed:', ctx.path, duration + 'ms');
    return result;
  }
});
// Protected route with middleware
export const getProfile = defineRouter({
  middleware: [loggingMiddleware, authMiddleware],
  input: z.object({}),
  resolve: async ({ ctx }) => {
    // ctx.user is available from authMiddleware
    return ctx.user;
  }
});`;

export const complexQueriesCode = `// Complex database queries
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users, posts, comments } from "./lorm.schema.js";
import { eq, and, or, desc, count, sql } from "drizzle-orm";
// Get user with their posts and comment counts
export const getUserWithStats = defineRouter({
  input: z.object({ userId: z.string().uuid() }),
  resolve: async ({ input, db }) => {
    const result = await db
      .select({
        user: users,
        postCount: count(posts.id),
        commentCount: count(comments.id)
      })
      .from(users)
      .leftJoin(posts, eq(users.id, posts.authorId))
      .leftJoin(comments, eq(users.id, comments.authorId))
      .where(eq(users.id, input.userId))
      .groupBy(users.id);
    return result[0];
  }
});
// Search posts with filters
export const searchPosts = defineRouter({
  input: z.object({
    query: z.string().optional(),
    authorId: z.string().uuid().optional(),
    status: z.enum(['draft', 'published']).optional(),
    limit: z.number().min(1).max(50).default(10)
  }),
  resolve: async ({ input, db }) => {
    let query = db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          email: users.email
        },
        commentCount: count(comments.id)
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(comments, eq(posts.id, comments.postId))
      .groupBy(posts.id, users.id);
    const conditions = [];
    if (input.query) {
      conditions.push(
        or(
          sql\`\${posts.title} ILIKE \${\`%\${input.query}%\`}\`,
          sql\`\${posts.content} ILIKE \${\`%\${input.query}%\`}\`
        )
      );
    }
    if (input.authorId) {
      conditions.push(eq(posts.authorId, input.authorId));
    }
    if (input.status) {
      conditions.push(eq(posts.status, input.status));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query
      .orderBy(desc(posts.createdAt))
      .limit(input.limit);
  }
});`

// ============================================================================
// CLIENT EXAMPLES
// ============================================================================

export const clientCode = `// Your frontend (React Native, React, etc.)
import { createClient } from '@lorm/client';
const client = createClient();
// Example usage
async function fetchUser() {
  const { data } = await client.getUserById({ id: "123" });
  console.log(data); // Fully typed!
}
fetchUser();`;

export const basicUsageCode = `import { createClient } from "@lorm/client";
const client = createClient();
// Example usage
async function example() {
  const data = await client.hello({ name: "John" });
  console.log(data); // "Hello, John!"
}
example();`;

export const clientUsageCode = `import { createClient } from '@lorm/client';
const client = createClient();
// Example usage
async function fetchData() {
  const data = await client.hello({ name: "John" });
  console.log(data); // "Hello, John!"
}
fetchData();`;

export const typedClientCode = `// Your backend router (lorm.router.js)
export const getUserById = defineRouter({
  input: z.object({ id: z.string().uuid() }),
  resolve: async ({ input, db }) => {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.id));
    return user;
  }
});
// Your frontend client
const client = createClient();
// Type-safe API call
async function fetchUser() {
  const user = await client.getUserById({ 
    id: "123e4567-e89b-12d3-a456-426614174000" 
  });
  // Full autocomplete and type checking
  console.log(user.name); // ✅ Type-safe
  console.log(user.invalidField); // ❌ TypeScript error
}
fetchUser();`;

export const reactNativeCode = `// React Native Example
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { createClient } from '@lorm/client';
const client = createClient();
export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await client.getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);
  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }
  return (
    <View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name}</Text>
            <Text>{item.email}</Text>
          </View>
        )}
      />
    </View>
  );
}`;

export const reactCode = `// React/Next.js Example
import { useState, useEffect } from 'react';
import { createClient } from '@lorm/client';
const client = createClient();
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    async function loadData() {
      // Parallel requests for better performance
      const [userData, postsData] = await Promise.all([
        client.getCurrentUser(),
        client.getUserPosts({ userId: 'current' })
      ]);
      setUser(userData);
      setPosts(postsData);
    }
    loadData();
  }, []);
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <div>
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}`;

export const errorHandlingCode = `import { createClient } from '@lorm/client';
const client = createClient();
async function handleErrors() {
  try {
    const user = await client.getUserById({ id: "invalid-id" });
  } catch (error) {
    if (error.status === 404) {
      console.log('User not found');
    } else if (error.status === 400) {
      console.log('Invalid request:', error.message);
    } else {
      console.log('Unexpected error:', error);
    }
  }
}
handleErrors();`;

export const configCode = `// Advanced client configuration
import { createClient } from '@lorm/client';
const client = createClient({
  baseUrl: 'https://api.myapp.com', // Custom API URL
  timeout: 10000, // 10 second timeout
  headers: {
    'Authorization': 'Bearer ' + getAuthToken(),
    'X-App-Version': '1.0.0'
  },
  retry: {
    attempts: 3,
    delay: 1000
  }
});`;

// ============================================================================
// FRAMEWORK EXAMPLES
// ============================================================================

export const svelteCode = `<!-- Svelte Example -->
<script>
  import { onMount } from 'svelte';
  import { createClient } from '@lorm/client';
  const client = createClient();
  let users = [];
  let loading = true;
  let error = null;
  onMount(async () => {
    try {
      users = await client.getAllUsers();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });
  async function createUser(name, email) {
    try {
      const newUser = await client.createUser({ name, email });
      users = [...users, newUser];
    } catch (err) {
      error = err.message;
    }
  }
</script>

{#if loading}
  <p>Loading users...</p>
{:else if error}
  <p class="error">Error: {error}</p>
{:else}
  <ul>
    {#each users as user (user.id)}
      <li>{user.name} - {user.email}</li>
    {/each}
  </ul>
{/if}`;

// ============================================================================
// CLI EXAMPLES
// ============================================================================

export const initExample = `cd my-app
lorm init
# Output:
# ✅ Installing dependencies...
# ✅ Created lorm.config.js
# ✅ Created lorm.schema.js
# ✅ Created lorm.router.js
# 🎉 Lorm project initialized!`;

export const devExample = `lorm dev
# Output:
# 🚀 Starting Lorm development server...
# 📡 Server running on http://localhost:3000
# 🔥 Hot reload enabled
# 👀 Watching lorm.router.js for changes...`;

export const pushExample = `lorm push
# Output:
# 🔍 Reading schema from lorm.schema.js
# 🔗 Connecting to database...
# 📊 Applying schema changes...
# ✅ Schema pushed successfully!
# 📁 Updated .lorm/ directory`;

export const generateExample = `lorm generate
# Output:
# 📝 Generating migration files...
# 📁 Created migrations/0001_initial.sql
# ✅ Migration files generated!`;

export const migrateExample = `lorm migrate
# Output:
# 🔍 Reading migration files...
# 🔗 Connecting to database...
# 📊 Applying migrations...
# ✅ All migrations applied successfully!`;

export const cliConfigExample = `// lorm.config.js
export default {
  database: {
    url: process.env.DATABASE_URL,
    // Optional: connection options
    ssl: process.env.NODE_ENV === 'production',
    max: 10, // connection pool size
  },
  server: {
    port: 3000,
    cors: true
  }
};`;

export const cliSchemaExample = `// lorm.schema.js
import { pgTable, uuid, varchar, timestamp } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  authorId: uuid("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
export const schema = { users, posts };`;

export const cliCommands = `# Initialize a new Lorm project
lorm init [project-name]
# Options:
#   --template, -t    Use a specific template (default: basic)
#   --package-manager Package manager to use (npm, yarn, pnpm)
#   --database, -d    Database type (postgres, mysql, sqlite)
#   --no-install      Skip dependency installation
# Examples:
lorm init my-app --template todo --database postgres
lorm init my-app -t blog -d mysql --package-manager pnpm
# Start development server
lorm dev
# Options:
#   --port, -p        Port to run on (default: 3000)
#   --host, -h        Host to bind to (default: localhost)
#   --watch, -w       Watch for file changes (default: true)
#   --verbose, -v     Verbose logging
# Examples:
lorm dev --port 8080
lorm dev --host 0.0.0.0 --verbose
# Push schema changes to database
lorm push
# Options:
#   --force, -f       Force push without confirmation
#   --dry-run, -d     Show what would be changed without applying
#   --verbose, -v     Verbose output
# Examples:
lorm push --dry-run
lorm push --force
# Generate types and client code
lorm generate
# Options:
#   --output, -o      Output directory (default: .lorm)
#   --watch, -w       Watch for changes
#   --verbose, -v     Verbose output
# Database migrations
lorm migrate
# Options:
#   --up              Apply pending migrations
#   --down            Rollback last migration
#   --reset           Reset database (destructive)
#   --seed            Run seed files after migration
# Examples:
lorm migrate --up
lorm migrate --down
lorm migrate --reset --seed`;

export const configExample = `// lorm.config.js
export default {
  // Database configuration
  database: {
    // Connection URL
    url: process.env.DATABASE_URL,
    // Connection pool settings
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    },
    // SSL configuration
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    // Migration settings
    migrations: {
      directory: './migrations',
      tableName: 'lorm_migrations'
    }
  },
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    // CORS settings
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    },
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    },
    // Request limits
    limits: {
      json: '10mb',
      urlencoded: '10mb',
      text: '10mb'
    }
  },
  // Development settings
  dev: {
    // Watch for changes
    watch: true,
    // Paths to watch
    watchPaths: ['./src', './lorm.schema.js', './lorm.router.js'],
    // Paths to ignore
    ignorePaths: ['node_modules', '.git', '.lorm'],
    // Debug mode
    debug: true
  },
  // Build settings
  build: {
    // Output directory
    outDir: './dist',
    // Generate source maps
    sourcemap: true,
    // Minify output
    minify: process.env.NODE_ENV === 'production',
    // External dependencies
    external: ['pg', 'mysql2', 'better-sqlite3']
  },
  // Plugins
  plugins: [
    // Authentication plugin
    {
      name: 'auth',
      config: {
        jwtSecret: process.env.JWT_SECRET,
        tokenExpiry: '7d',
        refreshTokenExpiry: '30d'
      }
    },
    // Cache plugin
    {
      name: 'cache',
      config: {
        redis: {
          url: process.env.REDIS_URL,
          ttl: 3600 // 1 hour default TTL
        }
      }
    }
  ]
};`;

export const middlewareExample = `// Authentication middleware
export const authMiddleware = async ({ context, input }) => {
  const token = context.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('Authentication required');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(payload.userId);
    if (!user) {
      throw new Error('Invalid token');
    }
    return { user };
  } catch (error) {
    throw new Error('Invalid token');
  }
};
// Role-based authorization
export const requireRole = (requiredRole) => {
  return async ({ context, middleware }) => {
    const { user } = middleware;
    if (!user) {
      throw new Error('Authentication required');
    }
    if (user.role !== requiredRole && user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    return { user };
  };
};

// Rate limiting middleware
export const rateLimitMiddleware = (options = {}) => {
  const { 
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    keyGenerator = (context) => context.ip 
  } = options;
  const requests = new Map();
  return async ({ context }) => {
    const key = keyGenerator(context);
    const now = Date.now();
    const windowStart = now - windowMs;
    // Clean up old requests
    const userRequests = requests.get(key) || [];
    const validRequests = userRequests.filter(time => time > windowStart);
    if (validRequests.length >= max) {
      throw new Error('Rate limit exceeded');
    }
    validRequests.push(now);
    requests.set(key, validRequests);
    return {};
  };
};`;

export const middlewareExample2 = `// Validation middleware
export const validateMiddleware = (schema) => {
  return async ({ input }) => {
    try {
      const validatedInput = schema.parse(input);
      return { validatedInput };
    } catch (error) {
      throw new Error('Validation error: ' + error.message);
    }
  };
};
// Logging middleware
export const loggingMiddleware = async ({ context, input }) => {
  const startTime = Date.now();
  console.log('[' + new Date().toISOString() + '] ' + context.method + ' ' + context.path, {
    input,
    userAgent: context.headers['user-agent'],
    ip: context.ip
  });
  return {
    startTime,
    log: (message, data) => {
      console.log('[' + new Date().toISOString() + '] ' + message, data);
    }
  };
};`;

export const defineRouterSignature = `defineRouter<TInput, TOutput>(options: {
  input: ZodSchema<TInput>;
  middleware?: MiddlewareFunction[];
  resolve: (context: {
    input: TInput;
    db: DrizzleDB;
    context: RequestContext;
    middleware: MiddlewareResult;
  }) => Promise<TOutput> | TOutput;
}): RouterFunction<TInput, TOutput>`;

export const errorHandlingExample = `// Custom error classes
class NotFoundError extends Error {
  constructor(resource) {
    super(\`\${resource} not found\`);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}
class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}
// Using custom errors in routers
export const getUser = defineRouter({
  input: z.object({ id: z.string().uuid() }),
  resolve: async ({ input, db }) => {
    try { 
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, input.id));
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    } catch (error) {
      // Log the error
      console.error('Error fetching user:', error);
      // Re-throw known errors
      if (error instanceof NotFoundError) {
        throw error;
      }
      // Wrap unknown errors
      throw new Error('Failed to fetch user');
    }
  }
});

// Global error handler
export default {
  server: {
    errorHandler: (error, context) => {
      // Log all errors
      console.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        path: context.path,
        method: context.method,
        input: context.input
      });
      // Handle specific error types
      if (error instanceof NotFoundError) {
        return {
          status: 404,
          body: { error: 'Resource not found', message: error.message }
        };
      }
      if (error instanceof UnauthorizedError) {
        return {
          status: 401,
          body: { error: 'Unauthorized', message: error.message }
        };
      }
      // Default error response
      return {
        status: 500,
        body: { 
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        }
      };
    }
  }
};`;

// ============================================================================
// DEPLOYMENT EXAMPLES
// ============================================================================

export const dockerFile = `# Dockerfile for Lorm Backend
FROM node:18-alpine
WORKDIR /app
# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
# Copy source code
COPY . .
# Build the application
RUN pnpm run build
# Expose port
EXPOSE 3000
# Start the application
CMD ["pnpm", "start"]`;

export const dockerCompose = `# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/lorm_db
      - JWT_SECRET=your-super-secret-jwt-key
    depends_on:
      - db
    restart: unless-stopped
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=lorm_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
volumes:
  postgres_data:`;

export const vercelConfig = `// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}`;

export const railwayConfig = `# railway.toml
[build]
builder = "nixpacks"
[deploy]
startCommand = "pnpm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
[environments.production]
DATABASE_URL = "\${{Postgres.DATABASE_URL}}"
JWT_SECRET = "\${{secrets.JWT_SECRET}}"
NODE_ENV = "production"`;

export const envExample = `# .env.production
NODE_ENV=production
PORT=3000
# Database
DATABASE_URL=postgresql://username:password@host:port/database
# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CORS_ORIGIN=https://yourdomain.com
# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
# Optional: File storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
# Optional: Email service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
# Optional: Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOGTAIL_TOKEN=your-logtail-token`;

export const productionChecklist = `# Production Deployment Checklist
## Security
- [ ] Environment variables are properly set
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are secure
- [ ] CORS is configured for your domain
- [ ] HTTPS is enabled
- [ ] Rate limiting is implemented
## Database
- [ ] Database migrations are applied
- [ ] Database backups are configured
- [ ] Connection pooling is optimized
- [ ] Indexes are created for performance
- [ ] Database monitoring is set up
## Performance
- [ ] Caching strategy is implemented
- [ ] CDN is configured for static assets
- [ ] Compression is enabled
- [ ] Database queries are optimized
- [ ] Memory usage is monitored
## Monitoring
- [ ] Error tracking is set up (Sentry)
- [ ] Logging is configured
- [ ] Health checks are implemented
- [ ] Uptime monitoring is active
- [ ] Performance metrics are tracked
## Backup & Recovery
- [ ] Database backups are automated
- [ ] Backup restoration is tested
- [ ] Disaster recovery plan exists
- [ ] Data retention policy is defined`;

export const nginxConfig = `# nginx.conf
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`;

// ============================================================================
// EXAMPLES
// ============================================================================

export const todoAppSchema = `// schema/todo.js
import { pgTable, serial, text, boolean, timestamp } from "@lorm/schema/pg";
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
// Add user relation to todos
export const todosWithUser = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});`;

export const todoAppRouter = `// routers/todo.js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { todos, users } from "../schema/todo.js";
export const getUserTodos = defineRouter({
  method: "GET",
  path: "/users/:userId/todos",
  schema: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
    query: z.object({
      completed: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }),
  },
  handler: async ({ params, query, db }) => {
    const { userId } = params;
    const { completed, limit, offset } = query;
    let queryBuilder = db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .limit(limit)
      .offset(offset);
    if (completed !== undefined) {
      queryBuilder = queryBuilder.where(eq(todos.completed, completed));
    }
    const userTodos = await queryBuilder;
    return { todos: userTodos };
  },
});
export const createTodo = defineRouter({
  method: "POST",
  path: "/todos",
  schema: {
    body: z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      userId: z.number(),
    }),
  },
  handler: async ({ body, db }) => {
    const [newTodo] = await db
      .insert(todos)
      .values({
        title: body.title,
        description: body.description,
        userId: body.userId,
      })
      .returning();
    return { todo: newTodo };
  },
});

export const toggleTodo = defineRouter({
  method: "PATCH",
  path: "/todos/:id/toggle",
  schema: {
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  handler: async ({ params, db }) => {
    const { id } = params;
    const [todo] = await db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);
    if (!todo) {
      throw new Error("Todo not found");
    }
    const [updatedTodo] = await db
      .update(todos)
      .set({ 
        completed: !todo.completed,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, id))
      .returning();
    return { todo: updatedTodo };
  },
});

export const deleteTodo = defineRouter({
  method: "DELETE",
  path: "/todos/:id",
  schema: {
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  handler: async ({ params, db }) => {
    const { id } = params;
    const [deletedTodo] = await db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning();
    if (!deletedTodo) {
      throw new Error("Todo not found");
    }
    return { message: "Todo deleted successfully", todo: deletedTodo };
  },
});`;

export const reactNativeTodo = `// TodoApp.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { createClient } from '@lorm/client';
const client = createClient({
  baseURL: 'http://localhost:3000',
});
interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
}
export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchTodos() {
      try {
        const response = await client.get('/users/1/todos');
        setTodos(response.data.todos);
      } catch (error) {
        console.error('Failed to fetch todos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTodos();
  }, []);
  const addTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      const response = await client.post('/todos', {
        title: newTodo,
        userId: 1,
      });
      setTodos([...todos, response.data.todo]);
      setNewTodo('');
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };
  const toggleTodo = async (id: number) => {
    try {
      const response = await client.patch(\`/todos/\${id}/toggle\`);
      setTodos(todos.map(todo => 
        todo.id === id ? response.data.todo : todo
      ));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };
  const deleteTodo = async (id: number) => {
    try {
      await client.delete(\`/todos/\${id}\`);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading todos...</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Todos</Text> 
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newTodo}
          onChangeText={setNewTodo}
          placeholder="Add a new todo..."
        />
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <TouchableOpacity 
              style={styles.todoContent}
              onPress={() => toggleTodo(item.id)}
            >
              <Text style={[
                styles.todoTitle,
                item.completed && styles.completedTodo
              ]}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={styles.todoDescription}>{item.description}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteTodo(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  todoItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedTodo: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  todoDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
  },
});`;

export const blogSchema = `// schema/blog.js
import { pgTable, serial, text, timestamp, integer } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  authorId: integer("author_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  parentId: integer("parent_id").references(() => comments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const postTags = pgTable("post_tags", {
  postId: integer("post_id").references(() => posts.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
}, (table) => ({
  pk: primaryKey(table.postId, table.tagId),
}));`;

export const ecommerceSchema = `// schema/ecommerce.js
import { pgTable, serial, text, decimal, integer, timestamp, boolean } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  parentId: integer("parent_id").references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow(),
});
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  sku: text("sku").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  trackQuantity: boolean("track_quantity").default(true),
  quantity: integer("quantity").default(0),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: text("dimensions"),
  categoryId: integer("category_id").references(() => categories.id),
  featured: boolean("featured").default(false),
  status: text("status").notNull().default("draft"), // draft, active, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  url: text("url").notNull(),
  altText: text("alt_text"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("pending"), // pending, confirmed, shipped, delivered, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  paymentMethod: text("payment_method"),
  shippingAddress: text("shipping_address").notNull(),
  billingAddress: text("billing_address").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});`;

export const chatAppExample = `// Chat Application Example
// schema/chat.js
import { pgTable, serial, text, timestamp, integer, boolean } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  avatar: text("avatar"),
  status: text("status").default("offline"), // online, offline, away
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("group"), // direct, group, channel
  isPrivate: boolean("is_private").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  type: text("type").default("text"), // text, image, file, system
  senderId: integer("sender_id").references(() => users.id).notNull(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  replyToId: integer("reply_to_id").references(() => messages.id),
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
// routers/chat.js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { chatRooms, messages, users } from "../schema/chat.js";
export const sendMessage = defineRouter({
  method: "POST",
  path: "/rooms/:roomId/messages",
  schema: {
    params: z.object({
      roomId: z.string().transform(Number),
    }),
    body: z.object({
      content: z.string().min(1).max(2000),
      type: z.enum(["text", "image", "file"]).default("text"),
      replyToId: z.number().optional(),
    }),
  },
  middleware: [authenticateUser],
  handler: async ({ params, body, user, db }) => {
    const { roomId } = params;
    const { content, type, replyToId } = body;
    // Check if user has access to the room
    const room = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, roomId))
      .limit(1);
    if (!room.length) {
      throw new Error("Room not found");
    }
    const [newMessage] = await db
      .insert(messages)
      .values({
        content,
        type,
        senderId: user.id,
        roomId,
        replyToId,
      })
      .returning();
    // Get sender info for the response
    const [sender] = await db
      .select({ id: users.id, username: users.username, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    return {
      message: {
        ...newMessage,
        sender,
      },
    };
  },
});
export const getRoomMessages = defineRouter({
  method: "GET",
  path: "/rooms/:roomId/messages",
  schema: {
    params: z.object({
      roomId: z.string().transform(Number),
    }),
    query: z.object({
      limit: z.number().min(1).max(100).default(50),
      before: z.number().optional(), // message ID for pagination
    }),
  },
  middleware: [authenticateUser],
  handler: async ({ params, query, user, db }) => {
    const { roomId } = params;
    const { limit, before } = query;
    let queryBuilder = db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        createdAt: messages.createdAt,
        edited: messages.edited,
        editedAt: messages.editedAt,
        sender: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    if (before) {
      queryBuilder = queryBuilder.where(lt(messages.id, before));
    }
    const roomMessages = await queryBuilder;
    return {
      messages: roomMessages.reverse(), // Reverse to show oldest first
    };
  },
});`;

// ============================================================================
// MAIN PAGE EXAMPLES
// ============================================================================

export const exampleCode = `// schema/user.js
import { pgTable, serial, text, timestamp } from "@lorm/schema/pg";
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
// routers/user.js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users } from "../schema/user.js";
export const getUser = defineRouter({
  method: "GET",
  path: "/users/:id",
  schema: {
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  handler: async ({ params, db }) => {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);
    if (!user.length) {
      throw new Error("User not found");
    }
    return { user: user[0] };
  },
});

// client usage
import { createClient } from "@lorm/client";
const client = createClient({
  baseURL: "http://localhost:3000",
});
async function fetchUser() {
  const response = await client.get("/users/1");
  console.log(response.data.user);
}`;

export const cliRouterExample = `// lorm.router.js
import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users, posts } from "./lorm.schema.js";
import { eq } from "drizzle-orm";
export const createUser = defineRouter({
  input: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  resolve: async ({ input, db }) => {
    const [user] = await db.insert(users)
      .values(input)
      .returning();
    return user;
  }
});
export const getUserById = defineRouter({
  input: z.object({ id: z.string().uuid() }),
  resolve: async ({ input, db }) => {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.id));
    return user;
  }
});`;

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

export const troubleshootingCode = `// 1. Check if types are generated
// Run this command to ensure types are up to date:
lorm dev
// 2. Check your tsconfig.json
// Make sure paths are configured correctly:
{
  "compilerOptions": {
    "paths": {
      "@lorm/types": ["./path/to/.lorm/types.d.ts"]
    }
  }
}
// 3. Import types explicitly
import type { RouterType } from '@lorm/types';
const client = createClient<RouterType>();`;

// ============================================================================
// API REFERENCE EXAMPLES
// ============================================================================

export const defineRouterExample = `import { defineRouter } from "@lorm/core";
import { z } from "zod";
import { users } from "./lorm.schema.js";
import { eq } from "drizzle-orm";
// Basic router definition
export const getUser = defineRouter({
  input: z.object({
    id: z.string().uuid()
  }),
  resolve: async ({ input, db }) => {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.id));
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
});
// Router with middleware
export const updateUser = defineRouter({
  input: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email()
  }),
  middleware: async ({ input, context }) => {
    // Authentication check
    if (!context.user) {
      throw new Error("Unauthorized");
    }
    // Authorization check
    if (context.user.id !== input.id && context.user.role !== 'admin') {
      throw new Error("Forbidden");
    }
    return { user: context.user };
  },
  resolve: async ({ input, db, middleware }) => {
    const [updatedUser] = await db.update(users)
      .set({
        name: input.name,
        email: input.email,
        updatedAt: new Date()
      })
      .where(eq(users.id, input.id))
      .returning();
    return updatedUser;
  }
});`;

export const createClientExample = `import { createClient } from '@lorm/client';
// Basic client creation
const client = createClient();
// Client with custom configuration
const client = createClient({
  baseURL: 'https://api.myapp.com',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  timeout: 10000,
  retries: 3
});
// Using the client
async function fetchUserData() {
  const user = await client.getUser({ id: 'user-123' });
  const updatedUser = await client.updateUser({
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com'
  });
}
// Error handling
async function handleOperation() {
  try {
    const result = await client.someOperation(data);
  } catch (error) {
    if (error.status === 404) {
      console.log('Resource not found');
    } else if (error.status === 401) {
      console.log('Unauthorized');
    } else {
      console.log('Unexpected error:', error.message);
    }
  }
}`;

export const schemaExample = `import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  decimal,
  pgEnum,
  index,
  unique
} from "@lorm/schema/pg";
// Define enums
export const userRoleEnum = pgEnum("user_role", ["admin", "user", "moderator"]);
// Define tables
export const users = pgTable("users", {
  // Primary key
  id: uuid("id").defaultRandom().primaryKey(),
  // String fields
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  // Text field
  bio: text("bio"),
  // Numeric fields
  age: integer("age"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  // Boolean field
  isActive: boolean("is_active").default(true),
  // Enum field
  role: userRoleEnum("role").default("user").notNull(),
  // Timestamp fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at")
}, (table) => ({
  // Indexes
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username),
  roleIdx: index("users_role_idx").on(table.role),
  // Unique constraints
  emailUnique: unique("users_email_unique").on(table.email),
  usernameUnique: unique("users_username_unique").on(table.username)
}));
// Related table
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  authorId: uuid("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
export const schema = { users, posts };`;