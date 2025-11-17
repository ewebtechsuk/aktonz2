import { safe as safeImpl, safeSync as safeSyncImpl } from './safe-json.mjs';

export function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return safeImpl(fn, fallback) as Promise<T>;
}

export function safeSync<T>(fn: () => T, fallback: T): T {
  return safeSyncImpl(fn, fallback) as T;
}
