const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';
const shouldExport = process.env.NEXT_EXPORT !== 'false';

/** @type {import('next').NextConfig} */
const staticHeaders = [
  {
    source: '/_next/static/(.*)',
    headers: [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],

      },
    ],
  },
  {
    source: '/images/(.*)',
    headers: [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],

      },
    ],
  },
  {
    source: '/fonts/(.*)',
    headers: [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],

      },
    ],
  },
  {
    source: '/static/(.*)',
    headers: [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],

      },
    ],
  },
  {
    source: '/property/:path*',
    headers: [
      {
        source: '/property/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],

      },
    ],
  },
];

const nextConfig = {
  ...(shouldExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        basePath: isProd && repo ? `/${repo}` : undefined,
        assetPrefix: isProd && repo ? `/${repo}/` : undefined,
      }
    : {
        async headers() {
          return staticHeaders;
        },
      }),
};


export default nextConfig;
