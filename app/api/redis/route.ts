import { NextResponse } from 'next/server';
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisConnection: Promise<RedisClientType> | null = null;

const ensureRedis = () => {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });

    redisConnection = redisClient.connect();
  }

  return { client: redisClient, connection: redisConnection };
};

export const POST = async () => {
  const redis = ensureRedis();

  if (!redis) {
    return NextResponse.json({ error: 'Redis is not configured.' }, { status: 503 });
  }

  try {
    await redis.connection;

    const result = await redis.client.get('item');

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Redis request failed:', error);
    return NextResponse.json({ error: 'Unable to read data from Redis.' }, { status: 500 });
  }
};
