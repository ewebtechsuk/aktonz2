import nextI18NextConfig from './next-i18next.config.mjs';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd && repo ? `/${repo}` : undefined,
  assetPrefix: isProd && repo ? `/${repo}/` : undefined,
  i18n: nextI18NextConfig.i18n,
};

export default nextConfig;
