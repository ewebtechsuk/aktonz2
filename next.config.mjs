const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';
// Default to a serverful build so API routes like /api/register work.
// Use NEXT_EXPORT=true if a static export is explicitly required.
const requestedStaticExport = process.env.NEXT_EXPORT === 'true';

const serverRuntimeOnlyRoutes = ['/integrations/3cx/contact-card'];
const hasServerOnlyRoutes = serverRuntimeOnlyRoutes.length > 0;

if (hasServerOnlyRoutes) {
  console.warn(
    'NEXT_EXPORT requested; attempting a static export but the following routes rely on server rendering:',
    serverRuntimeOnlyRoutes.join(', ')
  );
  console.warn('Those routes may not function correctly in the exported build.');
}

const shouldExport = requestedStaticExport;

/** @type {import('next').NextConfig} */
function withNoSniff(headers) {
  return [
    ...headers,
    { key: 'X-Content-Type-Options', value: 'nosniff' },
  ];
}

const staticHeaders = [
  {
    source: '/((?!_next/static).*)',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'no-cache, max-age=0, s-maxage=0',
      },
    ]),
  },
  {
    source: '/_next/static/:buildId/_buildManifest.js',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'no-store',
      },
    ]),

  },
  {
    source: '/_next/static/:buildId/_ssgManifest.js',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'no-store',
      },
    ]),

  },
  {
    source: '/_next/static/:path*',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ]),

  },
  {
    source: '/images/:path*',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ]),

  },
  {
    source: '/fonts/:path*',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ]),

  },
  {
    source: '/static/:path*',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ]),

  },
  {
    source: '/property/:path*',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'no-cache, max-age=0, s-maxage=0',
      },
    ]),

  },
  {
    source: '/to-rent',
    headers: withNoSniff([
      {
        key: 'Cache-Control',
        value: 'no-cache, max-age=0, s-maxage=0',
      },
    ]),

  },
];

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd && repo ? `/${repo}` : undefined,
  assetPrefix: isProd && repo ? `/${repo}/` : undefined,
};

export default nextConfig;
