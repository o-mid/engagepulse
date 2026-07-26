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

## Demo recordings

High-quality screen captures are attached to GitHub release **`v0.3.0`** (mp4 + posters). Links live in the root [README Demo video](../README.md#demo-video) section.

## See it online (free options)

The UI is a Next.js BFF: it must reach a running EngagePulse API (`ENGAGEPULSE_URL`) with the demo tenant keys from `.env.local.example`. There is no fully static export that can run the live demo alone.

### 1) Watch without hosting

Open the `v0.3.0` release assets (Arena / Architecture / Tour mp4). No deploy required.

### 2) Quick share of your local stack (best free “live” path)

Keep Postgres + Redpanda + `make run` + `npm run dev` on your machine, then expose both ports with a tunnel:

```bash
# example with Cloudflare Tunnel (free account)
cloudflared tunnel --url http://127.0.0.1:3000
```

Share the printed `https://*.trycloudflare.com` URL.  
If the browser UI calls the API through the BFF on `:3000`, one tunnel to the web app is enough (secrets stay on your machine).  
Alternatives: [ngrok](https://ngrok.com/) or [localhost.run](https://localhost.run/).

### 3) Free-host the web UI (Vercel)

1. Push this repo (or connect the GitHub remote) to [Vercel](https://vercel.com/) → Import → set **Root Directory** to `web`.
2. Add env vars from `.env.local.example`, but point `ENGAGEPULSE_URL` at a **public** API base URL (not `127.0.0.1`).
3. Deploy. The Arena page will load; **Ignite live demo** only works when that API is reachable from Vercel’s servers.

### 4) Free-host the Go API (harder piece)

You need Postgres + a Kafka-compatible broker (this repo uses Redpanda in Compose).

Practical free-tier path:

1. **Postgres** — [Neon](https://neon.tech/) or [Supabase](https://supabase.com/) free DB → set `DATABASE_URL`.
2. **Broker** — small Redpanda/Kafka on [Railway](https://railway.app/), [Render](https://render.com/), or [Fly.io](https://fly.io/) (free allowances change; expect to babysit sleep/idle limits).
3. **API** — deploy the Go binary on Fly/Railway/Render with `HTTP_ADDR=0.0.0.0:8080`, your Kafka brokers, and the seeded tenant keys/secrets.
4. Run migrations once against the hosted Postgres (`make migrate` with hosted `DATABASE_URL`).
5. Point Vercel `ENGAGEPULSE_URL` at that API.

If you only need a portfolio link for a day or two, prefer **option 2 (tunnel)** over fighting free Kafka hosting.
