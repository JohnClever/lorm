import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from "fumadocs-ui/page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Database,
  Key,
  Link,
  Shield,
  Calendar,
  Hash,
  Type,
  Info,
  CheckCircle,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  basicSchemaCode,
  relationshipsCode,
  dataTypesCode,
  constraintsCode,
  enumsCode,
  migrationCode,
  bestPracticesCode,
} from "@/components/code";

export default function SchemaPage() {
  return (
    <DocsPage
      toc={[
        { title: "Overview", url: "#overview", depth: 2 },
        {
          title: "Basic Schema Definition",
          url: "#basic-schema-definition",
          depth: 2,
        },
        { title: "Data Types", url: "#data-types", depth: 2 },
        { title: "Relationships", url: "#relationships", depth: 2 },
        {
          title: "Constraints & Indexes",
          url: "#constraints-indexes",
          depth: 2,
        },
        { title: "Enums for Type Safety", url: "#enums-type-safety", depth: 2 },
        { title: "Schema Evolution", url: "#schema-evolution", depth: 2 },
        { title: "Best Practices", url: "#best-practices", depth: 2 },
        { title: "Database Support", url: "#database-support", depth: 2 },
      ]}
    >
      <DocsTitle>Schema Definition</DocsTitle>
      <DocsDescription>
        Learn how to define your database schema using Lorm's powerful schema
        system built on Drizzle ORM.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="overview" className="text-2xl font-bold">
              Overview
            </h2>
            <p className="text-muted-foreground">
              Lorm uses Drizzle ORM's schema definition system to provide
              type-safe database schemas. Define your tables, relationships, and
              constraints in <code>lorm.schema.js</code> and Lorm handles the
              rest - from type generation to database synchronization.
            </p>
          </div>

          {/* Basic Schema */}
          <div className="space-y-4">
            <h2 id="basic-schema-definition" className="text-2xl font-bold">
              Basic Schema Definition
            </h2>
            <p className="text-muted-foreground">
              Start with a simple table definition using PostgreSQL data types:
            </p>
            <CodeBlock code={basicSchemaCode} language="javascript" />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Always export your tables in the <code>schema</code> object at
                the bottom of the file.
              </AlertDescription>
            </Alert>
          </div>

          {/* Data Types */}
          <div className="space-y-4">
            <h2 id="data-types" className="text-2xl font-bold">
              Data Types
            </h2>
            <p className="text-muted-foreground">
              Lorm supports all PostgreSQL data types through Drizzle ORM:
            </p>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader>
                  <Type className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Text Types</CardTitle>
                  <CardDescription>
                    varchar, text, char for string data
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Hash className="size-8 text-green-500 mb-2" />
                  <CardTitle>Numeric Types</CardTitle>
                  <CardDescription>
                    integer, bigint, decimal, real for numbers
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Calendar className="size-8 text-purple-500 mb-2" />
                  <CardTitle>Date/Time Types</CardTitle>
                  <CardDescription>
                    timestamp, date, time for temporal data
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <CodeBlock code={dataTypesCode} language="javascript" />
          </div>

          {/* Relationships */}
          <div className="space-y-4">
            <h2 id="relationships" className="text-2xl font-bold">
              Relationships
            </h2>
            <p className="text-muted-foreground">
              Define foreign keys and relationships between tables:
            </p>
            <CodeBlock code={relationshipsCode} language="javascript" />
          </div>

          {/* Constraints */}
          <div className="space-y-4">
            <h2 id="constraints-indexes" className="text-2xl font-bold">
              Constraints & Indexes
            </h2>
            <p className="text-muted-foreground">
              Add constraints, unique indexes, and performance optimizations:
            </p>
            <CodeBlock code={constraintsCode} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <Key className="size-8 text-yellow-500 mb-2" />
                  <CardTitle>Primary Keys</CardTitle>
                  <CardDescription>
                    Use <code>.primaryKey()</code> to define primary keys
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="size-8 text-red-500 mb-2" />
                  <CardTitle>Unique Constraints</CardTitle>
                  <CardDescription>
                    Use <code>.unique()</code> for single or composite unique
                    constraints
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Link className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Foreign Keys</CardTitle>
                  <CardDescription>
                    Use <code>.references()</code> with cascade options
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Database className="size-8 text-green-500 mb-2" />
                  <CardTitle>Indexes</CardTitle>
                  <CardDescription>
                    Use <code>index()</code> for query performance optimization
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Enums */}
          <div className="space-y-4">
            <h2 id="enums-type-safety" className="text-2xl font-bold">
              Enums for Type Safety
            </h2>
            <p className="text-muted-foreground">
              Use PostgreSQL enums for better type safety and data validation:
            </p>
            <CodeBlock code={enumsCode} language="javascript" />

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Enums provide compile-time type checking and runtime validation,
                preventing invalid values.
              </AlertDescription>
            </Alert>
          </div>

          {/* Schema Evolution */}
          <div className="space-y-4">
            <h2 id="schema-evolution" className="text-2xl font-bold">
              Schema Evolution
            </h2>
            <p className="text-muted-foreground">
              Lorm handles schema changes through migrations. Modify your schema
              and generate migrations:
            </p>
            <CodeBlock code={migrationCode} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Development Workflow</CardTitle>
                  <CardDescription>
                    Use <code>lorm push</code> for rapid prototyping and local
                    development
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">lorm push</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Production Workflow</CardTitle>
                  <CardDescription>
                    Use <code>lorm generate</code> and <code>lorm migrate</code>{" "}
                    for controlled deployments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-x-2">
                    <Badge variant="outline">lorm generate</Badge>
                    <Badge variant="outline">lorm migrate</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-4">
            <h2 id="best-practices" className="text-2xl font-bold">
              Best Practices
            </h2>
            <CodeBlock code={bestPracticesCode} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Naming Conventions</CardTitle>
                  <CardDescription>
                    Use snake_case for database columns and camelCase for
                    JavaScript
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Always Include Timestamps</CardTitle>
                  <CardDescription>
                    Add createdAt and updatedAt to track record lifecycle
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Use Appropriate Constraints</CardTitle>
                  <CardDescription>
                    Add NOT NULL, UNIQUE, and CHECK constraints where needed
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Index Frequently Queried Columns</CardTitle>
                  <CardDescription>
                    Add indexes on columns used in WHERE, JOIN, and ORDER BY
                    clauses
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Database Support */}
          <div className="space-y-4">
            <h2 id="database-support" className="text-2xl font-bold">
              Database Support
            </h2>
            <p className="text-muted-foreground mb-4">
              Lorm supports all databases that Drizzle ORM supports:
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>PostgreSQL</CardTitle>
                  <CardDescription>
                    Full support with advanced features like enums, arrays, and
                    JSON
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>MySQL</CardTitle>
                  <CardDescription>
                    Complete MySQL support with all data types and features
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>SQLite</CardTitle>
                  <CardDescription>
                    Perfect for development and lightweight applications
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}
