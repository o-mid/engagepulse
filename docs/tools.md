# Allowlisted tools

`POST /v1/tools/{name}` is a small HTTP allowlist over the same ingest and read paths partners already use. It does not write VIP or balance directly.

Auth: header `X-API-Key` (same tenant keys as `GET /v1/players/{id}`).

Unknown names return **404** `{"error":"unknown tool"}`.

## Tools

| Name | Request | What it does |
| --- | --- | --- |
| `ingest` | Body is the event JSON used by `POST /v1/events`. Header `X-Signature` is HMAC of that **raw body**. | Same accept path as partner ingest. The API key’s tenant must match `tenant_id`. |
| `get_player` | `{"player_id":"..."}` | Same snapshot as `GET /v1/players/{id}` for that tenant. |
| `get_metrics` | empty body or `{}` | JSON subset of process counters (`events_ingested_total`, `outbox_pending`, and the other totals). Not the Prometheus text from `GET /metrics`. |

## Not tools

These names are not on the allowlist. They 404 like any other unknown name:

- `credit`
- `set_vip`

There is no tool that credits the ledger or sets VIP. Send a signed event; rules and the ledger decide.
