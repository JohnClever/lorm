import { Code, Shield, Database } from 'lucide-react';

const features = [
  {
    icon: Code,
    title: 'Zero Backend Boilerplate',
    description: 'Define your schema and routes, then get instant backend APIs with full type safety.',
  },
  {
    icon: Shield,
    title: 'End-to-End Type Safety',
    description: 'Complete TypeScript integration via Zod + oRPC from database to frontend.',
  },
  {
    icon: Database,
    title: 'Built on Drizzle ORM',
    description: 'Leverage the power of Drizzle ORM with support for PostgreSQL, MySQL, SQLite.',
  },
];

export default function FeatureHighlights() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Build
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features that scale with your application
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                  <Icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}