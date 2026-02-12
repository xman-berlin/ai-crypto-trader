# Plan: GitHub Hosting + Web Deployment

## Stack
| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Vercel** | Next.js Hosting | 100GB BW, 100h Compute/mo |
| **Neon** | PostgreSQL Database | 0.5GB Storage, always-on |
| **GitHub** | Source Code + CI | Unlimited public repos |
| **cron-job.org** | External Cron (every 5 min) | Free |

## Progress

### Phase 1: GitHub Setup + Docker Dev-DB
- [x] Create `docker-compose.yml` (PostgreSQL for local development)
- [x] Update `.env`: `DATABASE_URL` to Neon Dev-DB
- [x] Create `.env.example` (template without secrets)
- [x] Create `.github/workflows/ci.yml` (build + lint check)
- [x] GitHub repo created: https://github.com/xman-berlin/ai-crypto-trader

### Phase 2: Database Migration (SQLite → PostgreSQL)
- [x] `prisma/schema.prisma`: Provider changed to `postgresql`
- [x] `package.json`: Added `postinstall: prisma generate`
- [x] Created `prisma/export-data.ts` (data migration)
- [x] Exported SQLite data (1 Round, 5 Holdings, 98 Transactions, 163 Snapshots)
- [x] Neon account created + 2 databases: `cryptotrader_dev` (local) + `neondb` (prod)
- [x] Ran `npx prisma migrate dev --name init`
- [x] Imported data into both DBs (dev + prod)

### Phase 3: Scheduler → External Cron
- [x] Created cron endpoint: `src/app/api/cron/trade/route.ts` (auth via `CRON_SECRET`)
- [x] Adapted scheduler status endpoint (Vercel vs. local)
- ~~`vercel.json` Cron~~ → Vercel Free Tier only supports daily, so using external cron
- [x] cron-job.org account created + cronjob configured (every 5 min → `/api/cron/trade`)

### Phase 4: Vercel Deployment
- [x] Vercel account created (GitHub login)
- [x] Project imported + linked to GitHub repo
- [x] Environment variables set (DATABASE_URL, OPENROUTER_API_KEY, CRON_SECRET, Telegram)
- [x] Deployed + live: https://ai-crypto-trader.vercel.app

### Phase 5: Verification + Bugfixes
- [x] Dashboard accessible in browser → works
- [x] cron-job.org configured + test run successful
- [x] Cron endpoint made async (`waitUntil`) due to 30s timeout limit
- [x] PostgreSQL sequences fixed (auto-increment conflict after data import)
- [x] CoinGecko rate limiting improved (fewer OHLC calls, longer backoff)
- [x] Bust detection secured (missing market prices → no false bust)
- [x] Trade tick successfully verified (round #3 running)

## Status: COMPLETED

## Decisions
- **Local DB**: Neon `cryptotrader_dev` (instead of Docker, due to Colima SSL issue)
- **Cron**: cron-job.org instead of Vercel Cron (Free Tier = daily only)
- **Direct vs Pooler Endpoint**: Migrations need Direct (`ep-proud-rice-agnfgno0.c-2...`), App uses Pooler (`ep-proud-rice-agnfgno0-pooler.c-2...`)
- **Missing Prices**: Portfolio falls back to avgBuyPrice, bust check is skipped
