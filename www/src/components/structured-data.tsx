'use client';

import { usePathname } from 'next/navigation';

interface StructuredDataProps {
  type?: 'website' | 'article' | 'documentation' | 'software';
  title?: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
}

export function StructuredData({
  type = 'website',
  title,
  description,
  datePublished,
  dateModified
}: StructuredDataProps) {
  const pathname = usePathname();
  const url = `https://lorm.dev${pathname}`;

  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type === 'website' ? 'WebSite' : type === 'article' ? 'Article' : type === 'documentation' ? 'TechArticle' : 'SoftwareApplication',
    name: title || 'Lorm - Type-Safe Database ORM',
    description: description || 'A powerful, type-safe ORM that makes database operations simple, secure, and scalable. Built for developers who value both productivity and performance.',
    url,
    publisher: {
      '@type': 'Organization',
      name: 'Lorm',
      url: 'https://lorm.dev',
      logo: {
        '@type': 'ImageObject',
        url: 'https://lorm.dev/logo.png',
        width: 512,
        height: 512
      }
    },
    author: {
      '@type': 'Organization',
      name: 'Lorm Team',
      url: 'https://lorm.dev'
    }
  };

  let structuredData = { ...baseStructuredData };

  if (type === 'software') {
    structuredData = {
      ...structuredData,
      '@type': 'SoftwareApplication',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
      programmingLanguage: 'TypeScript',
      softwareVersion: '1.0.0',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      downloadUrl: 'https://www.npmjs.com/package/@lorm/cli',
      softwareHelp: {
        '@type': 'CreativeWork',
        url: 'https://lorm.dev/docs'
      },
      featureList: [
        'Type-safe database operations',
        'Automatic schema generation',
        'Migration management',
        'Multi-database support',
        'TypeScript integration',
        'Developer-friendly CLI'
      ]
    } as any;
  }

  if (type === 'article' || type === 'documentation') {
    structuredData = {
      ...structuredData,
      headline: title,
      datePublished: datePublished || new Date().toISOString(),
      dateModified: dateModified || new Date().toISOString(),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url
      },
      image: {
        '@type': 'ImageObject',
        url: 'https://lorm.dev/og-image.png',
        width: 1200,
        height: 630
      }
    } as any;
  }

  if (type === 'website') {
    structuredData = {
      ...structuredData,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://lorm.dev/docs?search={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      },
      sameAs: [
        'https://github.com/lormjs/lorm',
        'https://www.npmjs.com/package/@lorm/cli',
        'https://twitter.com/lormdev'
      ]
    } as any;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2)
      }}
    />
  );
}

// Organization structured data for the main site
export function OrganizationStructuredData() {
  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lorm',
    url: 'https://lorm.dev',
    logo: {
      '@type': 'ImageObject',
      url: 'https://lorm.dev/logo.png',
      width: 512,
      height: 512
    },
    description: 'Creators of Lorm, a powerful type-safe database ORM for modern applications.',
    foundingDate: '2024',
    sameAs: [
      'https://github.com/lormjs/lorm',
      'https://www.npmjs.com/package/@lorm/cli',
      'https://twitter.com/lormdev'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://github.com/lormjs/lorm/issues'
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organizationData, null, 2)
      }}
    />
  );
}

// FAQ structured data for documentation pages
export function FAQStructuredData() {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Lorm?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lorm is a powerful, type-safe ORM (Object-Relational Mapping) tool that makes database operations simple, secure, and scalable. It provides full TypeScript support and works with PostgreSQL, MySQL, and SQLite databases.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I install Lorm?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can install Lorm using npm: "npm install -g @lorm/cli" for the CLI tool, and "npm install @lorm/client" for the client library. Then run "lorm init" to initialize your project.'
        }
      },
      {
        '@type': 'Question',
        name: 'What databases does Lorm support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lorm supports PostgreSQL, MySQL, and SQLite databases. It provides a unified API that works across all supported database systems while maintaining type safety.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is Lorm free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Lorm is completely free and open-source. You can use it in both personal and commercial projects without any licensing fees.'
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqData, null, 2)
      }}
    />
  );
}