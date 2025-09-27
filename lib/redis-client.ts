import Redis, { RedisOptions } from 'ioredis';

let redisClient: Redis | null = null;

function buildRedisOptions(url: URL): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  };

  const shouldForceTls =
    url.protocol === 'rediss:' || /\.redis-cloud\.com$/i.test(url.hostname);

  if (shouldForceTls) {
    options.tls = {
      rejectUnauthorized: true,
    };
  }

  return options;
}

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable must be set');
  }

  const parsedUrl = new URL(redisUrl);
  const options = buildRedisOptions(parsedUrl);

  redisClient = new Redis(redisUrl, options);

  return redisClient;
}

export type { Redis };
