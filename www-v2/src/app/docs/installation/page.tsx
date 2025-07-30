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
  projectScopedInstallCode,
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
      { title: '2. Initialize Your Project', url: '#initialize-project', depth: 2 },
      { title: '3. Generated Files', url: '#generated-files', depth: 2 },
      { title: '4. Mobile Client Setup', url: '#mobile-client-setup', depth: 2 },
      { title: 'Next Steps', url: '#next-steps', depth: 2 }
    ]}>
      <DocsTitle>Installation for React Native & Expo</DocsTitle>
      <DocsDescription>
        Get started with Lorm in your React Native or Expo project in minutes. This guide shows you how to add a type-safe backend to your mobile app.
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
                  <CardTitle>React Native or Expo</CardTitle>
                  <CardDescription>
                    An existing React Native or Expo project with TypeScript
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* CLI Installation */}
          <div className="space-y-4">
            <h2 id="install-cli" className="text-2xl font-bold">1. Install the CLI in Your Mobile Project</h2>
            <p className="text-muted-foreground mb-3">
              Navigate to your existing React Native or Expo project and install Lorm CLI as a development dependency. This keeps your project dependencies clean and ensures version consistency.
            </p>
            <CodeBlock code={projectScopedInstallCode} language="bash" />
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Project-Scoped Installation:</strong> Lorm CLI is designed to be installed locally in each project. This eliminates global dependency conflicts and ensures consistent behavior across different projects and team members.
              </AlertDescription>
            </Alert>
          </div>

          {/* Project Setup */}
          <div className="space-y-4">
            <h2 id="initialize-project" className="text-2xl font-bold">2. Initialize Lorm in Your Mobile Project</h2>
            <p className="text-muted-foreground">
              Run the initialization command using npx to set up Lorm in your React Native or Expo project:
            </p>
            <CodeBlock code={initCode} language="bash" />
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This command will install required dependencies (<code>@lorm/core</code>, <code>@lorm/schema</code>, <code>zod</code>) and create configuration files for your mobile backend.
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

          {/* Mobile Client Setup */}
          <div className="space-y-4">
            <h2 id="mobile-client-setup" className="text-2xl font-bold">4. Mobile Client Setup</h2>
            <p className="text-muted-foreground">
              Install the client package in your React Native or Expo application to connect to your Lorm backend:
            </p>
            <CodeBlock code={clientInstallCode} language="bash" />
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Basic Usage in React Native/Expo</h3>
              <CodeBlock code={clientUsageCode} language="typescript" />
            </div>
            
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                The <code>@lorm/client</code> provides full TypeScript support and works seamlessly with React Native and Expo projects. All API calls are automatically typed based on your backend schema.
              </AlertDescription>
            </Alert>
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
                  <Badge variant="outline">npx @lorm/cli push</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Start Development</CardTitle>
                  <CardDescription>
                    Launch the development server for your mobile app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">npx @lorm/cli dev</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Make sure to set your <code>DATABASE_URL</code> environment variable before running <code>npx @lorm/cli push</code>. Your React Native/Expo app will connect to the Lorm server running on <code>http://localhost:3000</code>.
            </AlertDescription>
          </Alert>
        </div>
      </DocsBody>
    </DocsPage>
  );
}