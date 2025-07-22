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
  Route,
  Shield,
  Zap,
  Database,
  CheckCircle,
  AlertTriangle,
  Code2,
  Settings,
  Lock,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  basicRouterCode,
  crudOperationsCode,
  validationCode,
  middlewareCode,
  complexQueriesCode,
  errorHandlingCode,
} from "@/components/code";

export default function RouterPage() {
  return (
    <DocsPage
      toc={[
        { title: "Overview", url: "#overview", depth: 2 },
        { title: "Key Features", url: "#key-features", depth: 2 },
        {
          title: "Basic Router Definition",
          url: "#basic-router-definition",
          depth: 2,
        },
        { title: "CRUD Operations", url: "#crud-operations", depth: 2 },
        {
          title: "Advanced Input Validation",
          url: "#advanced-input-validation",
          depth: 2,
        },
        {
          title: "Authentication & Middleware",
          url: "#authentication-middleware",
          depth: 2,
        },
        {
          title: "Complex Database Queries",
          url: "#complex-database-queries",
          depth: 2,
        },
        { title: "Error Handling", url: "#error-handling", depth: 2 },
        { title: "Router Context", url: "#router-context", depth: 2 },
        { title: "Best Practices", url: "#best-practices", depth: 2 },
        { title: "Performance Tips", url: "#performance-tips", depth: 2 },
      ]}
    >
      <DocsTitle>Router & API Endpoints</DocsTitle>
      <DocsDescription>
        Learn how to define type-safe API endpoints using Lorm's router system.
        Build powerful APIs with full type safety and validation.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="overview" className="text-2xl font-bold">
              Overview
            </h2>
            <p className="text-muted-foreground">
              Lorm's router system allows you to define type-safe API endpoints
              in <code>lorm.router.js</code>. Each route is defined using{" "}
              <code>defineRouter</code> with Zod validation for inputs and
              automatic type generation for your frontend.
            </p>
          </div>

          {/* Key Features */}
          <div className="space-y-4">
            <h2 id="key-features" className="text-2xl font-bold">
              Key Features
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Shield className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Type Safety</CardTitle>
                  <CardDescription>
                    Full TypeScript integration with auto-generated types for
                    frontend
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>Input Validation</CardTitle>
                  <CardDescription>
                    Zod-powered validation with detailed error messages
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Database className="size-8 text-purple-500 mb-2" />
                  <CardTitle>Database Integration</CardTitle>
                  <CardDescription>
                    Direct access to Drizzle ORM with your schema
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Zap className="size-8 text-yellow-500 mb-2" />
                  <CardTitle>Hot Reload</CardTitle>
                  <CardDescription>
                    Instant updates during development with lorm dev
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Basic Router */}
          <div className="space-y-4">
            <h2 id="basic-router-definition" className="text-2xl font-bold">
              Basic Router Definition
            </h2>
            <p className="text-muted-foreground">
              Start with simple endpoints that demonstrate the core concepts:
            </p>
            <CodeBlock code={basicRouterCode} language="javascript" />

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Each router function is automatically exposed as an HTTP
                endpoint that your frontend can call.
              </AlertDescription>
            </Alert>
          </div>

          {/* CRUD Operations */}
          <div className="space-y-4">
            <h2 id="crud-operations" className="text-2xl font-bold">
              CRUD Operations
            </h2>
            <p className="text-muted-foreground">
              Build complete Create, Read, Update, Delete operations with proper
              validation:
            </p>
            <CodeBlock code={crudOperationsCode} language="javascript" />
          </div>

          {/* Input Validation */}
          <div className="space-y-4">
            <h2 id="advanced-input-validation" className="text-2xl font-bold">
              Advanced Input Validation
            </h2>
            <p className="text-muted-foreground">
              Use Zod's powerful validation features for complex input
              requirements:
            </p>
            <CodeBlock code={validationCode} language="javascript" />

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">String Validation</CardTitle>
                  <CardDescription>
                    Email, URL, regex patterns, min/max length
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Number Validation</CardTitle>
                  <CardDescription>
                    Min/max values, integers, positive numbers
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom Validation</CardTitle>
                  <CardDescription>
                    Refine methods for complex business logic
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Authentication & Middleware */}
          <div className="space-y-4">
            <h2 id="authentication-middleware" className="text-2xl font-bold">
              Authentication & Middleware
            </h2>
            <p className="text-muted-foreground">
              Implement authentication and authorization patterns:
            </p>
            <CodeBlock code={middlewareCode} language="javascript" />

            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Always validate authentication and authorization on the server
                side, never trust client-side data.
              </AlertDescription>
            </Alert>
          </div>

          {/* Complex Queries */}
          <div className="space-y-4">
            <h2 id="complex-database-queries" className="text-2xl font-bold">
              Complex Database Queries
            </h2>
            <p className="text-muted-foreground">
              Leverage Drizzle ORM's full power for complex data operations:
            </p>
            <CodeBlock code={complexQueriesCode} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Joins & Relations</CardTitle>
                  <CardDescription>
                    Inner/outer joins with type-safe column selection
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aggregations</CardTitle>
                  <CardDescription>
                    COUNT, SUM, AVG, MAX, MIN with grouping
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transactions</CardTitle>
                  <CardDescription>
                    ACID transactions for data consistency
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw SQL</CardTitle>
                  <CardDescription>
                    Escape hatch for complex queries when needed
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Error Handling */}
          <div className="space-y-4">
            <h2 id="error-handling" className="text-2xl font-bold">
              Error Handling
            </h2>
            <p className="text-muted-foreground">
              Implement proper error handling with appropriate HTTP status
              codes:
            </p>
            <CodeBlock code={errorHandlingCode} language="javascript" />
          </div>

          {/* Router Context */}
          <div className="space-y-4">
            <h2 id="router-context" className="text-2xl font-bold">
              Router Context
            </h2>
            <p className="text-muted-foreground mb-4">
              Each router function receives a context object with useful
              properties:
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Code2 className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Available Context</CardTitle>
                  <CardDescription>
                    Properties available in your resolve function
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <code>input</code> - Validated input data
                    </li>
                    <li>
                      <code>db</code> - Drizzle database instance
                    </li>
                    <li>
                      <code>headers</code> - HTTP request headers
                    </li>
                    <li>
                      <code>method</code> - HTTP method (GET, POST, etc.)
                    </li>
                    <li>
                      <code>url</code> - Request URL
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Settings className="size-8 text-green-500 mb-2" />
                  <CardTitle>Custom Context</CardTitle>
                  <CardDescription>
                    Extend context with your own properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>Authentication data</li>
                    <li>Request ID for logging</li>
                    <li>User preferences</li>
                    <li>Feature flags</li>
                    <li>Custom middleware data</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-4">
            <h2 id="best-practices" className="text-2xl font-bold">
              Best Practices
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Input Validation</CardTitle>
                  <CardDescription>
                    Always validate inputs with Zod schemas, never trust client
                    data
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Error Handling</CardTitle>
                  <CardDescription>
                    Use proper HTTP status codes and meaningful error messages
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Database Queries</CardTitle>
                  <CardDescription>
                    Use indexes, limit results, and avoid N+1 query problems
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Security</CardTitle>
                  <CardDescription>
                    Implement authentication, authorization, and rate limiting
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="space-y-4">
            <h2 id="performance-tips" className="text-2xl font-bold">
              Performance Tips
            </h2>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Database Performance:</strong> Use indexes on frequently
                queried columns, limit result sets, and consider pagination for
                large datasets.
              </AlertDescription>
            </Alert>

            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>Query Optimization:</strong> Select only needed columns,
                use joins instead of multiple queries, and leverage
                database-level aggregations.
              </AlertDescription>
            </Alert>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Caching Strategy:</strong> Consider caching frequently
                accessed data and implementing proper cache invalidation
                strategies.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}
