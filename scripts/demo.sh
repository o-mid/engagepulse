#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_URL="${API_URL:-http://localhost:8080}"
ACME_KEY="${ACME_KEY:-ak_acme_dev_001}"
NOVA_KEY="${NOVA_KEY:-ak_nova_dev_001}"
ACME_SECRET="${ACME_SECRET:-hmac_acme_dev_secret}"
NOVA_SECRET="${NOVA_SECRET:-hmac_nova_dev_secret}"

echo "==> seeding traffic for acme-casino (VIP path)"
go run ./cmd/loadgen -url "$API_URL" -tenant acme-casino -secret "$ACME_SECRET" -mode vip -n 12

echo "==> seeding traffic for nova-sports (velocity path)"
go run ./cmd/loadgen -url "$API_URL" -tenant nova-sports -secret "$NOVA_SECRET" -mode velocity -n 8

echo "==> waiting for worker"
sleep 3

echo "==> acme player snapshot"
curl -sS -H "X-API-Key: $ACME_KEY" "$API_URL/v1/players/load-acme-casino-0" | tee /tmp/engagepulse-acme.json
echo

echo "==> nova player snapshot"
curl -sS -H "X-API-Key: $NOVA_KEY" "$API_URL/v1/players/load-nova-sports-0" | tee /tmp/engagepulse-nova.json
echo

echo "==> demo complete"
