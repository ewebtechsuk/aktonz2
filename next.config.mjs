const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd && repo ? `/${repo}` : undefined,
  assetPrefix: isProd && repo ? `/${repo}/` : undefined,
};

// Custom HTTP headers such as Cache-Control cannot be configured via
// `next.config.js` when using `output: 'export'`. They must be applied by the
// hosting environment instead. The previous header configuration was removed to
// avoid build-time warnings from Next.js.

export default nextConfig;
