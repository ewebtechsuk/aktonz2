import Redis from 'ioredis';
import {
  EncryptedPayload,
  deserializeEncryptedPayload,
  serializeEncryptedPayload,
} from './crypto-util';

const TOKEN_KEY = 'aktonz:ms:tokens';

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable must be set');
    }

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }

  return redisClient;
}

export interface StoredTokenSet {
  encryptedAccessToken: EncryptedPayload;
  encryptedRefreshToken: EncryptedPayload;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

export async function saveTokenSet(tokenSet: StoredTokenSet): Promise<void> {
  const client = getRedisClient();

  await client.hset(TOKEN_KEY, {
    access: serializeEncryptedPayload(tokenSet.encryptedAccessToken),
    refresh: serializeEncryptedPayload(tokenSet.encryptedRefreshToken),
    expiresAt: tokenSet.expiresAt.toString(),
    scope: tokenSet.scope ?? '',
    tokenType: tokenSet.tokenType ?? '',
  });
}

export async function loadTokenSet(): Promise<StoredTokenSet | null> {
  const client = getRedisClient();
  const record = await client.hgetall(TOKEN_KEY);

  if (
    !record ||
    Object.keys(record).length === 0 ||
    !record.access ||
    !record.refresh ||
    !record.expiresAt
  ) {
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
  const client = getRedisClient();
  await client.del(TOKEN_KEY);
}
