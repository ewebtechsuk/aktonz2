#!/usr/bin/env bash
# scripts/ms-oauth-tests.sh
# Usage:
#   chmod +x scripts/ms-oauth-tests.sh
#   BASE_URL="https://aktonz.com" ./scripts/ms-oauth-tests.sh
#   # or for local:
#   BASE_URL="http://localhost:3000" ./scripts/ms-oauth-tests.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "== Aktonz Microsoft Graph Smoke Tests =="
echo "Target: $BASE_URL"
echo

echo "[1/6] Checking Microsoft OAuth connection status..."
curl -fsS "$BASE_URL/api/microsoft/status" | jq . || { echo "❌ status check failed"; exit 1; }
echo "✅ status OK"
echo

echo "[2/6] Checking Microsoft Graph /me (sanity)..."
curl -fsS "$BASE_URL/api/microsoft/self" | jq . || { echo "❌ /me check failed"; exit 1; }
echo "✅ /me OK"
echo

echo "[3/6] POST /api/contact ..."
curl -fsS -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello from Aktonz smoke test"}' | jq . && echo "✅ contact OK"
echo

echo "[4/6] POST /api/book-viewing ..."
curl -fsS -X POST "$BASE_URL/api/book-viewing" \
  -H "Content-Type: application/json" \
  -d '{"name":"Viewer","email":"v@example.com","phone":"+44 7000 000000","propertyId":"AKT-123","preferredTime":"Tomorrow 2pm"}' | jq . && echo "✅ book-viewing OK"
echo

echo "[5/6] POST /api/offers ..."
curl -fsS -X POST "$BASE_URL/api/offers" \
  -H "Content-Type: application/json" \
  -d '{"name":"Buyer","email":"b@example.com","phone":"+44 7000 000001","offerAmount":350000,"propertyId":"AKT-456","notes":"Cash buyer"}' | jq . && echo "✅ offers OK"
echo

echo "[6/6] POST /api/valuations ..."
curl -fsS -X POST "$BASE_URL/api/valuations" \
  -H "Content-Type: application/json" \
  -d '{"name":"Owner","email":"o@example.com","phone":"+44 7000 000002","address":"33 Abersham Road, London E8 2LN","details":"2-bed flat"}' | jq . && echo "✅ valuations OK"
echo

echo "🎉 All smoke tests completed."
