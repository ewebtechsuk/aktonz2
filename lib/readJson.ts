import { readJson as readJsonImpl, readJsonSync as readJsonSyncImpl } from './read-json.mjs';

export function readJson<T = unknown>(...segments: string[]): Promise<T> {
  return readJsonImpl(...segments) as Promise<T>;
}

export function readJsonSync<T = unknown>(...segments: string[]): T {
  return readJsonSyncImpl(...segments) as T;
}
