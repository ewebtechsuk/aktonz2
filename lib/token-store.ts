import { kv } from '@vercel/kv';
import {
  EncryptedPayload,
  deserializeEncryptedPayload,
  serializeEncryptedPayload,
} from './crypto-util';

const TOKEN_KEY = 'aktonz:ms:tokens';

export interface StoredTokenSet {
  encryptedAccessToken: EncryptedPayload;
  encryptedRefreshToken: EncryptedPayload;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

export async function saveTokenSet(tokenSet: StoredTokenSet): Promise<void> {
  await kv.hset(TOKEN_KEY, {
    access: serializeEncryptedPayload(tokenSet.encryptedAccessToken),
    refresh: serializeEncryptedPayload(tokenSet.encryptedRefreshToken),
    expiresAt: tokenSet.expiresAt.toString(),
    scope: tokenSet.scope ?? '',
    tokenType: tokenSet.tokenType ?? '',
  });
}

export async function loadTokenSet(): Promise<StoredTokenSet | null> {
  const record = await kv.hgetall<Record<string, string>>(TOKEN_KEY);

  if (!record || !record.access || !record.refresh || !record.expiresAt) {
    return null;
  }

  return {
    encryptedAccessToken: deserializeEncryptedPayload(record.access),
    encryptedRefreshToken: deserializeEncryptedPayload(record.refresh),
    expiresAt: Number.parseInt(record.expiresAt, 10),
    scope: record.scope || undefined,
    tokenType: record.tokenType || undefined,
  };
}

export async function clearTokenSet(): Promise<void> {
  await kv.del(TOKEN_KEY);
}
