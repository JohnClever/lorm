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
  Smartphone,
  Globe,
  ShoppingCart,
  MessageSquare,
  Users,
  FileText,
  Calendar,
  Star,
  Lightbulb,
  Code2,
  CheckCircle,
  Database,
  Shield,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  todoAppSchema,
  todoAppRouter,
  reactNativeTodo,
  blogSchema,
  ecommerceSchema,
  chatAppExample,
} from "@/components/code";

export default function ExamplesPage() {
  return (
    <DocsPage
      toc={[
        {
          title: "Example Applications",
          url: "#example-applications",
          depth: 2,
        },
        { title: "Todo App (React Native)", url: "#todo-app", depth: 2 },
        { title: "Schema Definition", url: "#todo-schema", depth: 3 },
        { title: "API Routes", url: "#todo-api", depth: 3 },
        { title: "React Native Frontend", url: "#todo-frontend", depth: 3 },
        { title: "Blog Platform", url: "#blog-platform", depth: 2 },
        { title: "E-commerce Store", url: "#ecommerce-store", depth: 2 },
        { title: "Real-time Chat App", url: "#chat-app", depth: 2 },
        { title: "Implementation Tips", url: "#implementation-tips", depth: 2 },
        { title: "Next Steps", url: "#next-steps", depth: 2 },
      ]}
    >
      <DocsTitle>Examples & Use Cases</DocsTitle>
      <DocsDescription>
        Explore real-world examples and complete applications built with Lorm.
        From simple todo apps to complex e-commerce platforms.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="example-applications" className="text-2xl font-bold">
              Example Applications
            </h2>
            <p className="text-muted-foreground">
              These examples demonstrate how to build complete applications
              using Lorm's full-stack capabilities. Each example includes schema
              definition, API routes, and frontend implementation.
            </p>
          </div>

          {/* Example Categories */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CheckCircle className="size-8 text-green-500 mb-2" />
                <CardTitle>Todo App</CardTitle>
                <CardDescription>
                  Simple task management with React Native
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Beginner</Badge>
                  <Badge variant="outline">CRUD</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="size-8 text-blue-500 mb-2" />
                <CardTitle>Blog Platform</CardTitle>
                <CardDescription>
                  Content management with categories and comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Intermediate</Badge>
                  <Badge variant="outline">CMS</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ShoppingCart className="size-8 text-purple-500 mb-2" />
                <CardTitle>E-commerce</CardTitle>
                <CardDescription>
                  Online store with orders and inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Advanced</Badge>
                  <Badge variant="outline">Commerce</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="size-8 text-orange-500 mb-2" />
                <CardTitle>Chat App</CardTitle>
                <CardDescription>
                  Real-time messaging with rooms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Advanced</Badge>
                  <Badge variant="outline">Real-time</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="size-8 text-red-500 mb-2" />
                <CardTitle>Social Network</CardTitle>
                <CardDescription>
                  User profiles, posts, and social features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Advanced</Badge>
                  <Badge variant="outline">Social</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="size-8 text-teal-500 mb-2" />
                <CardTitle>Event Manager</CardTitle>
                <CardDescription>
                  Event planning with bookings and schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Intermediate</Badge>
                  <Badge variant="outline">Events</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Todo App Example */}
          <div className="space-y-4">
            <h2
              id="todo-app"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <CheckCircle className="size-6 text-green-500" />
              Todo App - Complete Implementation
            </h2>
            <p className="text-muted-foreground">
              A complete todo application demonstrating basic CRUD operations,
              perfect for getting started with Lorm.
            </p>

            <div className="space-y-6">
              <div>
                <h3 id="todo-schema" className="text-lg font-semibold mb-2">
                  1. Schema Definition
                </h3>
                <CodeBlock code={todoAppSchema} language="javascript" />
              </div>

              <div>
                <h3 id="todo-api" className="text-lg font-semibold mb-2">
                  2. API Routes
                </h3>
                <CodeBlock code={todoAppRouter} language="javascript" />
              </div>

              <div>
                <h3 id="todo-frontend" className="text-lg font-semibold mb-2">
                  3. React Native Frontend
                </h3>
                <CodeBlock code={reactNativeTodo} language="typescript" />
              </div>
            </div>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                This example shows the complete flow from database schema to
                mobile app UI, demonstrating Lorm's end-to-end type safety.
              </AlertDescription>
            </Alert>
          </div>

          {/* Blog Platform Schema */}
          <div className="space-y-4">
            <h2
              id="blog-platform"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <FileText className="size-6 text-blue-500" />
              Blog Platform
            </h2>
            <p className="text-muted-foreground">
              A more complex example showing relationships, enums, and content
              management patterns.
            </p>
            <CodeBlock code={blogSchema} language="javascript" />

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Features</CardTitle>
                  <CardDescription>
                    Advanced schema patterns demonstrated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• User roles with enums</li>
                    <li>• Post status workflow</li>
                    <li>• Category organization</li>
                    <li>• Nested comments</li>
                    <li>• SEO-friendly slugs</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Use Cases</CardTitle>
                  <CardDescription>
                    Perfect for content-driven applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Company blogs</li>
                    <li>• News websites</li>
                    <li>• Documentation sites</li>
                    <li>• Personal portfolios</li>
                    <li>• Community forums</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* E-commerce Schema */}
          <div className="space-y-4">
            <h2
              id="ecommerce-store"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <ShoppingCart className="size-6 text-purple-500" />
              E-commerce Store
            </h2>
            <p className="text-muted-foreground">
              Enterprise-level e-commerce schema with products, orders, and
              inventory management.
            </p>
            <CodeBlock code={ecommerceSchema} language="javascript" />

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Product Management
                  </CardTitle>
                  <CardDescription>
                    Comprehensive product catalog
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• SKU tracking</li>
                    <li>• Inventory management</li>
                    <li>• Category hierarchy</li>
                    <li>• Pricing & discounts</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Processing</CardTitle>
                  <CardDescription>Complete order lifecycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Order status tracking</li>
                    <li>• Line item details</li>
                    <li>• Tax calculation</li>
                    <li>• Shipping integration</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Management</CardTitle>
                  <CardDescription>Customer data & addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Multiple addresses</li>
                    <li>• Order history</li>
                    <li>• Customer profiles</li>
                    <li>• Contact information</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chat App Example */}
          <div className="space-y-4">
            <h2
              id="chat-app"
              className="text-2xl font-bold flex items-center gap-2"
            >
              <MessageSquare className="size-6 text-green-500" />
              Real-time Chat App
            </h2>
            <p className="text-muted-foreground">
              Building real-time features with Lorm, including chat rooms and
              messaging.
            </p>
            <CodeBlock code={chatAppExample} language="javascript" />

            <Alert>
              <Code2 className="h-4 w-4" />
              <AlertDescription>
                For real-time features, combine Lorm with WebSocket libraries
                like Socket.io or use Server-Sent Events for live updates.
              </AlertDescription>
            </Alert>
          </div>

          {/* Implementation Tips */}
          <div className="space-y-4">
            <h2 id="implementation-tips" className="text-2xl font-bold">
              Implementation Tips
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Smartphone className="size-8 text-purple-500 mb-2" />
                  <CardTitle>Mobile-First Design</CardTitle>
                  <CardDescription>
                    Best practices for React Native apps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Optimize for offline usage</li>
                    <li>• Implement proper loading states</li>
                    <li>• Use efficient list rendering</li>
                    <li>• Handle network errors gracefully</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Database className="size-8 text-green-500 mb-2" />
                  <CardTitle>Database Optimization</CardTitle>
                  <CardDescription>
                    Performance tips for production
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Add indexes on query columns</li>
                    <li>• Use pagination for large datasets</li>
                    <li>• Implement proper foreign keys</li>
                    <li>• Consider read replicas</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="size-8 text-red-500 mb-2" />
                  <CardTitle>Security Considerations</CardTitle>
                  <CardDescription>
                    Protect your application and data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Validate all inputs with Zod</li>
                    <li>• Implement authentication</li>
                    <li>• Use HTTPS in production</li>
                    <li>• Sanitize user content</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Star className="size-8 text-yellow-500 mb-2" />
                  <CardTitle>User Experience</CardTitle>
                  <CardDescription>
                    Create delightful user interfaces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Provide immediate feedback</li>
                    <li>• Implement optimistic updates</li>
                    <li>• Use skeleton screens</li>
                    <li>• Handle edge cases</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-4">
            <h2 id="next-steps" className="text-2xl font-bold">
              Next Steps
            </h2>
            <p className="text-muted-foreground mb-4">
              Ready to build your own application? Here's how to get started:
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Start Simple</CardTitle>
                  <CardDescription>
                    Begin with the todo app example and gradually add features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">Recommended for beginners</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Choose Your Stack</CardTitle>
                  <CardDescription>
                    Pick the frontend framework that best fits your needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">React Native</Badge>
                    <Badge variant="secondary">Next.js</Badge>
                    <Badge variant="secondary">Svelte</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DocsBody>
    </DocsPage>
  );
}
