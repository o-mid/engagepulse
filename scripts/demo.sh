#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_URL="${API_URL:-http://localhost:8080}"
# Prefer IPv4 if localhost resolves to ::1 and the server bound to 127.0.0.1
if [[ "$API_URL" == "http://localhost:8080" ]]; then
  if ! curl -sf --max-time 1 "$API_URL/healthz" >/dev/null 2>&1; then
    if curl -sf --max-time 1 "http://127.0.0.1:8080/healthz" >/dev/null 2>&1; then
      API_URL="http://127.0.0.1:8080"
    fi
  fi
fi

ACME_KEY="${ACME_KEY:-ak_acme_dev_001}"
NOVA_KEY="${NOVA_KEY:-ak_nova_dev_001}"
ACME_SECRET="${ACME_SECRET:-hmac_acme_dev_secret}"
NOVA_SECRET="${NOVA_SECRET:-hmac_nova_dev_secret}"

echo "============================================================"
echo " EngagePulse demo"
echo "============================================================"
echo
echo "This walk-through sends fake player actions for two brands,"
echo "waits for the worker, then prints each player's result."
echo
echo "API: $API_URL"
echo
echo "What the words mean (short):"
echo "  • welcome_bonus  = first-deposit reward tag (+100 balance once)"
echo "  • vip_tier       = bronze / silver / gold from bet score"
echo "  • integrity_flag = velocity means 'bet too many times too fast'"
echo "  • balance        = demo reward credits (not real cash)"
echo
echo "Full plain-language guide: docs/concepts.md"
echo

echo "==> 1) Health check"
if ! curl -sf "$API_URL/healthz" >/dev/null; then
  echo "ERROR: server not reachable at $API_URL"
  echo "Start Postgres + Redpanda, then: make migrate && make run"
  exit 1
fi
echo "OK — server is up"
echo

echo "==> 2) Brand A: acme-casino (VIP path)"
echo "    We send 1 deposit + several larger bets for a few players."
echo "    Expect player load-acme-casino-0 to get welcome_bonus and a higher VIP tier."
echo
go run ./cmd/loadgen -url "$API_URL" -tenant acme-casino -secret "$ACME_SECRET" -mode vip -n 12
echo

echo "==> 3) Brand B: nova-sports (fast-betting path)"
echo "    We send 1 deposit + many small bets on ONE player, quickly."
echo "    Expect integrity_flag=velocity on load-nova-sports-0."
echo
go run ./cmd/loadgen -url "$API_URL" -tenant nova-sports -secret "$NOVA_SECRET" -mode velocity -n 8
echo

echo "==> 4) Wait for outbox publish + worker rules (3s)"
echo "    Events are saved first, then pushed to the stream, then rules run."
sleep 3
echo

echo "==> 5) Read acme player snapshot"
echo "    GET /v1/players/load-acme-casino-0  (API key for acme-casino)"
echo
ACME_JSON="$(curl -sS -H "X-API-Key: $ACME_KEY" "$API_URL/v1/players/load-acme-casino-0")"
echo "$ACME_JSON" | tee /tmp/engagepulse-acme.json
echo
echo "    How to read this JSON:"
echo "      offer_tags      should include welcome_bonus"
echo "      vip_tier        silver or gold if enough bet score"
echo "      balance         should be 100 after the welcome credit"
echo "      integrity_flag  may also be set if that player bet in bursts"
echo

echo "==> 6) Read nova player snapshot"
echo "    GET /v1/players/load-nova-sports-0  (API key for nova-sports)"
echo
NOVA_JSON="$(curl -sS -H "X-API-Key: $NOVA_KEY" "$API_URL/v1/players/load-nova-sports-0")"
echo "$NOVA_JSON" | tee /tmp/engagepulse-nova.json
echo
echo "    How to read this JSON:"
echo "      offer_tags      should include welcome_bonus"
echo "      vip_tier        often still bronze (small bets)"
echo "      integrity_flag  should be velocity"
echo "      balance         should be 100"
echo

echo "==> 7) Selected counters from /metrics"
echo "    Useful lines: events accepted, events processed, bonus credits, rule hits"
echo
curl -sS "$API_URL/metrics" | rg 'engagepulse_(events_ingested|events_processed|ledger_credits|consumer_retries|consumer_dlq)_total|engagepulse_rule_hits' || true
echo

echo "==> Demo complete"
echo "    Saved JSON: /tmp/engagepulse-acme.json and /tmp/engagepulse-nova.json"
echo "    If both brands look different for the reasons above, you are good."
echo
