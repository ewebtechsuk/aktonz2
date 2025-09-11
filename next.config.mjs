const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  basePath: isProd && repo ? `/${repo}` : undefined,
  assetPrefix: isProd && repo ? `/${repo}/` : undefined,
};

export default nextConfig;
