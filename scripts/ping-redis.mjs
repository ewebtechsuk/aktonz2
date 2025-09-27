#!/usr/bin/env node
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('REDIS_URL environment variable must be set');
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(redisUrl);
} catch (error) {
  console.error('REDIS_URL is not a valid URL');
  process.exit(1);
}

const needsTls = parsedUrl.protocol === 'rediss:' || parsedUrl.hostname.endsWith('redis-cloud.com');

if (needsTls && parsedUrl.protocol !== 'rediss:') {
  parsedUrl.protocol = 'rediss:';
}

const options = needsTls ? { tls: { servername: parsedUrl.hostname } } : undefined;

const redis = new Redis(parsedUrl.toString(), options);

async function main() {
  try {
    const response = await redis.ping();
    console.log('PING:', response);
  } catch (error) {
    console.error('Redis ping failed:', error);
    process.exitCode = 1;
  } finally {
    redis.disconnect();
  }
}

main();
