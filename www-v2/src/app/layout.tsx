import './globals.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { OrganizationStructuredData, StructuredData } from '@/components/structured-data';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans'
});

export const metadata = {
  title: {
    template: '%s | Lorm',
    default: 'Lorm - Type-Safe Database ORM for Modern Applications'
  },
  description: 'A powerful, type-safe ORM that makes database operations simple, secure, and scalable. Built for developers who value both productivity and performance.',
  keywords: [
    'ORM',
    'TypeScript',
    'Database',
    'Type-Safe',
    'PostgreSQL',
    'MySQL',
    'SQLite',
    'Drizzle',
    'Prisma Alternative',
    'Node.js',
    'React',
    'Next.js',
    'Database Migration',
    'Schema Management',
    'SQL Query Builder',
    'Developer Tools',
    'Backend Development',
    'Full-Stack',
    'API Development',
    'Database ORM'
  ],
  authors: [{ name: 'Lorm Team' }],
  creator: 'Lorm Team',
  publisher: 'Lorm',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://lorm.dev'),
  alternates: {
    canonical: 'https://lorm.dev',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Lorm - Type-Safe Database ORM',
    description: 'A powerful, type-safe ORM that makes database operations simple, secure, and scalable. Built for developers who value both productivity and performance.',
    url: 'https://lorm.dev',
    siteName: 'Lorm',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lorm - Type-Safe Database ORM',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lorm - Type-Safe Database ORM',
    description: 'A powerful, type-safe ORM that makes database operations simple, secure, and scalable. Built for developers who value both productivity and performance.',
    images: ['/og-image.png'],
    creator: '@lormdev',
    site: '@lormdev',
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'technology',
  classification: 'Database ORM, Developer Tools',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lorm" />
        <meta name="application-name" content="Lorm" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <OrganizationStructuredData />
        <StructuredData type="software" />
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}