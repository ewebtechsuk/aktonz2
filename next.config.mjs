const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';
// Default to a serverful build so API routes like /api/register work.
// Use NEXT_EXPORT=true (or run within GitHub Actions) if a static export is required.
const requestedStaticExport = process.env.NEXT_EXPORT === 'true';
const ciRequestedStaticExport =
  process.env.GITHUB_ACTIONS === 'true' && process.env.NEXT_EXPORT !== 'false';

const serverRuntimeOnlyRoutes = ['/integrations/3cx/contact-card'];
const hasServerOnlyRoutes = serverRuntimeOnlyRoutes.length > 0;

const shouldExport = requestedStaticExport || ciRequestedStaticExport;

if (shouldExport && hasServerOnlyRoutes) {
  console.warn(
    'NEXT_EXPORT requested; attempting a static export but the following routes rely on server rendering:',
    serverRuntimeOnlyRoutes.join(', ')
  );
  console.warn('Those routes may not function correctly in the exported build.');
}

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

const computedBasePath = isProd && repo ? `/${repo}` : '';
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? computedBasePath;

const nextConfig = {
  ...(shouldExport
    ? {
        output: 'export',
        exportPathMap: async (defaultPathMap) => {
          const blockedPrefixes = ['/admin'];

          const filteredEntries = Object.entries(defaultPathMap).filter(([path]) => {
            if (path.startsWith('/_')) {
              return true;
            }

            return !blockedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
          });

          const filteredPathMap = Object.fromEntries(filteredEntries);

          const removedRoutes = Object.keys(defaultPathMap).filter((path) => !(path in filteredPathMap));

          if (removedRoutes.length) {
            console.warn('Omitting the following routes from static export:', removedRoutes.join(', '));
          }

          return filteredPathMap;
        },
      }
    : {}),
  images: { unoptimized: true },
  basePath: computedBasePath || undefined,
  assetPrefix: computedBasePath ? `${computedBasePath}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: publicBasePath,
  },
};

export default nextConfig;
