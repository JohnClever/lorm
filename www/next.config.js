/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['fumadocs-ui', 'lucide-react'],
    scrollRestoration: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'github.com'
      }
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        }
      ]
    },
    {
      source: '/sitemap.xml',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=86400, stale-while-revalidate=43200'
        }
      ]
    },
    {
      source: '/robots.txt',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=86400, stale-while-revalidate=43200'
        }
      ]
    },
    {
      source: '/:path*\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable'
        }
      ]
    }
  ],
  redirects: async () => [
    {
      source: '/documentation',
      destination: '/docs',
      permanent: true
    },
    {
      source: '/guide',
      destination: '/docs',
      permanent: true
    }
  ]
};

export default nextConfig;