#!/usr/bin/env bash
npm uninstall @vercel/kv
npm install ioredis
printf "04651e3a-82c5-4e03-ba50-574b2bb79cac" | vercel env add MS_CLIENT_ID
printf "60737a1b-9707-4d7f-9909-0ee943a1ffff" | vercel env add MS_TENANT_ID
printf "https://aktonz.com/api/microsoft/callback" | vercel env add MS_REDIRECT_URI
printf "offline_access Mail.Send User.Read" | vercel env add MS_SCOPES
printf "<NEW_CLIENT_SECRET_VALUE>" | vercel env add MS_CLIENT_SECRET
printf "<LONG_RANDOM_BASE64_FROM_OPENSSL>" | vercel env add TOKEN_ENCRYPTION_KEY
printf "<YOUR_REDIS_CLOUD_URL_STARTING_WITH_rediss://>" | vercel env add REDIS_URL
vercel deploy --prod
