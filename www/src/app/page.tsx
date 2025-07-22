"use client";

import { HomeLayout } from "fumadocs-ui/home-layout";
import { baseOptions } from "./layout.config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Smartphone,
  Shield,
  Zap,
  Code2,
  Database,
  Layers,
  CheckCircle,
  Star,
  Users,
  Download,
  Sparkles,
  Rocket,
  Globe,
  Terminal,
  GitBranch,
  Play,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CodeBlock } from "@/components/code-block";
import { FeatureGrid } from "@/components/feature-grid";
import { StatsSection } from "@/components/stats-section";

import { exampleCode } from "@/components/code";

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions}>
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-4 md:px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />

          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <Badge
                  variant="outline"
                  className="mb-8 border-slate-700 bg-slate-800/50 text-slate-300 px-4 py-2 text-sm font-medium"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Ewe - Lorm
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold mb-4 sm:mb-6 tracking-tight"
              >
                <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Ship faster with
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  type-safe APIs
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-400 mb-6 sm:mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed font-medium px-4"
              >
                Full-stack framework that generates type-safe APIs from your
                database schema.
                <br className="hidden sm:block" />
                Zero backend boilerplate. Works with any React Native and any
                frontend.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 md:mb-16 px-4"
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  className="bg-gradient-to-r from-white to-slate-100 text-black hover:from-slate-100 hover:to-slate-200 text-sm px-4 sm:px-6 py-2.5 sm:py-3 h-auto font-semibold shadow-md hover:shadow-lg transition-all duration-200 border-0 w-full sm:w-auto"
                  asChild
                >
                  <Link href="/docs">
                    <Play className="mr-2 w-4 h-4" />
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  variant="outline"
                  className="border-slate-600 bg-slate-800/80 hover:bg-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-sm px-4 sm:px-6 py-2.5 sm:py-3 h-auto font-semibold shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm w-full sm:w-auto"
                  asChild
                >
                  <Link
                    href="https://github.com/JohnClever/lorm"
                    className="group"
                  >
                    <GitBranch className="mr-2 w-4 h-4" />
                    View on GitHub
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Terminal Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="max-w-4xl mx-auto px-4"
            >
              <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-2xl">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <div className="w-2 sm:w-2.5 md:w-3 h-2 sm:h-2.5 md:h-3 bg-red-500 rounded-full"></div>
                  <div className="w-2 sm:w-2.5 md:w-3 h-2 sm:h-2.5 md:h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-2 sm:w-2.5 md:w-3 h-2 sm:h-2.5 md:h-3 bg-green-500 rounded-full"></div>
                  <span className="ml-2 sm:ml-4 text-slate-400 text-xs sm:text-sm font-mono">
                    terminal
                  </span>
                </div>
                <div className="font-mono text-xs sm:text-sm space-y-1.5 sm:space-y-2 overflow-x-auto">
                  <div className="text-slate-400 whitespace-nowrap">
                    $ npx lorm init
                  </div>
                  <div className="text-green-400">
                    ✓ Initialize project structure in your app
                  </div>
                  <div className="text-slate-400">$npx lorm push</div>
                  <div className="text-green-400">
                    ✓ Push schema to your database
                  </div>
                  <div className="text-slate-400">$ npx lorm dev</div>
                  <div className="text-blue-400 whitespace-nowrap">
                    🚀 Server running at http://localhost:3000
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Subtle background elements */}
          <div className="absolute top-1/4 left-1/4 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-purple-500/5 rounded-full blur-3xl" />
        </section>

        {/* Code Example Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="py-16 sm:py-20 md:py-32 px-4 md:px-6 relative"
        >
          <div className="w-96 md:max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 tracking-tight">
                  <span className="text-white">Zero backend</span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    boilerplate
                  </span>
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-slate-400 mb-6 sm:mb-8 md:mb-10 leading-relaxed">
                  Define your schema and routes, then get instant backend APIs
                  with full type safety. Works with any frontend framework.
                </p>

                <div className="space-y-4 sm:space-y-6">
                  {[
                    {
                      icon: Database,
                      text: "Built on Drizzle ORM",
                      color: "text-blue-400",
                    },
                    {
                      icon: Shield,
                      text: "End-to-end type safety",
                      color: "text-purple-400",
                    },
                    {
                      icon: Globe,
                      text: "Any frontend framework",
                      color: "text-green-400",
                    },
                    {
                      icon: Terminal,
                      text: "CLI-driven workflow",
                      color: "text-orange-400",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4 group"
                    >
                      <div
                        className={`w-5 h-5 ${item.color} transition-transform group-hover:scale-110`}
                      >
                        <item.icon className="w-full h-full" />
                      </div>
                      <span className="text-sm sm:text-base text-slate-300 group-hover:text-white transition-colors font-medium">
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-1 shadow-2xl">
                  <CodeBlock code={exampleCode} language="typescript" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Interactive Editor Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="py-16 sm:py-20 md:py-32 px-4 md:px-6 bg-slate-900/30"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16 md:mb-20"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 tracking-tight">
                <span className="text-white">Try Lorm in </span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  your browser
                </span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
                Experience the power of Lorm with this interactive example.
                <br className="hidden sm:block" />
                No installation required.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative max-w-6xl mx-auto"
            >
              <div className="relative rounded-lg sm:rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm shadow-2xl">
                {/* <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800/80 border-b border-slate-700/50">
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-red-500"></div>
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-green-500"></div>
                  </div>
                </div> */}
                <iframe
                  src="https://stackblitz.com/github/trpc/trpc/tree/main/examples/next-minimal-starter?embed=1&file=src%2Fpages%2Findex.tsx&file=src%2Fpages%2Fapi%2Ftrpc%2F%5Btrpc%5D.ts&hideNavigation=1&terminalHeight=1&showSidebar=0&view=editor"
                  className="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] border-0"
                  title="Lorm Interactive Example"
                  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                ></iframe>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="py-16 sm:py-20 md:py-32 px-4 md:px-6"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16 md:mb-20"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">
                <span className="text-white">Built for </span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  developers
                </span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
                Everything you need to build type-safe, full-stack applications.
                <br className="hidden md:block" />
                Zero configuration required.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <FeatureGrid />
            </motion.div>
          </div>
        </motion.section>

        {/* Stats Section */}
        <StatsSection />

        {/* Why Choose Lorm */}
        <section className="px-4 md:px-6 py-16 sm:py-20 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
                <span className="text-white">Why choose </span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Lorm
                </span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto px-4">
                Built by developers, for developers. Everything you need in one
                framework.
              </p>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Type Safety First",
                  description:
                    "Catch errors at compile time, not runtime. Full TypeScript integration with auto-generated types.",
                },
                {
                  icon: Zap,
                  title: "Lightning Fast",
                  description:
                    "Optimized queries, connection pooling, and smart caching. Built for performance at scale.",
                },
                {
                  icon: Code2,
                  title: "Developer Experience",
                  description:
                    "Intuitive API, excellent tooling, and comprehensive documentation. Get productive immediately.",
                },
                {
                  icon: Database,
                  title: "Multi-Database",
                  description:
                    "PostgreSQL, MySQL, SQLite support. Switch databases without changing your code.",
                },
                {
                  icon: Smartphone,
                  title: "Mobile Optimized",
                  description:
                    "Built specifically for React Native and Expo. Offline-first with automatic sync capabilities.",
                },
                {
                  icon: Globe,
                  title: "Cross Platform",
                  description:
                    "One codebase for iOS, Android, and web. Share logic across all your applications seamlessly.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-slate-700 bg-slate-900/50 backdrop-blur hover:bg-slate-800/50 transition-colors h-full">
                    <CardHeader className="pb-3 sm:pb-4">
                      <feature.icon className="size-6 sm:size-8 text-blue-400 mb-2 sm:mb-3" />
                      <CardTitle className="text-lg sm:text-xl text-white font-semibold">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm sm:text-base text-slate-400 leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 md:px-6 py-16 sm:py-20 md:py-32 bg-slate-900/30">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
                <span className="text-white">Ready to </span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  ship faster
                </span>
                <span className="text-white">?</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-400 mb-6 sm:mb-8 md:mb-12 max-w-2xl mx-auto px-4">
                Join thousands of developers building type-safe applications
                with Lorm
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    className="bg-gradient-to-r from-white to-slate-100 text-black hover:from-slate-100 hover:to-slate-200 text-sm px-4 sm:px-6 py-2.5 sm:py-3 h-auto font-semibold shadow-md hover:shadow-lg transition-all duration-200 border-0 w-full sm:w-auto group"
                    asChild
                  >
                    <Link href="/docs/getting-started">
                      <Rocket className="mr-2 size-4 transition-transform group-hover:scale-110" />
                      Get Started Now
                    </Link>
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    variant="outline"
                    className="border-slate-600 bg-slate-800/80 hover:bg-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-sm px-4 sm:px-6 py-2.5 sm:py-3 h-auto font-semibold shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm w-full sm:w-auto group"
                    asChild
                  >
                    <Link href="/docs">
                      <Code2 className="mr-2 size-4 transition-transform group-hover:scale-110" />
                      Read Documentation
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </HomeLayout>
  );
}
