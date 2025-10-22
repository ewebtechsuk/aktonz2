const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';
// Default to a serverful build so API routes like /api/register work.
// Use NEXT_EXPORT=true (or run within GitHub Actions) if a static export is required.
const requestedStaticExport = process.env.NEXT_EXPORT === 'true';
const ciRequestedStaticExport =
  process.env.GITHUB_ACTIONS === 'true' && process.env.NEXT_EXPORT !== 'false';

// Pages that call Next.js API routes or otherwise expect a server runtime.
// They are omitted from static exports so commit-driven deployments (e.g.
// GitHub Pages) do not publish broken forms or dashboards.
const serverRuntimeOnlyRoutes = [
  '/integrations/3cx/contact-card',
  '/contact',
  '/login',
  '/register',
  '/valuation',
  '/offers/[id]/payment-success',
];

// Route prefixes whose children rely on API routes for authentication or
// data. Keep these out of the static export to avoid publishing empty shells.
const serverRuntimeOnlyPrefixes = ['/admin', '/account'];

const shouldExport = requestedStaticExport || ciRequestedStaticExport;

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
          const blockedRoutes = new Set(serverRuntimeOnlyRoutes);

          const filteredEntries = Object.entries(defaultPathMap).filter(([path]) => {
            if (path.startsWith('/_')) {
              return true;
            }

            if (blockedRoutes.has(path)) {
              return false;
            }

            return !serverRuntimeOnlyPrefixes.some((prefix) =>
              path === prefix || path.startsWith(`${prefix}/`),
            );
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
