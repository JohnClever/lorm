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
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Server,
  Database,
  Shield,
  CheckCircle,
  AlertTriangle,
  Globe,
  Lock,
  Monitor,
  Zap,
  Settings,
  Cloud,
  Rocket,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import {
  dockerFile,
  dockerCompose,
  vercelConfig,
  railwayConfig,
  envExample,
  productionChecklist,
  nginxConfig,
} from "@/components/code";

export default function DeploymentPage() {
  return (
    <DocsPage
      toc={[
        { title: "Deployment Overview", url: "#deployment-overview", depth: 2 },
        {
          title: "Deployment Platforms",
          url: "#deployment-platforms",
          depth: 2,
        },
        {
          title: "Environment Configuration",
          url: "#environment-configuration",
          depth: 2,
        },
        { title: "Nginx Configuration", url: "#nginx-configuration", depth: 2 },
        {
          title: "Common Deployment Issues",
          url: "#common-deployment-issues",
          depth: 2,
        },
      ]}
    >
      <DocsTitle>Deployment Guide</DocsTitle>
      <DocsDescription>
        Deploy your Lorm applications to production with confidence. Learn about
        different deployment strategies, security best practices, and
        monitoring.
      </DocsDescription>
      <DocsBody>
        <div className="space-y-8">
          {/* Overview */}
          <div className="space-y-4">
            <h2 id="deployment-overview" className="text-2xl font-bold">
              Deployment Overview
            </h2>
            <p className="text-muted-foreground">
              Lorm applications can be deployed to various platforms and
              environments. This guide covers the most common deployment
              scenarios and best practices for production deployments.
            </p>
          </div>

          {/* Deployment Options */}
          <div className="space-y-4">
            <h2 id="deployment-platforms" className="text-2xl font-bold">
              Deployment Platforms
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <Cloud className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Vercel</CardTitle>
                  <CardDescription>
                    Serverless deployment with zero configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Recommended</Badge>
                    <Badge variant="outline">Serverless</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Perfect for Next.js frontends and API routes
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Rocket className="size-8 text-purple-500 mb-2" />
                  <CardTitle>Railway</CardTitle>
                  <CardDescription>
                    Simple deployment with built-in database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Easy Setup</Badge>
                    <Badge variant="outline">Full Stack</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Great for full-stack applications with PostgreSQL
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Server className="size-8 text-green-500 mb-2" />
                  <CardTitle>Docker</CardTitle>
                  <CardDescription>
                    Containerized deployment for any platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Flexible</Badge>
                    <Badge variant="outline">Self-hosted</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Deploy anywhere with container support
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Cloud className="size-8 text-orange-500 mb-2" />
                  <CardTitle>AWS/GCP/Azure</CardTitle>
                  <CardDescription>Enterprise cloud deployment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Enterprise</Badge>
                    <Badge variant="outline">Scalable</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Full control with cloud services
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="size-8 text-teal-500 mb-2" />
                  <CardTitle>Netlify</CardTitle>
                  <CardDescription>
                    Static site deployment with edge functions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">JAMstack</Badge>
                    <Badge variant="outline">CDN</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Ideal for static frontends with API
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Server className="size-8 text-red-500 mb-2" />
                  <CardTitle>VPS/Dedicated</CardTitle>
                  <CardDescription>
                    Traditional server deployment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Traditional</Badge>
                    <Badge variant="outline">Full Control</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Complete control over infrastructure
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Environment Configuration */}
          <div className="space-y-4">
            <h2 id="environment-configuration" className="text-2xl font-bold">
              Environment Configuration
            </h2>
            <p className="text-muted-foreground">
              Proper environment configuration is crucial for production
              deployments. Here's a comprehensive example:
            </p>
            <CodeBlock code={envExample} language="bash" />

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Never commit sensitive environment variables to version control.
                Use your platform's secret management system.
              </AlertDescription>
            </Alert>
          </div>

          {/* Vercel Deployment */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Cloud className="size-6 text-blue-500" />
              Vercel Deployment
            </h2>
            <p className="text-muted-foreground">
              Deploy your Lorm application to Vercel with serverless functions.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  1. Install Vercel CLI
                </h3>
                <CodeBlock code="npm install -g vercel" language="bash" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  2. Configure vercel.json
                </h3>
                <CodeBlock code={vercelConfig} language="json" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Deploy</h3>
                <CodeBlock
                  code={`# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET`}
                  language="bash"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="size-4 text-green-500" />
                    Pros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Zero configuration</li>
                    <li>• Automatic scaling</li>
                    <li>• Global CDN</li>
                    <li>• Built-in analytics</li>
                    <li>• Preview deployments</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="size-4 text-yellow-500" />
                    Considerations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Function timeout limits</li>
                    <li>• Cold start latency</li>
                    <li>• Vendor lock-in</li>
                    <li>• Limited server customization</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Railway Deployment */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="size-6 text-purple-500" />
              Railway Deployment
            </h2>
            <p className="text-muted-foreground">
              Deploy full-stack applications with integrated PostgreSQL
              database.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  1. Install Railway CLI
                </h3>
                <CodeBlock code="npm install -g @railway/cli" language="bash" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  2. Configure railway.toml
                </h3>
                <CodeBlock code={railwayConfig} language="toml" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Deploy</h3>
                <CodeBlock
                  code={`# Login to Railway
railway login

# Initialize project
railway init

# Add PostgreSQL database
railway add postgresql

# Deploy
railway up`}
                  language="bash"
                />
              </div>
            </div>
          </div>

          {/* Docker Deployment */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Server className="size-6 text-green-500" />
              Docker Deployment
            </h2>
            <p className="text-muted-foreground">
              Containerize your application for consistent deployment across
              environments.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  1. Create Dockerfile
                </h3>
                <CodeBlock code={dockerFile} language="dockerfile" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  2. Docker Compose Setup
                </h3>
                <CodeBlock code={dockerCompose} language="yaml" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Deploy</h3>
                <CodeBlock
                  code={`# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale the application
docker-compose up -d --scale app=3`}
                  language="bash"
                />
              </div>
            </div>
          </div>

          {/* Production Checklist */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="size-6 text-green-500" />
              Production Checklist
            </h2>
            <p className="text-muted-foreground">
              Ensure your application is production-ready with this
              comprehensive checklist.
            </p>
            <CodeBlock code={productionChecklist} language="markdown" />
          </div>

          {/* Security Best Practices */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="size-6 text-red-500" />
              Security Best Practices
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Lock className="size-8 text-red-500 mb-2" />
                  <CardTitle>Authentication & Authorization</CardTitle>
                  <CardDescription>Secure your API endpoints</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Use strong JWT secrets (32+ characters)</li>
                    <li>• Implement proper RBAC</li>
                    <li>• Add rate limiting</li>
                    <li>• Validate all inputs</li>
                    <li>• Use HTTPS everywhere</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Database className="size-8 text-blue-500 mb-2" />
                  <CardTitle>Database Security</CardTitle>
                  <CardDescription>Protect your data layer</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Use connection pooling</li>
                    <li>• Enable SSL connections</li>
                    <li>• Regular security updates</li>
                    <li>• Backup encryption</li>
                    <li>• Access logging</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="size-8 text-green-500 mb-2" />
                  <CardTitle>Network Security</CardTitle>
                  <CardDescription>
                    Secure network communications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Configure CORS properly</li>
                    <li>• Use security headers</li>
                    <li>• Implement CSP</li>
                    <li>• Enable HSTS</li>
                    <li>• Regular penetration testing</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Monitor className="size-8 text-purple-500 mb-2" />
                  <CardTitle>Monitoring & Logging</CardTitle>
                  <CardDescription>Track security events</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Log authentication attempts</li>
                    <li>• Monitor API usage</li>
                    <li>• Set up alerts</li>
                    <li>• Track error rates</li>
                    <li>• Regular security audits</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Nginx Configuration */}
          <div className="space-y-4">
            <h2 id="nginx-configuration" className="text-2xl font-bold">
              Nginx Configuration
            </h2>
            <p className="text-muted-foreground">
              Production-ready Nginx configuration with SSL, compression, and
              security headers.
            </p>
            <CodeBlock code={nginxConfig} language="nginx" />
          </div>

          {/* Monitoring & Observability */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="size-6 text-purple-500" />
              Monitoring & Observability
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Error Tracking</CardTitle>
                  <CardDescription>Monitor application errors</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Sentry integration</li>
                    <li>• Error alerting</li>
                    <li>• Performance monitoring</li>
                    <li>• Release tracking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Application Metrics
                  </CardTitle>
                  <CardDescription>Track performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Response times</li>
                    <li>• Throughput</li>
                    <li>• Memory usage</li>
                    <li>• Database performance</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Infrastructure</CardTitle>
                  <CardDescription>Monitor system health</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Server resources</li>
                    <li>• Network latency</li>
                    <li>• Disk usage</li>
                    <li>• Uptime monitoring</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance Optimization */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="size-6 text-yellow-500" />
              Performance Optimization
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Database Optimization</CardTitle>
                  <CardDescription>
                    Optimize database performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Add indexes on frequently queried columns</li>
                    <li>• Use connection pooling</li>
                    <li>• Implement query caching</li>
                    <li>• Optimize slow queries</li>
                    <li>• Consider read replicas</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Application Optimization</CardTitle>
                  <CardDescription>
                    Improve application performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Enable response compression</li>
                    <li>• Implement caching strategies</li>
                    <li>• Optimize bundle sizes</li>
                    <li>• Use CDN for static assets</li>
                    <li>• Implement lazy loading</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-4">
            <h2 id="common-deployment-issues" className="text-2xl font-bold">
              Common Deployment Issues
            </h2>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Database Connection Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Verify DATABASE_URL format</li>
                    <li>• Check network connectivity</li>
                    <li>• Ensure database is running</li>
                    <li>• Verify SSL requirements</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Environment Variable Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Check variable names and values</li>
                    <li>• Verify platform-specific syntax</li>
                    <li>• Ensure secrets are properly set</li>
                    <li>• Test locally with production env</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Build/Runtime Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Check build logs for errors</li>
                    <li>• Verify Node.js version compatibility</li>
                    <li>• Ensure all dependencies are installed</li>
                    <li>• Test build process locally</li>
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
