import Redis, { RedisOptions } from 'ioredis';

export type StoredTokens = {
  access_token_enc: string;
  refresh_token_enc: string;
  expires_in: number;
  obtained_at: number;
  account: string;
};

const TOKEN_KEY = 'aktonz:ms:tokens';

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable must be set');
  }

  const parsedUrl = new URL(redisUrl);
  const shouldForceTls =
    parsedUrl.protocol === 'rediss:' || /\.redis-cloud\.com$/i.test(parsedUrl.hostname);

  const options: RedisOptions = {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  };

  if (shouldForceTls) {
    options.tls = {
      rejectUnauthorized: true,
    };
  }

  redisClient = new Redis(redisUrl, options);
  return redisClient;
}

export async function saveTokens(data: StoredTokens): Promise<void> {
  const client = getRedisClient();

  await client.hset(TOKEN_KEY, {
    access_token_enc: data.access_token_enc,
    refresh_token_enc: data.refresh_token_enc,
    expires_in: data.expires_in.toString(),
    obtained_at: data.obtained_at.toString(),
    account: data.account,
  });
}

export async function readTokens(): Promise<StoredTokens | null> {
  const client = getRedisClient();
  const record = await client.hgetall(TOKEN_KEY);

  if (!record || Object.keys(record).length === 0) {
    return null;
  }

  const { access_token_enc, refresh_token_enc, expires_in, obtained_at, account } = record;

  if (!access_token_enc || !refresh_token_enc || !expires_in || !obtained_at || !account) {
    return null;
  }

  return {
    access_token_enc,
    refresh_token_enc,
    expires_in: Number.parseInt(expires_in, 10),
    obtained_at: Number.parseInt(obtained_at, 10),
    account,
  };
}

export async function clearTokens(): Promise<void> {
  const client = getRedisClient();
  await client.del(TOKEN_KEY);
}
