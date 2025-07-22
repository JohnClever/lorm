'use client';

import { useState } from 'react';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Download, 
  BookOpen, 
  Code2,
  Zap,
  Shield,
  Database,
  Smartphone,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { CodeBlock } from '@/components/code-block';
import { cn } from '@/lib/utils';
import {
  installationCodes,
  quickStartCode,
  schemaCode,
  routerCode,
  clientCode
} from '@/components/code';

export default function IntroductionPage() {
  const [activeTab, setActiveTab] = useState('npm');
  
  return (
    <DocsPage toc={[
      { title: 'Quick Start', url: '#quick-start', depth: 2 },
      { title: 'Define Your Schema', url: '#define-schema', depth: 2 },
      { title: 'Create API Endpoints', url: '#create-api-endpoints', depth: 2 },
      { title: 'Use in Your App', url: '#use-in-app', depth: 2 },
      { title: "What's Next?", url: '#whats-next', depth: 2 },
      { title: 'Join the Community', url: '#join-community', depth: 2 }
    ]}>
      <DocsTitle>Introduction to Lorm</DocsTitle>
      <DocsDescription>
        A powerful, type-safe ORM that makes database operations simple, secure, and scalable.
      </DocsDescription>
      
      <DocsBody>
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center py-8">
            <Badge variant="secondary" className="mb-4">
              <Zap className="mr-1 size-3" />
              Latest: v1.0.0
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Welcome to <span className="gradient-text">Lorm</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              The full-stack framework that brings your database, API, and frontend together with complete type safety. 
              Perfect for React Native and web applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/docs/installation">
                  <Download className="mr-2 size-4" />
                  Get Started
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/docs/quick-start">
                  <BookOpen className="mr-2 size-4" />
                  Quick Start Guide
                </Link>
              </Button>
            </div>
          </div>

          {/* Key Features */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Shield className="size-8 text-blue-500 mb-2" />
                <CardTitle>Type Safe</CardTitle>
                <CardDescription>
                  End-to-end type safety from database to frontend
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Smartphone className="size-8 text-purple-500 mb-2" />
                <CardTitle>Mobile First</CardTitle>
                <CardDescription>
                  Built for React Native with web support
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Layers className="size-8 text-orange-500 mb-2" />
                <CardTitle>Full Stack</CardTitle>
                <CardDescription>
                  Schema, API, and client in one unified system
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Quick Start */}
          <div className="space-y-4">
            <h2 id="quick-start" className="text-2xl font-bold flex items-center gap-2">
              <Code2 className="size-6" />
              Quick Start
            </h2>
            <p className="text-muted-foreground">
              Get up and running with Lorm in minutes:
            </p>
            
            {/* Installation Tabs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Installation</h3>
              <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                {Object.keys(installationCodes).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                      activeTab === tab
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <CodeBlock 
                code={installationCodes[activeTab as keyof typeof installationCodes]} 
                language="bash" 
              />
            </div>
            
            {/* Setup Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Setup</h3>
              <CodeBlock code={quickStartCode} language="bash" />
            </div>
          </div>

          {/* Schema Definition */}
          <div className="space-y-4">
            <h2 id="define-schema" className="text-2xl font-bold">1. Define Your Schema</h2>
            <p className="text-muted-foreground">
              Start by defining your database schema:
            </p>
            <CodeBlock code={schemaCode} language="typescript" />
          </div>

          {/* Router Definition */}
          <div className="space-y-4">
            <h2 id="create-api-endpoints" className="text-2xl font-bold">2. Create API Endpoints</h2>
            <p className="text-muted-foreground">
              Define your API logic with full type safety:
            </p>
            <CodeBlock code={routerCode} language="typescript" />
          </div>

          {/* Client Usage */}
          <div className="space-y-4">
            <h2 id="use-in-app" className="text-2xl font-bold">3. Use in Your App</h2>
            <p className="text-muted-foreground">
              Call your APIs with complete type safety:
            </p>
            <CodeBlock code={clientCode} language="typescript" />
          </div>

          {/* What's Next */}
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 id="whats-next" className="text-xl font-semibold mb-4">What's Next?</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 bg-background/50">
                <CardHeader>
                  <CardTitle className="text-lg">Installation</CardTitle>
                  <CardDescription>
                    Learn how to install and configure Lorm in your project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/docs/installation">
                      Read Guide
                      <ArrowRight className="ml-2 size-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-0 bg-background/50">
                <CardHeader>
                  <CardTitle className="text-lg">Schema Definition</CardTitle>
                  <CardDescription>
                    Define your database schema with type safety
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/docs/schema">
                      Learn More
                      <ArrowRight className="ml-2 size-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Community */}
          <div className="text-center py-8 border-t">
            <h2 id="join-community" className="text-2xl font-bold mb-4">Join the Community</h2>
            <p className="text-muted-foreground mb-6">
              Get help, share ideas, and contribute to the future of Lorm
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link href="https://github.com/your-org/lorm">
                  GitHub
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="https://discord.gg/lorm">
                  Discord
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="https://twitter.com/lorm_dev">
                  Twitter
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}