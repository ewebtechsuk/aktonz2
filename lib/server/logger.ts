// lib/server/logger.ts
export function logInfo(msg: string, meta: Record<string, unknown> = {}) {
  try {
    console.log(`[INFO] ${msg}`, JSON.stringify(meta));
  } catch {
    // ignore logging errors
  }
}

export function logWarn(msg: string, meta: Record<string, unknown> = {}) {
  try {
    console.warn(`[WARN] ${msg}`, JSON.stringify(meta));
  } catch {
    // ignore logging errors
  }
}

export function logError(msg: string, meta: Record<string, unknown> = {}) {
  try {
    console.error(`[ERROR] ${msg}`, JSON.stringify(meta));
  } catch {
    // ignore logging errors
  }
}
