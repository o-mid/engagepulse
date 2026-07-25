# EngagePulse · Pulse Arena (web)

Creative Next.js console for the EngagePulse Go service.

## What it showcases

- Dual-tenant visual composition (Acme VIP vs Nova velocity)
- Canvas pulse field reacting to signed ingest
- Choreographed demo state machine (Framer Motion)
- BFF routes that HMAC-sign event bodies — secrets never hit the browser
- Live player snapshots + Prometheus counter parsing

## Run

From repo root:

```bash
docker compose up -d postgres redpanda
make migrate
make run
```

In another terminal:

```bash
cd web
cp .env.local.example .env.local   # if needed
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Ignite live demo**.

Pages:

| Path | What |
| --- | --- |
| `/` | Pulse Arena — guided dual-tenant demo |
| `/architecture` | Live architecture — flow, metrics poll, reliability notes |
