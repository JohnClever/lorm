import './globals.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

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
  metadataBase: new URL('https://lorm.dev'),
  openGraph: {
    title: 'Lorm - Type-Safe Database ORM',
    description: 'A powerful, type-safe ORM that makes database operations simple, secure, and scalable.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Lorm'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lorm - Type-Safe Database ORM',
    description: 'A powerful, type-safe ORM that makes database operations simple, secure, and scalable.'
  }
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}