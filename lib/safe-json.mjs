export async function safe(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
    console.warn('safe fallback:', message);
    return fallback;
  }
}

export function safeSync(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
    console.warn('safe fallback:', message);
    return fallback;
  }
}
