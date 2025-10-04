const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isProd = process.env.NODE_ENV === 'production';

const serverRuntimeOnlyRoutes = ['/integrations/3cx/contact-card'];
const hasServerOnlyRoutes = serverRuntimeOnlyRoutes.length > 0;

if (hasServerOnlyRoutes) {
  console.warn(
    'Static exports do not support routes that rely on server rendering. The following routes may not function correctly:',
    serverRuntimeOnlyRoutes.join(', ')
  );
}

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd && repo ? `/${repo}` : undefined,
  assetPrefix: isProd && repo ? `/${repo}/` : undefined,
};

export default nextConfig;
