import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (error) => {
  console.error('Redis Client Error:', error);
});

const redisConnection = redisClient.connect();

export const POST = async () => {
  await redisConnection;

  const result = await redisClient.get('item');

  return NextResponse.json({ result });
};
