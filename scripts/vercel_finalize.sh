#!/bin/bash
set -euo pipefail

# 0) Vars
APP_ID="${APP_ID:-04651e3a-82c5-4e03-ba50-574b2bb79cac}"
TENANT_ID="${TENANT_ID:-60737a1b-9707-4d7f-9909-0ee943a1ffff}"
BASE_URL="${BASE_URL:-https://aktonz.com}"

ORIG_REDIS_URL="${REDIS_URL:-}"
ORIG_TOKEN_ENCRYPTION_KEY="${TOKEN_ENCRYPTION_KEY:-}"

REDIS_URL='rediss://<USER>:<PASS>@<HOST>.redis-cloud.com:<PORT>'
TOKEN_ENCRYPTION_KEY='<LONG_RANDOM_BASE64_FROM_OPENSSL>'

if [[ -n "$ORIG_REDIS_URL" ]]; then
  REDIS_URL="$ORIG_REDIS_URL"
fi

if [[ -n "$ORIG_TOKEN_ENCRYPTION_KEY" ]]; then
  TOKEN_ENCRYPTION_KEY="$ORIG_TOKEN_ENCRYPTION_KEY"
fi

# 1) Deps
npm i ioredis
npm un @vercel/kv || true

# 2) Vercel link + pull (optional)
vercel link
vercel env pull .env.local

# 3) Azure login + permissions + redirect
az login --tenant "$TENANT_ID"
az ad app permission add --id "$APP_ID" --api 00000003-0000-0000-c000-000000000000 --api-permissions Mail.Send=Scope offline_access=Scope User.Read=Scope
az ad app permission admin-consent --id "$APP_ID"
az ad app update --id "$APP_ID" --web-redirect-uris "https://aktonz.com/api/microsoft/callback" "http://localhost:3000/api/admin/email/microsoft/callback"

# 4) Rotate client secret (capture new value)
NEW_SECRET="$(
  az ad app credential reset \
    --id "$APP_ID" \
    --display-name "aktonz-prod-$(date +%Y%m%d)" \
    --years 2 \
    --query password -o tsv
)"

# 5) Vercel envs
printf '%s\n' '04651e3a-82c5-4e03-ba50-574b2bb79cac' | vercel env add MS_CLIENT_ID
printf '%s\n' '60737a1b-9707-4d7f-9909-0ee943a1ffff' | vercel env add MS_TENANT_ID
printf '%s\n' 'https://aktonz.com/api/microsoft/callback' | vercel env add MS_REDIRECT_URI
printf '%s\n' 'offline_access Mail.Send User.Read' | vercel env add MS_SCOPES
printf '%s\n' "$NEW_SECRET" | vercel env add MS_CLIENT_SECRET
printf '%s\n' "$TOKEN_ENCRYPTION_KEY" | vercel env add TOKEN_ENCRYPTION_KEY
printf '%s\n' "$REDIS_URL" | vercel env add REDIS_URL

# 6) Redis ping (TLS auto if rediss:// or redis-cloud.com)
export REDIS_URL
node -e "const u=new URL(process.env.REDIS_URL);const tls=u.protocol==='rediss:'||u.hostname.endsWith('redis-cloud.com');const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL,tls?{tls:{rejectUnauthorized:false}}:{});r.ping().then(x=>{console.log('PING:',x);process.exit(0)}).catch(e=>{console.error(e.stack||e);process.exit(1)})"

# 7) Build + deploy
npm run build
vercel deploy --prod

# 8) Manual OAuth (in browser):
# Open ${BASE_URL}/admin and click "Connect to Microsoft", sign in as info@aktonz.com; expect /admin?connected=1

# 9) Status + profile checks
curl -s "${BASE_URL}/api/microsoft/status"
curl -s "${BASE_URL}/api/microsoft/self"

# 10) API smoke tests
curl -X POST "${BASE_URL}/api/contact" -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com","message":"Hello"}'
curl -X POST "${BASE_URL}/api/book-viewing" -H "Content-Type: application/json" -d '{"name":"Viewer","email":"v@example.com","phone":"+44 7000 000000","propertyId":"AKT-123","preferredTime":"Tomorrow 2pm"}'
curl -X POST "${BASE_URL}/api/offers" -H "Content-Type: application/json" -d '{"name":"Buyer","email":"b@example.com","phone":"+44 7000 000001","offerAmount":350000,"propertyId":"AKT-456","notes":"Cash buyer"}'
curl -X POST "${BASE_URL}/api/valuations" -H "Content-Type: application/json" -d '{"name":"Owner","email":"o@example.com","phone":"+44 7000 000002","address":"33 Abersham Road, London E8 2LN","details":"2-bed flat"}'

# 11) (Optional) After verifying, list old Azure secrets and delete unused ones:
az ad app credential list --id "$APP_ID" -o table
# az ad app credential delete --id "$APP_ID" --key-id <OLD_KEY_ID>
