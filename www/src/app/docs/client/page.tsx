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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Smartphone,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Globe,
  Code,
  Database,
  Layers,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import {
  clientInstallCode,
  clientUsageCode,
  typedClientCode,
  reactNativeCode,
  reactCode,
  svelteCode,
  errorHandlingCode,
  configCode,
  troubleshootingCode,
} from "@/components/code";

export default function ClientPage() {
  return (
    <DocsPage
      toc={[
        { title: "Overview", url: "#overview", depth: 2 },
        { title: "Key Features", url: "#key-features", depth: 2 },
        { title: "Installation", url: "#installation", depth: 2 },
        { title: "Basic Usage", url: "#basic-usage", depth: 2 },
        {
          title: "Type Safety in Action",
          url: "#type-safety-in-action",
          depth: 2,
        },
        { title: "Framework Examples", url: "#framework-examples", depth: 2 },
        { title: "Error Handling", url: "#error-handling", depth: 2 },
        {
          title: "Advanced Configuration",
          url: "#advanced-configuration",
          depth: 2,
        },
        { title: "Troubleshooting", url: "#troubleshooting", depth: 2 },
        { title: "Best Practices", url: "#best-practices", depth: 2 },
        {
          title: "Framework Compatibility",
          url: "#framework-compatibility",
          depth: 2,
        },
      ]}
    >
      <DocsTitle>Client Reference</DocsTitle>
      <DocsDescription>
        Complete guide to the @lorm/client package. Build type-safe frontends
        that connect seamlessly to your Lorm backend.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="overview" className="text-2xl font-bold">
              Overview
            </h2>
            <p className="text-muted-foreground">
              The <code>@lorm/client</code> package provides an auto-typed HTTP
              client for consuming routes from your Lorm backend. It eliminates
              the need for manual typing and REST boilerplate, giving you full
              type safety from backend to frontend.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h2 id="key-features" className="text-2xl font-bold">
              Key Features
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Shield className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Full Type Safety</CardTitle>
                  <CardDescription>
                    Auto-generated types from your backend routes with complete
                    input/output validation
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Smartphone className="size-8 text-purple-500 mb-2" />
                  <CardTitle>Universal Framework Support</CardTitle>
                  <CardDescription>
                    Works with React Native, React, Svelte, Vue, and any
                    TypeScript frontend
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Zap className="size-8 text-yellow-500 mb-2" />
                  <CardTitle>Zero Configuration</CardTitle>
                  <CardDescription>
                    No manual setup required - types are generated automatically
                    from your router
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Code className="size-8 text-green-500 mb-2" />
                  <CardTitle>Developer Experience</CardTitle>
                  <CardDescription>
                    Full autocomplete, IntelliSense, and compile-time error
                    checking
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Installation */}
          <div className="space-y-4">
            <h2 id="installation" className="text-2xl font-bold">
              Installation
            </h2>
            <CodeBlock code={clientInstallCode} language="bash" />
          </div>

          {/* Basic Usage */}
          <div className="space-y-4">
            <h2 id="basic-usage" className="text-2xl font-bold">
              Basic Usage
            </h2>
            <p className="text-muted-foreground">
              Import the client and start making type-safe API calls:
            </p>
            <CodeBlock code={clientUsageCode} language="typescript" />
          </div>

          {/* Type Safety */}
          <div className="space-y-4">
            <h2 id="type-safety-in-action" className="text-2xl font-bold">
              Type Safety in Action
            </h2>
            <p className="text-muted-foreground">
              The client automatically infers types from your backend routes,
              providing full autocomplete and validation:
            </p>
            <CodeBlock code={typedClientCode} language="typescript" />

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Types are generated automatically when you run{" "}
                <code>lorm dev</code>. They live in{" "}
                <code>.lorm/types.d.ts</code>.
              </AlertDescription>
            </Alert>
          </div>

          {/* Framework Examples */}
          <div className="space-y-4">
            <h2 id="framework-examples" className="text-2xl font-bold">
              Framework Examples
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Smartphone className="size-5" />
                  React Native
                </h3>
                <p className="text-muted-foreground mb-3">
                  Perfect for mobile applications with full type safety:
                </p>
                <CodeBlock code={reactNativeCode} language="typescript" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Globe className="size-5" />
                  React / Next.js
                </h3>
                <p className="text-muted-foreground mb-3">
                  Seamless integration with React applications:
                </p>
                <CodeBlock code={reactCode} language="typescript" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Layers className="size-5" />
                  Svelte / SvelteKit
                </h3>
                <p className="text-muted-foreground mb-3">
                  Clean and reactive with Svelte:
                </p>
                <CodeBlock code={svelteCode} language="svelte" />
              </div>
            </div>
          </div>

          {/* Error Handling */}
          <div className="space-y-4">
            <h2 id="error-handling" className="text-2xl font-bold">
              Error Handling
            </h2>
            <p className="text-muted-foreground">
              The client provides structured error handling with HTTP status
              codes:
            </p>
            <CodeBlock code={errorHandlingCode} language="typescript" />
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <h2 id="advanced-configuration" className="text-2xl font-bold">
              Advanced Configuration
            </h2>
            <p className="text-muted-foreground">
              Customize the client behavior for production use:
            </p>
            <CodeBlock code={configCode} language="typescript" />
          </div>

          {/* Troubleshooting */}
          <div className="space-y-4">
            <h2 id="troubleshooting" className="text-2xl font-bold">
              Troubleshooting
            </h2>

            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>"Cannot read property query of undefined"</strong>
                  <br />
                  Check if the route name matches exactly and ensure{" "}
                  <code>.lorm/types.d.ts</code> exists.
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>"Types not found"</strong>
                  <br />
                  Run <code>lorm dev</code> to regenerate types and check your
                  TypeScript config paths.
                </AlertDescription>
              </Alert>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Common Solutions</h3>
              <CodeBlock code={troubleshootingCode} language="typescript" />
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
                  <CardTitle className="text-base">Type Generation</CardTitle>
                  <CardDescription>
                    Always run <code>lorm dev</code> when you change your router
                    to regenerate types
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Error Boundaries</CardTitle>
                  <CardDescription>
                    Implement proper error handling for network failures and
                    validation errors
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Loading States</CardTitle>
                  <CardDescription>
                    Always handle loading states for better user experience
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Environment URLs</CardTitle>
                  <CardDescription>
                    Use environment variables for different API endpoints
                    (dev/staging/prod)
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Framework Compatibility */}
          <div className="space-y-4">
            <h2 id="framework-compatibility" className="text-2xl font-bold">
              Framework Compatibility
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>Mobile</CardTitle>
                  <CardDescription>
                    React Native, Expo, NativeScript
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>React Ecosystem</CardTitle>
                  <CardDescription>
                    React, Next.js, Remix, Gatsby
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-green-500 mb-2" />
                  <CardTitle>Other Frameworks</CardTitle>
                  <CardDescription>
                    Svelte, Vue, Angular, Solid.js
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
