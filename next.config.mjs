const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';
// Default to a serverful build so API routes like /api/register work.
// Use NEXT_EXPORT=true if a static export is explicitly required.
const shouldExport = process.env.NEXT_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const staticHeaders = [
  {
    source: '/_next/static/:buildId/_buildManifest.js',
    headers: [
      {
        key: 'Cache-Control',
        value: 'no-store',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/_next/static/:buildId/_ssgManifest.js',
    headers: [
      {
        key: 'Cache-Control',
        value: 'no-store',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/_next/static/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/images/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/fonts/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/static/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/property/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'no-store',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ],
  },
  {
    source: '/to-rent',
    headers: [
      {
        key: 'Cache-Control',
        value: 'no-store',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',

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
