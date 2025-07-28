import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import type { PageTree } from 'fumadocs-core/server';

// Documentation structure organized into Framework, CLI, and Core sections
const pageTree: PageTree.Root = {
  name: 'Lorm Documentation',
  children: [
    {
      type: 'page' as const,
      name: 'Introduction',
      url: '/docs'
    },
    {
      type: 'page' as const,
      name: 'Installation',
      url: '/docs/installation'
    },
    // {
    //   type: 'separator' as const
    // },
    {
      type: 'folder' as const,
      name: 'Framework',
      children: [
        {
          type: 'page' as const,
          name: 'Schema Definition',
          url: '/docs/schema'
        },
        {
          type: 'page' as const,
          name: 'Router System',
          url: '/docs/router'
        },
        {
          type: 'page' as const,
          name: 'Client Usage',
          url: '/docs/client'
        },
        {
          type: 'page' as const,
          name: 'Examples & Use Cases',
          url: '/docs/examples'
        },
        {
          type: 'page' as const,
          name: 'Deployment Guide',
          url: '/docs/deployment'
        },
        {
          type: 'page' as const,
          name: 'API Reference',
          url: '/docs/api-reference'
        }
      ]
    },
    {
      type: 'folder' as const,
      name: 'CLI',
      children: [
        {
          type: 'page' as const,
          name: 'CLI Reference',
          url: '/docs/cli'
        }
      ]
    },
    {
      type: 'folder' as const,
      name: 'Core',
      children: [
        {
          type: 'page' as const,
          name: 'Overview',
          url: '/docs/core'
        }
      ]
    }
  ]
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}