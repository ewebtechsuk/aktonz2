import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis-client';

export async function POST() {
  const redis = getRedisClient();
  const result = await redis.get('item');

  return NextResponse.json({ result });
}
