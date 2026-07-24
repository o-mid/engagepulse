#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer 127.0.0.1 so we match the default server bind (avoids [::1] refused).
API_URL="${API_URL:-http://127.0.0.1:8080}"
DEMO_WAIT_SECONDS="${DEMO_WAIT_SECONDS:-60}"

ACME_KEY="${ACME_KEY:-ak_acme_dev_001}"
NOVA_KEY="${NOVA_KEY:-ak_nova_dev_001}"
ACME_SECRET="${ACME_SECRET:-hmac_acme_dev_secret}"
NOVA_SECRET="${NOVA_SECRET:-hmac_nova_dev_secret}"

# Read one Prometheus counter/gauge value (last field on the matching line).
metric_value() {
  local name="$1"
  local line
  line="$(curl -sf "$API_URL/metrics" | rg "^${name} " || true)"
  if [[ -z "$line" ]]; then
    echo "0"
    return
  fi
  awk '{print $NF}' <<<"$line" | head -1 | cut -d. -f1
}

# True when both demo players show the expected end state (guards Kafka backlog races).
snapshots_ready() {
  local acme nova
  acme="$(curl -sf -H "X-API-Key: $ACME_KEY" "$API_URL/v1/players/load-acme-casino-0" || true)"
  nova="$(curl -sf -H "X-API-Key: $NOVA_KEY" "$API_URL/v1/players/load-nova-sports-0" || true)"
  [[ -n "$acme" && -n "$nova" ]] || return 1
  echo "$acme" | rg -q 'welcome_bonus' || return 1
  echo "$acme" | rg -q '"balance":100' || return 1
  echo "$acme" | rg -q '"vip_tier":"(silver|gold)"' || return 1
  echo "$nova" | rg -q 'welcome_bonus' || return 1
  echo "$nova" | rg -q '"balance":100' || return 1
  echo "$nova" | rg -q '"integrity_flag":"velocity"' || return 1
  return 0
}

# Wait until outbox is empty, this run's processed delta catches ingest, and snapshots look right.
wait_for_catch_up() {
  local base_ingested="$1"
  local base_processed="$2"
  local deadline=$(( $(date +%s) + DEMO_WAIT_SECONDS ))
  local ingested processed pending delta_in delta_out
  echo "==> 4) Wait until outbox is empty and worker catches up"
  echo "    We poll /metrics (not a fixed sleep). Timeout: ${DEMO_WAIT_SECONDS}s."
  echo
  while true; do
    ingested="$(metric_value engagepulse_events_ingested_total)"
    processed="$(metric_value engagepulse_events_processed_total)"
    pending="$(metric_value engagepulse_outbox_pending)"
    delta_in=$(( ingested - base_ingested ))
    delta_out=$(( processed - base_processed ))
    if (( delta_in < 0 )); then delta_in=0; fi
    if (( delta_out < 0 )); then delta_out=0; fi

    if [[ "$delta_in" -gt 0 && "$pending" -eq 0 && "$delta_out" -ge "$delta_in" ]] && snapshots_ready; then
      echo "    Caught up: this_run_ingested=$delta_in this_run_processed=$delta_out outbox_pending=$pending"
      echo "    (totals: ingested=$ingested processed=$processed)"
      echo
      return 0
    fi

    if (( $(date +%s) >= deadline )); then
      echo "ERROR: timed out waiting for catch-up after ${DEMO_WAIT_SECONDS}s"
      echo "  this_run_ingested=$delta_in this_run_processed=$delta_out outbox_pending=$pending"
      echo "  totals: ingested=$ingested processed=$processed"
      echo "  Check that make run is still up and Redpanda is healthy."
      exit 1
    fi

    if [[ "$delta_out" -lt "$delta_in" || "$pending" -gt 0 ]]; then
      echo "    still catching up… this_run_ingested=$delta_in this_run_processed=$delta_out outbox_pending=$pending"
    elif ! snapshots_ready; then
      echo "    still catching up… metrics ok, waiting for player results…"
    fi
    sleep 1
  done
}

echo "============================================================"
echo " EngagePulse demo"
echo "============================================================"
echo
echo "This walk-through sends fake player actions for two brands,"
echo "waits until the outbox and worker catch up, then prints results."
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

BASE_INGESTED="$(metric_value engagepulse_events_ingested_total)"
BASE_PROCESSED="$(metric_value engagepulse_events_processed_total)"

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

wait_for_catch_up "$BASE_INGESTED" "$BASE_PROCESSED"

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
echo "    Useful lines: accepted, processed, outbox pending (0 when drained),"
echo "    bonus credits, rule hits, retries / dlq"
echo
curl -sS "$API_URL/metrics" | rg 'engagepulse_(events_ingested|events_processed|ledger_credits|consumer_retries|consumer_dlq)_total|engagepulse_outbox_pending|engagepulse_rule_hits' || true
echo

echo "==> Demo complete"
echo "    Saved JSON: /tmp/engagepulse-acme.json and /tmp/engagepulse-nova.json"
echo "    If both brands look different for the reasons above, you are good."
echo
