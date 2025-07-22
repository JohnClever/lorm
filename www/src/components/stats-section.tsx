'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { motion } from 'framer-motion';
import { 
  Download, 
  Star, 
  Users, 
  Smartphone,
  Code2,
  Globe
} from 'lucide-react';

const stats = [
  {
    icon: Code2,
    label: 'Apps Built',
    value: 2500,
    suffix: '+',
    color: 'text-purple-400'
  },
  {
    icon: Globe,
    label: 'GitHub Stars',
    value: 12000,
    suffix: '+',
    color: 'text-blue-400'
  },
  {
    icon: Smartphone,
    label: 'Supported Databases',
    value: 4,
    suffix: '+',
    color: 'text-green-400'
  },
  {
    icon: Code2,
    label: 'Frontend Frameworks',
    value: 5,
    suffix: '+',
    color: 'text-pink-400'
  }
];

function AnimatedNumber({ 
  value, 
  isPercentage = false 
}: { 
  value: number; 
  isPercentage?: boolean; 
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setDisplayValue(0);
    
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  // Show final value on server, animate on client
  const valueToShow = isClient ? displayValue : value;

  if (isPercentage) {
    return <span>{valueToShow.toFixed(1)}</span>;
  }

  return <span>{formatNumber(valueToShow)}</span>;
}

export function StatsSection() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="py-24 px-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
            Trusted by Developers Worldwide
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of developers building type-safe, full-stack applications with zero backend boilerplate
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                <Card className="text-center p-6 glass-effect hover:neon-glow transition-all duration-300 group">
                  <CardContent className="p-0">
                    <div className="flex flex-col items-center space-y-4">
                      <motion.div 
                        className={`p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-all duration-300`}
                        whileHover={{ 
                          scale: 1.1,
                          rotate: 5
                        }}
                      >
                        <Icon className={`w-8 h-8 ${stat.color} group-hover:scale-110 transition-transform`} />
                      </motion.div>
                      <div>
                        <motion.div 
                          className="text-3xl md:text-4xl font-bold mb-1"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <AnimatedNumber value={stat.value} />
                          <span className={stat.color}>{stat.suffix}</span>
                        </motion.div>
                        <div className="text-sm text-muted-foreground group-hover:text-gray-300 transition-colors">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}