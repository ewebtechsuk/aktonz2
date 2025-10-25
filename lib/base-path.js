const ENV_BASE_PATH_KEYS = ['NEXT_PUBLIC_BASE_PATH', 'BASE_PATH', 'NEXT_BASE_PATH'];

let cachedBasePath;

function normaliseBasePath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  let basePath = value.trim();
  if (!basePath || basePath === '/') {
    return '';
  }

  if (!basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }

  // Remove trailing slashes while preserving the leading slash.
  basePath = basePath.replace(/\/+$/, '');

  if (basePath === '/' || basePath === '') {
    return '';
  }

  return basePath;
}

function readBasePathFromEnv() {
  if (typeof process === 'undefined') {
    return '';
  }

  for (const key of ENV_BASE_PATH_KEYS) {
    const value = process.env?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}

function readBasePathFromWindow() {
  if (typeof window === 'undefined') {
    return '';
  }

  const nextData = window.__NEXT_DATA__;
  const fromConfig = nextData?.config?.basePath || nextData?.runtimeConfig?.basePath;
  if (typeof fromConfig === 'string' && fromConfig.trim()) {
    return fromConfig;
  }

  return '';
}

export function getBasePath() {
  if (cachedBasePath !== undefined) {
    return cachedBasePath;
  }

  const fromWindow = normaliseBasePath(readBasePathFromWindow());
  if (fromWindow) {
    cachedBasePath = fromWindow;
    return cachedBasePath;
  }

  cachedBasePath = normaliseBasePath(readBasePathFromEnv());
  return cachedBasePath;
}

export function withBasePath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    return path;
  }

  const basePath = getBasePath();
  if (!basePath) {
    return path;
  }

  // Ignore non-root-relative URLs (e.g. http://example.com/foo or mailto links).
  if (!path.startsWith('/')) {
    return path;
  }

  if (path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }

  return `${basePath}${path}`;
}
