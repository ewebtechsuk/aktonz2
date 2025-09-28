import { createClient } from 'redis';

let redisClient = null;
let redisConnection = null;

function ensureRedis() {
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  const redis = ensureRedis();

  if (!redis) {
    res.status(503).json({ error: 'Redis is not configured.' });
    return;
  }

  try {
    await redis.connection;
    const result = await redis.client.get('item');
    res.status(200).json({ result });
  } catch (error) {
    console.error('Redis request failed:', error);
    res.status(500).json({ error: 'Unable to read data from Redis.' });
  }
}
