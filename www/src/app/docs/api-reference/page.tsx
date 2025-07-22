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
  Code2,
  Database,
  Zap,
  Shield,
  Settings,
  FileText,
  Terminal,
  Layers,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  defineRouterExample,
  createClientExample,
  schemaExample,
  cliCommands,
  configExample,
  middlewareExample,
  defineRouterSignature,
  errorHandlingExample,
} from "@/components/code";

export default function APIReferencePage() {
  const toc = [
    { title: "API Overview", url: "#api-overview", depth: 2 },
    { title: "Core APIs", url: "#core-apis", depth: 2 },
    { title: "CLI Commands", url: "#cli-commands", depth: 2 },
    { title: "Configuration", url: "#configuration", depth: 2 },
    { title: "Middleware", url: "#middleware", depth: 2 },
    { title: "Error Handling", url: "#error-handling", depth: 2 },
    { title: "Type Definitions", url: "#type-definitions", depth: 2 },
    { title: "API Best Practices", url: "#api-best-practices", depth: 2 },
  ];

  return (
    <DocsPage toc={toc}>
      <DocsTitle>API Reference</DocsTitle>
      <DocsDescription>
        Complete reference for all Lorm APIs, functions, and configuration
        options. Everything you need to build powerful full-stack applications.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="api-overview" className="text-2xl font-bold">
              API Overview
            </h2>
            <p className="text-muted-foreground">
              Lorm provides a comprehensive set of APIs for building type-safe,
              full-stack applications. This reference covers all core functions,
              configuration options, and advanced features.
            </p>
          </div>

          {/* Core APIs */}
          <div className="space-y-4">
            <h2 id="core-apis" className="text-2xl font-bold">
              Core APIs
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <Code2 className="size-8 text-blue-500 mb-2" />
                  <CardTitle>@lorm/core</CardTitle>
                  <CardDescription>
                    Core framework functions and utilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">defineRouter</Badge>
                    <Badge variant="outline">middleware</Badge>
                    <Badge variant="outline">context</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="size-8 text-green-500 mb-2" />
                  <CardTitle>@lorm/client</CardTitle>
                  <CardDescription>
                    Type-safe HTTP client for frontend apps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">createClient</Badge>
                    <Badge variant="outline">auto-typed</Badge>
                    <Badge variant="outline">error handling</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Database className="size-8 text-purple-500 mb-2" />
                  <CardTitle>@lorm/schema</CardTitle>
                  <CardDescription>
                    Database schema definition and types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">pgTable</Badge>
                    <Badge variant="outline">column types</Badge>
                    <Badge variant="outline">relationships</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Terminal className="size-8 text-orange-500 mb-2" />
                  <CardTitle>@lorm/cli</CardTitle>
                  <CardDescription>
                    Command-line interface and tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">init</Badge>
                    <Badge variant="outline">dev</Badge>
                    <Badge variant="outline">push</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Settings className="size-8 text-red-500 mb-2" />
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>
                    Project and server configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">lorm.config.js</Badge>
                    <Badge variant="outline">database</Badge>
                    <Badge variant="outline">server</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="size-8 text-teal-500 mb-2" />
                  <CardTitle>Middleware</CardTitle>
                  <CardDescription>
                    Authentication, validation, and more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">auth</Badge>
                    <Badge variant="outline">validation</Badge>
                    <Badge variant="outline">rate limiting</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* defineRouter API */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Code2 className="size-6 text-blue-500" />
              defineRouter
            </h2>
            <p className="text-muted-foreground">
              The core function for defining type-safe API routes with input
              validation and middleware support.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Function Signature
                </h3>
                <CodeBlock code={defineRouterSignature} language="typescript" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Examples</h3>
                <CodeBlock code={defineRouterExample} language="javascript" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parameters</CardTitle>
                  <CardDescription>
                    Function parameters and options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <code className="text-xs">input</code> - Zod schema for
                      input validation
                    </li>
                    <li>
                      <code className="text-xs">middleware</code> - Optional
                      middleware functions
                    </li>
                    <li>
                      <code className="text-xs">resolve</code> - Main route
                      handler function
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Context Object</CardTitle>
                  <CardDescription>
                    Available in resolve function
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <code className="text-xs">input</code> - Validated input
                      data
                    </li>
                    <li>
                      <code className="text-xs">db</code> - Drizzle database
                      instance
                    </li>
                    <li>
                      <code className="text-xs">context</code> - Request context
                      (headers, IP, etc.)
                    </li>
                    <li>
                      <code className="text-xs">middleware</code> - Middleware
                      results
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* createClient API */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="size-6 text-green-500" />
              createClient
            </h2>
            <p className="text-muted-foreground">
              Creates a type-safe HTTP client for consuming your Lorm API routes
              with full TypeScript support.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Function Signature
                </h3>
                <CodeBlock
                  code={`createClient<TRoutes>(options?: {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  onError?: (error: ClientError) => void;
}): TypedClient<TRoutes>`}
                  language="typescript"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Examples</h3>
                <CodeBlock code={createClientExample} language="javascript" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuration</CardTitle>
                  <CardDescription>
                    Client configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <code className="text-xs">baseURL</code> - API base URL
                    </li>
                    <li>
                      <code className="text-xs">headers</code> - Default headers
                    </li>
                    <li>
                      <code className="text-xs">timeout</code> - Request timeout
                    </li>
                    <li>
                      <code className="text-xs">retries</code> - Retry attempts
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Type Safety</CardTitle>
                  <CardDescription>Automatic type inference</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Auto-generated from routes</li>
                    <li>• Input validation</li>
                    <li>• Return type inference</li>
                    <li>• Error type safety</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Error Handling</CardTitle>
                  <CardDescription>Built-in error management</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• HTTP status codes</li>
                    <li>• Validation errors</li>
                    <li>• Network errors</li>
                    <li>• Custom error types</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Schema API */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Database className="size-6 text-purple-500" />
              Schema Definition
            </h2>
            <p className="text-muted-foreground">
              Define your database schema with type-safe column definitions,
              relationships, and constraints.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Available Column Types
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">String Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <code className="text-xs">
                            varchar(name, options)
                          </code>
                        </li>
                        <li>
                          <code className="text-xs">text(name)</code>
                        </li>
                        <li>
                          <code className="text-xs">char(name, length)</code>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Numeric Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <code className="text-xs">integer(name)</code>
                        </li>
                        <li>
                          <code className="text-xs">
                            decimal(name, options)
                          </code>
                        </li>
                        <li>
                          <code className="text-xs">real(name)</code>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Other Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <code className="text-xs">boolean(name)</code>
                        </li>
                        <li>
                          <code className="text-xs">timestamp(name)</code>
                        </li>
                        <li>
                          <code className="text-xs">uuid(name)</code>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Complete Example</h3>
                <CodeBlock code={schemaExample} language="javascript" />
              </div>
            </div>
          </div>

          {/* CLI Commands */}
          <div className="space-y-4">
            <h2
              id="cli-commands"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <Terminal className="size-6 text-purple-500" />
              CLI Commands
            </h2>
            <p className="text-muted-foreground">
              Complete reference for all Lorm CLI commands and their options.
            </p>
            <CodeBlock code={cliCommands} language="bash" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">lorm init</CardTitle>
                  <CardDescription>Initialize new project</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Creates project structure</li>
                    <li>• Installs dependencies</li>
                    <li>• Sets up configuration</li>
                    <li>• Generates boilerplate</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">lorm dev</CardTitle>
                  <CardDescription>Development server</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Hot reload</li>
                    <li>• Type generation</li>
                    <li>• File watching</li>
                    <li>• Debug logging</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">lorm push</CardTitle>
                  <CardDescription>Database operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Schema migrations</li>
                    <li>• Dry run mode</li>
                    <li>• Force push</li>
                    <li>• Backup creation</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">lorm generate</CardTitle>
                  <CardDescription>Code generation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• TypeScript types</li>
                    <li>• Client code</li>
                    <li>• API documentation</li>
                    <li>• Schema validation</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <h2
              id="configuration"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <Settings className="size-6 text-red-500" />
              Configuration
            </h2>
            <p className="text-muted-foreground">
              Comprehensive configuration options for customizing your Lorm
              application.
            </p>
            <CodeBlock code={configExample} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Database Config</CardTitle>
                  <CardDescription>
                    Database connection settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Connection URL</li>
                    <li>• Pool configuration</li>
                    <li>• SSL settings</li>
                    <li>• Migration options</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Server Config</CardTitle>
                  <CardDescription>HTTP server configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Port and host</li>
                    <li>• CORS settings</li>
                    <li>• Rate limiting</li>
                    <li>• Request limits</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Development</CardTitle>
                  <CardDescription>
                    Development-specific options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• File watching</li>
                    <li>• Debug logging</li>
                    <li>• Hot reload</li>
                    <li>• Source maps</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Middleware */}
          <div className="space-y-4">
            <h2
              id="middleware"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <Shield className="size-6 text-teal-500" />
              Middleware
            </h2>
            <p className="text-muted-foreground">
              Create reusable middleware for authentication, validation,
              logging, and more.
            </p>
            <CodeBlock code={middlewareExample} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Built-in Middleware
                  </CardTitle>
                  <CardDescription>
                    Ready-to-use middleware functions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Authentication (JWT, OAuth)</li>
                    <li>• Rate limiting</li>
                    <li>• Request validation</li>
                    <li>• CORS handling</li>
                    <li>• Logging and monitoring</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom Middleware</CardTitle>
                  <CardDescription>Create your own middleware</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Access to request context</li>
                    <li>• Modify request/response</li>
                    <li>• Chain multiple middleware</li>
                    <li>• Error handling</li>
                    <li>• Async support</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Handling */}
          <div className="space-y-4">
            <h2 id="error-handling" className="text-2xl font-bold">
              Error Handling
            </h2>
            <p className="text-muted-foreground">
              Comprehensive error handling with custom error types and global
              error handlers.
            </p>
            <CodeBlock code={errorHandlingExample} language="javascript" />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Lorm automatically handles common errors like validation
                failures and provides structured error responses to clients.
              </AlertDescription>
            </Alert>
          </div>

          {/* Type Definitions */}
          <div className="space-y-4">
            <h2 id="type-definitions" className="text-2xl font-bold">
              Type Definitions
            </h2>
            <p className="text-muted-foreground">
              Key TypeScript interfaces and types used throughout Lorm.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Core Types</CardTitle>
                  <CardDescription>Essential type definitions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <code className="text-xs">
                        RouterFunction&lt;TInput, TOutput&gt;
                      </code>
                    </li>
                    <li>
                      <code className="text-xs">MiddlewareFunction</code>
                    </li>
                    <li>
                      <code className="text-xs">RequestContext</code>
                    </li>
                    <li>
                      <code className="text-xs">DatabaseInstance</code>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client Types</CardTitle>
                  <CardDescription>
                    Client-side type definitions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <code className="text-xs">
                        TypedClient&lt;TRoutes&gt;
                      </code>
                    </li>
                    <li>
                      <code className="text-xs">ClientError</code>
                    </li>
                    <li>
                      <code className="text-xs">ClientOptions</code>
                    </li>
                    <li>
                      <code className="text-xs">ResponseType&lt;T&gt;</code>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-4">
            <h2 id="api-best-practices" className="text-2xl font-bold">
              API Best Practices
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>Do's</CardTitle>
                  <CardDescription>Recommended practices</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Use descriptive router names</li>
                    <li>• Validate all inputs with Zod</li>
                    <li>• Handle errors gracefully</li>
                    <li>• Use middleware for common logic</li>
                    <li>• Keep routers focused and small</li>
                    <li>• Document complex business logic</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <AlertTriangle className="size-8 text-red-500 mb-2" />
                  <CardTitle>Don'ts</CardTitle>
                  <CardDescription>Things to avoid</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Don't skip input validation</li>
                    <li>• Don't expose sensitive data</li>
                    <li>• Don't ignore error handling</li>
                    <li>• Don't create overly complex routers</li>
                    <li>• Don't hardcode configuration</li>
                    <li>• Don't bypass type safety</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}
