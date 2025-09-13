const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';
const shouldExport = process.env.NEXT_EXPORT !== 'false';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(shouldExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        basePath: isProd && repo ? `/${repo}` : undefined,
        assetPrefix: isProd && repo ? `/${repo}/` : undefined,
      }
    : {}),
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'x-xss-protection', value: '' },
          { key: 'content-security-policy', value: '' },
        ],
      },
    ];
  },
};

export default nextConfig;
