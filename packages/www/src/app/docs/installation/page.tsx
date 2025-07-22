import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { 
  Terminal, 
  CheckCircle, 
  AlertTriangle,
  Database,
  Smartphone,
  Globe
} from 'lucide-react';
import { CodeBlock } from '@/components/code-block';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  globalInstallCode,
  localInstallCode,
  initCode,
  packageJsonCode,
  basicConfigCode,
  schemaCode,
  basicRouterCode,
  clientInstallCode,
  clientUsageCode
} from '@/components/code';

export default function InstallationPage() {
  return (
    <DocsPage toc={[
      { title: 'Prerequisites', url: '#prerequisites', depth: 2 },
      { title: '1. Install the CLI', url: '#install-cli', depth: 2 },
      { title: 'Global Installation (Recommended)', url: '#global-installation', depth: 3 },
      { title: 'Local Installation', url: '#local-installation', depth: 3 },
      { title: '2. Initialize Your Project', url: '#initialize-project', depth: 2 },
      { title: '3. Generated Files', url: '#generated-files', depth: 2 },
      { title: '4. Frontend Client Setup', url: '#frontend-client-setup', depth: 2 },
      { title: 'Next Steps', url: '#next-steps', depth: 2 }
    ]}>
      <DocsTitle>Installation</DocsTitle>
      <DocsDescription>
        Get started with Lorm in minutes. Follow this guide to set up your development environment.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Prerequisites */}
          <div className="space-y-4">
            <h2 id="prerequisites" className="text-2xl font-bold">Prerequisites</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <Terminal className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Node.js 18+</CardTitle>
                  <CardDescription>
                    Required for running the CLI and development server
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Database className="size-8 text-green-500 mb-2" />
                  <CardTitle>Database</CardTitle>
                  <CardDescription>
                    PostgreSQL, MySQL, or SQLite (Drizzle-supported)
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Smartphone className="size-8 text-purple-500 mb-2" />
                  <CardTitle>TypeScript Frontend</CardTitle>
                  <CardDescription>
                    React Native, React, Svelte, Vue, or any TS framework
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* CLI Installation */}
          <div className="space-y-4">
            <h2 id="install-cli" className="text-2xl font-bold">1. Install the CLI</h2>
            
            <div className="space-y-4">
              <div>
                <h3 id="global-installation" className="text-lg font-semibold mb-2">Global Installation (Recommended)</h3>
                <p className="text-muted-foreground mb-3">
                  Install the CLI globally to use the <code>lorm</code> command anywhere:
                </p>
                <CodeBlock code={globalInstallCode} language="bash" />
              </div>
              
              <div>
                <h3 id="local-installation" className="text-lg font-semibold mb-2">Local Installation</h3>
                <p className="text-muted-foreground mb-3">
                  Or install locally as a dev dependency:
                </p>
                <CodeBlock code={localInstallCode} language="bash" />
              </div>
            </div>
          </div>

          {/* Project Setup */}
          <div className="space-y-4">
            <h2 id="initialize-project" className="text-2xl font-bold">2. Initialize Your Project</h2>
            <p className="text-muted-foreground">
              Navigate to your project directory and initialize Lorm:
            </p>
            <CodeBlock code={initCode} language="bash" />
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This command will install required dependencies and create the necessary configuration files.
              </AlertDescription>
            </Alert>
          </div>

          {/* Generated Files */}
          <div className="space-y-4">
            <h2 id="generated-files" className="text-2xl font-bold">3. Generated Files</h2>
            <p className="text-muted-foreground mb-4">
              The <code>lorm init</code> command creates these files in your project:
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Dependencies Added</h3>
                <CodeBlock code={packageJsonCode} language="json" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">lorm.config.js</h3>
                <p className="text-muted-foreground mb-3">Database configuration:</p>
                <CodeBlock code={basicConfigCode} language="javascript" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">lorm.schema.js</h3>
                <p className="text-muted-foreground mb-3">Example schema with a users table:</p>
                <CodeBlock code={schemaCode} language="javascript" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">lorm.router.js</h3>
                <p className="text-muted-foreground mb-3">Example API route:</p>
                <CodeBlock code={basicRouterCode} language="javascript" />
              </div>
            </div>
          </div>

          {/* Frontend Setup */}
          <div className="space-y-4">
            <h2 id="frontend-client-setup" className="text-2xl font-bold">4. Frontend Client Setup</h2>
            <p className="text-muted-foreground">
              Install the client package in your frontend application:
            </p>
            <CodeBlock code={clientInstallCode} language="bash" />
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Basic Usage</h3>
              <CodeBlock code={clientUsageCode} language="typescript" />
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-4">
            <h2 id="next-steps" className="text-2xl font-bold">Next Steps</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Configure Your Database</CardTitle>
                  <CardDescription>
                    Set up your database connection and push your schema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">lorm push</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Start Development</CardTitle>
                  <CardDescription>
                    Launch the development server with hot reload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">lorm dev</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Make sure to set your <code>DATABASE_URL</code> environment variable before running <code>lorm push</code>.
            </AlertDescription>
          </Alert>
        </div>
      </DocsBody>
    </DocsPage>
  );
}