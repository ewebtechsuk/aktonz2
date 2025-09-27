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

const connectionUrl = parsedUrl.toString();
const options = needsTls ? { tls: { servername: parsedUrl.hostname } } : undefined;

function formatUrlForDisplay(urlString) {
  try {
    const url = new URL(urlString);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch (error) {
    return urlString;
  }
}

console.log('Connecting to', formatUrlForDisplay(connectionUrl));

const redis = new Redis(connectionUrl, options);


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
