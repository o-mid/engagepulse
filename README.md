# EngagePulse

Multi-tenant player engagement service. Ingest signed activity events, score and flag players, and credit rewards without double-paying on retries.

## Status

Early scaffolding. Local run instructions will land as the service takes shape.

## Requirements

- Go 1.22+
- Docker (Postgres + Redpanda in later commits)

## Quick start

```bash
go run ./cmd/engagepulse
```
