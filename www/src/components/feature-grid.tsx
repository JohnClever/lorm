'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Shield, 
  Zap, 
  Code2, 
  Database, 
  Layers,
  Globe,
  Rocket,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: 'Full-Stack Framework',
    description: 'Complete solution optimized for mobile development but works with any frontend - React Native, React, Svelte, Next.js, Solid.',
    highlight: 'Universal framework'
  },
  {
    icon: Smartphone,
    title: 'End-to-End Type Safety',
    description: 'Complete TypeScript integration via Zod + oRPC from database to frontend with automatic type generation.',
    highlight: 'Zero runtime type errors'
  },
  {
    icon: Globe,
    title: 'Zero Backend Boilerplate',
    description: 'No complex setup required. Just define your schema and routes - Lorm handles the rest automatically.',
    highlight: 'Instant setup'
  },
  {
    icon: Rocket,
    title: 'Built on Drizzle ORM',
    description: 'Leverage the power of Drizzle ORM with support for PostgreSQL, MySQL, SQLite, and more databases.',
    highlight: 'Database agnostic'
  },
  {
    icon: Sparkles,
    title: 'CLI-Driven Workflow',
    description: 'Fully CLI-driven development with lorm init, lorm push, and lorm dev commands for blazing fast DX.',
    highlight: 'Developer experience'
  },
  {
    icon: Database,
    title: 'Auto-Generated Client',
    description: 'Automatically generated, fully-typed HTTP client that works seamlessly with any TypeScript frontend.',
    highlight: 'Type-safe client'
  }
];

export function FeatureGrid() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Build
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features that scale with your application
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -5,
                  transition: { duration: 0.2 }
                }}
              >
                <Card className="relative overflow-hidden glass-effect hover:neon-glow transition-all duration-300 group h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <motion.div 
                        className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                        whileHover={{ 
                          scale: 1.1,
                          rotate: 5
                        }}
                      >
                        <Icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                      </motion.div>
                      <motion.div 
                        className="px-3 py-1 rounded-full glass-effect text-xs font-medium text-purple-300 border border-purple-500/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        {feature.highlight}
                      </motion.div>
                    </div>
                    <CardTitle className="text-xl font-semibold group-hover:gradient-text transition-all duration-300">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed text-muted-foreground group-hover:text-gray-300 transition-colors">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                  
                  {/* Animated background gradient */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    animate={{
                      background: [
                        "linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05), rgba(236, 72, 153, 0.05))",
                        "linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05))",
                        "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(236, 72, 153, 0.05), rgba(139, 92, 246, 0.05))"
                      ]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}