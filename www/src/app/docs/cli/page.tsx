import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { 
  Terminal, 
  Play, 
  Database,
  FileText,
  Zap,
  RefreshCw,
  Settings,
  Info
} from 'lucide-react';
import { CodeBlock } from '@/components/code-block';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  initExample,
  devExample,
  pushExample,
  generateExample,
  migrateExample,
  cliConfigExample,
  cliSchemaExample,
  cliRouterExample
} from '@/components/code';

export default function CLIPage() {
  return (
    <DocsPage toc={[
      { title: 'Overview', url: '#overview', depth: 2 },
      { title: 'lorm init', url: '#lorm-init', depth: 2 },
      { title: 'lorm dev', url: '#lorm-dev', depth: 2 },
      { title: 'lorm push', url: '#lorm-push', depth: 2 },
      { title: 'lorm generate', url: '#lorm-generate', depth: 2 },
      { title: 'lorm migrate', url: '#lorm-migrate', depth: 2 },
      { title: 'Configuration Files', url: '#configuration-files', depth: 2 },
      { title: '.lorm/ Directory', url: '#lorm-directory', depth: 2 }
    ]}>
      <DocsTitle>CLI Reference</DocsTitle>
      <DocsDescription>
        Complete reference for the Lorm command-line interface. Master all commands for efficient development.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="overview" className="text-2xl font-bold">Overview</h2>
            <p className="text-muted-foreground">
              The Lorm CLI is your primary tool for managing Lorm projects. It handles project initialization, 
              database operations, development server, and type generation.
            </p>
          </div>

          {/* Commands Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Settings className="size-8 text-blue-500 mb-2" />
                <CardTitle>lorm init</CardTitle>
                <CardDescription>
                  Initialize a new Lorm project
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Play className="size-8 text-green-500 mb-2" />
                <CardTitle>lorm dev</CardTitle>
                <CardDescription>
                  Start development server with hot reload
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Database className="size-8 text-purple-500 mb-2" />
                <CardTitle>lorm push</CardTitle>
                <CardDescription>
                  Push schema changes to database
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="size-8 text-orange-500 mb-2" />
                <CardTitle>lorm generate</CardTitle>
                <CardDescription>
                  Generate migration files
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* lorm init */}
          <div className="space-y-4">
            <h2 id="lorm-init" className="text-2xl font-bold">lorm init</h2>
            <p className="text-muted-foreground">
              Initialize a new Lorm project in your existing directory. This command sets up all necessary 
              files and dependencies for a type-safe full-stack application.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage</h3>
              <CodeBlock code={initExample} language="bash" />
              
              <h3 className="text-lg font-semibold">What it does</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Installs required dependencies (<code>zod</code>, <code>@lorm/core</code>, <code>@lorm/schema</code>, <code>@lorm/lib</code>)</li>
                <li>Creates <code>lorm.config.js</code> with database configuration</li>
                <li>Creates <code>lorm.schema.js</code> with example schema</li>
                <li>Creates <code>lorm.router.js</code> with example API routes</li>
                <li>Sets up the foundation for a type-safe full-stack app</li>
              </ul>
            </div>
          </div>

          {/* lorm dev */}
          <div className="space-y-4">
            <h2 id="lorm-dev" className="text-2xl font-bold">lorm dev</h2>
            <p className="text-muted-foreground">
              Start a local development server with hot reload capabilities. Perfect for rapid development 
              and API testing.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage</h3>
              <CodeBlock code={devExample} language="bash" />
              
              <h3 className="text-lg font-semibold">Features</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <Zap className="size-6 text-yellow-500 mb-2" />
                    <CardTitle className="text-base">Hot Reload</CardTitle>
                    <CardDescription>
                      Automatically restarts on router changes
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <FileText className="size-6 text-blue-500 mb-2" />
                    <CardTitle className="text-base">Type Generation</CardTitle>
                    <CardDescription>
                      Auto-generates TypeScript types in <code>.lorm/types.d.ts</code>
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <Settings className="size-6 text-green-500 mb-2" />
                    <CardTitle className="text-base">Zero Config</CardTitle>
                    <CardDescription>
                      Works out of the box with sensible defaults
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <RefreshCw className="size-6 text-purple-500 mb-2" />
                    <CardTitle className="text-base">CORS Enabled</CardTitle>
                    <CardDescription>
                      Ready for frontend development
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>

          {/* lorm push */}
          <div className="space-y-4">
            <h2 id="lorm-push" className="text-2xl font-bold">lorm push</h2>
            <p className="text-muted-foreground">
              Push your schema changes directly to your database. Perfect for development workflow 
              and rapid prototyping.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage</h3>
              <CodeBlock code={pushExample} language="bash" />
              
              <h3 className="text-lg font-semibold">Requirements</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Valid database URL in <code>lorm.config.js</code></li>
                <li>Properly defined schema in <code>lorm.schema.js</code></li>
                <li>Database connection must be accessible</li>
              </ul>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Best for:</strong> Quick prototyping and local development. For production, 
                  consider using <code>lorm generate</code> and <code>lorm migrate</code> for better control.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* lorm generate */}
          <div className="space-y-4">
            <h2 id="lorm-generate" className="text-2xl font-bold">lorm generate</h2>
            <p className="text-muted-foreground">
              Generate SQL migration files based on schema changes. Recommended for production deployments.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage</h3>
              <CodeBlock code={generateExample} language="bash" />
              
              <h3 className="text-lg font-semibold">What it does</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Compares current schema with previous state</li>
                <li>Generates SQL migration files in <code>migrations/</code> directory</li>
                <li>Creates timestamped migration files</li>
                <li>Tracks schema changes for version control</li>
              </ul>
            </div>
          </div>

          {/* lorm migrate */}
          <div className="space-y-4">
            <h2 id="lorm-migrate" className="text-2xl font-bold">lorm migrate</h2>
            <p className="text-muted-foreground">
              Apply generated migration files to your database. Use this in production environments.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage</h3>
              <CodeBlock code={migrateExample} language="bash" />
              
              <h3 className="text-lg font-semibold">Safety Features</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Applies migrations in correct order</li>
                <li>Tracks applied migrations to prevent duplicates</li>
                <li>Rollback support for failed migrations</li>
                <li>Transaction-based execution</li>
              </ul>
            </div>
          </div>

          {/* Configuration Files */}
          <div className="space-y-4">
            <h2 id="configuration-files" className="text-2xl font-bold">Configuration Files</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">lorm.config.js</h3>
                <p className="text-muted-foreground mb-3">
                  Main configuration file for database connection and server settings:
                </p>
                <CodeBlock code={cliConfigExample} language="javascript" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">lorm.schema.js</h3>
                <p className="text-muted-foreground mb-3">
                  Define your database schema using Drizzle ORM syntax:
                </p>
                <CodeBlock code={cliSchemaExample} language="javascript" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">lorm.router.js</h3>
                <p className="text-muted-foreground mb-3">
                  Define your API endpoints with full type safety:
                </p>
                <CodeBlock code={cliRouterExample} language="javascript" />
              </div>
            </div>
          </div>

          {/* Generated Directory */}
          <div className="space-y-4">
            <h2 id="lorm-directory" className="text-2xl font-bold">.lorm/ Directory</h2>
            <p className="text-muted-foreground mb-4">
              The CLI automatically generates this directory with compiled artifacts:
            </p>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="font-mono text-sm">
                      <div>📁 .lorm/</div>
                      <div className="ml-4">📄 types.d.ts <Badge variant="secondary">Auto-generated types</Badge></div>
                      <div className="ml-4">📄 schema.js <Badge variant="secondary">Compiled schema</Badge></div>
                      <div className="ml-4">📄 router.js <Badge variant="secondary">Compiled router</Badge></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Add <code>.lorm/</code> to your <code>.gitignore</code> file as these are generated artifacts.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}