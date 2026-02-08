# Plan: GitHub Hosting + Web-Deployment

## Stack
| Service | Zweck | Free Tier |
|---------|-------|-----------|
| **Vercel** | Next.js Hosting | 100GB BW, 100h Compute/Mo |
| **Neon** | PostgreSQL Datenbank | 0.5GB Storage, always-on |
| **GitHub** | Source Code + CI | Unlimited public repos |
| **cron-job.org** | Externer Cron (alle 5 Min) | Kostenlos |

## Fortschritt

### Phase 1: GitHub Setup + Docker Dev-DB
- [x] `docker-compose.yml` erstellen (PostgreSQL für lokale Entwicklung)
- [x] `.env` anpassen: `DATABASE_URL` auf Neon Dev-DB
- [x] `.env.example` erstellen (Template ohne Secrets)
- [x] `.github/workflows/ci.yml` erstellen (Build + Lint Check)
- [x] GitHub Repo erstellt: https://github.com/xman-berlin/ai-crypto-trader

### Phase 2: Datenbank-Migration (SQLite → PostgreSQL)
- [x] `prisma/schema.prisma`: Provider auf `postgresql` geändert
- [x] `package.json`: `postinstall: prisma generate` hinzugefügt
- [x] `prisma/export-data.ts` erstellt (Datenmigration)
- [x] SQLite-Daten exportiert (1 Round, 5 Holdings, 98 Transactions, 163 Snapshots)
- [x] Neon-Account erstellt + 2 Datenbanken: `cryptotrader_dev` (lokal) + `neondb` (prod)
- [x] `npx prisma migrate dev --name init` ausgeführt
- [x] Daten in beide DBs importiert (dev + prod)

### Phase 3: Scheduler → Externer Cron
- [x] Cron-Endpoint erstellt: `src/app/api/cron/trade/route.ts` (Auth via `CRON_SECRET`)
- [x] Scheduler-Status-Endpoint angepasst (Vercel vs. lokal)
- ~~`vercel.json` Cron~~ → Vercel Free Tier nur täglich, daher externer Cron
- [x] cron-job.org Account erstellt + Cronjob eingerichtet (alle 5 Min → `/api/cron/trade`)

### Phase 4: Vercel Deployment
- [x] Vercel-Account erstellt (GitHub-Login)
- [x] Projekt importiert + GitHub-Repo verknüpft
- [x] Environment Variables gesetzt (DATABASE_URL, OPENROUTER_API_KEY, CRON_SECRET, Telegram)
- [x] Deployed + live: https://ai-crypto-trader.vercel.app

### Phase 5: Verifizierung + Bugfixes
- [x] Dashboard im Browser aufrufen → funktioniert
- [x] cron-job.org eingerichtet + Testrun erfolgreich
- [x] Cron-Endpoint async gemacht (`waitUntil`) wegen 30s Timeout-Limit
- [x] PostgreSQL-Sequenzen gefixt (auto-increment Konflikt nach Datenimport)
- [x] CoinGecko Rate-Limiting verbessert (weniger OHLC-Calls, längeres Backoff)
- [x] Bust-Detection abgesichert (fehlende Marktpreise → kein falscher Bust)
- [x] Trade-Tick erfolgreich verifiziert (Runde #3 läuft)

## Status: ABGESCHLOSSEN

## Entscheidungen
- **Lokale DB**: Neon `cryptotrader_dev` (statt Docker, da Colima SSL-Problem)
- **Cron**: cron-job.org statt Vercel Cron (Free Tier = nur daily)
- **Direct vs Pooler Endpoint**: Migrations brauchen Direct (`ep-proud-rice-agnfgno0.c-2...`), App nutzt Pooler (`ep-proud-rice-agnfgno0-pooler.c-2...`)
- **Fehlende Preise**: Portfolio fällt auf avgBuyPrice zurück, Bust-Check wird übersprungen
