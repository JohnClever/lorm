import { NextRequest, NextResponse } from 'next/server';

// Mock search data - in a real app, this would come from your content source
const searchData = [
  {
    id: '1',
    title: 'Getting Started',
    content: 'Learn how to get started with Lorm, the type-safe database ORM.',
    url: '/docs'
  },
  {
    id: '2',
    title: 'Installation',
    content: 'Install Lorm in your project using npm, yarn, or pnpm.',
    url: '/docs/installation'
  },
  {
    id: '3',
    title: 'Quick Start',
    content: 'Quick start guide to begin using Lorm in your application.',
    url: '/docs/quick-start'
  },
  {
    id: '4',
    title: 'API Reference',
    content: 'Complete API reference for all Lorm methods and utilities.',
    url: '/docs/api'
  },
  {
    id: '5',
    title: 'Examples',
    content: 'Code examples and use cases for common Lorm patterns.',
    url: '/docs/examples'
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.toLowerCase() || '';

  if (!query) {
    return NextResponse.json([]);
  }

  // Simple search implementation
  const results = searchData
    .filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query)
    )
    .map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      url: item.url
    }))
    .slice(0, 10); // Limit to 10 results

  return NextResponse.json(results);
}