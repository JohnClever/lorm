import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Construction, 
  Clock, 
  Zap,
  Database,
  Layers
} from 'lucide-react';

export default function CorePage() {
  return (
    <DocsPage toc={[
      { title: 'Overview', url: '#overview', depth: 2 },
      { title: 'What\'s Coming', url: '#whats-coming', depth: 2 },
      { title: 'Timeline', url: '#timeline', depth: 2 }
    ]}>
      <DocsTitle>Lorm Core</DocsTitle>
      <DocsDescription>
        The headless library powering LORM's type-safe database operations.
      </DocsDescription>
      
      <DocsBody>
        <div className="flex items-center gap-2 mb-6">
          <Construction className="size-5 text-orange-500" />
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Coming Soon
          </Badge>
        </div>

        <Alert className="mb-8">
          <Clock className="size-4" />
          <AlertDescription>
            LORM Core documentation is currently under development. This section will contain comprehensive guides for the headless library that powers LORM's type-safe database operations.
          </AlertDescription>
        </Alert>

        <section id="overview">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-muted-foreground mb-6">
            LORM Core is the foundational library that provides the core functionality for type-safe database operations, 
            schema validation, and query building. It's designed to be framework-agnostic and can be used in any JavaScript/TypeScript environment.
          </p>
        </section>

        <section id="whats-coming" className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">What's Coming</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="size-5 text-blue-500" />
                  Core APIs
                </CardTitle>
                <CardDescription>
                  Comprehensive documentation for LORM's core database operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li> Query builder APIs</li>
                  <li> Schema validation</li>
                  <li> Type inference</li>
                  <li> Connection management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-5 text-green-500" />
                  Advanced Features
                </CardTitle>
                <CardDescription>
                  Deep dive into LORM's advanced capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li> Custom adapters</li>
                  <li> Plugin system</li>
                  <li> Performance optimization</li>
                  <li> Migration tools</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5 text-purple-500" />
                  Integration Guides
                </CardTitle>
                <CardDescription>
                  How to integrate LORM Core with different frameworks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li> Node.js integration</li>
                  <li> Edge runtime support</li>
                  <li> Custom environments</li>
                  <li> Testing strategies</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Construction className="size-5 text-orange-500" />
                  API Reference
                </CardTitle>
                <CardDescription>
                  Complete API documentation for all core functions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li> Function signatures</li>
                  <li> Type definitions</li>
                  <li> Usage examples</li>
                  <li> Best practices</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="timeline" className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Timeline</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="size-3 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Phase 1: Core APIs</h3>
                <p className="text-sm text-muted-foreground">Documentation for basic database operations and query building</p>
                <Badge variant="outline" className="mt-2 text-xs">Q2 2025</Badge>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="size-3 bg-gray-300 rounded-full mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Phase 2: Advanced Features</h3>
                <p className="text-sm text-muted-foreground">Plugin system, custom adapters, and performance guides</p>
                <Badge variant="outline" className="mt-2 text-xs">Q3 2025</Badge>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="size-3 bg-gray-300 rounded-full mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Phase 3: Complete Reference</h3>
                <p className="text-sm text-muted-foreground">Full API reference and integration examples</p>
                <Badge variant="outline" className="mt-2 text-xs">Q1 2026</Badge>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Stay Updated</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Want to be notified when LORM Core documentation is available? Follow our progress on GitHub or join our community.
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary">GitHub</Badge>
            <Badge variant="secondary">Discord</Badge>
            <Badge variant="secondary">Newsletter</Badge>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}