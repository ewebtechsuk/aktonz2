const FALLBACK_BASE_PATH =
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH)) ||
  '';

function normalizeBasePath(value) {
  if (!value) {
    return '';
  }
  const base = String(value);
  if (base === '/') {
    return '';
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function resolveBasePath(source) {
  if (typeof source === 'string') {
    return normalizeBasePath(source);
  }

  if (source && typeof source === 'object') {
    if (typeof source.basePath === 'string') {
      return normalizeBasePath(source.basePath);
    }
    if (typeof source.router === 'object' && typeof source.router.basePath === 'string') {
      return normalizeBasePath(source.router.basePath);
    }
  }

  if (typeof window !== 'undefined') {
    const fromWindow =
      (window.__NEXT_ROUTER_BASEPATH && String(window.__NEXT_ROUTER_BASEPATH)) ||
      (window.__NEXT_DATA__ && typeof window.__NEXT_DATA__.basePath === 'string'
        ? window.__NEXT_DATA__.basePath
        : undefined);
    if (fromWindow) {
      return normalizeBasePath(fromWindow);
    }
  }

  return normalizeBasePath(FALLBACK_BASE_PATH);
}

export function withBasePath(path = '', basePathOrRouter) {
  const basePath = resolveBasePath(basePathOrRouter);
  if (!basePath) {
    return path || '';
  }

  if (!path) {
    return basePath;
  }

  if (path.startsWith('/')) {
    return `${basePath}${path}`;
  }

  return `${basePath}/${path}`;
}

export function getBasePath(basePathOrRouter) {
  return resolveBasePath(basePathOrRouter);
}

export default withBasePath;
